import os
from uuid import uuid4
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth.security import ALGORITHM, SECRET_KEY
from database.connection import get_db
from models.stamp_card import StampCard, StampToken


router = APIRouter(prefix="/stamps", tags=["stamps"])
TOKEN_MINUTES = 5
BARBEROS_VALIDOS = {"Lobo", "Ian"}


class StampRedeem(BaseModel):
    nombre: str = ""
    telefono: str


class StampCardResponse(BaseModel):
    id: int
    cliente_nombre: str
    cliente_telefono: str
    barbero: str
    barbero_inicial: str
    total_cortes: int
    descuento_porcentaje: int
    descuento_texto: str


def _discount_for(total_cortes: int) -> tuple[int, str]:
    if total_cortes == 10:
        return 100, "¡Corte gratis!"
    if total_cortes == 5:
        return 50, "50% de descuento"
    return 0, "Precio normal"


def _serialize_card(card: StampCard) -> StampCardResponse:
    descuento, texto = _discount_for(card.total_cortes)
    return StampCardResponse(
        id=card.id,
        cliente_nombre=card.cliente_nombre,
        cliente_telefono=card.cliente_telefono,
        barbero=card.barbero,
        barbero_inicial=card.barbero[:1].upper() if card.barbero else "",
        total_cortes=card.total_cortes,
        descuento_porcentaje=descuento,
        descuento_texto=texto,
    )


@router.get("/qr")
def generar_qr(barbero: str = Query(..., description="Lobo o Ian"), db: Session = Depends(get_db)):
    if barbero not in BARBEROS_VALIDOS:
        raise HTTPException(status_code=400, detail="Barbero inválido")

    ahora = datetime.utcnow()
    expira = ahora + timedelta(minutes=TOKEN_MINUTES)
    payload = {"tipo": "stamp", "barbero": barbero, "jti": uuid4().hex, "iat": ahora, "exp": expira}
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    db_token = StampToken(token=token, creado_en=ahora, expira_en=expira)
    db.add(db_token)
    db.commit()

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    qr_url = f"{frontend_url}/stamp/{token}"
    return {
        "token": token,
        "qr_url": qr_url,
        "expira_en": expira.isoformat() + "Z",
        "segundos_validos": TOKEN_MINUTES * 60,
    }


@router.post("/canjear/{token}", response_model=StampCardResponse)
def canjear_sello(token: str, datos: StampRedeem, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=400, detail="QR vencido, pide uno nuevo al barbero")

    if payload.get("tipo") != "stamp":
        raise HTTPException(status_code=400, detail="QR vencido, pide uno nuevo al barbero")

    barbero = payload.get("barbero")
    if barbero not in BARBEROS_VALIDOS:
        raise HTTPException(status_code=400, detail="QR vencido, pide uno nuevo al barbero")

    db_token = db.query(StampToken).filter(StampToken.token == token).first()
    if not db_token or db_token.usado or db_token.expira_en <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="QR vencido, pide uno nuevo al barbero")

    telefono = datos.telefono.strip()
    nombre = datos.nombre.strip()
    if not telefono:
        raise HTTPException(status_code=400, detail="El teléfono es requerido")

    card = (
        db.query(StampCard)
        .filter(StampCard.cliente_telefono == telefono, StampCard.barbero == barbero)
        .first()
    )
    if card:
        if nombre and not card.cliente_nombre:
            card.cliente_nombre = nombre
        if card.total_cortes >= 10:
            card.total_cortes = 1
        else:
            card.total_cortes += 1
    else:
        if not nombre:
            raise HTTPException(status_code=400, detail="El nombre es requerido para crear tu tarjeta")
        card = StampCard(cliente_nombre=nombre, cliente_telefono=telefono, barbero=barbero, total_cortes=1)
        db.add(card)

    db_token.usado = True
    db.commit()
    db.refresh(card)
    return _serialize_card(card)


@router.get("/card/{telefono}", response_model=list[StampCardResponse])
def obtener_tarjeta(telefono: str, db: Session = Depends(get_db)):
    cards = db.query(StampCard).filter(StampCard.cliente_telefono == telefono.strip()).all()
    if not cards:
        raise HTTPException(status_code=404, detail="No encontramos tarjeta para ese teléfono")
    return [_serialize_card(card) for card in cards]
