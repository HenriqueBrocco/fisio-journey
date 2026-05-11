import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.exception_handlers import register_exception_handlers
from app.core.logging import setup_logging
from app.middleware.request_logging import RequestLoggingMiddleware

load_dotenv()

setup_logging()

app = FastAPI(title="Fisio API", version="0.1.0")

app.add_middleware(RequestLoggingMiddleware)

origins_raw = os.getenv("BACKEND_CORS_ORIGINS", "")
origins = [item.strip() for item in origins_raw.split(",") if item.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(api_router, prefix="/v1")