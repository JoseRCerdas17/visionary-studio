import logging

from fastapi import APIRouter, Depends, HTTPException
from emails import enviar_confirmacion_cliente
from sqlalchemy.orm import Session
from database.connection import get_db
from models.reserva import Reserva
from pydantic import BaseModel

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

    class Config:
        from_attributes = True

@router.post("/", response_model=ReservaResponse)
def crear_reserva(reserva: ReservaCreate, db: Session = Depends(get_db)):
    # Verificar si ya existe una reserva en esa fecha y hora
    reserva_existente = db.query(Reserva).filter(
        Reserva.fecha == reserva.fecha,
        Reserva.hora == reserva.hora,
        Reserva.estado != "cancelada"
    ).first()
    
    if reserva_existente:
        raise HTTPException(
            status_code=400,
            detail="Ya existe una reserva para esa fecha y hora"
        )
    
    nueva_reserva = Reserva(**reserva.model_dump())
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
    reserva_id=nueva_reserva.id

)
    except Exception:
        logger.exception("Error enviando correos para reserva id=%s", nueva_reserva.id)

    return nueva_reserva

@router.get("/")
def obtener_reservas(db: Session = Depends(get_db)):
    return db.query(Reserva).all()

@router.get("/ocupados")
def obtener_horarios_ocupados(fecha: str, db: Session = Depends(get_db)):
    reservas = db.query(Reserva).filter(
        Reserva.fecha == fecha,
        Reserva.estado != "cancelada"
    ).all()
    return [r.hora for r in reservas]

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
    db.commit()
    return {"message": "Reserva cancelada exitosamente"}


    

from pydantic import BaseModel as PydanticBaseModel

class EstadoUpdate(BaseModel):
    estado: str
    metodo_pago: str = None

@router.patch("/{reserva_id}")
def actualizar_estado(reserva_id: int, body: EstadoUpdate, db: Session = Depends(get_db)):
    reserva = db.query(Reserva).filter(Reserva.id == reserva_id).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    reserva.estado = body.estado
    if body.metodo_pago:
        reserva.metodo_pago = body.metodo_pago
    db.commit()
    return {"message": "Estado actualizado"}


@router.delete("/{reserva_id}")
def cancelar_reserva(reserva_id: int, db: Session = Depends(get_db)):
    reserva = db.query(Reserva).filter(Reserva.id == reserva_id).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    reserva.estado = "cancelada"
    db.commit()
    return {"message": "Reserva cancelada"}