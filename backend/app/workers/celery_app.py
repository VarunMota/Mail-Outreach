from celery import Celery
from celery.schedules import crontab
from ..config import settings

celery_app = Celery(
    "workers",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_always_eager=False,  # Always use real Celery workers
    result_expires=3600,  # Results expire after 1 hour
    include=["app.workers.campaign", "app.workers.replies", "app.workers.followup"],
)

# Schedule
celery_app.conf.beat_schedule = {
    "check-email-replies-every-10-minutes": {
        "task": "app.workers.replies.check_email_replies",
        "schedule": crontab(minute="*/10"),
    },
    "process-followups-every-hour": {
        "task": "app.workers.followup.process_followups",
        "schedule": crontab(minute="0"), # Run every hour
    },
}
