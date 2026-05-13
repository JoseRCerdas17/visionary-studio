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

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()