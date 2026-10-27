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


def ensure_reserva_adicionales_column():
    """Añade columna adicionales en bases existentes (SQLite / Postgres)."""
    with engine.begin() as conn:
        if _is_sqlite_url(DATABASE_URL):
            rows = conn.execute(text("PRAGMA table_info(reservas)")).fetchall()
            existing = {row[1] for row in rows}
            if "adicionales" not in existing:
                conn.execute(
                    text("ALTER TABLE reservas ADD COLUMN adicionales VARCHAR")
                )
        else:
            conn.execute(
                text("ALTER TABLE reservas ADD COLUMN IF NOT EXISTS adicionales VARCHAR")
            )


def ensure_reserva_adicionales_precio_column():
    """Añade columna adicionales_precio en bases existentes (SQLite / Postgres)."""
    with engine.begin() as conn:
        if _is_sqlite_url(DATABASE_URL):
            rows = conn.execute(text("PRAGMA table_info(reservas)")).fetchall()
            existing = {row[1] for row in rows}
            if "adicionales_precio" not in existing:
                conn.execute(
                    text("ALTER TABLE reservas ADD COLUMN adicionales_precio INTEGER")
                )
        else:
            conn.execute(
                text("ALTER TABLE reservas ADD COLUMN IF NOT EXISTS adicionales_precio INTEGER")
            )


def ensure_reserva_es_miembro_club_column():
    """Añade columna es_miembro_club en reservas (SQLite / Postgres)."""
    with engine.begin() as conn:
        if _is_sqlite_url(DATABASE_URL):
            rows = conn.execute(text("PRAGMA table_info(reservas)")).fetchall()
            existing = {row[1] for row in rows}
            if "es_miembro_club" not in existing:
                conn.execute(
                    text("ALTER TABLE reservas ADD COLUMN es_miembro_club BOOLEAN DEFAULT 0 NOT NULL")
                )
        else:
            conn.execute(
                text("ALTER TABLE reservas ADD COLUMN IF NOT EXISTS es_miembro_club BOOLEAN DEFAULT FALSE NOT NULL")
            )


def ensure_club_miembro_email_column():
    """Añade columna email en club_miembros para bases existentes (SQLite / Postgres)."""
    with engine.begin() as conn:
        if _is_sqlite_url(DATABASE_URL):
            rows = conn.execute(text("PRAGMA table_info(club_miembros)")).fetchall()
            existing = {row[1] for row in rows}
            if existing and "email" not in existing:
                conn.execute(
                    text("ALTER TABLE club_miembros ADD COLUMN email VARCHAR")
                )
        else:
            conn.execute(
                text("ALTER TABLE club_miembros ADD COLUMN IF NOT EXISTS email VARCHAR")
            )


def ensure_club_miembro_recordatorio_column():
    """Añade columna recordatorio_vencimiento_enviado en club_miembros (SQLite / Postgres)."""
    with engine.begin() as conn:
        if _is_sqlite_url(DATABASE_URL):
            rows = conn.execute(text("PRAGMA table_info(club_miembros)")).fetchall()
            existing = {row[1] for row in rows}
            if existing and "recordatorio_vencimiento_enviado" not in existing:
                conn.execute(
                    text(
                        "ALTER TABLE club_miembros ADD COLUMN recordatorio_vencimiento_enviado BOOLEAN DEFAULT 0 NOT NULL"
                    )
                )
        else:
            conn.execute(
                text(
                    "ALTER TABLE club_miembros ADD COLUMN IF NOT EXISTS recordatorio_vencimiento_enviado BOOLEAN DEFAULT FALSE NOT NULL"
                )
            )


def ensure_club_miembro_barbero_column():
    """Añade columna barbero en club_miembros (SQLite / Postgres). Las filas existentes quedan en 'Alonso Lobo'."""
    with engine.begin() as conn:
        if _is_sqlite_url(DATABASE_URL):
            rows = conn.execute(text("PRAGMA table_info(club_miembros)")).fetchall()
            existing = {row[1] for row in rows}
            if existing and "barbero" not in existing:
                conn.execute(
                    text("ALTER TABLE club_miembros ADD COLUMN barbero VARCHAR DEFAULT 'Alonso Lobo' NOT NULL")
                )
        else:
            conn.execute(
                text("ALTER TABLE club_miembros ADD COLUMN IF NOT EXISTS barbero VARCHAR DEFAULT 'Alonso Lobo' NOT NULL")
            )


def ensure_club_grupo_barbero_column():
    """Añade columna barbero en club_grupos (SQLite / Postgres). Las filas existentes quedan en 'Alonso Lobo'."""
    with engine.begin() as conn:
        if _is_sqlite_url(DATABASE_URL):
            rows = conn.execute(text("PRAGMA table_info(club_grupos)")).fetchall()
            existing = {row[1] for row in rows}
            if existing and "barbero" not in existing:
                conn.execute(
                    text("ALTER TABLE club_grupos ADD COLUMN barbero VARCHAR DEFAULT 'Alonso Lobo' NOT NULL")
                )
        else:
            conn.execute(
                text("ALTER TABLE club_grupos ADD COLUMN IF NOT EXISTS barbero VARCHAR DEFAULT 'Alonso Lobo' NOT NULL")
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


def ensure_club_servicios_extra_table():
    """Crea la tabla club_servicios_extra si no existe (SQLite / Postgres)."""
    with engine.begin() as conn:
        if _is_sqlite_url(DATABASE_URL):
            existing_tables = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()
            if ("club_servicios_extra",) not in existing_tables:
                conn.execute(text(
                    "CREATE TABLE club_servicios_extra ("
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                    "miembro_id INTEGER NOT NULL, "
                    "servicio VARCHAR NOT NULL, "
                    "monto INTEGER DEFAULT 0 NOT NULL, "
                    "pagado BOOLEAN DEFAULT 0 NOT NULL, "
                    "metodo VARCHAR, "
                    "nota VARCHAR, "
                    "creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, "
                    "creado_por VARCHAR"
                    ")"
                ))
        else:
            conn.execute(text(
                "CREATE TABLE IF NOT EXISTS club_servicios_extra ("
                "id SERIAL PRIMARY KEY, "
                "miembro_id INTEGER NOT NULL, "
                "servicio VARCHAR NOT NULL, "
                "monto INTEGER DEFAULT 0 NOT NULL, "
                "pagado BOOLEAN DEFAULT FALSE NOT NULL, "
                "metodo VARCHAR, "
                "nota VARCHAR, "
                "creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, "
                "creado_por VARCHAR"
                ")"
            ))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()