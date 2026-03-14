"""Mock composition service — merges shot videos into a final output.
Replace compose_storyboard() with real FFmpeg implementation when ready.
"""
import asyncio
import uuid
from sqlalchemy.orm import Session
from models import Storyboard, Shot, ShotStatus, Video, VideoStatus, Project, ProjectStatus

MOCK_VIDEO_URL = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
MOCK_THUMBNAIL = "https://peach.blender.org/wp-content/uploads/title_anouncement.jpg?x11217"


async def compose_storyboard(storyboard_id: str, db: Session):
    """Merge all done shot videos into a single final video (mock: 3s delay)."""
    await asyncio.sleep(3)

    storyboard = db.query(Storyboard).filter(Storyboard.id == storyboard_id).first()
    if not storyboard:
        return

    done_shots = [s for s in storyboard.shots if s.status == ShotStatus.done and s.video_id]
    if not done_shots:
        return

    first_video = db.query(Video).filter(Video.id == done_shots[0].video_id).first()
    final_url = first_video.url if first_video else MOCK_VIDEO_URL
    final_thumb = first_video.thumbnail_url if first_video else MOCK_THUMBNAIL
    total_duration = sum(s.duration for s in done_shots)

    final_video = Video(
        id=str(uuid.uuid4()),
        project_id=storyboard.project_id,
        url=final_url,
        thumbnail_url=final_thumb,
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
        project.thumbnail_url = final_thumb

    db.commit()


# --- Real FFmpeg implementation (swap in when ready) ---
# async def compose_storyboard_ffmpeg(storyboard_id: str, db: Session):
#     import subprocess, tempfile, os
#     storyboard = db.query(Storyboard).filter(Storyboard.id == storyboard_id).first()
#     done_shots = [s for s in storyboard.shots if s.status == ShotStatus.done]
#     with tempfile.TemporaryDirectory() as tmpdir:
#         list_file = os.path.join(tmpdir, "concat.txt")
#         with open(list_file, "w") as f:
#             for shot in done_shots:
#                 # download shot.video.url to tmpdir, write local path
#                 f.write(f"file '{local_path}'\n")
#         out_path = f"/tmp/{storyboard_id}.mp4"
#         subprocess.run(
#             ["ffmpeg", "-f", "concat", "-safe", "0", "-i", list_file, "-c", "copy", out_path],
#             check=True
#         )
#         # upload out_path to storage, update storyboard.final_video_id
