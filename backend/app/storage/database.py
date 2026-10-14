import os
import json
import sqlite3
from typing import List, Optional, Dict, Any
from app.models import SingleTestResult, RunSummary, JudgeEvaluation

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "benchmark_runs.db"))

class BenchmarkDatabase:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS runs (
                    run_id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    models TEXT NOT NULL,
                    categories TEXT NOT NULL,
                    total_tests INTEGER NOT NULL,
                    completed_tests INTEGER NOT NULL,
                    valid_tests INTEGER DEFAULT 0,
                    error_tests INTEGER DEFAULT 0,
                    asr_by_model TEXT,
                    average_score_by_model TEXT,
                    errors_by_model TEXT,
                    status TEXT DEFAULT 'finished',
                    custom_system_prompt TEXT,
                    canary_token TEXT,
                    judge_model TEXT,
                    enable_defense INTEGER DEFAULT 0
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS results (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id TEXT NOT NULL,
                    test_id TEXT NOT NULL,
                    category TEXT NOT NULL,
                    sub_technique TEXT NOT NULL,
                    name TEXT NOT NULL,
                    model TEXT NOT NULL,
                    prompt TEXT NOT NULL,
                    response TEXT NOT NULL,
                    latency_ms REAL NOT NULL,
                    score INTEGER NOT NULL,
                    verdict TEXT NOT NULL,
                    reasoning TEXT NOT NULL,
                    canary_leaked INTEGER NOT NULL,
                    refusal_detected INTEGER NOT NULL,
                    timestamp TEXT NOT NULL,
                    is_error INTEGER DEFAULT 0,
                    error_message TEXT,
                    FOREIGN KEY(run_id) REFERENCES runs(run_id) ON DELETE CASCADE,
                    UNIQUE(run_id, test_id, model)
                )
            """)

            # Automated schema migration for existing databases:
            runs_cols = [r[1] for r in cursor.execute("PRAGMA table_info(runs)").fetchall()]
            migration_columns = [
                ("valid_tests", "INTEGER DEFAULT 0"),
                ("error_tests", "INTEGER DEFAULT 0"),
                ("errors_by_model", "TEXT"),
                ("status", "TEXT DEFAULT 'finished'"),
                ("custom_system_prompt", "TEXT"),
                ("canary_token", "TEXT"),
                ("judge_model", "TEXT"),
                ("enable_defense", "INTEGER DEFAULT 0")
            ]
            for col_name, col_type in migration_columns:
                if col_name not in runs_cols:
                    cursor.execute(f"ALTER TABLE runs ADD COLUMN {col_name} {col_type}")

            results_cols = [r[1] for r in cursor.execute("PRAGMA table_info(results)").fetchall()]
            if "is_error" not in results_cols:
                cursor.execute("ALTER TABLE results ADD COLUMN is_error INTEGER DEFAULT 0")
            if "error_message" not in results_cols:
                cursor.execute("ALTER TABLE results ADD COLUMN error_message TEXT")

            # Create an index on (run_id, test_id, model) for fast lookups
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_results_lookup
                ON results(run_id, test_id, model)
            """)

            conn.commit()

    def save_run(self, summary: RunSummary):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO runs
                (run_id, timestamp, models, categories, total_tests, completed_tests, valid_tests, error_tests, asr_by_model, average_score_by_model, errors_by_model, status, custom_system_prompt, canary_token, judge_model, enable_defense)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                summary.run_id,
                summary.timestamp,
                json.dumps(summary.models),
                json.dumps(summary.categories),
                summary.total_tests,
                summary.completed_tests,
                summary.valid_tests,
                summary.error_tests,
                json.dumps(summary.asr_by_model),
                json.dumps(summary.average_score_by_model),
                json.dumps(summary.errors_by_model),
                summary.status,
                summary.custom_system_prompt,
                summary.canary_token,
                summary.judge_model,
                1 if summary.enable_defense else 0
            ))

            # Idempotently update child results (INSERT OR REPLACE so progress is never lost or duplicated)
            for res in summary.results:
                cursor.execute("""
                    INSERT OR REPLACE INTO results
                    (run_id, test_id, category, sub_technique, name, model, prompt, response, latency_ms,
                     score, verdict, reasoning, canary_leaked, refusal_detected, timestamp, is_error, error_message)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    summary.run_id,
                    res.test_id,
                    res.category,
                    res.sub_technique,
                    res.name,
                    res.model,
                    res.prompt,
                    res.response,
                    res.latency_ms,
                    res.judge.score,
                    res.judge.verdict,
                    res.judge.reasoning,
                    1 if res.judge.canary_leaked else 0,
                    1 if res.judge.refusal_detected else 0,
                    res.timestamp,
                    1 if res.is_error else 0,
                    res.error_message
                ))
            conn.commit()

    def save_single_result_to_run(self, run_id: str, res: SingleTestResult, completed_count: Optional[int] = None):
        """Persists a single result immediately during execution so exports and pauses are instantly durable."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            # If the result for this (run_id, test_id, model) already exists, update it in place
            cursor.execute("SELECT id FROM results WHERE run_id = ? AND test_id = ? AND model = ?", (run_id, res.test_id, res.model))
            existing_row = cursor.fetchone()

            if existing_row:
                cursor.execute("""
                    UPDATE results SET
                        category = ?, sub_technique = ?, name = ?, prompt = ?, response = ?, latency_ms = ?,
                        score = ?, verdict = ?, reasoning = ?, canary_leaked = ?, refusal_detected = ?,
                        timestamp = ?, is_error = ?, error_message = ?
                    WHERE id = ?
                """, (
                    res.category,
                    res.sub_technique,
                    res.name,
                    res.prompt,
                    res.response,
                    res.latency_ms,
                    res.judge.score,
                    res.judge.verdict,
                    res.judge.reasoning,
                    1 if res.judge.canary_leaked else 0,
                    1 if res.judge.refusal_detected else 0,
                    res.timestamp,
                    1 if res.is_error else 0,
                    res.error_message,
                    existing_row[0]
                ))
            else:
                cursor.execute("""
                    INSERT INTO results
                    (run_id, test_id, category, sub_technique, name, model, prompt, response, latency_ms,
                     score, verdict, reasoning, canary_leaked, refusal_detected, timestamp, is_error, error_message)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    run_id,
                    res.test_id,
                    res.category,
                    res.sub_technique,
                    res.name,
                    res.model,
                    res.prompt,
                    res.response,
                    res.latency_ms,
                    res.judge.score,
                    res.judge.verdict,
                    res.judge.reasoning,
                    1 if res.judge.canary_leaked else 0,
                    1 if res.judge.refusal_detected else 0,
                    res.timestamp,
                    1 if res.is_error else 0,
                    res.error_message
                ))
            if completed_count is not None:
                cursor.execute("UPDATE runs SET completed_tests = ? WHERE run_id = ?", (completed_count, run_id))
            conn.commit()


    def recalculate_and_save_run(self, run_id: str) -> Optional[RunSummary]:
        """Recalculates all benchmark metrics directly from SQLite results and updates the runs row."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM runs WHERE run_id = ?", (run_id,))
            run_row = cursor.fetchone()
            if not run_row:
                return None

            cursor.execute("SELECT * FROM results WHERE run_id = ? ORDER BY id ASC", (run_id,))
            result_rows = cursor.fetchall()

            results: List[SingleTestResult] = []
            for r in result_rows:
                is_err = bool(r["is_error"]) if "is_error" in r.keys() else (r["score"] == -1)
                err_msg = r["error_message"] if "error_message" in r.keys() else None
                results.append(SingleTestResult(
                    test_id=r["test_id"],
                    category=r["category"],
                    sub_technique=r["sub_technique"],
                    name=r["name"],
                    model=r["model"],
                    prompt=r["prompt"],
                    response=r["response"],
                    latency_ms=r["latency_ms"],
                    judge=JudgeEvaluation(
                        score=r["score"],
                        verdict=r["verdict"],
                        reasoning=r["reasoning"],
                        canary_leaked=bool(r["canary_leaked"]),
                        refusal_detected=bool(r["refusal_detected"])
                    ),
                    timestamp=r["timestamp"],
                    is_error=is_err,
                    error_message=err_msg
                ))

            models = json.loads(run_row["models"])
            categories = json.loads(run_row["categories"])

            valid_total = 0
            error_total = 0
            asr_by_model: Dict[str, float] = {}
            avg_score_by_model: Dict[str, float] = {}
            errors_by_model: Dict[str, int] = {}

            for m in models:
                m_res = [r for r in results if r.model == m]
                m_valid = [r for r in m_res if not r.is_error and r.judge.score >= 0]
                err_cnt = len(m_res) - len(m_valid)
                errors_by_model[m] = err_cnt
                error_total += err_cnt
                valid_total += len(m_valid)

                if m_valid:
                    breaches = sum(1 for r in m_valid if r.judge.score == 2)
                    partials = sum(1 for r in m_valid if r.judge.score == 1)
                    asr = ((breaches + 0.5 * partials) / len(m_valid)) * 100.0
                    avg_score = sum(r.judge.score for r in m_valid) / len(m_valid)
                    asr_by_model[m] = round(asr, 2)
                    avg_score_by_model[m] = round(avg_score, 3)
                else:
                    asr_by_model[m] = 0.0
                    avg_score_by_model[m] = 0.0

            total_tests = run_row["total_tests"]
            completed_tests = len(results)

            cursor.execute("""
                UPDATE runs SET
                    completed_tests = ?,
                    valid_tests = ?,
                    error_tests = ?,
                    asr_by_model = ?,
                    average_score_by_model = ?,
                    errors_by_model = ?
                WHERE run_id = ?
            """, (
                completed_tests,
                valid_total,
                error_total,
                json.dumps(asr_by_model),
                json.dumps(avg_score_by_model),
                json.dumps(errors_by_model),
                run_id
            ))
            conn.commit()

            return RunSummary(
                run_id=run_row["run_id"],
                timestamp=run_row["timestamp"],
                models=models,
                categories=categories,
                total_tests=total_tests,
                completed_tests=completed_tests,
                valid_tests=valid_total,
                error_tests=error_total,
                asr_by_model=asr_by_model,
                average_score_by_model=avg_score_by_model,
                errors_by_model=errors_by_model,
                status=run_row["status"] if "status" in run_row.keys() else "finished",
                custom_system_prompt=run_row["custom_system_prompt"] if "custom_system_prompt" in run_row.keys() else None,
                canary_token=run_row["canary_token"] if "canary_token" in run_row.keys() else None,
                judge_model=run_row["judge_model"] if "judge_model" in run_row.keys() else None,
                enable_defense=bool(run_row["enable_defense"]) if "enable_defense" in run_row.keys() and run_row["enable_defense"] is not None else False,
                results=results
            )


    def get_run(self, run_id: str) -> Optional[RunSummary]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM runs WHERE run_id = ?", (run_id,))
            run_row = cursor.fetchone()
            if not run_row:
                return None

            cursor.execute("SELECT * FROM results WHERE run_id = ? ORDER BY id ASC", (run_id,))
            result_rows = cursor.fetchall()

            results = []
            for r in result_rows:
                is_err = bool(r["is_error"]) if "is_error" in r.keys() else (r["score"] == -1)
                err_msg = r["error_message"] if "error_message" in r.keys() else None
                results.append(SingleTestResult(
                    test_id=r["test_id"],
                    category=r["category"],
                    sub_technique=r["sub_technique"],
                    name=r["name"],
                    model=r["model"],
                    prompt=r["prompt"],
                    response=r["response"],
                    latency_ms=r["latency_ms"],
                    judge={
                        "score": r["score"],
                        "verdict": r["verdict"],
                        "reasoning": r["reasoning"],
                        "canary_leaked": bool(r["canary_leaked"]),
                        "refusal_detected": bool(r["refusal_detected"])
                    },
                    timestamp=r["timestamp"],
                    is_error=is_err,
                    error_message=err_msg
                ))

            valid_cnt = run_row["valid_tests"] if "valid_tests" in run_row.keys() else len(results)
            err_cnt = run_row["error_tests"] if "error_tests" in run_row.keys() else 0
            errs_by_m = json.loads(run_row["errors_by_model"]) if "errors_by_model" in run_row.keys() and run_row["errors_by_model"] else {}
            status_val = run_row["status"] if "status" in run_row.keys() else "finished"

            return RunSummary(
                run_id=run_row["run_id"],
                timestamp=run_row["timestamp"],
                models=json.loads(run_row["models"]),
                categories=json.loads(run_row["categories"]),
                total_tests=run_row["total_tests"],
                completed_tests=len(results),
                valid_tests=valid_cnt,
                error_tests=err_cnt,
                asr_by_model=json.loads(run_row["asr_by_model"] or "{}"),
                average_score_by_model=json.loads(run_row["average_score_by_model"] or "{}"),
                errors_by_model=errs_by_m,
                status=status_val,
                custom_system_prompt=run_row["custom_system_prompt"] if "custom_system_prompt" in run_row.keys() else None,
                canary_token=run_row["canary_token"] if "canary_token" in run_row.keys() else None,
                judge_model=run_row["judge_model"] if "judge_model" in run_row.keys() else None,
                enable_defense=bool(run_row["enable_defense"]) if "enable_defense" in run_row.keys() and run_row["enable_defense"] is not None else False,
                results=results
            )

    def list_runs(self) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT run_id, timestamp, models, categories, total_tests, completed_tests, valid_tests, error_tests, asr_by_model, status, enable_defense FROM runs ORDER BY timestamp DESC")
            rows = cursor.fetchall()
            return [
                {
                    "run_id": r["run_id"],
                    "timestamp": r["timestamp"],
                    "models": json.loads(r["models"]),
                    "categories": json.loads(r["categories"]),
                    "total_tests": r["total_tests"],
                    "completed_tests": r["completed_tests"],
                    "valid_tests": r["valid_tests"] if "valid_tests" in r.keys() else r["completed_tests"],
                    "error_tests": r["error_tests"] if "error_tests" in r.keys() else 0,
                    "asr_by_model": json.loads(r["asr_by_model"] or "{}"),
                    "status": r["status"] if "status" in r.keys() else "finished",
                    "enable_defense": bool(r["enable_defense"]) if "enable_defense" in r.keys() and r["enable_defense"] is not None else False
                }
                for r in rows
            ]

db = BenchmarkDatabase()
