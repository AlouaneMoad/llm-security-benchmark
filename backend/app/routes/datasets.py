from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict
from app.models import TestCase
from app.services.dataset_loader import dataset_loader

router = APIRouter(prefix="/datasets", tags=["datasets"])

@router.get("/categories", response_model=List[str])
async def list_categories():
    return dataset_loader.get_categories()

@router.get("/tests", response_model=List[TestCase])
async def list_tests(
    category: Optional[str] = Query(None, description="Filter by category slug"),
    search: Optional[str] = Query(None, description="Search by name or sub-technique")
):
    if category:
        tests = dataset_loader.load_category(category)
    else:
        tests = dataset_loader.load_all_tests()

    if search:
        s = search.lower()
        tests = [
            t for t in tests
            if s in t.name.lower() or s in t.sub_technique.lower() or s in t.prompt.lower()
        ]
    return tests

@router.get("/tests/{test_id}", response_model=TestCase)
async def get_test(test_id: str):
    test = dataset_loader.get_test_by_id(test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Test case not found.")
    return test

@router.get("/stats")
async def get_dataset_stats():
    categories = dataset_loader.get_categories()
    counts: Dict[str, int] = {}
    for cat in categories:
        counts[cat] = len(dataset_loader.load_category(cat))
    return {
        "total_categories": len(categories),
        "total_test_cases": sum(counts.values()),
        "breakdown": counts
    }
