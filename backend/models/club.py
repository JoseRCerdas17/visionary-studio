from datetime import datetime, timedelta, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String

from database.connection import Base


def _ahora_cr() -> datetime:
    """Hora local de Costa Rica (UTC-6, sin DST) como datetime naive."""
    return datetime.now(timezone(timedelta(hours=-6))).replace(tzinfo=None)


class ClubPlan(Base):
    __tablename__ = "club_planes"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    precio = Column(Integer, nullable=False)
    activo = Column(Boolean, default=True, nullable=False)
    servicios = Column(String, nullable=False)
    cupo_max = Column(Integer, nullable=True)
    creado_en = Column(DateTime, default=_ahora_cr, nullable=False)


class ClubGrupo(Base):
    __tablename__ = "club_grupos"

    id = Column(Integer, primary_key=True, index=True)
    nombre_grupo = Column(String, nullable=False)
    plan_id = Column(Integer, ForeignKey("club_planes.id"), nullable=False)
    pago_total = Column(Integer, nullable=False)
    fecha_pago = Column(DateTime, default=_ahora_cr, nullable=False)
    activo = Column(Boolean, default=True, nullable=False)
    barbero = Column(String, default="Alonso Lobo", nullable=False)


class ClubMiembro(Base):
    __tablename__ = "club_miembros"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    telefono = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, nullable=True)
    barbero = Column(String, default="Alonso Lobo", nullable=False)
    plan_id = Column(Integer, ForeignKey("club_planes.id"), nullable=False)
    estado = Column(String, default="pendiente", nullable=False)
    fecha_inicio = Column(DateTime, nullable=True)
    fecha_vencimiento = Column(DateTime, nullable=True)
    qr_token = Column(String, unique=True, nullable=True, index=True)
    mascarilla_promo = Column(Boolean, default=False, nullable=False)
    recordatorio_vencimiento_enviado = Column(Boolean, default=False, nullable=False)
    grupo_id = Column(Integer, ForeignKey("club_grupos.id"), nullable=True)
    creado_en = Column(DateTime, default=_ahora_cr, nullable=False)
    activado_por = Column(String, nullable=True)
    activado_en = Column(DateTime, nullable=True)


class ClubPago(Base):
    __tablename__ = "club_pagos"

    id = Column(Integer, primary_key=True, index=True)
    miembro_id = Column(Integer, ForeignKey("club_miembros.id"), nullable=False, index=True)
    monto = Column(Integer, nullable=False)
    metodo = Column(String, nullable=False)
    referencia = Column(String, nullable=True)
    fecha = Column(DateTime, default=_ahora_cr, nullable=False)
    registrado_por = Column(String, nullable=True)


class ClubConsumo(Base):
    __tablename__ = "club_consumos"

    id = Column(Integer, primary_key=True, index=True)
    miembro_id = Column(Integer, ForeignKey("club_miembros.id"), nullable=False, index=True)
    servicio = Column(String, nullable=False)
    fecha = Column(DateTime, default=_ahora_cr, nullable=False)
    registrado_por = Column(String, nullable=True)
    anulado = Column(Boolean, default=False, nullable=False)
    motivo_anulacion = Column(String, nullable=True)
