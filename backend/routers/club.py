import json
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.connection import get_db
from models.club import ClubConsumo, ClubGrupo, ClubMiembro, ClubPago, ClubPlan, ClubServicioExtra
from routers.auth import TokenData, get_usuario_actual

CR_TZ = timezone(timedelta(hours=-6))


def _ahora() -> datetime:
    """Hora local de Costa Rica (UTC-6, sin DST) como datetime naive.

    Se devuelve naive para poder comparar con las columnas DateTime de la BD,
    que también son naive. (Comparar aware contra naive lanzaría TypeError.)
    """
    return datetime.now(CR_TZ).replace(tzinfo=None)


router = APIRouter(prefix="/club", tags=["club"])

PROMO_MASCARILLA_LIMITE = 10
DIAS_VIGENCIA = 30
SERVICIOS_VALIDOS = {"corte", "barba", "mascarilla"}


class MiembroCreate(BaseModel):
    nombre: str
    telefono: str
    plan_id: int
    email: str | None = None
    barbero: str


class EstadoMiembroUpdate(BaseModel):
    estado: str


class PagoCreate(BaseModel):
    monto: int
    metodo: str
    referencia: str | None = None


class ConsumoCreate(BaseModel):
    servicio: str


class AnularConsumo(BaseModel):
    motivo: str | None = None
    consumo_id: int | None = None


class ServicioExtraCreate(BaseModel):
    servicio: str
    monto: int = 0
    pagado: bool = False
    metodo: str | None = None
    nota: str | None = None


class PlanUpdate(BaseModel):
    precio: int | None = None
    cortes: int | None = None
    barbas: int | None = None


class MiembroGrupo(BaseModel):
    nombre: str
    telefono: str


class GrupoCreate(BaseModel):
    nombre_grupo: str
    miembros: list[MiembroGrupo]
    metodo: str
    monto: int | None = None
    referencia: str | None = None
    barbero: str


def _admin_only(usuario: TokenData) -> None:
    if usuario.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo Lobo puede gestionar los planes del club")


def _staff_only(usuario: TokenData) -> None:
    if usuario.rol not in ("admin", "barber"):
        raise HTTPException(status_code=403, detail="No autorizado para gestionar Visionary Club")


def _verificar_barbero_miembro(miembro: ClubMiembro, usuario: TokenData) -> None:
    """Lobo (admin) tiene acceso total; un barbero solo puede gestionar sus propios miembros."""
    if usuario.rol == "admin":
        return
    if miembro.barbero != usuario.barbero:
        raise HTTPException(status_code=403, detail="No autorizado")


def _servicios_plan(plan: ClubPlan) -> dict:
    if not plan or not plan.servicios:
        return {"cortes": 0, "barbas": 0, "mascarilla": False}
    try:
        data = json.loads(plan.servicios)
        return {
            "cortes": int(data.get("cortes", 0)),
            "barbas": int(data.get("barbas", 0)),
            "mascarilla": bool(data.get("mascarilla", False)),
        }
    except (ValueError, TypeError):
        return {"cortes": 0, "barbas": 0, "mascarilla": False}


def _servicios_extra_vigentes(miembro: ClubMiembro, db: Session):
    """Servicios extra del ciclo vigente (desde fecha_inicio, si existe)."""
    query = db.query(ClubServicioExtra).filter(ClubServicioExtra.miembro_id == miembro.id)
    if miembro.fecha_inicio is not None:
        query = query.filter(ClubServicioExtra.creado_en >= miembro.fecha_inicio)
    return query.order_by(ClubServicioExtra.creado_en.desc()).all()


def _servicio_extra_serialize(extra: ClubServicioExtra) -> dict:
    return {
        "id": extra.id,
        "servicio": extra.servicio,
        "monto": extra.monto,
        "pagado": extra.pagado,
        "metodo": extra.metodo,
        "nota": extra.nota,
        "creado_en": extra.creado_en.isoformat() if extra.creado_en else None,
    }


def _estado_efectivo(miembro: ClubMiembro) -> str:
    if miembro.estado == "suspendido":
        return "suspendido"
    if not miembro.fecha_inicio or not miembro.qr_token:
        return "pendiente"
    if miembro.fecha_vencimiento and miembro.fecha_vencimiento < _ahora():
        return "vencido"
    return "activo"


