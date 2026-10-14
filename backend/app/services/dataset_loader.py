import os
import json
from typing import List, Dict, Optional
from app.models import TestCase

DATASETS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../datasets"))

CATEGORY_FILES = {
    "direct_injection": "direct_injection.json",
    "indirect_injection": "indirect_injection.json",
    "jailbreaks": "jailbreaks.json",
    "system_prompt_extraction": "system_prompt_extraction.json",
    "obfuscation_ciphers": "obfuscation_ciphers.json"
}

class DatasetLoader:
    def __init__(self):
        self._cache: Dict[str, List[TestCase]] = {}

    def get_categories(self) -> List[str]:
        return list(CATEGORY_FILES.keys())

    def load_category(self, category: str) -> List[TestCase]:
        if category in self._cache:
            return self._cache[category]

        filename = CATEGORY_FILES.get(category)
        if not filename:
            return []

        filepath = os.path.join(DATASETS_DIR, filename)
        if not os.path.exists(filepath):
            return []

        with open(filepath, "r", encoding="utf-8") as f:
            raw_data = json.load(f)

        tests = [TestCase(**item) for item in raw_data]
        self._cache[category] = tests
        return tests

    def load_all_tests(self) -> List[TestCase]:
        all_tests = []
        for cat in self.get_categories():
            all_tests.extend(self.load_category(cat))
        return all_tests

    def get_test_by_id(self, test_id: str) -> Optional[TestCase]:
        for test in self.load_all_tests():
            if test.id == test_id:
                return test
        return None

dataset_loader = DatasetLoader()
