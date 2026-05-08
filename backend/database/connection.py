from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./visionary_studio.db")

if DATABASE_URL.startswith("postgresql"):
    engine = create_engine(DATABASE_URL)
else:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def ensure_reserva_reminder_columns():
    """Añade columnas de recordatorios en bases existentes (SQLite / Postgres)."""
    with engine.begin() as conn:
        if DATABASE_URL.startswith("sqlite"):
            rows = conn.execute(text("PRAGMA table_info(reservas)")).fetchall()
            existing = {row[1] for row in rows}
            if "recordatorio_dia_previo_enviado" not in existing:
                conn.execute(
                    text(
                        "ALTER TABLE reservas ADD COLUMN recordatorio_dia_previo_enviado BOOLEAN DEFAULT 0 NOT NULL"
                    )
                )
            if "recordatorio_1h_enviado" not in existing:
                conn.execute(
                    text(
                        "ALTER TABLE reservas ADD COLUMN recordatorio_1h_enviado BOOLEAN DEFAULT 0 NOT NULL"
                    )
                )
        else:
            conn.execute(
                text(
                    "ALTER TABLE reservas ADD COLUMN IF NOT EXISTS recordatorio_dia_previo_enviado BOOLEAN DEFAULT FALSE NOT NULL"
                )
            )
            conn.execute(
                text(
                    "ALTER TABLE reservas ADD COLUMN IF NOT EXISTS recordatorio_1h_enviado BOOLEAN DEFAULT FALSE NOT NULL"
                )
            )

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()