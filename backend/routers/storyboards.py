from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid
from database import get_db
from models import Storyboard, Shot, ShotStatus, Video, VideoStatus, Project, User
from schemas import StoryboardOut, ShotUpdate, ShotOut
from auth import get_current_user
from tasks.video_tasks import generate_shot_task, compose_storyboard_task

router = APIRouter(prefix="/api/projects/{project_id}/storyboards", tags=["storyboards"])


def _get_project(project_id: str, db: Session, user: User) -> Project:
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _get_storyboard(project_id: str, storyboard_id: str, db: Session, user: User) -> Storyboard:
    _get_project(project_id, db, user)
    sb = db.query(Storyboard).filter(
        Storyboard.id == storyboard_id,
        Storyboard.project_id == project_id
    ).first()
    if not sb:
        raise HTTPException(status_code=404, detail="Storyboard not found")
    return sb


@router.get("", response_model=List[StoryboardOut])
def list_storyboards(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_project(project_id, db, current_user)
    return project.storyboards


@router.get("/{storyboard_id}", response_model=StoryboardOut)
def get_storyboard(
    project_id: str,
    storyboard_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_storyboard(project_id, storyboard_id, db, current_user)


@router.patch("/{storyboard_id}/shots/{shot_id}", response_model=ShotOut)
def update_shot(
    project_id: str,
    storyboard_id: str,
    shot_id: str,
    data: ShotUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_storyboard(project_id, storyboard_id, db, current_user)
    shot = db.query(Shot).filter(Shot.id == shot_id, Shot.storyboard_id == storyboard_id).first()
    if not shot:
        raise HTTPException(status_code=404, detail="Shot not found")
    for field, val in data.model_dump(exclude_none=True).items():
        setattr(shot, field, val)
    db.commit()
    db.refresh(shot)
    return shot


@router.post("/{storyboard_id}/generate")
async def generate_all_shots(
    project_id: str,
    storyboard_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create Video records for all pending shots and kick off generation."""
    sb = _get_storyboard(project_id, storyboard_id, db, current_user)
    pending_shots = [s for s in sb.shots if s.status == ShotStatus.pending]

    # Check credits
    from fastapi import HTTPException as _HTTPException
    if current_user.credits < len(pending_shots):
        raise _HTTPException(status_code=402, detail=f"积分不足，需要 {len(pending_shots)} 积分，当前剩余 {current_user.credits}")
    current_user.credits -= len(pending_shots)

    shot_ids = []
    for shot in pending_shots:
        video = Video(
            id=str(uuid.uuid4()),
            project_id=project_id,
            status=VideoStatus.processing,
            meta={"shot_id": shot.id},
        )
        db.add(video)
        db.flush()
        shot.video_id = video.id
        shot.status = ShotStatus.processing
        shot_ids.append(shot.id)
    db.commit()

    for shot_id in shot_ids:
        generate_shot_task.delay(shot_id)

    return {"ok": True, "shot_count": len(shot_ids)}


@router.post("/{storyboard_id}/compose")
async def compose_final(
    project_id: str,
    storyboard_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger composition of all done shots into a final video."""
    sb = _get_storyboard(project_id, storyboard_id, db, current_user)
    done = [s for s in sb.shots if s.status == ShotStatus.done]
    if not done:
        raise HTTPException(status_code=400, detail="No completed shots to compose")
    compose_storyboard_task.delay(storyboard_id)
    return {"ok": True}
