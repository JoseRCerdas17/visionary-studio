import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from database.connection import Base, engine, ensure_reserva_reminder_columns
from recordatorios import iniciar_scheduler, shutdown_scheduler
from routers import auth, reservas

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s %(name)s: %(message)s",
)
logging.getLogger("recordatorios").setLevel(logging.INFO)

_ENV_REMINDER_OFF = frozenset({"1", "true", "yes", "on"})

Base.metadata.create_all(bind=engine)
ensure_reserva_reminder_columns()


@asynccontextmanager
async def lifespan(app: FastAPI):
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