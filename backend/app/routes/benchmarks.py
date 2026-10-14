import json
from fastapi import APIRouter, HTTPException, Query, Response, UploadFile, File
from sse_starlette.sse import EventSourceResponse
from typing import List, Optional
from app.models import StartRunRequest, SingleTestRunRequest, SingleTestResult, RunSummary, RerunErrorsRequest
from app.services.runner import runner
from app.services.dataset_loader import dataset_loader
from app.services.llm_client import llm_client
from app.services.judge import security_judge
from app.storage.database import db

router = APIRouter(prefix="/benchmarks", tags=["benchmarks"])

@router.post("/run-single", response_model=SingleTestResult)
async def run_single_attack(req: SingleTestRunRequest):
    test_case = dataset_loader.get_test_by_id(req.test_id)
    if not test_case:
        raise HTTPException(status_code=404, detail=f"Test case {req.test_id} not found.")

    result = await runner.run_single_test(
        test_case=test_case,
        model=req.model,
        custom_system_prompt=req.custom_system_prompt,
        canary_token=req.canary_token,
        client=llm_client,
        judge=security_judge,
        judge_model=req.judge_model,
        enable_defense=req.enable_defense
    )
    return result

@router.post("/run-stream")
async def run_benchmark_stream(req: StartRunRequest):
    """
    Executes a benchmark run with real-time SSE event streaming.
    Yields 'run_started', 'test_completed', and 'run_finished' events.
    """
    async def event_generator():
        async for event in runner.execute_benchmark_stream(req, client=llm_client, judge=security_judge):
            yield {
                "event": event["event"],
                "data": json.dumps(event["data"], ensure_ascii=False)
            }

    return EventSourceResponse(event_generator())

@router.post("/cancel/{run_id}")
async def cancel_run(run_id: str):
    cancelled = runner.cancel_run(run_id)
    if not cancelled:
        raise HTTPException(status_code=404, detail="Run not found or already finished.")
    return {"status": "cancellation_requested", "run_id": run_id}

@router.post("/pause/{run_id}")
async def pause_run(run_id: str):
    paused = runner.pause_run(run_id)
    if not paused:
        raise HTTPException(status_code=404, detail="Run not found or not active.")
    return {"status": "pause_requested", "run_id": run_id}

@router.post("/rerun-errors")
async def rerun_api_errors_stream(req: RerunErrorsRequest):
    """
    Reruns only errored test evaluations for a given run with SSE streaming.
    Yields 'rerun_started', 'error_resolved', and 'rerun_finished' events.
    """
    async def event_generator():
        async for event in runner.rerun_errors_stream(req, client=llm_client, judge=security_judge):
            yield {
                "event": event["event"],
                "data": json.dumps(event["data"], ensure_ascii=False)
            }

    return EventSourceResponse(event_generator())

@router.post("/import", response_model=RunSummary)
async def import_run(file: UploadFile = File(...)):
    """
    Accepts an exported Run JSON file, validates it, persists/upserts into SQLite,
    and returns the imported RunSummary ready for viewing, exports, and error reruns.
    """
    if not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="Only .json files are supported.")

    try:
        content = await file.read()
        raw_data = json.loads(content.decode("utf-8"))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON file: {str(e)}")

    if not isinstance(raw_data, dict) or "results" not in raw_data or not isinstance(raw_data["results"], list):
        raise HTTPException(status_code=422, detail="Invalid benchmark format: 'results' array is missing.")

    # Auto-heal and normalize data if metadata was incomplete
    if "models" not in raw_data or not raw_data["models"]:
        raw_data["models"] = sorted(list({r.get("model") for r in raw_data["results"] if r.get("model")}))

    if "categories" not in raw_data or not raw_data["categories"]:
        raw_data["categories"] = sorted(list({r.get("category") for r in raw_data["results"] if r.get("category")}))

    if "total_tests" not in raw_data or raw_data["total_tests"] == 0:
        raw_data["total_tests"] = len(raw_data["results"])

    if "completed_tests" not in raw_data or raw_data["completed_tests"] == 0:
        raw_data["completed_tests"] = len(raw_data["results"])

    try:
        summary = RunSummary(**raw_data)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"RunSummary validation failed: {str(e)}")

    # Persist run and child results to SQLite safely
    db.save_run(summary)

    # Recalculate metrics directly against SQLite rows for mathematical consistency
    final_summary = db.recalculate_and_save_run(summary.run_id) or summary
    return final_summary

@router.get("/runs", response_model=List[dict])
async def list_runs():
    return db.list_runs()

@router.get("/runs/{run_id}", response_model=RunSummary)
async def get_run_details(run_id: str):
    run = db.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found.")
    return run

