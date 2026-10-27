import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from database.connection import Base, engine, ensure_reserva_reminder_columns, ensure_cancelada_en_column, ensure_reserva_adicionales_column, ensure_reserva_adicionales_precio_column, ensure_reserva_es_miembro_club_column, ensure_club_miembro_email_column, ensure_club_miembro_recordatorio_column, ensure_club_miembro_barbero_column, ensure_club_grupo_barbero_column, ensure_resenas_table, ensure_club_servicios_extra_table, ensure_stamp_card_barbero_column, SessionLocal
from models.reserva import Reserva
from models.usuario import Usuario
from models.resena import Resena
from models.stamp_card import StampCard, StampToken
from models.club import ClubPlan, ClubMiembro, ClubPago, ClubConsumo, ClubGrupo, ClubServicioExtra
from models.finanzas import Gasto, PagoSilla
from auth.security import hashear_password
from recordatorios import iniciar_scheduler, shutdown_scheduler
from recordatorios_logic import CR_TZ, MIN_SEGUNDOS_ANTES_UNA_HORA, MAX_SEGUNDOS_ANTES_UNA_HORA, parse_cita_cr, debe_enviar_dia_previo, debe_enviar_1h
from routers import auth, reservas, resenas, stamps, club, finanzas

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s %(name)s: %(message)s",
)
logging.getLogger("recordatorios").setLevel(logging.INFO)

_ENV_REMINDER_OFF = frozenset({"1", "true", "yes", "on"})

Base.metadata.create_all(bind=engine)
ensure_reserva_reminder_columns()
ensure_cancelada_en_column()
ensure_reserva_adicionales_column()
ensure_reserva_adicionales_precio_column()
ensure_reserva_es_miembro_club_column()
ensure_club_miembro_email_column()
ensure_club_miembro_recordatorio_column()
ensure_club_miembro_barbero_column()
ensure_club_grupo_barbero_column()
ensure_resenas_table()
ensure_club_servicios_extra_table()
ensure_stamp_card_barbero_column()


def seed_club_planes():
    import json

    planes = [
        {"nombre": "Essential", "precio": 7500, "activo": True, "servicios": {"cortes": 2, "barbas": 0, "mascarilla": False}, "cupo_max": None},
        {"nombre": "Grooming", "precio": 9500, "activo": True, "servicios": {"cortes": 2, "barbas": 1, "mascarilla": False}, "cupo_max": None},
        {"nombre": "Premium", "precio": 17000, "activo": True, "servicios": {"cortes": 4, "barbas": 3, "mascarilla": False}, "cupo_max": None},
        {"nombre": "Student", "precio": 10500, "activo": False, "servicios": {"cortes": 3, "barbas": 0, "mascarilla": False}, "cupo_max": None},
        {"nombre": "Visionary Black", "precio": 14000, "activo": False, "servicios": {"cortes": 4, "barbas": 0, "mascarilla": False}, "cupo_max": 20},
        {"nombre": "Visionary Friends 5", "precio": 35000, "activo": False, "servicios": {"cortes": 2, "barbas": 0, "mascarilla": False}, "cupo_max": None},
    ]
    db = SessionLocal()
    try:
        for p in planes:
            existente = db.query(ClubPlan).filter(ClubPlan.nombre == p["nombre"]).first()
            if existente:
                continue
            db.add(
                ClubPlan(
                    nombre=p["nombre"],
                    precio=p["precio"],
                    activo=p["activo"],
                    servicios=json.dumps(p["servicios"]),
                    cupo_max=p["cupo_max"],
                )
            )
        # Migración única: ajusta planes existentes que aún conservan el valor anterior.
        # Solo se aplica si las barbas siguen en el valor viejo, para no pisar ediciones posteriores.
        parches = [
            ("Premium", 2, 3),
            ("Visionary Black", 1, 0),
        ]
        for nombre, barbas_antes, barbas_despues in parches:
            plan = db.query(ClubPlan).filter(ClubPlan.nombre == nombre).first()
            if not plan:
                continue
            try:
                actual = json.loads(plan.servicios)
            except (ValueError, TypeError):
                continue
            if actual.get("barbas") == barbas_antes:
                actual["barbas"] = barbas_despues
                plan.servicios = json.dumps(actual)
        db.commit()
    finally:
        db.close()


