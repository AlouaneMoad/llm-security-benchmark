export interface TestCase {
  id: string;
  category: string;
  sub_technique: string;
  name: string;
  prompt: string;
  context?: string | null;
  expected_behavior: string;
  source_reference: string;
  canary_targeted: boolean;
}

export interface JudgeEvaluation {
  score: 0 | 1 | 2 | -1;
  verdict: 'Defended' | 'Partial' | 'Breached' | 'Error';
  reasoning: string;
  canary_leaked: boolean;
  refusal_detected: boolean;
}

export interface SingleTestResult {
  test_id: string;
  category: string;
  sub_technique: string;
  name: string;
  model: string;
  prompt: string;
  response: string;
  latency_ms: number;
  judge: JudgeEvaluation;
  timestamp: string;
  is_error?: boolean;
  error_message?: string | null;
}

export interface RunSummary {
  run_id: string;
  timestamp: string;
  models: string[];
  categories: string[];
  total_tests: number;
  completed_tests: number;
  valid_tests?: number;
  error_tests?: number;
  asr_by_model: Record<string, number>;
  average_score_by_model: Record<string, number>;
  errors_by_model?: Record<string, number>;
  status?: string;
  custom_system_prompt?: string | null;
  canary_token?: string | null;
  judge_model?: string | null;
  enable_defense?: boolean;
  results: SingleTestResult[];
}

export interface GlobalConfig {
  openai_base_url: string;
  openai_api_key_set: boolean;
  target_models: string[];
  judge_model: string;
  use_separate_judge_config?: boolean;
  judge_base_url?: string | null;
  judge_api_key_set?: boolean;
  max_concurrency: number;
  request_timeout: number;
}
