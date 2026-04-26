from sqlalchemy import Column, Integer, String, DateTime
from database.connection import Base
from datetime import datetime

class Reserva(Base):
    __tablename__ = "reservas"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    telefono = Column(String, nullable=False)
    email = Column(String, nullable=False)
    barbero = Column(String, nullable=False)
    servicio = Column(String, nullable=False)
    precio = Column(String, nullable=False)
    fecha = Column(String, nullable=False)
    hora = Column(String, nullable=False)
    estado = Column(String, default="pendiente")
    metodo_pago = Column(String, nullable=True)
    creado_en = Column(DateTime, default=datetime.utcnow)