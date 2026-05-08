from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.connection import Base, engine, ensure_reserva_reminder_columns
from recordatorios import iniciar_scheduler, shutdown_scheduler
from routers import auth, reservas

Base.metadata.create_all(bind=engine)
ensure_reserva_reminder_columns()


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = iniciar_scheduler()
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