"""Celery tasks for video generation and composition."""
from celery_app import celery_app
from database import SessionLocal

MOCK_VIDEO_URL = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
MOCK_THUMBNAIL = "https://peach.blender.org/wp-content/uploads/title_anouncement.jpg?x11217"


@celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
def generate_video_task(self, video_id: str):
    """Generate a single video (mock: 5s delay)."""
    import time
    from models import Video, VideoStatus, Project, ProjectStatus

    db = SessionLocal()
    try:
        time.sleep(5)
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            return
        video.status = VideoStatus.done
        video.url = MOCK_VIDEO_URL
        video.thumbnail_url = MOCK_THUMBNAIL
        video.duration = 9.0
        db.commit()

        project = db.query(Project).filter(Project.id == video.project_id).first()
        if project:
            project.status = ProjectStatus.done
            project.thumbnail_url = MOCK_THUMBNAIL
            db.commit()
    except Exception as exc:
        db.rollback()
        raise self.retry(exc=exc)
    finally:
        db.close()


@celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
def generate_shot_task(self, shot_id: str):
    """Generate video for a single shot (mock: 5s delay)."""
    import time
    from models import Video, VideoStatus, Shot, ShotStatus

    db = SessionLocal()
    try:
        time.sleep(5)
        shot = db.query(Shot).filter(Shot.id == shot_id).first()
        if not shot or not shot.video_id:
            return
        video = db.query(Video).filter(Video.id == shot.video_id).first()
        if not video:
            return
        video.status = VideoStatus.done
        video.url = MOCK_VIDEO_URL
        video.thumbnail_url = MOCK_THUMBNAIL
        video.duration = shot.duration
        shot.status = ShotStatus.done
        db.commit()
    except Exception as exc:
        db.rollback()
        # Mark shot as failed on final retry
        try:
            shot = db.query(Shot).filter(Shot.id == shot_id).first()
            if shot and self.request.retries >= self.max_retries:
                from models import ShotStatus, VideoStatus
                shot.status = ShotStatus.failed
                if shot.video_id:
                    video = db.query(Video).filter(Video.id == shot.video_id).first()
                    if video:
                        video.status = VideoStatus.failed
                db.commit()
        except Exception:
            pass
        raise self.retry(exc=exc)
    finally:
        db.close()


@celery_app.task(bind=True, max_retries=2, default_retry_delay=5)
def compose_storyboard_task(self, storyboard_id: str):
    """Compose all done shots into a final video."""
    import time, uuid, subprocess, tempfile, os
    from models import Storyboard, Shot, ShotStatus, Video, VideoStatus, Project, ProjectStatus

    db = SessionLocal()
    try:
        storyboard = db.query(Storyboard).filter(Storyboard.id == storyboard_id).first()
        if not storyboard:
            return

        done_shots = [s for s in storyboard.shots if s.status == ShotStatus.done and s.video_id]
        if not done_shots:
            return

        # Try real FFmpeg composition
        final_url = None
        final_thumb = None
        total_duration = sum(s.duration for s in done_shots)

        ffmpeg_available = _check_ffmpeg()
        mock_urls = {MOCK_VIDEO_URL}

        shot_videos = []
        for shot in done_shots:
            v = db.query(Video).filter(Video.id == shot.video_id).first()
            if v:
                shot_videos.append(v)

        all_real = ffmpeg_available and all(v.url not in mock_urls for v in shot_videos)

        if all_real:
            try:
                final_url, final_thumb = _ffmpeg_compose(shot_videos, storyboard_id)
            except Exception as e:
                print(f"[compose] FFmpeg failed ({e}), falling back to mock")

        if not final_url:
            # Mock fallback: use first shot's video
            first = shot_videos[0] if shot_videos else None
            final_url = first.url if first else MOCK_VIDEO_URL
            final_thumb = first.thumbnail_url if first else MOCK_THUMBNAIL
            time.sleep(3)

        final_video = Video(
            id=str(uuid.uuid4()),
            project_id=storyboard.project_id,
            url=final_url,
            thumbnail_url=final_thumb or MOCK_THUMBNAIL,
            duration=total_duration,
            status=VideoStatus.done,
            meta={"composed": True, "shot_count": len(done_shots)},
        )
        db.add(final_video)
        db.flush()

        storyboard.final_video_id = final_video.id
        project = db.query(Project).filter(Project.id == storyboard.project_id).first()
        if project:
            project.status = ProjectStatus.done
            project.thumbnail_url = final_thumb or MOCK_THUMBNAIL
        db.commit()

    except Exception as exc:
        db.rollback()
        raise self.retry(exc=exc)
    finally:
        db.close()


def _check_ffmpeg() -> bool:
    import subprocess
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, timeout=3)
        return True
    except Exception:
        return False


def _ffmpeg_compose(videos, storyboard_id: str) -> tuple[str, str]:
    """Concatenate videos with FFmpeg, return (url, thumbnail_url)."""
    import subprocess, tempfile, os, uuid, httpx

    upload_dir = "./uploads"
    os.makedirs(upload_dir, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmpdir:
        list_file = os.path.join(tmpdir, "concat.txt")
        local_paths = []

        for i, video in enumerate(videos):
            local_path = os.path.join(tmpdir, f"shot_{i}.mp4")
            # Download video
            with httpx.Client(timeout=60) as client:
                r = client.get(video.url)
                r.raise_for_status()
                with open(local_path, "wb") as f:
                    f.write(r.content)
            local_paths.append(local_path)

        with open(list_file, "w") as f:
            for p in local_paths:
                f.write(f"file '{p}'\n")

        out_name = f"{storyboard_id}.mp4"
        out_path = os.path.join(upload_dir, out_name)
        subprocess.run(
            ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", list_file, "-c", "copy", out_path],
            check=True, capture_output=True, timeout=300,
        )

        # Extract thumbnail from first frame
        thumb_name = f"{storyboard_id}_thumb.jpg"
        thumb_path = os.path.join(upload_dir, thumb_name)
        subprocess.run(
            ["ffmpeg", "-y", "-i", out_path, "-vframes", "1", "-q:v", "2", thumb_path],
            check=True, capture_output=True, timeout=30,
        )

        return f"/uploads/{out_name}", f"/uploads/{thumb_name}"
