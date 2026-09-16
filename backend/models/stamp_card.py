from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String, UniqueConstraint

from database.connection import Base


class StampCard(Base):
    __tablename__ = "stamp_cards"
    __table_args__ = (UniqueConstraint("cliente_telefono", "barbero", name="uq_stamp_card_telefono_barbero"),)

    id = Column(Integer, primary_key=True, index=True)
    cliente_nombre = Column(String, nullable=False)
    cliente_telefono = Column(String, nullable=False, index=True)
    barbero = Column(String, nullable=False, default="Lobo", server_default="Lobo")
    total_cortes = Column(Integer, default=0, nullable=False)
    creado_en = Column(DateTime, default=datetime.utcnow)


class StampToken(Base):
    __tablename__ = "stamp_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, nullable=False, index=True)
    creado_en = Column(DateTime, default=datetime.utcnow)
    expira_en = Column(DateTime, nullable=False)
    usado = Column(Boolean, default=False, nullable=False)
