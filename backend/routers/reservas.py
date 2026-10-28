import json
import logging
import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from emails import enviar_confirmacion_cliente
from sqlalchemy.orm import Session
from database.connection import get_db
from models.reserva import Reserva
from models.club import ClubConsumo, ClubMiembro, ClubPlan, ClubServicioExtra
from pydantic import BaseModel
from routers.auth import get_admin_actual, get_usuario_actual, TokenData

DIAS_RETENCION_CANCELADAS = 7

HORARIOS_EXCLUSIVOS_MIEMBRO = {"2:30 PM", "7:00 PM"}

CR_TZ = timezone(timedelta(hours=-6))

router = APIRouter(prefix="/reservas", tags=["reservas"])
logger = logging.getLogger(__name__)

class ReservaCreate(BaseModel):
    nombre: str
    telefono: str
    email: str
    barbero: str
    servicio: str
    precio: str
    fecha: str
    hora: str
    adicionales: list[str] = []
    adicionales_precio: int = 0

class ReservaResponse(BaseModel):
    id: int
    nombre: str
    telefono: str
    email: str
    barbero: str
    servicio: str
    precio: str
    fecha: str
    hora: str
    estado: str
    metodo_pago: str | None = None
    adicionales: str | None = None
    adicionales_precio: int | None = None
    es_miembro_club: bool = False
    cancelada_en: datetime | None = None

    class Config:
        from_attributes = True


class BloqueoHorarioCreate(BaseModel):
    fecha: str
    hora: str
    barbero: str


# El plan guarda las claves de servicios en plural ("cortes", "barbas"),
# mientras que los consumos y servicios extra usan el singular ("corte", "barba").
_CLAVE_PLAN_POR_TIPO = {"corte": "cortes", "barba": "barbas", "mascarilla": "mascarilla"}


def _normalizar_telefono(telefono: str | None) -> str:
    """Normaliza un teléfono a solo dígitos para comparaciones robustas."""
    return re.sub(r"\D", "", telefono or "")


def _normalizar_barbero(barbero: str | None) -> str:
    """Normaliza el nombre del barbero (trim + minúsculas) para comparaciones robustas."""
    return (barbero or "").strip().lower()


def _servicio_a_tipo_membresia(servicio: str) -> str | None:
    """Mapea el servicio de la reserva al tipo de balance de membresía que consume."""
    if servicio in ("Corte de Cabello", "Corte y Barba"):
        return "corte"
    if servicio == "Marcado y/o Barba":
        return "barba"
    return None


def _saldo_servicio_membresia(miembro: ClubMiembro, tipo: str, db: Session) -> int:
    """Saldo disponible de un tipo de servicio (corte/barba) en el ciclo vigente."""
    base = 0
    plan = db.query(ClubPlan).filter(ClubPlan.id == miembro.plan_id).first()
    if plan and plan.servicios:
        try:
            data = json.loads(plan.servicios)
            base = int(data.get(_CLAVE_PLAN_POR_TIPO.get(tipo, tipo), 0))
        except (ValueError, TypeError):
            base = 0

    extras_q = db.query(ClubServicioExtra).filter(
        ClubServicioExtra.miembro_id == miembro.id,
        ClubServicioExtra.servicio == tipo,
    )
    consumos_q = db.query(ClubConsumo).filter(
        ClubConsumo.miembro_id == miembro.id,
        ClubConsumo.servicio == tipo,
        ClubConsumo.anulado == False,
    )
    if miembro.fecha_inicio is not None:
        extras_q = extras_q.filter(ClubServicioExtra.creado_en >= miembro.fecha_inicio)
        consumos_q = consumos_q.filter(ClubConsumo.fecha >= miembro.fecha_inicio)

    extra = extras_q.count()
    consumido = consumos_q.count()
    return base + extra - consumido


def _detectar_miembro_club(telefono: str, barbero: str, servicio: str, db: Session) -> bool:
    """Determina si el cliente tiene una membresía activa de Visionary Club con
    saldo disponible para el servicio solicitado."""
    hoy_cr = datetime.now(CR_TZ).replace(tzinfo=None)
    telefono_norm = _normalizar_telefono(telefono)
    barbero_norm = _normalizar_barbero(barbero)

    miembro_club = None
    for m in db.query(ClubMiembro).filter(ClubMiembro.estado == "activo").all():
        if (
            _normalizar_telefono(m.telefono) == telefono_norm
            and _normalizar_barbero(m.barbero) == barbero_norm
        ):
            miembro_club = m
            break

    tipo_membresia = _servicio_a_tipo_membresia(servicio)

    return (
        miembro_club is not None
        and tipo_membresia is not None
        and miembro_club.fecha_vencimiento is not None
        and miembro_club.fecha_vencimiento >= hoy_cr
        and _saldo_servicio_membresia(miembro_club, tipo_membresia, db) > 0
    )

