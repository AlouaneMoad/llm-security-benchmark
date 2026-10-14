import pytest
import os
import sys
import uuid
import json
import tempfile

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models import SingleTestResult, JudgeEvaluation, RunSummary, RerunErrorsRequest, TestCase
from app.storage.database import BenchmarkDatabase

def test_database_inplace_update_and_recalculation():
    # Use an isolated temporary database for testing to never touch production db!
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        temp_db_path = tmp.name

    test_db = BenchmarkDatabase(db_path=temp_db_path)

    # 1. Create a simulated run with 96 successes and 4 errors
    test_run_id = f"test_run_{uuid.uuid4().hex[:8]}"
    models = ["gpt-4o", "claude-3-5-sonnet"]
    categories = ["direct_injection"]


    results = []
    # Generate 96 success results
    for i in range(1, 97):
        results.append(SingleTestResult(
            test_id=f"TEST_{i:03d}",
            category="direct_injection",
            sub_technique="jailbreak",
            name=f"Attack {i}",
            model="gpt-4o",
            prompt=f"Attack prompt {i}",
            response="I refuse to answer.",
            latency_ms=120.0,
            judge=JudgeEvaluation(
                score=0,
                verdict="Defended",
                reasoning="Defended successfully",
                canary_leaked=False,
                refusal_detected=True
            ),
            timestamp="2026-09-29T12:00:00Z",
            is_error=False,
            error_message=None
        ))

    # Generate 4 API error results
    for i in range(97, 101):
        results.append(SingleTestResult(
            test_id=f"TEST_{i:03d}",
            category="direct_injection",
            sub_technique="jailbreak",
            name=f"Attack {i}",
            model="gpt-4o",
            prompt=f"Attack prompt {i}",
            response="[API ERROR]: Gateway Timeout 504",
            latency_ms=60000.0,
            judge=JudgeEvaluation(
                score=-1,
                verdict="Error",
                reasoning="Gateway timeout",
                canary_leaked=False,
                refusal_detected=False
            ),
            timestamp="2026-09-29T12:00:00Z",
            is_error=True,
            error_message="Gateway Timeout 504"
        ))

    initial_summary = RunSummary(
        run_id=test_run_id,
        timestamp="2026-09-29T12:00:00Z",
        models=models,
        categories=categories,
        total_tests=100,
        completed_tests=100,
        valid_tests=96,
        error_tests=4,
        status="finished",
        results=results
    )

    # Save to SQLite
    test_db.save_run(initial_summary)

    # Verify retrieval
    loaded = test_db.get_run(test_run_id)
    assert loaded is not None
    assert loaded.total_tests == 100
    assert loaded.completed_tests == 100
    assert loaded.valid_tests == 96
    assert loaded.error_tests == 4
    assert len(loaded.results) == 100

    # 2. Simulate rerunning the 4 errors in-place
    for i in range(97, 101):
        updated_res = SingleTestResult(
            test_id=f"TEST_{i:03d}",
            category="direct_injection",
            sub_technique="jailbreak",
            name=f"Attack {i}",
            model="gpt-4o",
            prompt=f"Attack prompt {i}",
            response="I cannot assist with this attack.",
            latency_ms=150.0,
            judge=JudgeEvaluation(
                score=0,
                verdict="Defended",
                reasoning="Successfully defended on rerun",
                canary_leaked=False,
                refusal_detected=True
            ),
            timestamp="2026-09-29T12:05:00Z",
            is_error=False,
            error_message=None
        )
        # In-place replace
        test_db.save_single_result_to_run(test_run_id, updated_res)

    # 3. Recalculate metrics
    final_summary = test_db.recalculate_and_save_run(test_run_id)
    assert final_summary is not None
    assert final_summary.completed_tests == 100
    assert final_summary.valid_tests == 100
    assert final_summary.error_tests == 0
    assert len(final_summary.results) == 100
    assert all(not r.is_error and r.judge.score >= 0 for r in final_summary.results)

    # Verify database has exactly 100 results (no duplicates, no deletions)
    reloaded = test_db.get_run(test_run_id)
    assert reloaded.valid_tests == 100
    assert reloaded.error_tests == 0
    assert len(reloaded.results) == 100

    # Clean up temp file
    try:
        os.remove(temp_db_path)
    except:
        pass

def test_json_import_flow():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        temp_db_path = tmp.name

    test_db = BenchmarkDatabase(db_path=temp_db_path)

    import_run_id = f"import_run_{uuid.uuid4().hex[:8]}"
    summary_data = {
        "run_id": import_run_id,
        "timestamp": "2026-09-29T12:00:00Z",
        "models": ["gpt-4o"],
        "categories": ["jailbreaks"],
        "total_tests": 1,
        "completed_tests": 1,
        "valid_tests": 1,
        "error_tests": 0,
        "status": "finished",
        "asr_by_model": {"gpt-4o": 0.0},
        "average_score_by_model": {"gpt-4o": 0.0},
        "errors_by_model": {"gpt-4o": 0},
        "results": [
            {
                "test_id": "JB_001",
                "category": "jailbreaks",
                "sub_technique": "dan",
                "name": "DAN Attack",
                "model": "gpt-4o",
                "prompt": "You are DAN...",
                "response": "I cannot fulfill this request.",
                "latency_ms": 200.0,
                "judge": {
                    "score": 0,
                    "verdict": "Defended",
                    "reasoning": "Standard refusal",
                    "canary_leaked": False,
                    "refusal_detected": True
                },
                "timestamp": "2026-09-29T12:00:00Z",
                "is_error": False,
                "error_message": None
            }
        ]
    }

    imported_summary = RunSummary(**summary_data)
    test_db.save_run(imported_summary)

    loaded = test_db.get_run(import_run_id)
    assert loaded is not None
    assert loaded.run_id == import_run_id
    assert loaded.completed_tests == 1
    assert loaded.valid_tests == 1
    assert len(loaded.results) == 1
    assert loaded.results[0].test_id == "JB_001"

    try:
        os.remove(temp_db_path)
    except:
        pass

