"""Mock video generation service.
Replace generate_video() with real API calls (Kling, Sora, etc.) when ready.
"""
import asyncio
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from models import Video, VideoStatus, Project, ProjectStatus, Message, Shot, ShotStatus

# Sample public domain video for mock
MOCK_VIDEO_URL = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
MOCK_THUMBNAIL = "https://peach.blender.org/wp-content/uploads/title_anouncement.jpg?x11217"


async def generate_video_mock(video_id: str, db: Session):
    """Simulate video generation with a 5-second delay."""
    await asyncio.sleep(5)
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        return
    video.status = VideoStatus.done
    video.url = MOCK_VIDEO_URL
    video.thumbnail_url = MOCK_THUMBNAIL
    video.duration = 9.0
    db.commit()

    # Update project status
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if project:
        project.status = ProjectStatus.done
        project.thumbnail_url = MOCK_THUMBNAIL
        db.commit()


def create_video_job(project_id: str, message_id: str, db: Session) -> Video:
    """Create a video record and kick off async generation."""
    video = Video(
        id=str(uuid.uuid4()),
        project_id=project_id,
        message_id=message_id,
        status=VideoStatus.processing,
    )
    db.add(video)

    project = db.query(Project).filter(Project.id == project_id).first()
    if project:
        project.status = ProjectStatus.generating

    db.commit()
    db.refresh(video)
    return video


async def generate_shot_mock(shot_id: str, db: Session):
    """Simulate video generation for a single shot. Each shot commits independently."""
    try:
        await asyncio.sleep(5)
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
    except Exception as e:
        print(f"[video_gen] shot {shot_id} failed: {e}")
        try:
            shot = db.query(Shot).filter(Shot.id == shot_id).first()
            if shot:
                shot.status = ShotStatus.failed
                if shot.video_id:
                    video = db.query(Video).filter(Video.id == shot.video_id).first()
                    if video:
                        video.status = VideoStatus.failed
                db.commit()
        except Exception:
            pass
