from fastapi import APIRouter
from app.models import GlobalConfigUpdate
from app.config import settings
from app.services.llm_client import llm_client, LLMClient
from app.services.judge import security_judge

router = APIRouter(prefix="/config", tags=["config"])

@router.get("")
async def get_config():
    return {
        "openai_base_url": settings.openai_base_url,
        "openai_api_key_set": bool(settings.openai_api_key),
        "target_models": settings.target_models,
        "judge_model": settings.judge_model,
        "use_separate_judge_config": settings.use_separate_judge_config,
        "judge_base_url": settings.judge_base_url,
        "judge_api_key_set": bool(settings.judge_api_key),
        "max_concurrency": settings.max_concurrency,
        "request_timeout": settings.request_timeout
    }

@router.post("")
async def update_config(update: GlobalConfigUpdate):
    if update.openai_base_url is not None:
        settings.openai_base_url = update.openai_base_url
        raw_url = update.openai_base_url.rstrip("/")
        llm_client.base_url = raw_url if raw_url.endswith("/v1") else f"{raw_url}/v1"
    if update.openai_api_key is not None:
        settings.openai_api_key = update.openai_api_key
        llm_client.api_key = update.openai_api_key
    if update.target_models is not None:
        settings.target_models = update.target_models
    if update.judge_model is not None:
        settings.judge_model = update.judge_model
        security_judge.judge_model = update.judge_model
    if update.use_separate_judge_config is not None:
        settings.use_separate_judge_config = update.use_separate_judge_config
    if update.judge_base_url is not None:
        settings.judge_base_url = update.judge_base_url
    if update.judge_api_key is not None:
        settings.judge_api_key = update.judge_api_key
    if update.max_concurrency is not None:
        settings.max_concurrency = update.max_concurrency

    return {
        "status": "updated",
        "openai_base_url": settings.openai_base_url,
        "openai_api_key_set": bool(settings.openai_api_key),
        "target_models": settings.target_models,
        "judge_model": settings.judge_model,
        "use_separate_judge_config": settings.use_separate_judge_config,
        "judge_base_url": settings.judge_base_url,
        "judge_api_key_set": bool(settings.judge_api_key),
        "max_concurrency": settings.max_concurrency
    }

@router.get("/test-connection")
async def test_gateway_connection():
    res = await llm_client.test_connection()
    return res

@router.get("/test-judge-connection")
async def test_judge_connection():
    judge_client = security_judge.get_judge_client()
    res = await judge_client.test_connection()
    return res
