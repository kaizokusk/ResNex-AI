from fastapi import APIRouter, HTTPException
from rq.job import Job

from app.core.queue import get_queue, get_redis_connection
from app.jobs.tasks import ping_job

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("/ping")
def enqueue_ping() -> dict:
    job = get_queue().enqueue(ping_job)
    return {"job_id": job.id, "status": job.get_status()}


@router.get("/{job_id}")
def get_job_status(job_id: str) -> dict:
    try:
        job = Job.fetch(job_id, connection=get_redis_connection())
    except Exception as exc:
        raise HTTPException(status_code=404, detail="Job not found") from exc

    return {
        "job_id": job.id,
        "status": job.get_status(),
        "result": job.result,
        "enqueued_at": job.enqueued_at.isoformat() if job.enqueued_at else None,
        "ended_at": job.ended_at.isoformat() if job.ended_at else None,
    }