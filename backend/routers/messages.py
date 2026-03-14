from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import uuid
import asyncio
import json
from database import get_db
from models import Project, Message, MessageRole, User
from schemas import MessageCreate, MessageOut
from auth import get_current_user
from services.ai_chat import get_ai_response, should_plan
from services.video_gen import create_video_job
from services.planning_service import generate_storyboard, refine_storyboard
from tasks.video_tasks import generate_video_task

router = APIRouter(prefix="/api/projects/{project_id}/messages", tags=["messages"])


@router.get("", response_model=List[MessageOut])
def list_messages(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    msgs = project.messages
    result = []
    for m in msgs:
        video_id = m.video.id if m.video else None
        result.append(MessageOut(
            id=m.id, role=m.role, content=m.content,
            created_at=m.created_at, video_id=video_id
        ))
    return result


@router.post("/stream")
async def send_message_stream(
    project_id: str,
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Save user message
    user_msg = Message(id=str(uuid.uuid4()), project_id=project_id, role=MessageRole.user, content=data.content)
    db.add(user_msg)
    db.commit()

    is_first = db.query(Message).filter(Message.project_id == project_id).count() <= 2

    storyboard_id = None
    video_id = None

    # If user is refining an existing storyboard (planning mode)
    if data.storyboard_id:
        llm = data.llm_config
        sb, ai_text = refine_storyboard(
            data.storyboard_id,
            data.content,
            db,
            provider=llm.provider if llm else "claude",
            api_key=llm.api_key if llm else "",
            model=llm.model if llm else "",
            base_url=llm.base_url if llm else None,
            fallbacks=llm.fallbacks if llm else None,
        )
        storyboard_id = sb.id
        do_generate = False
    elif should_plan(data.content):
        # Deduct 1 credit for storyboard generation
        if current_user.credits <= 0:
            raise HTTPException(status_code=402, detail="积分不足，请充值后继续使用")
        current_user.credits -= 1
        db.commit()

        llm = data.llm_config
        sb = generate_storyboard(
            project_id,
            data.content,
            db,
            provider=llm.provider if llm else "claude",
            api_key=llm.api_key if llm else "",
            model=llm.model if llm else "",
            base_url=llm.base_url if llm else None,
            fallbacks=llm.fallbacks if llm else None,
            context_md=project.context_md or "",
            style_pack_id=data.style_pack_id or "default",
        )
        storyboard_id = sb.id
        shot_count = len(sb.shots)
        ai_text = f"已将视频拆解为 {shot_count} 个镜头。在右侧查看和编辑分镜方案，满意后点击「生成所有镜头」。"
        do_generate = False
    else:
        llm_cfg = data.llm_config.model_dump() if data.llm_config else None
        ai_text, do_generate = get_ai_response(data.content, is_first, llm_config=llm_cfg)

    # Save assistant message
    assistant_msg = Message(id=str(uuid.uuid4()), project_id=project_id, role=MessageRole.assistant, content=ai_text)
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)

    if do_generate:
        # Deduct 1 credit for video generation
        if current_user.credits <= 0:
            raise HTTPException(status_code=402, detail="积分不足，请充值后继续使用")
        current_user.credits -= 1
        db.commit()
        video = create_video_job(project_id, assistant_msg.id, db)
        video_id = video.id
        generate_video_task.delay(video_id)

    async def event_stream():
        # Stream the AI text word by word
        words = ai_text.split()
        for i, word in enumerate(words):
            chunk = word + (" " if i < len(words) - 1 else "")
            yield f"data: {json.dumps({'type': 'text', 'content': chunk})}\n\n"
            await asyncio.sleep(0.05)

        # Send message metadata
        yield f"data: {json.dumps({'type': 'done', 'message_id': assistant_msg.id, 'video_id': video_id, 'storyboard_id': storyboard_id})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
