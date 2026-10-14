from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes.benchmarks import router as benchmarks_router
from app.routes.datasets import router as datasets_router
from app.routes.export import router as export_router
from app.routes.config import router as config_router

app = FastAPI(
    title="LLM Security Benchmarking Platform",
    description="Research-grade empirical evaluation suite for LLM prompt injections, jailbreaks, and extractions.",
    version="1.0.0"
)

# Enable CORS for local React/Vite development or any frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(benchmarks_router, prefix=settings.api_prefix)
app.include_router(datasets_router, prefix=settings.api_prefix)
app.include_router(export_router, prefix=settings.api_prefix)
app.include_router(config_router, prefix=settings.api_prefix)

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "LLM Security Benchmark Platform API",
        "version": "1.0.0",
        "endpoints": {
            "benchmarks": f"{settings.api_prefix}/benchmarks",
            "datasets": f"{settings.api_prefix}/datasets",
            "export": f"{settings.api_prefix}/export",
            "config": f"{settings.api_prefix}/config"
        }
    }
