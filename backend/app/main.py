from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.routes.health import router as health_router
from app.api.routes.jobs import router as jobs_router
from app.api.routes.workspaces import router as workspaces_router
from app.api.routes.documents import router as documents_router
from app.api.routes.search import router as search_router
from app.api.routes.chat import router as chat_router
from app.api.routes.agents import router as agents_router
from app.api.routes.reports import router as reports_router
from app.api.routes.tasks import router as tasks_router
from app.api.routes.discover import router as discover_router
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import engine


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    # Enable pgvector extension
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    Base.metadata.create_all(bind=engine)
    # Ensure uploads dir exists
    import os
    os.makedirs(settings.upload_dir, exist_ok=True)
    print(f"Starting {settings.app_name} in {settings.app_env} mode")
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        lifespan=lifespan,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(health_router)
    application.include_router(jobs_router, prefix=settings.api_v1_prefix)
    application.include_router(workspaces_router, prefix=settings.api_v1_prefix)
    application.include_router(documents_router, prefix=settings.api_v1_prefix)
    application.include_router(search_router, prefix=settings.api_v1_prefix)
    application.include_router(chat_router, prefix=settings.api_v1_prefix)
    application.include_router(agents_router, prefix=settings.api_v1_prefix)
    application.include_router(reports_router, prefix=settings.api_v1_prefix)
    application.include_router(tasks_router, prefix=settings.api_v1_prefix)
    application.include_router(discover_router, prefix=settings.api_v1_prefix)
    return application


app = create_app()


def main() -> None:
    import uvicorn

    settings = get_settings()
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.api_port, reload=True)