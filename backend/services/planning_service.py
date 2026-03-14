"""Storyboard planning service — supports multiple LLM providers.
Falls back to keyword-based mock if no API key is configured.
"""
import uuid
import json
import re
from sqlalchemy.orm import Session
from models import Storyboard, Shot
from config import settings

SYSTEM_PROMPT = """你是一位专业的视频导演和分镜师，擅长将创意描述转化为精确的分镜脚本。

用户会给你一段视频创意描述，你需要：
1. 深入理解内容的节奏、情绪和叙事结构
2. 动态决定分镜数量（根据内容复杂度，通常 3-10 个镜头）
3. 每个镜头的时长根据内容节奏决定，不要固定

输出严格的 JSON 数组，每个元素包含：
- description: 画面视觉描述（英文，用于 AI 视频生成，要具体描述景别/运动/光线/氛围）
- script: 该镜头的字幕或旁白（中文，可为空字符串）
- duration: 时长（秒，浮点数，1.0-10.0）

只输出 JSON 数组，不要任何其他文字。"""


def _parse_shots(raw: str) -> list[dict]:
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    shots = json.loads(raw)
    result = []
    for s in shots:
        result.append({
            "description": str(s.get("description", "")).strip(),
            "script": str(s.get("script", "")).strip(),
            "duration": max(1.0, min(10.0, float(s.get("duration", 4.0)))),
        })
    return result


def _call_claude(prompt: str, api_key: str, model: str, system: str = SYSTEM_PROMPT) -> list[dict]:
    import anthropic
    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model=model,
        max_tokens=2048,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return _parse_shots(message.content[0].text)


def _call_openai_compat(prompt: str, api_key: str, model: str, base_url: str | None = None, system: str = SYSTEM_PROMPT) -> list[dict]:
    """Works for OpenAI, DeepSeek, Qwen, and any OpenAI-compatible endpoint."""
    from openai import OpenAI
    kwargs = {"api_key": api_key}
    if base_url:
        kwargs["base_url"] = base_url
    client = OpenAI(**kwargs)
    resp = client.chat.completions.create(
        model=model,
        max_tokens=2048,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
    )
    return _parse_shots(resp.choices[0].message.content)


def _call_gemini(prompt: str, api_key: str, model: str, system: str = SYSTEM_PROMPT) -> list[dict]:
    import google.generativeai as genai
    genai.configure(api_key=api_key)
    m = genai.GenerativeModel(
        model_name=model,
        system_instruction=system,
    )
    resp = m.generate_content(prompt)
    return _parse_shots(resp.text)


# Provider base URLs for OpenAI-compat providers
_PROVIDER_BASE_URLS = {
    "deepseek": "https://api.deepseek.com/v1",
    "qwen": "https://dashscope.aliyuncs.com/compatible-mode/v1",
}


def _call_llm(prompt: str, provider: str, api_key: str, model: str, base_url: str | None = None, system: str = SYSTEM_PROMPT) -> list[dict]:
    if provider == "claude":
        return _call_claude(prompt, api_key, model, system)
    elif provider == "gemini":
        return _call_gemini(prompt, api_key, model, system)
    elif provider in ("openai", "deepseek", "qwen", "custom"):
        resolved_base = base_url or _PROVIDER_BASE_URLS.get(provider)
        return _call_openai_compat(prompt, api_key, model, resolved_base, system)
    else:
        raise ValueError(f"Unknown provider: {provider}")


# --- Fallback mock ---
_MOCK_TEMPLATES = {
    "fight": [
        {"description": "Wide establishing shot of the arena, two fighters face off", "script": "决战开始", "duration": 4.0},
        {"description": "Close-up of fighter A's determined eyes", "script": "", "duration": 2.0},
        {"description": "Dynamic action, fighter A throws a spinning kick", "script": "雷霆一击！", "duration": 3.0},
        {"description": "Fighter B blocks and counters with a punch", "script": "", "duration": 3.0},
        {"description": "Slow-motion final blow, fighter A wins", "script": "胜利", "duration": 5.0},
    ],
    "product": [
        {"description": "Product hero shot on clean white background, dramatic lighting", "script": "未来已来", "duration": 3.0},
        {"description": "Extreme close-up of key product feature", "script": "精工细作", "duration": 3.0},
        {"description": "Lifestyle shot, person using product", "script": "为你而生", "duration": 4.0},
        {"description": "Brand logo fade in on dark background", "script": "立即拥有", "duration": 3.0},
    ],
    "default": [
        {"description": "Opening wide shot establishing the scene", "script": "", "duration": 4.0},
        {"description": "Medium shot introducing the main subject", "script": "", "duration": 4.0},
        {"description": "Close-up detail shot", "script": "", "duration": 3.0},
        {"description": "Closing wide shot with call to action", "script": "", "duration": 4.0},
    ],
}
_MOCK_KEYWORDS = {
    "fight": ["fight", "martial", "combat", "battle", "kung fu", "武打", "打架", "格斗", "动作"],
    "product": ["product", "commercial", "ad", "brand", "launch", "广告", "产品", "商业"],
}