@router.post("/", response_model=ReservaResponse)
def crear_reserva(reserva: ReservaCreate, db: Session = Depends(get_db)):
    reserva_existente = db.query(Reserva).filter(
        Reserva.fecha == reserva.fecha,
        Reserva.hora == reserva.hora,
        Reserva.barbero == reserva.barbero,
        Reserva.estado != "cancelada"
    ).first()
    
    if reserva_existente:
        raise HTTPException(
            status_code=400,
            detail="Ya existe una reserva para esa fecha y hora"
        )
    
    if reserva.barbero == "Alonso Lobo" and reserva.hora in HORARIOS_EXCLUSIVOS_MIEMBRO:
        miembro = (
            db.query(ClubMiembro)
            .filter(ClubMiembro.telefono == reserva.telefono.strip())
            .first()
        )
        activo = (
            miembro is not None
            and miembro.barbero == reserva.barbero
            and miembro.estado == "activo"
            and miembro.fecha_inicio is not None
            and miembro.qr_token is not None
            and (miembro.fecha_vencimiento is None or miembro.fecha_vencimiento >= datetime.now(CR_TZ).replace(tzinfo=None))
        )
        if not activo:
            raise HTTPException(
                status_code=403,
                detail="Este horario es exclusivo para miembros activos de Visionary Club",
            )
    
    # Determina si el cliente tiene una membresía activa de Visionary Club con este barbero
    # y si aún tiene saldo disponible para el servicio solicitado.
    es_miembro_club = _detectar_miembro_club(
        reserva.telefono, reserva.barbero, reserva.servicio, db
    )

    datos = reserva.model_dump()
    adicionales = datos.pop("adicionales", None) or []
    datos["adicionales"] = json.dumps(adicionales) if adicionales else None
    datos["es_miembro_club"] = es_miembro_club
    nueva_reserva = Reserva(**datos)
    db.add(nueva_reserva)
    db.commit()
    db.refresh(nueva_reserva)
    try:
        enviar_confirmacion_cliente(
            nombre=reserva.nombre,
            email=reserva.email,
            servicio=reserva.servicio,
            precio=reserva.precio,
            fecha=reserva.fecha,
            hora=reserva.hora,
            barbero=reserva.barbero,
            reserva_id=nueva_reserva.id,
            adicionales=adicionales,
            adicionales_precio=reserva.adicionales_precio or 0,
        )
    except Exception:
        logger.exception("Error enviando correos para reserva id=%s", nueva_reserva.id)

    return nueva_reserva

