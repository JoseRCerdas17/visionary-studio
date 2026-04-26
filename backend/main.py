from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.connection import engine, Base
from routers import reservas, auth
from recordatorios import iniciar_scheduler

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Visionary Studio API",
    description="API para Visionary Studio Barber Shop",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reservas.router)
app.include_router(auth.router)

scheduler = iniciar_scheduler()

@app.get("/")
def root():
    return {"message": "Visionary Studio API funcionando"}