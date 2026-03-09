# ResNex AI Backend

This service exposes the initial Docker-first backend foundation for ResNex.

## Included in this phase

- FastAPI application skeleton
- `/health` endpoint
- Redis-backed background worker skeleton
- queue test endpoint for worker validation
- configuration via environment variables

## Local run

From the repo root, use Docker Compose:

1. Copy `.env.example` to `.env`
2. Start the stack with Docker Compose
3. Open the API health endpoint on the configured port

## Main modules

- `app/main.py` — FastAPI app entrypoint
- `app/core/config.py` — application settings
- `app/core/queue.py` — Redis / RQ queue helpers
- `app/jobs/tasks.py` — background jobs
- `worker.py` — worker process entrypoint
