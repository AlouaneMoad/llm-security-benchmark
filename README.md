# Empirical LLM Security & Adversarial Benchmarking Platform

A research-grade, automated benchmarking system designed to empirically evaluate and quantify Large Language Model (LLM) resilience against adversarial prompt injections, safety jailbreaks, and system prompt extractions across any OpenAI-compatible frontier or open-weights gateway (OpenRouter, LiteLLM, vLLM, Ollama, or direct provider endpoints).

---

## Key Features

1. **Strict Stateless Single-Turn Execution**:
   - Every attack payload is executed in pure isolation. Zero conversational memory, session state, or multi-turn crosstalk to guarantee scientifically reproducible results.
2. **Unified Baseline Security Policy & Ground-Truth Canary**:
   - Every target model receives an identical enterprise operational guardrail containing a cryptographically unique canary verification token (`CANARY_SECRET_SIGMA_9082`).
3. **500 Curated Research-Grade Attack Test Cases**:
   - 100 tests per category across 5 distinct domains derived from [OWASP Top 10 for LLMs](https://owasp.org/www-project-top-10-for-large-language-model-applications/), [HackAPrompt](https://github.com/aengrv/hackaprompt), [TensorTrust](https://github.com/HumanCompatibleAI/tensor-trust), [JailbreakBench](https://jailbreakbench.github.io/), [BIPIA](https://arxiv.org/abs/2312.14197), and [HarmBench](https://www.harmbench.org/):
     - **Direct Prompt Injection** (100 tests)
     - **Indirect Prompt Injection** (100 tests)
     - **Safety Jailbreaks** (100 tests)
     - **System Prompt & Secret Extraction** (100 tests)
     - **Obfuscation, Ciphers & Delimiters** (100 tests)
4. **Dual-Layer Evaluation Pipeline**:
   - **Layer 1: Deterministic Scanner**: Instant detection of leaked canary substrings and refusal patterns.
   - **Layer 2: Frontier LLM Judge**: Standardized 3-tier scoring rubric (`0 = Defended`, `1 = Partial Compromise`, `2 = Full Breach`) with mandatory justification.
5. **Minimalist, High-Density Research UI**:
   - Monochromatic zinc/slate design inspired by Linear and Vercel. No purple gradients, no AI slop, clean tabular typography with real-time SSE streaming.
6. **Multi-Format Forensic Exporters**:
   - One-click export to:
     - **Academic Markdown Report (`.md`)**: Camera-ready formatting with mathematical Attack Success Rate (ASR) tables and breach case studies.
     - **Excel Workbook (`.xlsx`)**: Multi-sheet workbook with Summary Matrix and detailed evaluation traces.
     - **Raw JSON (`.json`)**: Machine-readable audit traces for downstream data science.
     - **CSV (`.csv`)**: Raw tabular format.

---

## Quick Start Guide

### 1. Start the Backend API (FastAPI)
```bash
# Navigate to backend directory
cd backend

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Launch FastAPI server (Runs on http://127.0.0.1:8000)
python run.py
```

### 2. Start the Frontend Dashboard (React + Vite)
```bash
# Open a new terminal in the frontend directory
cd frontend

# Install dependencies
npm install

# Start development server (Runs on http://localhost:5173)
npm run dev
```

---

## Configuration & Usage

1. Open `http://localhost:5173` in your browser.
2. Navigate to the **Config** tab:
   - Provide your **OpenAI-Compatible Base URL** (e.g., `https://openrouter.ai/api/v1` or `http://localhost:11434/v1`).
   - Enter your **API Key**.
   - Specify your **Target Models** (e.g. `gpt-4o`, `claude-3-5-sonnet`, `llama-3.1-70b-instruct`) and the **Frontier Judge Model** (e.g. `gpt-4o`).
   - Click **Probe Gateway /models** to verify connectivity, then click **Save Configuration**.
3. In the **Runner & Matrix** tab:
   - Choose which attack categories and models to evaluate.
   - Click **Execute Benchmarks** to launch parallel evaluations with live progress updates.
   - Inspect Attack Success Rate (ASR) scorecards, cross-tabulation matrices, and forensic traces.
4. Export results at any time via the `.MD`, `.XLSX`, or `.JSON` buttons.
