from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.connection import engine, Base
from routers import reservas

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Evolution X API",
    description="API para la barberia Evolution X",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reservas.router)

@app.get("/")
def root():
    return {"message": "Evolution X API funcionando"}