def _mock_shots(prompt: str) -> list[dict]:
    lower = prompt.lower()
    for key, kws in _MOCK_KEYWORDS.items():
        if any(k in lower for k in kws):
            return _MOCK_TEMPLATES[key]
    return _MOCK_TEMPLATES["default"]


def generate_storyboard(
    project_id: str,
    prompt: str,
    db: Session,
    provider: str = "claude",
    api_key: str = "",
    model: str = "",
    base_url: str | None = None,
    fallbacks: list[dict] | None = None,
    context_md: str = "",
    style_pack_id: str = "default",
) -> Storyboard:
    """Create a Storyboard with LLM-generated shots. Tries fallback chain before mock."""
    # Resolve system prompt from style pack
    from routers.style_packs import get_system_prompt
    custom_prompt = get_system_prompt(style_pack_id)
    system = custom_prompt if custom_prompt else SYSTEM_PROMPT

    # Build chain: primary + fallbacks
    chain = [{"provider": provider, "api_key": api_key, "model": model, "base_url": base_url}]
    for fb in (fallbacks or []):
        chain.append({
            "provider": fb.get("provider", "claude"),
            "api_key": fb.get("api_key", ""),
            "model": fb.get("model", ""),
            "base_url": fb.get("base_url"),
        })

    # Build prompt with project context
    full_prompt = prompt
    if context_md:
        full_prompt = f"【项目背景与风格偏好】\n{context_md}\n\n【本次视频描述】\n{prompt}"

    shot_data = None
    for entry in chain:
        p = entry["provider"]
        key = entry["api_key"] or (settings.anthropic_api_key if p == "claude" else "")
        m = entry["model"] or "claude-opus-4-6"
        if not key:
            continue
        try:
            shot_data = _call_llm(full_prompt, p, key, m, entry["base_url"], system)
            break
        except Exception as e:
            print(f"[planning] {p}/{m} failed ({e}), trying next")

    if shot_data is None:
        shot_data = _mock_shots(prompt)

    storyboard = Storyboard(
        id=str(uuid.uuid4()),
        project_id=project_id,
        prompt=prompt,
        title=prompt[:50],
    )
    db.add(storyboard)
    db.flush()

    for i, s in enumerate(shot_data):
        db.add(Shot(
            id=str(uuid.uuid4()),
            storyboard_id=storyboard.id,
            order=i,
            description=s["description"],
            script=s["script"],
            duration=s["duration"],
        ))

    db.commit()
    db.refresh(storyboard)
    return storyboard


REFINE_PROMPT = """你是一位专业的视频导演。用户有一个现有的分镜脚本，他们想要修改它。

当前分镜脚本（JSON数组）：
{current_shots}

用户的修改要求：{instruction}

请根据用户的要求修改分镜脚本，返回完整的修改后的 JSON 数组。
每个元素包含：
- description: 画面视觉描述（英文）
- script: 字幕或旁白（中文，可为空字符串）
- duration: 时长（秒，1.0-10.0）

只输出 JSON 数组，不要任何其他文字。"""


def refine_storyboard(
    storyboard_id: str,
    instruction: str,
    db: Session,
    provider: str = "claude",
    api_key: str = "",
    model: str = "",
    base_url: str | None = None,
    fallbacks: list[dict] | None = None,
) -> tuple[Storyboard, str]:
    """Refine an existing storyboard based on user instruction. Returns (storyboard, ai_reply)."""
    storyboard = db.query(Storyboard).filter(Storyboard.id == storyboard_id).first()
    if not storyboard:
        raise ValueError(f"Storyboard {storyboard_id} not found")

    current_shots = [
        {"description": s.description, "script": s.script, "duration": s.duration}
        for s in storyboard.shots
    ]
    prompt = REFINE_PROMPT.format(
        current_shots=json.dumps(current_shots, ensure_ascii=False),
        instruction=instruction,
    )

    chain = [{"provider": provider, "api_key": api_key, "model": model, "base_url": base_url}]
    for fb in (fallbacks or []):
        chain.append({"provider": fb.get("provider", "claude"), "api_key": fb.get("api_key", ""),
                       "model": fb.get("model", ""), "base_url": fb.get("base_url")})

    shot_data = None
    for entry in chain:
        p = entry["provider"]
        key = entry["api_key"] or (settings.anthropic_api_key if p == "claude" else "")
        m = entry["model"] or "claude-opus-4-6"
        if not key:
            continue
        try:
            shot_data = _call_llm(prompt, p, key, m, entry["base_url"])
            break
        except Exception as e:
            print(f"[refine] {p}/{m} failed ({e}), trying next")

    if shot_data is None:
        return storyboard, "抱歉，没有配置可用的 AI 模型，无法修改分镜。请在模型设置中添加分镜模型。"

    # Delete old shots and create new ones
    for shot in storyboard.shots:
        db.delete(shot)
    db.flush()

    for i, s in enumerate(shot_data):
        db.add(Shot(
            id=str(uuid.uuid4()),
            storyboard_id=storyboard.id,
            order=i,
            description=s["description"],
            script=s["script"],
            duration=s["duration"],
        ))

    db.commit()
    db.refresh(storyboard)

    ai_reply = f"已根据你的要求修改分镜，现在共 {len(shot_data)} 个镜头。"
    return storyboard, ai_reply
