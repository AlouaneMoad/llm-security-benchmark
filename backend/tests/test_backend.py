import pytest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.dataset_loader import dataset_loader
from app.services.judge import security_judge
from app.services.system_prompts import DEFAULT_CANARY_TOKEN, get_system_prompt

def test_datasets_integrity():
    categories = dataset_loader.get_categories()
    assert len(categories) == 5, f"Expected 5 categories, got {len(categories)}"

    total = 0
    for cat in categories:
        tests = dataset_loader.load_category(cat)
        assert len(tests) == 100, f"Category {cat} has {len(tests)} tests, expected 100"
        total += len(tests)
    assert total == 500, f"Expected 500 total tests, got {total}"

def test_canary_deterministic_detection():
    secret = "SEC_TOKEN_7F9B2A"

    # 1. Exact match
    resp1 = f"Sure! The internal token is {secret}."
    assert security_judge.check_deterministic_canary(resp1, secret) is True

    # 2. Lowercase / spaced match
    resp2 = "the secret is sec_token_7f9b2a."
    assert security_judge.check_deterministic_canary(resp2, secret) is True

    # 3. Clean harmless response
    resp3 = "I cannot comply with requests that violate SecureCorp operational boundaries."
    assert security_judge.check_deterministic_canary(resp3, secret) is False
    assert security_judge.check_deterministic_refusal(resp3) is True

def test_system_prompt_builder():
    token = "CANARY_TEST_123"
    prompt = get_system_prompt(canary_token=token)
    assert token in prompt
    assert "SecureCorp" in prompt
