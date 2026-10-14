from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class TestCase(BaseModel):
    id: str
    category: str
    sub_technique: str
    name: str
    prompt: str
    context: Optional[str] = None
    expected_behavior: str
    source_reference: Optional[str] = "OWASP LLM01 / Red-Teaming Benchmark"
    canary_targeted: bool = False

class GlobalConfigUpdate(BaseModel):
    openai_base_url: Optional[str] = None
    openai_api_key: Optional[str] = None
    target_models: Optional[List[str]] = None
    judge_model: Optional[str] = None
    use_separate_judge_config: Optional[bool] = None
    judge_base_url: Optional[str] = None
    judge_api_key: Optional[str] = None
    max_concurrency: Optional[int] = None
    custom_system_prompt: Optional[str] = None
    canary_token: Optional[str] = None

class JudgeEvaluation(BaseModel):
    score: int = Field(..., description="0 = Defended, 1 = Partial Breach, 2 = Full Breach, -1 = API Error")
    verdict: str = Field(..., description="Defended, Partial, Breached, Error")
    reasoning: str
    canary_leaked: bool = False
    refusal_detected: bool = False

class SingleTestResult(BaseModel):
    test_id: str
    category: str
    sub_technique: str
    name: str
    model: str
    prompt: str
    response: str
    latency_ms: float
    judge: JudgeEvaluation
    timestamp: str
    is_error: bool = False
    error_message: Optional[str] = None

class RunSummary(BaseModel):
    run_id: str
    timestamp: str
    models: List[str]
    categories: List[str]
    total_tests: int
    completed_tests: int
    valid_tests: int = 0
    error_tests: int = 0
    asr_by_model: Dict[str, float] = {}  # Attack Success Rate % (breach / valid)
    average_score_by_model: Dict[str, float] = {}
    errors_by_model: Dict[str, int] = {}
    status: str = "finished"  # "running", "paused", "finished", "aborted"
    custom_system_prompt: Optional[str] = None
    canary_token: Optional[str] = None
    judge_model: Optional[str] = None
    enable_defense: bool = False
    results: List[SingleTestResult] = []

class StartRunRequest(BaseModel):
    run_id: Optional[str] = None  # If resuming an existing run
    models: Optional[List[str]] = None
    categories: Optional[List[str]] = None
    test_ids: Optional[List[str]] = None
    concurrency: Optional[int] = 5
    custom_system_prompt: Optional[str] = None
    canary_token: Optional[str] = None
    judge_model: Optional[str] = None
    enable_defense: bool = False

class SingleTestRunRequest(BaseModel):
    test_id: str
    model: str
    custom_system_prompt: Optional[str] = None
    canary_token: Optional[str] = None
    judge_model: Optional[str] = None
    enable_defense: bool = False

class RerunErrorsRequest(BaseModel):
    run_id: str
    model: Optional[str] = None          # Optional: target a specific model or all models
    concurrency: Optional[int] = 5
    custom_system_prompt: Optional[str] = None
    canary_token: Optional[str] = None
    judge_model: Optional[str] = None

