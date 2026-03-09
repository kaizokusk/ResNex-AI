from datetime import datetime, timezone


def ping_job() -> dict:
    return {
        "message": "worker-acknowledged",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }