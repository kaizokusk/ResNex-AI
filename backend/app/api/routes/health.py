from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import get_settings
from app.core.queue import get_redis_connection
from app.db.session import SessionLocal

router = APIRouter(tags=["health"])


@router.get("/health")
def healthcheck() -> dict:
    settings = get_settings()
    redis_ok = True
    database_ok = True
    try:
        get_redis_connection().ping()
    except Exception:
        redis_ok = False

    try:
        with SessionLocal() as session:
            session.execute(text("SELECT 1"))
    except Exception:
        database_ok = False

    overall_ok = redis_ok and database_ok

    return {
        "status": "ok" if overall_ok else "degraded",
        "service": settings.app_name,
        "environment": settings.app_env,
        "version": settings.app_version,
        "redis": "up" if redis_ok else "down",
        "database": "up" if database_ok else "down",
    }