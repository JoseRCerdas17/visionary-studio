from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.connection import get_db
from models.finanzas import Gasto, PagoSilla
from routers.auth import TokenData, get_usuario_actual

router = APIRouter(prefix="/finanzas", tags=["finanzas"])


def _admin_only(usuario: TokenData) -> None:
    if usuario.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo Lobo puede gestionar finanzas")


def _hoy_cr():
    return datetime.now(timezone(timedelta(hours=-6))).date()


class SillaCreate(BaseModel):
    monto: int
    nota: str | None = None


class GastoCreate(BaseModel):
    descripcion: str
    monto: int


def _silla_response(p: PagoSilla) -> dict:
    return {
        "id": p.id,
        "monto": p.monto,
        "fecha": p.fecha.isoformat() if p.fecha else None,
        "nota": p.nota,
        "registrado_en": p.registrado_en.isoformat() if p.registrado_en else None,
    }


def _gasto_response(g: Gasto) -> dict:
    return {
        "id": g.id,
        "descripcion": g.descripcion,
        "monto": g.monto,
        "fecha": g.fecha.isoformat() if g.fecha else None,
        "registrado_en": g.registrado_en.isoformat() if g.registrado_en else None,
    }


# ---------------------------------------------------------------- Silla

@router.post("/silla")
def crear_pago_silla(
    datos: SillaCreate,
    usuario: TokenData = Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    _admin_only(usuario)
    if datos.monto <= 0:
        raise HTTPException(status_code=400, detail="Monto inválido")
    pago = PagoSilla(monto=datos.monto, nota=(datos.nota.strip() if datos.nota else None))
    db.add(pago)
    db.commit()
    db.refresh(pago)
    return _silla_response(pago)


@router.get("/silla")
def listar_pagos_silla(
    usuario: TokenData = Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    _admin_only(usuario)
    pagos = db.query(PagoSilla).order_by(PagoSilla.fecha.desc(), PagoSilla.id.desc()).all()
    return [_silla_response(p) for p in pagos]


@router.delete("/silla/{pago_id}")
def eliminar_pago_silla(
    pago_id: int,
    usuario: TokenData = Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    _admin_only(usuario)
    pago = db.query(PagoSilla).filter(PagoSilla.id == pago_id).first()
    if not pago:
        raise HTTPException(status_code=404, detail="Pago de silla no encontrado")
    db.delete(pago)
    db.commit()
    return {"message": "Pago de silla eliminado"}


# ---------------------------------------------------------------- Gastos

@router.post("/gastos")
def crear_gasto(
    datos: GastoCreate,
    usuario: TokenData = Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    _admin_only(usuario)
    if not datos.descripcion.strip():
        raise HTTPException(status_code=400, detail="La descripción es requerida")
    if datos.monto <= 0:
        raise HTTPException(status_code=400, detail="Monto inválido")
    gasto = Gasto(descripcion=datos.descripcion.strip(), monto=datos.monto)
    db.add(gasto)
    db.commit()
    db.refresh(gasto)
    return _gasto_response(gasto)


@router.get("/gastos")
def listar_gastos(
    usuario: TokenData = Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    _admin_only(usuario)
    gastos = db.query(Gasto).order_by(Gasto.fecha.desc(), Gasto.id.desc()).all()
    return [_gasto_response(g) for g in gastos]


@router.delete("/gastos/{gasto_id}")
def eliminar_gasto(
    gasto_id: int,
    usuario: TokenData = Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    _admin_only(usuario)
    gasto = db.query(Gasto).filter(Gasto.id == gasto_id).first()
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    db.delete(gasto)
    db.commit()
    return {"message": "Gasto eliminado"}