@router.get("/")
def obtener_reservas(
    barbero: str | None = Query(None),
    _: TokenData = Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    query = db.query(Reserva)
    if barbero:
        query = query.filter(Reserva.barbero == barbero)
    return query.all()

@router.get("/ocupados")
def obtener_horarios_ocupados(
    fecha: str,
    barbero: str = Query(...),
    db: Session = Depends(get_db),
):
    reservas = db.query(Reserva).filter(
        Reserva.fecha == fecha,
        Reserva.barbero == barbero,
        Reserva.estado != "cancelada"
    ).all()
    return [r.hora for r in reservas]


@router.post("/bloqueos", response_model=ReservaResponse)
def bloquear_horario(
    bloqueo: BloqueoHorarioCreate,
    db: Session = Depends(get_db),
    usuario: TokenData = Depends(get_usuario_actual),
):
    if usuario.rol != "admin" and usuario.barbero != bloqueo.barbero:
        raise HTTPException(status_code=403, detail="Solo puedes bloquear horarios de tu propio Barbero")
    reserva_existente = db.query(Reserva).filter(
        Reserva.fecha == bloqueo.fecha,
        Reserva.hora == bloqueo.hora,
        Reserva.barbero == bloqueo.barbero,
        Reserva.estado != "cancelada",
    ).first()

    if reserva_existente:
        raise HTTPException(
            status_code=400,
            detail="Ese horario ya está ocupado o bloqueado",
        )

    nuevo_bloqueo = Reserva(
        nombre="Horario bloqueado",
        telefono="-",
        email="admin@visionary.local",
        barbero=bloqueo.barbero,
        servicio="Horario bloqueado por admin",
        precio="₡0",
        fecha=bloqueo.fecha,
        hora=bloqueo.hora,
        estado="bloqueado",
        metodo_pago=None,
    )
    db.add(nuevo_bloqueo)
    db.commit()
    db.refresh(nuevo_bloqueo)
    return nuevo_bloqueo


@router.delete("/bloqueos")
def desbloquear_horario(
    fecha: str = Query(...),
    hora: str = Query(...),
    barbero: str = Query(...),
    db: Session = Depends(get_db),
    usuario: TokenData = Depends(get_usuario_actual),
):
    if usuario.rol != "admin" and usuario.barbero != barbero:
        raise HTTPException(status_code=403, detail="Solo puedes desbloquear horarios de tu propio Barbero")
    bloqueo = db.query(Reserva).filter(
        Reserva.fecha == fecha,
        Reserva.hora == hora,
        Reserva.barbero == barbero,
        Reserva.estado == "bloqueado",
    ).first()
    if not bloqueo:
        raise HTTPException(status_code=404, detail="Bloqueo no encontrado")
    db.delete(bloqueo)
    db.commit()
    return {"message": "Horario desbloqueado"}

@router.get("/{reserva_id}")
def obtener_reserva(reserva_id: int, db: Session = Depends(get_db)):
    reserva = db.query(Reserva).filter(Reserva.id == reserva_id).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return reserva

@router.get("/cancelar/{reserva_id}")
def cancelar_por_link(reserva_id: int, db: Session = Depends(get_db)):
    reserva = db.query(Reserva).filter(Reserva.id == reserva_id).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    if reserva.estado == "cancelada":
        return {"message": "La reserva ya fue cancelada"}
    reserva.estado = "cancelada"
    reserva.cancelada_en = datetime.utcnow()
    db.commit()
    return {"message": "Reserva cancelada exitosamente"}


    

from pydantic import BaseModel as PydanticBaseModel

class EstadoUpdate(BaseModel):
    estado: str
    metodo_pago: str = None

@router.patch("/{reserva_id}")
def actualizar_estado(reserva_id: int, body: EstadoUpdate, _: TokenData = Depends(get_usuario_actual), db: Session = Depends(get_db)):
    reserva = db.query(Reserva).filter(Reserva.id == reserva_id).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    reserva.estado = body.estado
    if body.metodo_pago:
        reserva.metodo_pago = body.metodo_pago
    db.commit()
    return {"message": "Estado actualizado"}


@router.delete("/{reserva_id}")
def cancelar_reserva(reserva_id: int, _: TokenData = Depends(get_usuario_actual), db: Session = Depends(get_db)):
    reserva = db.query(Reserva).filter(Reserva.id == reserva_id).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    reserva.estado = "cancelada"
    reserva.cancelada_en = datetime.utcnow()
    db.commit()
    return {"message": "Reserva cancelada"}

@router.patch("/restaurar/{reserva_id}", dependencies=[Depends(get_admin_actual)])
def restaurar_reserva(reserva_id: int, db: Session = Depends(get_db)):
    reserva = db.query(Reserva).filter(Reserva.id == reserva_id).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    if reserva.estado != "cancelada":
        raise HTTPException(status_code=400, detail="Solo se pueden restaurar reservas canceladas")
    reserva.estado = "pendiente"
    reserva.cancelada_en = None
    db.commit()
    return {"message": "Reserva restaurada"}


@router.delete("/eliminar/{reserva_id}")
def eliminar_reserva(reserva_id: int, db: Session = Depends(get_db), _: str = Depends(get_admin_actual)):
    reserva = db.query(Reserva).filter(Reserva.id == reserva_id).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    db.delete(reserva)
    db.commit()
    return {"message": "Reserva eliminada"}


@router.delete("/limpiar-canceladas-viejas", dependencies=[Depends(get_admin_actual)])
def limpiar_canceladas_viejas(db: Session = Depends(get_db)):
    """Elimina reservas canceladas hace más de DIAS_RETENCION_CANCELADAS días."""
    limite = datetime.utcnow() - timedelta(days=DIAS_RETENCION_CANCELADAS)
    eliminadas = (
        db.query(Reserva)
        .filter(Reserva.estado == "cancelada", Reserva.cancelada_en <= limite)
        .all()
    )
    for r in eliminadas:
        db.delete(r)
    db.commit()
    return {"eliminadas": len(eliminadas)}


@router.post("/backfill-membresia", dependencies=[Depends(get_admin_actual)])
def backfill_membresia(db: Session = Depends(get_db)):
    """Re-evalúa es_miembro_club en reservas pendientes que aún no están marcadas."""
    pendientes = (
        db.query(Reserva)
        .filter(
            Reserva.estado == "pendiente",
            Reserva.es_miembro_club == False,
        )
        .all()
    )
    actualizadas = 0
    sin_cambio = 0
    for reserva in pendientes:
        if _detectar_miembro_club(reserva.telefono, reserva.barbero, reserva.servicio, db):
            reserva.es_miembro_club = True
            actualizadas += 1
        else:
            sin_cambio += 1
    db.commit()
    return {"actualizadas": actualizadas, "sin_cambio": sin_cambio}