from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./visionary_studio.db")


def _is_postgres_url(url: str) -> bool:
    """Railway/Heroku suelen usar postgres://; SQLAlchemy acepta ambos."""
    u = url.strip().lower()
    return u.startswith("postgresql") or u.startswith("postgres://")


def _is_sqlite_url(url: str) -> bool:
    return url.strip().lower().startswith("sqlite")


if _is_postgres_url(DATABASE_URL):
    engine = create_engine(DATABASE_URL)
elif _is_sqlite_url(DATABASE_URL):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

import models.usuario  # noqa: F401 — registers Usuario with Base
import models.resena  # noqa: F401 — registers Resena with Base


def ensure_reserva_reminder_columns():
    """Añade columnas de recordatorios en bases existentes (SQLite / Postgres)."""
    with engine.begin() as conn:
        if _is_sqlite_url(DATABASE_URL):
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

def ensure_cancelada_en_column():
    """Añade columna cancelada_en en bases existentes (SQLite / Postgres)."""
    with engine.begin() as conn:
        if _is_sqlite_url(DATABASE_URL):
            rows = conn.execute(text("PRAGMA table_info(reservas)")).fetchall()
            existing = {row[1] for row in rows}
            if "cancelada_en" not in existing:
                conn.execute(
                    text("ALTER TABLE reservas ADD COLUMN cancelada_en TIMESTAMP")
                )
        else:
            conn.execute(
                text(
                    "ALTER TABLE reservas ADD COLUMN IF NOT EXISTS cancelada_en TIMESTAMP"
                )
            )


def ensure_stamp_card_barbero_column():
    """Añade columna barbero en stamp_cards para bases existentes (SQLite / Postgres)."""
    with engine.begin() as conn:
        if _is_sqlite_url(DATABASE_URL):
            rows = conn.execute(text("PRAGMA table_info(stamp_cards)")).fetchall()
            existing = {row[1] for row in rows}
            if existing and "barbero" not in existing:
                conn.execute(
                    text("ALTER TABLE stamp_cards ADD COLUMN barbero VARCHAR DEFAULT 'Lobo' NOT NULL")
                )
        else:
            conn.execute(
                text(
                    "ALTER TABLE stamp_cards ADD COLUMN IF NOT EXISTS barbero VARCHAR DEFAULT 'Lobo' NOT NULL"
                )
            )


def ensure_resenas_table():
    """Crea la tabla resenas si no existe (SQLite / Postgres)."""
    with engine.begin() as conn:
        if _is_sqlite_url(DATABASE_URL):
            existing_tables = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()
            if ("resenas",) not in existing_tables:
                conn.execute(text(
                    "CREATE TABLE resenas ("
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                    "nombre VARCHAR NOT NULL, "
                    "calificacion INTEGER NOT NULL, "
                    "comentario TEXT NOT NULL, "
                    "aprobado BOOLEAN DEFAULT 1 NOT NULL, "
                    "creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
                    ")"
                ))
        else:
            conn.execute(text(
                "CREATE TABLE IF NOT EXISTS resenas ("
                "id SERIAL PRIMARY KEY, "
                "nombre VARCHAR NOT NULL, "
                "calificacion INTEGER NOT NULL, "
                "comentario TEXT NOT NULL, "
                "aprobado BOOLEAN DEFAULT TRUE NOT NULL, "
                "creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
                ")"
            ))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()