"""AI chat service — uses real LLM when configured, falls back to mock."""
import random
from typing import Optional

MOCK_RESPONSES = [
    "Got it! I'm generating your video now. This usually takes about 30 seconds.",
    "Perfect! Starting the video generation. I'll use cinematic lighting and smooth transitions.",
    "On it! Creating your video with the style you described. Should be ready shortly.",
    "Great idea! Generating now — I'll add background music and subtitles automatically.",
    "Understood! Building your video. I'll apply color grading and effects as requested.",
]

MOCK_REFINE_RESPONSES = [
    "Making that change now. Updated video will be ready in a moment.",
    "Got it, adjusting the video. One moment...",
    "Sure! Applying your changes and regenerating.",
    "On it! Tweaking the video based on your feedback.",
]

KEYWORDS_GENERATE = ["create", "make", "generate", "build", "produce", "video", "anime", "film", "commercial"]
KEYWORDS_REFINE = ["faster", "slower", "change", "update", "adjust", "fix", "add", "remove", "more", "less"]
KEYWORDS_PLAN = ["film", "movie", "scene", "storyboard", "martial", "fighting", "commercial", "ad campaign",
                 "武打", "打架", "格斗", "电影", "分镜", "广告"]

CHAT_SYSTEM_PROMPT = """你是 Coco，一个专业的 AI 视频创作助手。你帮助用户规划、生成和优化视频内容。

你的职责：
- 理解用户的视频创意，给出专业建议
- 帮助用户优化视频描述，使其更适合 AI 生成
- 对用户的修改请求给出简洁、明确的回应
- 保持对话简短有力，不要过度解释

回复要求：
- 中文回复（除非用户用英文）
- 简洁，不超过 3 句话
- 不要重复用户说的内容
- 如果用户描述了视频内容，确认你理解并告知正在处理"""


def should_plan(content: str) -> bool:
    """Detect if the user wants a multi-shot planned video."""
    lower = content.lower()
    return any(k in lower for k in KEYWORDS_PLAN) or len(content) > 60


def should_generate_video(content: str) -> bool:
    lower = content.lower()
    return any(k in lower for k in KEYWORDS_GENERATE) or len(content) > 20


def get_ai_response(
    content: str,
    is_first_message: bool = False,
    llm_config: Optional[dict] = None,
) -> tuple[str, bool]:
    """Returns (response_text, should_generate_video)."""
    lower = content.lower()
    is_refine = any(k in lower for k in KEYWORDS_REFINE) and not is_first_message
    do_generate = is_refine or should_generate_video(content) or is_first_message

    # Try real LLM
    if llm_config:
        provider = llm_config.get("provider", "claude")
        api_key = llm_config.get("api_key", "")
        model = llm_config.get("model", "") or ("claude-opus-4-6" if provider == "claude" else "")
        base_url = llm_config.get("base_url")

        if not api_key:
            from config import settings
            api_key = settings.anthropic_api_key if provider == "claude" else ""

        if api_key:
            try:
                from services.planning_service import _call_llm_text, _PROVIDER_BASE_URLS
                resolved_base = base_url or _PROVIDER_BASE_URLS.get(provider)
                response = _call_llm_text(
                    f"{CHAT_SYSTEM_PROMPT}\n\n用户说：{content}",
                    provider, api_key, model, resolved_base,
                )
                return response.strip(), do_generate
            except Exception as e:
                print(f"[ai_chat] LLM failed ({e}), falling back to mock")

    # Mock fallback
    if is_refine:
        return random.choice(MOCK_REFINE_RESPONSES), True
    if do_generate:
        return random.choice(MOCK_RESPONSES), True
    return "能描述一下你想创作什么样的视频吗？", False
