"""Image generation service for shot previews.
Supports mock, DALL-E 3 (OpenAI), Replicate (FLUX), and custom OpenAI-compat endpoints.
"""
import hashlib


def generate_preview_image(
    description: str,
    provider: str = "mock",
    api_key: str = "",
    model: str = "",
    base_url: str | None = None,
) -> str:
    """Generate a preview image for a shot description. Returns image URL."""
    if provider == "mock" or not api_key:
        return _mock_image(description)
    elif provider == "openai":
        return _dalle(description, api_key, model or "dall-e-3")
    elif provider == "replicate":
        return _replicate(description, api_key, model or "black-forest-labs/flux-schnell")
    elif provider == "custom":
        return _openai_compat_image(description, api_key, model, base_url)
    else:
        return _mock_image(description)


def _mock_image(description: str) -> str:
    """Return a deterministic placeholder image based on description hash."""
    seed = int(hashlib.md5(description.encode()).hexdigest()[:8], 16) % 1000
    return f"https://picsum.photos/seed/{seed}/640/360"


def _dalle(description: str, api_key: str, model: str) -> str:
    from openai import OpenAI
    client = OpenAI(api_key=api_key)
    # Enhance prompt for cinematic quality
    prompt = f"Cinematic film still, {description}. Professional cinematography, high quality, 16:9 aspect ratio."
    resp = client.images.generate(
        model=model,
        prompt=prompt[:1000],
        size="1792x1024",
        quality="standard",
        n=1,
    )
    return resp.data[0].url


def _replicate(description: str, api_key: str, model: str) -> str:
    import httpx
    prompt = f"Cinematic film still, {description}. Professional cinematography, high quality."
    resp = httpx.post(
        f"https://api.replicate.com/v1/models/{model}/predictions",
        headers={"Authorization": f"Token {api_key}", "Content-Type": "application/json"},
        json={"input": {"prompt": prompt, "aspect_ratio": "16:9"}},
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    # Poll for result
    prediction_url = data.get("urls", {}).get("get")
    if not prediction_url:
        raise ValueError("No prediction URL returned")
    import time
    for _ in range(30):
        time.sleep(2)
        poll = httpx.get(prediction_url, headers={"Authorization": f"Token {api_key}"}, timeout=10)
        poll.raise_for_status()
        result = poll.json()
        if result.get("status") == "succeeded":
            output = result.get("output")
            if isinstance(output, list):
                return output[0]
            return output
        if result.get("status") == "failed":
            raise ValueError(f"Replicate prediction failed: {result.get('error')}")
    raise TimeoutError("Replicate prediction timed out")


def _openai_compat_image(description: str, api_key: str, model: str, base_url: str | None) -> str:
    from openai import OpenAI
    kwargs = {"api_key": api_key}
    if base_url:
        kwargs["base_url"] = base_url
    client = OpenAI(**kwargs)
    prompt = f"Cinematic film still, {description}. Professional cinematography, high quality."
    resp = client.images.generate(
        model=model or "dall-e-3",
        prompt=prompt[:1000],
        n=1,
    )
    return resp.data[0].url