def _balance(miembro: ClubMiembro, db: Session) -> dict:
    plan = db.query(ClubPlan).filter(ClubPlan.id == miembro.plan_id).first()
    servicios = _servicios_plan(plan)
    mascarilla = 1 if miembro.mascarilla_promo else 0
    if miembro.fecha_inicio is None:
        return {"cortes": 0, "barbas": 0, "mascarilla": mascarilla}
    # Solo cuentan los consumos del ciclo vigente (desde fecha_inicio),
    # para que al renovar la membresía el balance se reinicie.
    consumos = (
        db.query(ClubConsumo)
        .filter(
            ClubConsumo.miembro_id == miembro.id,
            ClubConsumo.anulado == False,
            ClubConsumo.fecha >= miembro.fecha_inicio,
        )
        .all()
    )
    extras = _servicios_extra_vigentes(miembro, db)
    cortes_usados = sum(1 for c in consumos if c.servicio == "corte")
    barbas_usados = sum(1 for c in consumos if c.servicio == "barba")
    mascarilla_usados = sum(1 for c in consumos if c.servicio == "mascarilla")
    extra_cortes = sum(1 for e in extras if e.servicio == "corte")
    extra_barbas = sum(1 for e in extras if e.servicio == "barba")
    extra_mascarilla = sum(1 for e in extras if e.servicio == "mascarilla")
    return {
        "cortes": max(servicios["cortes"] + extra_cortes - cortes_usados, 0),
        "barbas": max(servicios["barbas"] + extra_barbas - barbas_usados, 0),
        "mascarilla": max(mascarilla + extra_mascarilla - mascarilla_usados, 0),
    }


def _member_response(miembro: ClubMiembro, db: Session) -> dict:
    plan = db.query(ClubPlan).filter(ClubPlan.id == miembro.plan_id).first()
    return {
        "id": miembro.id,
        "nombre": miembro.nombre,
        "telefono": miembro.telefono,
        "email": miembro.email,
        "barbero": miembro.barbero,
        "plan_id": miembro.plan_id,
        "plan_nombre": plan.nombre if plan else None,
        "plan_precio": plan.precio if plan else None,
        "plan_servicios": _servicios_plan(plan),
        "estado": _estado_efectivo(miembro),
        "fecha_inicio": miembro.fecha_inicio.isoformat() if miembro.fecha_inicio else None,
        "fecha_vencimiento": miembro.fecha_vencimiento.isoformat() if miembro.fecha_vencimiento else None,
        "qr_token": miembro.qr_token,
        "mascarilla_promo": miembro.mascarilla_promo,
        "grupo_id": miembro.grupo_id,
        "balance": _balance(miembro, db),
    }


def _detalle_miembro_response(miembro: ClubMiembro, db: Session) -> dict:
    resp = _member_response(miembro, db)
    resp["pagos"] = [
        {
            "id": p.id,
            "monto": p.monto,
            "metodo": p.metodo,
            "referencia": p.referencia,
            "fecha": p.fecha.isoformat() if p.fecha else None,
            "registrado_por": p.registrado_por,
        }
        for p in db.query(ClubPago)
        .filter(ClubPago.miembro_id == miembro.id)
        .order_by(ClubPago.fecha.desc())
        .all()
    ]
    resp["consumos"] = [
        {
            "id": c.id,
            "servicio": c.servicio,
            "fecha": c.fecha.isoformat() if c.fecha else None,
            "registrado_por": c.registrado_por,
            "anulado": c.anulado,
            "motivo_anulacion": c.motivo_anulacion,
        }
        for c in db.query(ClubConsumo)
        .filter(ClubConsumo.miembro_id == miembro.id)
        .order_by(ClubConsumo.fecha.desc())
        .all()
    ]
    resp["servicios_extra"] = [
        _servicio_extra_serialize(e) for e in _servicios_extra_vigentes(miembro, db)
    ]
    return resp


def _generar_qr_token(db: Session) -> str:
    token = secrets.token_urlsafe(16)
    while db.query(ClubMiembro).filter(ClubMiembro.qr_token == token).first():
        token = secrets.token_urlsafe(16)
    return token


