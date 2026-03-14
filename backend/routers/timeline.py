"""Timeline edit endpoint — uses LLM to parse natural language edit commands."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
from auth import get_current_user
from models import User, Project
from database import get_db
from sqlalchemy.orm import Session
from services.planning_service import _call_llm, _PROVIDER_BASE_URLS
import json
import re

router = APIRouter(prefix="/api/timeline", tags=["timeline"])

TIMELINE_EDIT_PROMPT = """你是一个视频时间线编辑助手。用户会给你一段自然语言编辑指令和当前时间线片段列表，你需要解析指令并返回操作。

当前时间线片段（JSON数组，每项包含 id, index从1开始, script, duration, transition）：
{clips_json}

用户指令：{command}

请返回严格的 JSON 对象，格式如下：
{{
  "op": "duration" | "script" | "delete" | "swap" | "transition" | "unknown",
  "desc": "操作描述（中文，简短）",
  "params": {{
    // duration: {{ "index": 1, "value": 5.0 }}
    // script:   {{ "index": 1, "text": "新文案" }}
    // delete:   {{ "index": 1 }}
    // swap:     {{ "index_a": 1, "index_b": 3 }}
    // transition: {{ "index": 1, "type": "fade" | "cut" | "none" }}
    // unknown:  {{}}
  }}
}}

index 从 1 开始。只输出 JSON，不要其他文字。"""


class ClipInfo(BaseModel):
    id: str
    index: int
    script: str
    duration: float
    transition: str


class TimelineEditRequest(BaseModel):
    command: str
    clips: List[ClipInfo]
    project_id: Optional[str] = None
    llm_config: Optional[Any] = None


class TimelineEditResponse(BaseModel):
    op: str
    desc: str
    params: dict


@router.post("/edit", response_model=TimelineEditResponse)
async def timeline_edit(
    data: TimelineEditRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clips_json = json.dumps(
        [c.model_dump() for c in data.clips],
        ensure_ascii=False,
    )
    prompt = TIMELINE_EDIT_PROMPT.format(
        clips_json=clips_json,
        command=data.command,
    )

    cfg = data.llm_config or {}
    if isinstance(cfg, dict):
        provider = cfg.get("provider", "claude")
        api_key = cfg.get("api_key", "")
        model = cfg.get("model", "") or ("claude-opus-4-6" if provider == "claude" else "")
        base_url = cfg.get("base_url") or _PROVIDER_BASE_URLS.get(provider)
    else:
        provider, api_key, model, base_url = "claude", "", "claude-opus-4-6", None

    from config import settings
    resolved_key = api_key or (settings.anthropic_api_key if provider == "claude" else "")

    result = None
    if resolved_key:
        try:
            raw = _call_llm_text(prompt, provider, resolved_key, model, base_url)
            raw = re.sub(r"^```(?:json)?\s*", "", raw.strip())
            raw = re.sub(r"\s*```$", "", raw)
            parsed = json.loads(raw)
            result = TimelineEditResponse(
                op=parsed.get("op", "unknown"),
                desc=parsed.get("desc", ""),
                params=parsed.get("params", {}),
            )
        except Exception as e:
            print(f"[timeline] LLM parse failed ({e}), falling back to regex")

    if result is None:
        result = _regex_parse(data.command, data.clips)

    # Append to project edit log if op was successful
    if result.op != "unknown" and data.project_id:
        try:
            project = db.query(Project).filter(
                Project.id == data.project_id,
                Project.user_id == current_user.id,
            ).first()
            if project:
                log = list(project.edit_log or [])
                log.append({
                    "timestamp": datetime.utcnow().isoformat(),
                    "op": result.op,
                    "desc": result.desc,
                    "command": data.command,
                })
                project.edit_log = log
                db.commit()
        except Exception:
            pass

    return result


def _call_llm_text(prompt: str, provider: str, api_key: str, model: str, base_url) -> str:
    """Call LLM and return raw text (not parsed as shots)."""
    if provider == "claude":
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        msg = client.messages.create(
            model=model,
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        return msg.content[0].text
    elif provider == "gemini":
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        m = genai.GenerativeModel(model_name=model)
        return m.generate_content(prompt).text
    else:
        from openai import OpenAI
        kwargs = {"api_key": api_key}
        if base_url:
            kwargs["base_url"] = base_url
        client = OpenAI(**kwargs)
        resp = client.chat.completions.create(
            model=model,
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.choices[0].message.content


def _regex_parse(command: str, clips: List[ClipInfo]) -> TimelineEditResponse:
    """Fallback regex parser (same logic as original frontend)."""
    n = len(clips)

    m = re.search(r"第\s*(\d+)\s*段.*?(\d+(?:\.\d+)?)\s*秒", command)
    if m:
        idx = int(m.group(1))
        dur = float(m.group(2))
        if 1 <= idx <= n:
            return TimelineEditResponse(op="duration", desc=f"Shot {idx} 时长改为 {dur}s", params={"index": idx, "value": dur})

    m = re.search(r"第\s*(\d+)\s*段.*?(?:文案|字幕).*?(?:改成|换成|变成)[\"\"\"「](.+?)[\"\"\"」]", command)
    if m:
        idx = int(m.group(1))
        text = m.group(2)
        if 1 <= idx <= n:
            return TimelineEditResponse(op="script", desc=f"Shot {idx} 文案改为「{text}」", params={"index": idx, "text": text})

    m = re.search(r"删除第\s*(\d+)\s*段", command)
    if m:
        idx = int(m.group(1))
        if 1 <= idx <= n:
            return TimelineEditResponse(op="delete", desc=f"删除 Shot {idx}", params={"index": idx})

    m = re.search(r"第\s*(\d+)\s*段.*?第\s*(\d+)\s*段.*?(?:对调|调换|互换)", command)
    if m:
        a, b = int(m.group(1)), int(m.group(2))
        if 1 <= a <= n and 1 <= b <= n and a != b:
            return TimelineEditResponse(op="swap", desc=f"Shot {a} 和 Shot {b} 对调", params={"index_a": a, "index_b": b})

    m = re.search(r"第\s*(\d+)\s*段.*?(?:添加|加|换成).*?(淡入淡出|fade|硬切|cut)", command, re.I)
    if m:
        idx = int(m.group(1))
        t = "fade" if re.search(r"fade|淡入淡出", m.group(2), re.I) else "cut"
        if 1 <= idx <= n:
            return TimelineEditResponse(op="transition", desc=f"Shot {idx} 转场改为 {t}", params={"index": idx, "type": t})

    return TimelineEditResponse(op="unknown", desc="", params={})
