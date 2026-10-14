import { TestCase, GlobalConfig, SingleTestResult, RunSummary } from '../types';

const API_BASE = 'http://127.0.0.1:8000/api';

export const api = {
  // Config
  getConfig: async (): Promise<GlobalConfig> => {
    const res = await fetch(`${API_BASE}/config`);
    return res.json();
  },

  updateConfig: async (config: Partial<GlobalConfig & { openai_api_key?: string; judge_api_key?: string }>): Promise<any> => {
    const res = await fetch(`${API_BASE}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return res.json();
  },

  testConnection: async (): Promise<{ status: string; models_available?: string[]; message?: string }> => {
    const res = await fetch(`${API_BASE}/config/test-connection`);
    return res.json();
  },

  testJudgeConnection: async (): Promise<{ status: string; models_available?: string[]; message?: string }> => {
    const res = await fetch(`${API_BASE}/config/test-judge-connection`);
    return res.json();
  },

  // Datasets
  getCategories: async (): Promise<string[]> => {
    const res = await fetch(`${API_BASE}/datasets/categories`);
    return res.json();
  },

  getTests: async (category?: string, search?: string): Promise<TestCase[]> => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    const res = await fetch(`${API_BASE}/datasets/tests?${params.toString()}`);
    return res.json();
  },

  getStats: async (): Promise<{ total_categories: number; total_test_cases: number; breakdown: Record<string, number> }> => {
    const res = await fetch(`${API_BASE}/datasets/stats`);
    return res.json();
  },

  // Runs & Execution
  runSingleAttack: async (data: { test_id: string; model: string; custom_system_prompt?: string; canary_token?: string; judge_model?: string }): Promise<SingleTestResult> => {
    const res = await fetch(`${API_BASE}/benchmarks/run-single`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  cancelRun: async (run_id: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/benchmarks/cancel/${run_id}`, { method: 'POST' });
    return res.json();
  },

  pauseRun: async (run_id: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/benchmarks/pause/${run_id}`, { method: 'POST' });
    return res.json();
  },

  getRuns: async (): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/benchmarks/runs`);
    return res.json();
  },

  getRunDetails: async (run_id: string): Promise<RunSummary> => {
    const res = await fetch(`${API_BASE}/benchmarks/runs/${run_id}`);
    return res.json();
  },

  // Run Import & Error Rerun
  importRunFile: async (file: File): Promise<RunSummary> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/benchmarks/import`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errorData.detail || 'Failed to import run JSON');
    }
    return res.json();
  },

  rerunErrorsStream: (data: {
    run_id: string;
    model?: string;
    concurrency?: number;
    custom_system_prompt?: string;
    canary_token?: string;
    judge_model?: string;
  }) => {
    return fetch(`${API_BASE}/benchmarks/rerun-errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // Export URLs
  getExportUrl: (type: 'markdown' | 'json' | 'excel' | 'csv', run_id: string) => {
    return `${API_BASE}/export/${type}/${run_id}`;
  }
};