def _activar_miembro(miembro: ClubMiembro, db: Session, usuario: TokenData) -> None:
    ahora = _ahora()
    # Renovación temprana (aún activa): extiende los días restantes.
    # En cualquier caso, cada pago inicia un nuevo ciclo con balance completo.
    if miembro.fecha_vencimiento and miembro.fecha_vencimiento > ahora:
        miembro.fecha_vencimiento = miembro.fecha_vencimiento + timedelta(days=DIAS_VIGENCIA)
    else:
        miembro.fecha_vencimiento = ahora + timedelta(days=DIAS_VIGENCIA)
    miembro.fecha_inicio = ahora

    if not miembro.qr_token:
        miembro.qr_token = _generar_qr_token(db)

    miembro.estado = "activo"
    miembro.activado_por = usuario.username
    miembro.activado_en = ahora
    miembro.recordatorio_vencimiento_enviado = False

    if not miembro.mascarilla_promo:
        promo_count = (
            db.query(ClubMiembro)
            .filter(
                ClubMiembro.plan_id == miembro.plan_id,
                ClubMiembro.barbero == miembro.barbero,
                ClubMiembro.mascarilla_promo == True,
            )
            .count()
        )
        if promo_count < PROMO_MASCARILLA_LIMITE:
            miembro.mascarilla_promo = True


# ---------------------------------------------------------------- Planes

