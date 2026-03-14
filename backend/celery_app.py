"""Celery application — connects to Redis for task queue."""
from celery import Celery
from config import settings

celery_app = Celery(
    "coco",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["tasks.video_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)
