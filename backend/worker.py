#!/usr/bin/env python3
"""Start Celery worker. Run: python worker.py"""
from celery_app import celery_app

if __name__ == "__main__":
    celery_app.worker_main(
        argv=["worker", "--loglevel=info", "--concurrency=4", "-Q", "celery"]
    )