@router.get("/planes")
def listar_planes(
    barbero: str | None = Query(None),
    _: TokenData = Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    planes = db.query(ClubPlan).order_by(ClubPlan.id).all()
    resultado = []
    for plan in planes:
        activos_query = db.query(ClubMiembro).filter(
            ClubMiembro.plan_id == plan.id, ClubMiembro.estado == "activo"
        )
        promo_query = db.query(ClubMiembro).filter(
            ClubMiembro.plan_id == plan.id, ClubMiembro.mascarilla_promo == True
        )
        if barbero:
            activos_query = activos_query.filter(ClubMiembro.barbero == barbero)
            promo_query = promo_query.filter(ClubMiembro.barbero == barbero)
        activos = activos_query.count()
        promo_otorgadas = promo_query.count()
        resultado.append(
            {
                "id": plan.id,
                "nombre": plan.nombre,
                "precio": plan.precio,
                "activo": plan.activo,
                "servicios": _servicios_plan(plan),
                "cupo_max": plan.cupo_max,
                "miembros_activos": activos,
                "promo_restantes": max(PROMO_MASCARILLA_LIMITE - promo_otorgadas, 0),
                "creado_en": plan.creado_en.isoformat() if plan.creado_en else None,
            }
        )
    return resultado


@router.patch("/planes/{plan_id}")
def alternar_plan(
    plan_id: int,
    usuario: TokenData = Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    _admin_only(usuario)
    plan = db.query(ClubPlan).filter(ClubPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")
    plan.activo = not plan.activo
    db.commit()
    return {
        "id": plan.id,
        "nombre": plan.nombre,
        "activo": plan.activo,
        "miembros_activos": db.query(ClubMiembro)
        .filter(ClubMiembro.plan_id == plan.id, ClubMiembro.estado == "activo")
        .count(),
    }


@router.put("/planes/{plan_id}")
def editar_plan(
    plan_id: int,
    datos: PlanUpdate,
    usuario: TokenData = Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    _admin_only(usuario)
    plan = db.query(ClubPlan).filter(ClubPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")

    servicios = _servicios_plan(plan)
    if datos.precio is not None and datos.precio > 0:
        plan.precio = datos.precio
    if datos.cortes is not None and datos.cortes >= 0:
        servicios["cortes"] = datos.cortes
    if datos.barbas is not None and datos.barbas >= 0:
        servicios["barbas"] = datos.barbas
    plan.servicios = json.dumps(servicios)
    db.commit()

    return {
        "id": plan.id,
        "nombre": plan.nombre,
        "precio": plan.precio,
        "activo": plan.activo,
        "servicios": servicios,
        "cupo_max": plan.cupo_max,
        "miembros_activos": db.query(ClubMiembro)
        .filter(ClubMiembro.plan_id == plan.id, ClubMiembro.estado == "activo")
        .count(),
    }


# ---------------------------------------------------------------- Miembros

@router.post("/miembros")
def crear_miembro(
    datos: MiembroCreate,
    usuario: TokenData = Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    _staff_only(usuario)
    plan = db.query(ClubPlan).filter(ClubPlan.id == datos.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")

    barbero = datos.barbero.strip()
    if barbero not in ("Alonso Lobo", "Ian Bustos Navarrete"):
        raise HTTPException(status_code=400, detail="Barbero inválido")

    telefono = datos.telefono.strip()
    existente = db.query(ClubMiembro).filter(ClubMiembro.telefono == telefono).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe un miembro con ese teléfono")

    miembro = ClubMiembro(
        nombre=datos.nombre.strip(),
        telefono=telefono,
        plan_id=datos.plan_id,
        estado="pendiente",
        email=(datos.email.strip() if datos.email else None),
        barbero=barbero,
    )
    db.add(miembro)
    db.commit()
    db.refresh(miembro)
    return _member_response(miembro, db)


@router.patch("/miembros/{miembro_id}/estado")
def cambiar_estado_miembro(
    miembro_id: int,
    datos: EstadoMiembroUpdate,
    usuario: TokenData = Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    _staff_only(usuario)
    if datos.estado not in {"suspendido", "activo"}:
        raise HTTPException(status_code=400, detail="Estado inválido")
    miembro = db.query(ClubMiembro).filter(ClubMiembro.id == miembro_id).first()
    if not miembro:
        raise HTTPException(status_code=404, detail="Miembro no encontrado")
    _verificar_barbero_miembro(miembro, usuario)
    miembro.estado = datos.estado
    db.commit()
    db.refresh(miembro)
    return _member_response(miembro, db)


@router.post("/miembros/{miembro_id}/regenerar-qr")
def regenerar_qr(
    miembro_id: int,
    usuario: TokenData = Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    _staff_only(usuario)
    miembro = db.query(ClubMiembro).filter(ClubMiembro.id == miembro_id).first()
    if not miembro:
        raise HTTPException(status_code=404, detail="Miembro no encontrado")
    _verificar_barbero_miembro(miembro, usuario)
    miembro.qr_token = _generar_qr_token(db)
    db.commit()
    db.refresh(miembro)
    return _member_response(miembro, db)


@router.get("/miembros")
def listar_miembros(
    estado: str | None = Query(None),
    barbero: str | None = Query(None),
    usuario: TokenData = Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    _staff_only(usuario)
    query = db.query(ClubMiembro).order_by(ClubMiembro.creado_en.desc())
    if barbero:
        query = query.filter(ClubMiembro.barbero == barbero)
    if estado and estado != "todas":
        if estado == "activo":
            query = query.filter(ClubMiembro.estado == "activo")
        elif estado == "pendiente":
            query = query.filter(ClubMiembro.estado == "pendiente")
        elif estado == "vencido":
            query = query.filter(ClubMiembro.estado == "activo")
    miembros = query.all()
    resultado = []
    for m in miembros:
        resp = _member_response(m, db)
        if estado and estado != "todas" and resp["estado"] != estado:
            continue
        resultado.append(resp)
    return resultado


@router.get("/miembros/{miembro_id}")
def detalle_miembro(
    miembro_id: int,
    usuario: TokenData = Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    _staff_only(usuario)
    miembro = db.query(ClubMiembro).filter(ClubMiembro.id == miembro_id).first()
    if not miembro:
        raise HTTPException(status_code=404, detail="Miembro no encontrado")
    _verificar_barbero_miembro(miembro, usuario)
    return _detalle_miembro_response(miembro, db)


@router.post("/miembros/{miembro_id}/pago")
def registrar_pago(
    miembro_id: int,
    datos: PagoCreate,
    usuario: TokenData = Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    _staff_only(usuario)
    miembro = db.query(ClubMiembro).filter(ClubMiembro.id == miembro_id).first()
    if not miembro:
        raise HTTPException(status_code=404, detail="Miembro no encontrado")
    _verificar_barbero_miembro(miembro, usuario)

    plan = db.query(ClubPlan).filter(ClubPlan.id == miembro.plan_id).first()
    if not plan or not plan.activo:
        raise HTTPException(status_code=400, detail="El plan de este miembro no está activo")

    if datos.metodo not in {"sinpe", "efectivo"}:
        raise HTTPException(status_code=400, detail="Método de pago inválido")
    if datos.monto <= 0:
        raise HTTPException(status_code=400, detail="Monto inválido")

    # Cupo máximo: solo se valida en la primera activación (no en renovaciones).
    if plan.cupo_max is not None and miembro.estado != "activo":
        activos = (
            db.query(ClubMiembro)
            .filter(ClubMiembro.plan_id == plan.id, ClubMiembro.estado == "activo")
            .count()
        )
        if activos >= plan.cupo_max:
            raise HTTPException(
                status_code=400,
                detail=f"El plan {plan.nombre} alcanzó su cupo máximo de {plan.cupo_max} miembros",
            )

    _activar_miembro(miembro, db, usuario)

    pago = ClubPago(
        miembro_id=miembro.id,
        monto=datos.monto,
        metodo=datos.metodo,
        referencia=datos.referencia,
        registrado_por=usuario.username,
    )
    db.add(pago)
    db.commit()
    db.refresh(miembro)
    return _member_response(miembro, db)


@router.post("/miembros/{miembro_id}/consumo")
def registrar_consumo(
    miembro_id: int,
    datos: ConsumoCreate,
    usuario: TokenData = Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    _staff_only(usuario)
    servicio = datos.servicio.strip().lower()
    if servicio not in SERVICIOS_VALIDOS:
        raise HTTPException(status_code=400, detail="Servicio inválido")

    miembro = db.query(ClubMiembro).filter(ClubMiembro.id == miembro_id).first()
    if not miembro:
        raise HTTPException(status_code=404, detail="Miembro no encontrado")
    _verificar_barbero_miembro(miembro, usuario)

    estado = _estado_efectivo(miembro)
    if estado != "activo":
        raise HTTPException(
            status_code=400,
            detail="La membresía no está activa"
            if estado == "pendiente"
            else "La membresía está vencida o suspendida",
        )

    balance = _balance(miembro, db)

    if servicio == "corte" and balance["cortes"] <= 0:
        raise HTTPException(status_code=400, detail="No hay cortes disponibles en el balance")
    if servicio == "barba" and balance["barbas"] <= 0:
        raise HTTPException(status_code=400, detail="No hay barbas disponibles en el balance")
    if servicio == "mascarilla" and balance["mascarilla"] <= 0:
        raise HTTPException(status_code=400, detail="No hay mascarilla promocional disponible")

    ultimo = (
        db.query(ClubConsumo)
        .filter(
            ClubConsumo.miembro_id == miembro.id,
            ClubConsumo.servicio == servicio,
            ClubConsumo.anulado == False,
        )
        .order_by(ClubConsumo.fecha.desc())
        .first()
    )
    if ultimo and (_ahora() - ultimo.fecha).total_seconds() < 60:
        raise HTTPException(status_code=400, detail="Este servicio ya se registró hace menos de un minuto")

    consumo = ClubConsumo(
        miembro_id=miembro.id,
        servicio=servicio,
        registrado_por=usuario.username,
    )
    db.add(consumo)

    if servicio == "mascarilla":
        miembro.mascarilla_promo = False

    db.commit()
    db.refresh(miembro)
    return _member_response(miembro, db)


@router.post("/miembros/{miembro_id}/anular-consumo")
def anular_consumo(
    miembro_id: int,
    datos: AnularConsumo,
    usuario: TokenData = Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    _staff_only(usuario)
    miembro = db.query(ClubMiembro).filter(ClubMiembro.id == miembro_id).first()
    if not miembro:
        raise HTTPException(status_code=404, detail="Miembro no encontrado")
    _verificar_barbero_miembro(miembro, usuario)

    consumo = None
    if datos.consumo_id is not None:
        consumo = (
            db.query(ClubConsumo)
            .filter(
                ClubConsumo.id == datos.consumo_id,
                ClubConsumo.miembro_id == miembro.id,
                ClubConsumo.anulado == False,
            )
            .first()
        )
    if consumo is None:
        consumo = (
            db.query(ClubConsumo)
            .filter(ClubConsumo.miembro_id == miembro.id, ClubConsumo.anulado == False)
            .order_by(ClubConsumo.fecha.desc())
            .first()
        )
    if not consumo:
        raise HTTPException(status_code=404, detail="No hay consumos recientes para anular")

    consumo.anulado = True
    consumo.motivo_anulacion = datos.motivo
    if consumo.servicio == "mascarilla":
        miembro.mascarilla_promo = True

    db.commit()
    db.refresh(miembro)
    return _member_response(miembro, db)


@router.post("/miembros/{miembro_id}/servicios-extra")
def agregar_servicio_extra(
    miembro_id: int,
    datos: ServicioExtraCreate,
    usuario: TokenData = Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    _admin_only(usuario)
    servicio = datos.servicio.strip().lower()
    if servicio not in SERVICIOS_VALIDOS:
        raise HTTPException(status_code=400, detail="Servicio inválido")
    if datos.monto < 0:
        raise HTTPException(status_code=400, detail="Monto inválido")
    if datos.pagado and datos.monto <= 0:
        raise HTTPException(status_code=400, detail="Un servicio pagado debe tener un monto mayor a 0")
    if datos.pagado and datos.metodo not in {"sinpe", "efectivo"}:
        raise HTTPException(status_code=400, detail="Método de pago inválido")

    miembro = db.query(ClubMiembro).filter(ClubMiembro.id == miembro_id).first()
    if not miembro:
        raise HTTPException(status_code=404, detail="Miembro no encontrado")
    _verificar_barbero_miembro(miembro, usuario)

    extra = ClubServicioExtra(
        miembro_id=miembro.id,
        servicio=servicio,
        monto=datos.monto,
        pagado=datos.pagado,
        metodo=(datos.metodo if datos.pagado else None),
        nota=datos.nota.strip() if datos.nota else None,
        creado_por=usuario.username,
    )
    db.add(extra)
    db.flush()

    if datos.pagado:
        db.add(
            ClubPago(
                miembro_id=miembro.id,
                monto=datos.monto,
                metodo=datos.metodo,
                referencia=f"servicio-extra:{extra.id}",
                registrado_por=usuario.username,
            )
        )

    db.commit()
    db.refresh(miembro)
    return _detalle_miembro_response(miembro, db)


@router.delete("/miembros/{miembro_id}/servicios-extra/{extra_id}")
def eliminar_servicio_extra(
    miembro_id: int,
    extra_id: int,
    usuario: TokenData = Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    _admin_only(usuario)
    miembro = db.query(ClubMiembro).filter(ClubMiembro.id == miembro_id).first()
    if not miembro:
        raise HTTPException(status_code=404, detail="Miembro no encontrado")
    _verificar_barbero_miembro(miembro, usuario)

    extra = (
        db.query(ClubServicioExtra)
        .filter(
            ClubServicioExtra.id == extra_id,
            ClubServicioExtra.miembro_id == miembro.id,
        )
        .first()
    )
    if not extra:
        raise HTTPException(status_code=404, detail="Servicio extra no encontrado")

    # Si tenía un pago asociado, también lo elimina.
    pago = (
        db.query(ClubPago)
        .filter(
            ClubPago.miembro_id == miembro.id,
            ClubPago.referencia == f"servicio-extra:{extra.id}",
        )
        .first()
    )
    if pago:
        db.delete(pago)

    db.delete(extra)
    db.commit()
    db.refresh(miembro)
    return _detalle_miembro_response(miembro, db)


# ---------------------------------------------------------------- Grupos

@router.post("/grupos")
def crear_grupo(
    datos: GrupoCreate,
    usuario: TokenData = Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    _staff_only(usuario)
    plan = (
        db.query(ClubPlan)
        .filter(ClubPlan.nombre == "Visionary Friends 5")
        .first()
    )
    if not plan:
        raise HTTPException(status_code=404, detail="El plan Visionary Friends 5 no existe")

    if len(datos.miembros) != 5:
        raise HTTPException(status_code=400, detail="El grupo debe tener exactamente 5 miembros")

    telefonos = [m.telefono.strip() for m in datos.miembros]
    if len(set(telefonos)) != 5:
        raise HTTPException(status_code=400, detail="Los teléfonos de los miembros deben ser únicos")

    for telefono in telefonos:
        if db.query(ClubMiembro).filter(ClubMiembro.telefono == telefono).first():
            raise HTTPException(status_code=400, detail=f"El teléfono {telefono} ya está registrado")

    if datos.metodo not in {"sinpe", "efectivo"}:
        raise HTTPException(status_code=400, detail="Método de pago inválido")

    barbero = datos.barbero.strip()
    if barbero not in ("Alonso Lobo", "Ian Bustos Navarrete"):
        raise HTTPException(status_code=400, detail="Barbero inválido")

    monto = datos.monto if datos.monto else plan.precio
    if monto <= 0:
        raise HTTPException(status_code=400, detail="Monto inválido")

    grupo = ClubGrupo(
        nombre_grupo=datos.nombre_grupo.strip(),
        plan_id=plan.id,
        pago_total=monto,
        fecha_pago=_ahora(),
        activo=True,
        barbero=barbero,
    )
    db.add(grupo)
    db.flush()

    miembros = []
    for m in datos.miembros:
        miembro = ClubMiembro(
            nombre=m.nombre.strip(),
            telefono=m.telefono.strip(),
            plan_id=plan.id,
            estado="activo",
            fecha_inicio=_ahora(),
            fecha_vencimiento=_ahora() + timedelta(days=DIAS_VIGENCIA),
            qr_token=_generar_qr_token(db),
            grupo_id=grupo.id,
            activado_por=usuario.username,
            barbero=barbero,
            activado_en=_ahora(),
        )
        promo_count = (
            db.query(ClubMiembro)
            .filter(
                ClubMiembro.plan_id == plan.id,
                ClubMiembro.barbero == barbero,
                ClubMiembro.mascarilla_promo == True,
            )
            .count()
        )
        if promo_count < PROMO_MASCARILLA_LIMITE:
            miembro.mascarilla_promo = True
        db.add(miembro)
        miembros.append(miembro)

    db.commit()
    return {
        "id": grupo.id,
        "nombre_grupo": grupo.nombre_grupo,
        "pago_total": grupo.pago_total,
        "fecha_pago": grupo.fecha_pago.isoformat(),
        "activo": grupo.activo,
        "miembros": [_member_response(m, db) for m in miembros],
    }


@router.get("/grupos")
def listar_grupos(
    barbero: str | None = Query(None),
    usuario: TokenData = Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    _staff_only(usuario)
    query = db.query(ClubGrupo).order_by(ClubGrupo.fecha_pago.desc())
    if barbero:
        query = query.filter(ClubGrupo.barbero == barbero)
    grupos = query.all()
    resultado = []
    for grupo in grupos:
        plan = db.query(ClubPlan).filter(ClubPlan.id == grupo.plan_id).first()
        miembros = db.query(ClubMiembro).filter(ClubMiembro.grupo_id == grupo.id).all()
        resultado.append(
            {
                "id": grupo.id,
                "nombre_grupo": grupo.nombre_grupo,
                "plan_nombre": plan.nombre if plan else None,
                "pago_total": grupo.pago_total,
                "fecha_pago": grupo.fecha_pago.isoformat() if grupo.fecha_pago else None,
                "activo": grupo.activo,
                "miembros": [_member_response(m, db) for m in miembros],
            }
        )
    return resultado


class GrupoEstadoUpdate(BaseModel):
    activo: bool


@router.patch("/grupos/{grupo_id}/estado")
def cambiar_estado_grupo(
    grupo_id: int,
    datos: GrupoEstadoUpdate,
    usuario: TokenData = Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    _staff_only(usuario)
    grupo = db.query(ClubGrupo).filter(ClubGrupo.id == grupo_id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")

    grupo.activo = datos.activo
    miembros = db.query(ClubMiembro).filter(ClubMiembro.grupo_id == grupo.id).all()
    for m in miembros:
        m.estado = "activo" if datos.activo else "suspendido"
    db.commit()
    return {"id": grupo.id, "nombre_grupo": grupo.nombre_grupo, "activo": grupo.activo}


# ---------------------------------------------------------------- Stats

@router.get("/stats")
def stats_club(
    barbero: str | None = Query(None),
    usuario: TokenData = Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    _staff_only(usuario)
    ahora = _ahora()
    inicio_mes = datetime(ahora.year, ahora.month, 1)
    limite_7_dias = ahora + timedelta(days=7)

    def _miembros():
        q = db.query(ClubMiembro)
        if barbero:
            q = q.filter(ClubMiembro.barbero == barbero)
        return q

    def _pagos():
        q = db.query(ClubPago)
        if barbero:
            q = q.join(ClubMiembro, ClubPago.miembro_id == ClubMiembro.id).filter(ClubMiembro.barbero == barbero)
        return q

    def _consumos():
        q = db.query(ClubConsumo)
        if barbero:
            q = q.join(ClubMiembro, ClubConsumo.miembro_id == ClubMiembro.id).filter(ClubMiembro.barbero == barbero)
        return q

    activos = _miembros().filter(ClubMiembro.estado == "activo").count()
    pagos_mes = _pagos().filter(ClubPago.fecha >= inicio_mes).all()

    grupos_mes = db.query(ClubGrupo).filter(ClubGrupo.fecha_pago >= inicio_mes).all()
    if barbero:
        grupos_mes = (
            db.query(ClubGrupo)
            .join(ClubMiembro, ClubGrupo.id == ClubMiembro.grupo_id)
            .filter(ClubGrupo.fecha_pago >= inicio_mes, ClubMiembro.barbero == barbero)
            .distinct()
            .all()
        )

    total_pagos_mes = sum(p.monto for p in pagos_mes) + sum(g.pago_total for g in grupos_mes)
    cantidad_pagos_mes = len(pagos_mes) + len(grupos_mes)
    consumos_mes = _consumos().filter(ClubConsumo.fecha >= inicio_mes, ClubConsumo.anulado == False).count()
    por_vencer = (
        _miembros()
        .filter(
            ClubMiembro.estado == "activo",
            ClubMiembro.fecha_vencimiento != None,
            ClubMiembro.fecha_vencimiento <= limite_7_dias,
            ClubMiembro.fecha_vencimiento >= ahora,
        )
        .all()
    )
    return {
        "miembros_activos": activos,
        "pagos_mes_total": total_pagos_mes,
        "pagos_mes_cantidad": cantidad_pagos_mes,
        "servicios_mes": consumos_mes,
        "por_vencer": [_member_response(m, db) for m in por_vencer],
    }


@router.get("/pagos")
def listar_pagos_club(
    barbero: str | None = Query(None),
    usuario: TokenData = Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    _staff_only(usuario)
    query = db.query(ClubPago)
    if barbero:
        query = query.join(ClubMiembro, ClubPago.miembro_id == ClubMiembro.id).filter(ClubMiembro.barbero == barbero)
    pagos = query.order_by(ClubPago.fecha.desc()).all()

    resultado = []
    for p in pagos:
        miembro = db.query(ClubMiembro).filter(ClubMiembro.id == p.miembro_id).first()
        resultado.append(
            {
                "id": p.id,
                "miembro_id": p.miembro_id,
                "barbero": miembro.barbero if miembro else None,
                "monto": p.monto,
                "metodo": p.metodo,
                "fecha": p.fecha.isoformat() if p.fecha else None,
                "referencia": p.referencia,
            }
        )
    return resultado


# ---------------------------------------------------------------- Público

@router.get("/planes/publico")
def planes_publicos(db: Session = Depends(get_db)):
    """Planes activos disponibles para el público (sin datos administrativos)."""
    planes = (
        db.query(ClubPlan)
        .filter(ClubPlan.activo == True)
        .order_by(ClubPlan.id)
        .all()
    )
    return [
        {
            "id": plan.id,
            "nombre": plan.nombre,
            "precio": plan.precio,
            "servicios": _servicios_plan(plan),
        }
        for plan in planes
    ]


@router.get("/tarjeta/{telefono}")
def tarjeta_miembro(telefono: str, db: Session = Depends(get_db)):
    miembro = db.query(ClubMiembro).filter(ClubMiembro.telefono == telefono.strip()).first()
    if not miembro:
        raise HTTPException(status_code=404, detail="No encontramos una membresía para ese teléfono")
    resp = _member_response(miembro, db)
    resp["pagos"] = [
        {
            "monto": p.monto,
            "metodo": p.metodo,
            "fecha": p.fecha.isoformat() if p.fecha else None,
        }
        for p in db.query(ClubPago)
        .filter(ClubPago.miembro_id == miembro.id)
        .order_by(ClubPago.fecha.desc())
        .all()
    ]
    resp["servicios_extra"] = [
        _servicio_extra_serialize(e) for e in _servicios_extra_vigentes(miembro, db)
    ]
    return resp


@router.get("/qr/{qr_token}")
def miembro_por_qr(
    qr_token: str,
    usuario: TokenData = Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    miembro = db.query(ClubMiembro).filter(ClubMiembro.qr_token == qr_token.strip()).first()
    if not miembro:
        raise HTTPException(status_code=404, detail="QR inválido")
    _verificar_barbero_miembro(miembro, usuario)
    estado = _estado_efectivo(miembro)
    resp = _member_response(miembro, db)
    if estado == "suspendido":
        resp["error"] = "La membresía está suspendida"
    elif estado == "vencido":
        resp["error"] = "La membresía está vencida"
    return resp
