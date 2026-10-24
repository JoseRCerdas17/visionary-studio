from datetime import datetime, timedelta, timezone

from sqlalchemy import Column, Date, DateTime, Integer, String

from database.connection import Base


def _hoy_cr():
    """Fecha de hoy en Costa Rica (UTC-6, sin DST)."""
    return datetime.now(timezone(timedelta(hours=-6))).date()


def _ahora_cr_naive():
    """Hora local de Costa Rica (UTC-6) como datetime naive."""
    return datetime.now(timezone(timedelta(hours=-6))).replace(tzinfo=None)


class PagoSilla(Base):
    __tablename__ = "pagos_silla"

    id = Column(Integer, primary_key=True, index=True)
    monto = Column(Integer, nullable=False)
    fecha = Column(Date, default=_hoy_cr, nullable=False)
    nota = Column(String, nullable=True)
    registrado_en = Column(DateTime, default=_ahora_cr_naive, nullable=False)


class Gasto(Base):
    __tablename__ = "gastos"

    id = Column(Integer, primary_key=True, index=True)
    descripcion = Column(String, nullable=False)
    monto = Column(Integer, nullable=False)
    fecha = Column(Date, default=_hoy_cr, nullable=False)
    registrado_en = Column(DateTime, default=_ahora_cr_naive, nullable=False)
