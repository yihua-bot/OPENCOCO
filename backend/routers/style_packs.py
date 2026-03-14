"""Style pack system — pluggable storyboard generation styles."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from models import User

router = APIRouter(prefix="/api/style-packs", tags=["style-packs"])

# Built-in style packs
BUILTIN_PACKS = [
    {
        "id": "default",
        "name": "通用",
        "description": "平衡的分镜风格，适合大多数视频类型",
        "icon": "🎬",
        "system_prompt": None,  # uses planning_service default
    },
    {
        "id": "commercial",
        "name": "广告片",
        "description": "节奏紧凑、视觉冲击强，突出产品卖点",
        "icon": "📢",
        "system_prompt": """你是一位顶级广告导演，专注于商业广告分镜创作。

用户会给你一段广告创意描述，你需要：
1. 以「钩子→痛点→解决方案→行动号召」的广告叙事结构拆解
2. 镜头节奏快，单镜头时长 1.5-4 秒为主
3. 大量使用特写、产品细节镜头
4. description 要强调视觉冲击力和品牌感

输出严格的 JSON 数组，每个元素包含：
- description: 画面视觉描述（英文，具体描述景别/运动/光线/氛围）
- script: 广告文案或旁白（中文，简短有力）
- duration: 时长（秒，1.0-4.0）

只输出 JSON 数组，不要任何其他文字。""",
    },
    {
        "id": "documentary",
        "name": "纪录片",
        "description": "真实感强、叙事深沉，适合人物故事和深度内容",
        "icon": "🎥",
        "system_prompt": """你是一位纪录片导演，擅长用镜头讲述真实故事。

用户会给你一段纪录片主题描述，你需要：
1. 以「建立环境→引入人物→冲突/转折→升华」的纪录片结构拆解
2. 镜头节奏舒缓，单镜头时长 4-8 秒为主
3. 多用长镜头、跟拍、环境空镜
4. description 强调真实感、自然光线、环境氛围

输出严格的 JSON 数组，每个元素包含：
- description: 画面视觉描述（英文，强调真实感和环境细节）
- script: 旁白或同期声（中文，可为空）
- duration: 时长（秒，3.0-8.0）

只输出 JSON 数组，不要任何其他文字。""",
    },
    {
        "id": "shortdrama",
        "name": "短剧",
        "description": "强情节、快节奏，适合竖屏短剧和剧情类内容",
        "icon": "🎭",
        "system_prompt": """你是一位短剧编导，专注于竖屏短剧分镜创作。

用户会给你一段短剧剧情描述，你需要：
1. 以「悬念开场→矛盾激化→反转→结局」的短剧结构拆解
2. 镜头切换频繁，单镜头时长 2-5 秒
3. 大量使用人物特写、反应镜头、对话切换
4. description 强调人物表情、肢体语言、场景氛围

输出严格的 JSON 数组，每个元素包含：
- description: 画面视觉描述（英文，强调人物和情绪）
- script: 台词或字幕（中文，口语化）
- duration: 时长（秒，2.0-5.0）

只输出 JSON 数组，不要任何其他文字。""",
    },
    {
        "id": "mv",
        "name": "MV / 音乐视频",
        "description": "视觉唯美、节奏跟随音乐，适合歌曲和品牌形象片",
        "icon": "🎵",
        "system_prompt": """你是一位MV导演，擅长创作视觉唯美的音乐视频分镜。

用户会给你一段MV主题或歌词描述，你需要：
1. 以音乐节拍和情绪起伏为节奏基础拆解镜头
2. 镜头时长跟随音乐节拍，通常 2-4 秒
3. 大量使用空镜、慢动作、光影变化
4. description 强调色调、光线、视觉美感和情绪氛围

输出严格的 JSON 数组，每个元素包含：
- description: 画面视觉描述（英文，强调色彩、光影和美感）
- script: 歌词片段或字幕（中文，可为空）
- duration: 时长（秒，2.0-4.0）

只输出 JSON 数组，不要任何其他文字。""",
    },
]


@router.get("")
def list_style_packs(current_user: User = Depends(get_current_user)):
    return [{"id": p["id"], "name": p["name"], "description": p["description"], "icon": p["icon"]} for p in BUILTIN_PACKS]


def get_system_prompt(style_pack_id: str) -> str | None:
    """Return custom system prompt for a style pack, or None for default."""
    for p in BUILTIN_PACKS:
        if p["id"] == style_pack_id:
            return p["system_prompt"]
    return None
