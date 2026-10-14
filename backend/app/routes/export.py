from fastapi import APIRouter, HTTPException
from fastapi.responses import Response, PlainTextResponse
from app.storage.database import db
from app.services.exporter import exporter

router = APIRouter(prefix="/export", tags=["export"])

@router.get("/markdown/{run_id}", response_class=PlainTextResponse)
async def export_markdown(run_id: str):
    run = db.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found.")
    md_content = exporter.generate_markdown_report(run)
    return PlainTextResponse(
        content=md_content,
        headers={"Content-Disposition": f"attachment; filename=llm_security_report_{run_id}.md"}
    )

@router.get("/json/{run_id}", response_class=PlainTextResponse)
async def export_json(run_id: str):
    run = db.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found.")
    json_content = exporter.generate_json_export(run)
    return PlainTextResponse(
        content=json_content,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=llm_security_trace_{run_id}.json"}
    )

@router.get("/excel/{run_id}")
async def export_excel(run_id: str):
    run = db.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found.")
    excel_bytes = exporter.generate_excel_export(run)
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=llm_security_benchmark_{run_id}.xlsx"}
    )

@router.get("/csv/{run_id}", response_class=PlainTextResponse)
async def export_csv(run_id: str):
    run = db.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found.")
    csv_content = exporter.generate_csv_export(run)
    return PlainTextResponse(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=llm_security_benchmark_{run_id}.csv"}
    )
