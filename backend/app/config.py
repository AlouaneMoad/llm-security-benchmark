import os
import json
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional, Union

DEFAULT_TARGET_MODELS = [
    "deepseek-v4-flash-0731",
    "deepseek-v4-pro-0813",
    "glm-5.3-flash",
    "glm-5.3",
    "kimi-k2.6",
    "kimi-k3",
    "MiniMax-M3",
    "MiniMax-M2.7",
    "qwen3.8-flash",
    "mimo-v2.6-pro",
    "mimo-v2.6-flash",
    "hy3",
    "hy4-preview",
    "gpt-6-luna",
    "gpt-5.6-terra",
    "gpt-5.6-sol",
    "claude-sonnet-5",
    "gemini-3.8-flash",
    "grok-4.6",
    "claude-opus-5",
    "gpt-6-sol",
    "claude-fable-5",
    "qwen3.8-max",
    "gpt-6-astra",
    "claude-opus-4-8",
    "gemini-3.7-flash"
]

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env")),
        extra="ignore"
    )

    app_name: str = "LLM Security Benchmark Platform"
    api_prefix: str = "/api"

    # OpenAI compatible global gateway
    openai_base_url: str = ""
    openai_api_key: str = ""

    # Target models requested by user (supports comma-separated string or list)
    target_models: Union[List[str], str] = DEFAULT_TARGET_MODELS

    # Judge configuration
    judge_model: str = "gemini-3.8-flash-high"
    use_separate_judge_config: bool = True
    judge_base_url: Optional[str] = "http://localhost:8080/v1"
    judge_api_key: Optional[str] = ""

    # Concurrency limit
    max_concurrency: int = 5
    # Default request timeout in seconds
    request_timeout: float = 60.0

    @field_validator("target_models", mode="before")
    @classmethod
    def parse_target_models(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [m.strip() for m in v.split(",") if m.strip()]
        return v

settings = Settings()