def _barberos_from_env():
    barbers = []
    # Primary account
    u1 = os.getenv("ADMIN_USERNAME", "").strip()
    p1 = os.getenv("ADMIN_PASSWORD", "").strip()
    is_admin_raw1 = os.getenv("ADMIN_IS_ADMIN", "").strip().lower()
    if u1 and p1:
        barbers.append({"username": u1, "password": p1, "is_admin": is_admin_raw1 in ("true", "1", "yes", "on")})
    # Second account
    u2 = os.getenv("ADMIN2_USERNAME", "").strip()
    p2 = os.getenv("ADMIN2_PASSWORD", "").strip()
    is_admin_raw2 = os.getenv("ADMIN2_IS_ADMIN", "").strip().lower()
    if u2 and p2:
        barbers.append({"username": u2, "password": p2, "is_admin": is_admin_raw2 in ("true", "1", "yes", "on")})
    return barbers


def seed_usuarios():
    barbers = _barberos_from_env()
    if not barbers:
        logging.warning("No se encontraron usuarios de barbero en .env — no se crearon cuentas")
        return
    db = SessionLocal()
    try:
        created = []
        for b in barbers:
            existente = db.query(Usuario).filter(Usuario.username == b["username"]).first()
            if existente:
                logging.info(f"Usuario '{b['username']}' ya existe, se omite")
                continue
            barbero_nombre = "Alonso Lobo" if b["is_admin"] else "Ian Bustos Navarrete"
            usuario = Usuario(
                username=b["username"],
                password_hash=hashear_password(b["password"]),
                rol="admin" if b["is_admin"] else "barber",
                barbero=barbero_nombre,
            )
            db.add(usuario)
            created.append(b["username"])
        if created:
            db.commit()
            logging.info(f"Usuarios creados: {', '.join(created)}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_usuarios()
    seed_club_planes()
    scheduler = iniciar_scheduler()
    app.state.reminder_scheduler = scheduler
    try:
        yield
    finally:
        shutdown_scheduler(scheduler)


app = FastAPI(
    title="Visionary Studio API",
    description="API para Visionary Studio Barber Shop",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reservas.router)
app.include_router(auth.router)
app.include_router(resenas.router)
app.include_router(stamps.router)
app.include_router(club.router)
app.include_router(finanzas.router)


@app.get("/")
def root():
    return {"message": "Visionary Studio API funcionando"}


@app.get("/health/reminders")
def health_reminders(request: Request):
    """Diagnóstico ligero (sin secretos) para comprobar si el scheduler y Resend están activos."""
    disable = os.getenv("DISABLE_REMINDER_SCHEDULER", "").strip().lower() in _ENV_REMINDER_OFF
    sched = getattr(request.app.state, "reminder_scheduler", None)
    payload = {
        "reminders_disabled_by_env": disable,
        "resend_api_key_configured": bool(os.getenv("RESEND_API_KEY")),
        "scheduler_started": sched is not None,
    }
    if sched:
        job = sched.get_job("recordatorios_visionary")
        if job and job.next_run_time:
            payload["scheduler_next_run_iso"] = job.next_run_time.isoformat()
    return payload


@app.get("/health/reminders/debug")
def health_reminders_debug():
    """Muestra el estado de recordatorios de reservas pendientes sin enviar nada."""
    ahora_cr = datetime.now(CR_TZ)
    db = SessionLocal()
    try:
        reservas_pendientes = db.query(Reserva).filter(Reserva.estado == "pendiente").all()
        resultado = []
        for r in reservas_pendientes:
            cita_cr = parse_cita_cr(r.fecha, r.hora)
            seg_rest = (cita_cr - ahora_cr).total_seconds() if cita_cr else None
            resultado.append({
                "id": r.id,
                "fecha": r.fecha,
                "hora": r.hora,
                "cita_cr_parsed": cita_cr.isoformat() if cita_cr else None,
                "seg_restantes": round(seg_rest) if seg_rest is not None else None,
                "dia_previo_enviado": bool(r.recordatorio_dia_previo_enviado),
                "1h_enviado": bool(r.recordatorio_1h_enviado),
                "enviaria_dia_previo": debe_enviar_dia_previo(ahora_cr, cita_cr, bool(r.recordatorio_dia_previo_enviado)) if cita_cr else False,
                "enviaria_1h": debe_enviar_1h(ahora_cr, cita_cr, bool(r.recordatorio_1h_enviado)) if cita_cr else False,
            })
        return {
            "ahora_cr": ahora_cr.isoformat(),
            "ventana_1h_min_seg": MIN_SEGUNDOS_ANTES_UNA_HORA,
            "ventana_1h_max_seg": MAX_SEGUNDOS_ANTES_UNA_HORA,
            "reservas": resultado,
        }
    finally:
        db.close()
