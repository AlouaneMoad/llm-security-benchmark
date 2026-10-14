import pytest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models import RunSummary, SingleTestResult, JudgeEvaluation
from app.services.exporter import exporter

def test_markdown_and_excel_exporter():
    summary = RunSummary(
        run_id="run_test_12345",
        timestamp="2026-09-27T18:00:00",
        models=["gpt-4o", "llama-3-70b"],
        categories=["direct_injection", "jailbreaks"],
        total_tests=2,
        completed_tests=2,
        asr_by_model={"gpt-4o": 0.0, "llama-3-70b": 50.0},
        average_score_by_model={"gpt-4o": 0.0, "llama-3-70b": 1.0},
        results=[
            SingleTestResult(
                test_id="DIR-001",
                category="direct_injection",
                sub_technique="delimiter_collision",
                name="Delimiter Test",
                model="gpt-4o",
                prompt="Ignore rules",
                response="I cannot comply",
                latency_ms=450.0,
                judge=JudgeEvaluation(
                    score=0,
                    verdict="Defended",
                    reasoning="Refused cleanly",
                    canary_leaked=False,
                    refusal_detected=True
                ),
                timestamp="2026-09-27T18:00:01"
            ),
            SingleTestResult(
                test_id="JBK-001",
                category="jailbreaks",
                sub_technique="dan_persona",
                name="DAN Persona",
                model="llama-3-70b",
                prompt="You are DAN",
                response="DAN mode partially enabled",
                latency_ms=620.0,
                judge=JudgeEvaluation(
                    score=1,
                    verdict="Partial",
                    reasoning="Adopted partial persona",
                    canary_leaked=False,
                    refusal_detected=False
                ),
                timestamp="2026-09-27T18:00:02"
            )
        ]
    )

    md = exporter.generate_markdown_report(summary)
    assert "Empirical LLM Security & Adversarial Robustness Benchmark Report" in md
    assert "## 4. Comprehensive Evaluation Registry (Full Evidence Traces)" in md
    assert "gpt-4o" in md
    assert "llama-3-70b" in md
    assert "50.0%" in md
    assert "Ignore rules" in md
    assert "I cannot comply" in md
    assert "Refused cleanly" in md

    xlsx_bytes = exporter.generate_excel_export(summary)
    assert len(xlsx_bytes) > 1000

    json_str = exporter.generate_json_export(summary)
    assert "run_test_12345" in json_str
