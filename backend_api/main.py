from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend_api.config import initialize_firebase
from routers import doctores, auth, admin, reportes, graficas, archivos, catalogos
from import api_peas

app = FastAPI(title="API de Doctores IMSS Bienestar")

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "https://doctores-elastic-app.vercel.app",
    "https://gestion-imssb.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=600
)

app.include_router(api_peas.router)
app.include_router(doctores.router)
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(reportes.router)
app.include_router(graficas.router)
app.include_router(archivos.router)
app.include_router(catalogos.router)

@app.on_event("startup")
async def startup():
    initialize_firebase()

@app.get("/")
async def root():
    return {"message": "¡Bienvenido a la API de Doctores Cubanos IMSS Bienestar!"}
