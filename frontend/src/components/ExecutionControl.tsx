import React, { useState } from 'react';
import { Play, Square, Pause, RotateCw, FileText, Database, FileSpreadsheet } from 'lucide-react';
import { api } from '../api/client';

interface ExecutionControlProps {
  categories: string[];
  models: string[];
  initialSelectedModels?: string[];
  initialSelectedCats?: string[];
  isRunning: boolean;
  isPaused: boolean;
  onStartRun: (selectedCats: string[], selectedModels: string[], resumeRunId?: string, enableDefense?: boolean) => void;
  onPauseRun: () => void;
  onCancelRun: () => void;
  currentRunId: string | null;
  isIncompleteRun?: boolean;
  completedTestsCount?: number;
  totalTestsCount?: number;
  errorTestsCount?: number;
  onRerunErrors?: () => void;
  isRerunningErrors?: boolean;
}

export const ExecutionControl: React.FC<ExecutionControlProps> = ({
  categories,
  models,
  initialSelectedModels,
  initialSelectedCats,
  isRunning,
  isPaused,
  onStartRun,
  onPauseRun,
  onCancelRun,
  currentRunId,
  isIncompleteRun = false,
  completedTestsCount = 0,
  totalTestsCount = 0,
  errorTestsCount = 0,
  onRerunErrors,
  isRerunningErrors = false,
}) => {
  const [selectedCats, setSelectedCats] = useState<string[]>(initialSelectedCats || categories);
  const [selectedModels, setSelectedModels] = useState<string[]>(initialSelectedModels || models);
  const [enableDefense, setEnableDefense] = useState<boolean>(false);

  // Sync selectedModels if parent models change or if initialSelectedModels changes (e.g. on loading past run)
  React.useEffect(() => {
    if (initialSelectedModels && initialSelectedModels.length > 0) {
      setSelectedModels([...initialSelectedModels]);
    } else if (models.length > 0 && selectedModels.length === 0) {
      setSelectedModels([...models]);
    }
  }, [initialSelectedModels, models]);

  React.useEffect(() => {
    if (initialSelectedCats && initialSelectedCats.length > 0) {
      setSelectedCats([...initialSelectedCats]);
    } else if (categories.length > 0 && selectedCats.length === 0) {
      setSelectedCats([...categories]);
    }
  }, [initialSelectedCats, categories]);

  const toggleCategory = (cat: string) => {
    if (selectedCats.includes(cat)) {
      if (selectedCats.length > 1) {
        setSelectedCats(selectedCats.filter((c) => c !== cat));
      }
    } else {
      setSelectedCats([...selectedCats, cat]);
    }
  };

  const toggleModel = (model: string) => {
    if (selectedModels.includes(model)) {
      if (selectedModels.length > 1) {
        setSelectedModels(selectedModels.filter((m) => m !== model));
      }
    } else {
      setSelectedModels([...selectedModels, model]);
    }
  };

  const selectAllCategories = () => setSelectedCats([...categories]);
  const selectAllModels = () => setSelectedModels([...models]);

  const selectQuickTestPreset = () => {
    const quickModels = ['claude-sonnet-5', 'hy3'].filter(m => models.includes(m));
    const quickCats = ['system_prompt_extraction', 'obfuscation_ciphers', 'indirect_injection'].filter(c => categories.includes(c));
    setSelectedModels(quickModels.length > 0 ? quickModels : ['claude-sonnet-5', 'hy3']);
    setSelectedCats(quickCats.length > 0 ? quickCats : ['system_prompt_extraction', 'obfuscation_ciphers', 'indirect_injection']);
    setEnableDefense(true);
  };

  const totalCalculatedTests = selectedCats.length * 100 * selectedModels.length;

  return (
    <div className="border border-zinc-800 rounded bg-zinc-900/40 p-5 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider font-mono text-zinc-100">
            Adversarial Benchmark Controller
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Select attack vectors and models to benchmark in parallel with pure single-turn isolation.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {isRunning ? (
            <>
              <button
                onClick={onPauseRun}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded bg-amber-950/60 border border-amber-800 hover:bg-amber-900 text-amber-200 text-xs font-mono font-medium transition-colors"
                title="Pause active benchmark gracefully. You can resume anytime without repeating tests."
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </button>

              <button
                onClick={onCancelRun}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded bg-red-950/60 border border-red-800 hover:bg-red-900 text-red-200 text-xs font-mono font-medium transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            </>
          ) : (isPaused || isIncompleteRun) && currentRunId ? (
            <>
              <button
                onClick={() => onStartRun(selectedCats, selectedModels, currentRunId, enableDefense)}
                className="flex items-center space-x-1.5 px-5 py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-mono font-bold transition-colors shadow-sm"
                title={`Resume this run from test ${completedTestsCount + 1}. All ${completedTestsCount} already-evaluated tests are kept.`}
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Resume Benchmark ({completedTestsCount}/{totalTestsCount || 500})</span>
              </button>

              <button
                onClick={() => onStartRun(selectedCats, selectedModels, undefined, enableDefense)}
                disabled={selectedCats.length === 0 || selectedModels.length === 0}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded border border-zinc-700 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 text-xs font-mono font-medium transition-colors disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Start Fresh Run</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => onStartRun(selectedCats, selectedModels, undefined, enableDefense)}
              disabled={selectedCats.length === 0 || selectedModels.length === 0}
              className="flex items-center space-x-1.5 px-5 py-2 rounded bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-mono font-semibold transition-colors disabled:opacity-50 shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Execute {totalCalculatedTests} Benchmarks</span>
            </button>
          )}

          {currentRunId && (
            <div className="flex items-center space-x-1.5 pl-2 border-l border-zinc-800">
              {errorTestsCount > 0 && onRerunErrors && (
                <button
                  onClick={onRerunErrors}
                  disabled={isRunning || isRerunningErrors}
                  title="Rerun all API error tests for this run"
                  className="px-2.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs flex items-center space-x-1 font-mono font-bold transition-all disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRerunningErrors ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Rerun {errorTestsCount} Errors</span>
                </button>
              )}

              <a
                href={api.getExportUrl('markdown', currentRunId)}
                download
                title="Export Academic Markdown Report (.md)"
                className="p-2 rounded border border-zinc-800 bg-zinc-950 hover:bg-zinc-850 text-zinc-300 text-xs flex items-center space-x-1 font-mono"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">.MD</span>
              </a>

              <a
                href={api.getExportUrl('excel', currentRunId)}
                download
                title="Export Complete Spreadsheet (.xlsx)"
                className="p-2 rounded border border-zinc-800 bg-zinc-950 hover:bg-zinc-850 text-zinc-300 text-xs flex items-center space-x-1 font-mono"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">.XLSX</span>
              </a>

              <a
                href={api.getExportUrl('json', currentRunId)}
                download
                title="Export Raw Traces (.json)"
                className="p-2 rounded border border-zinc-800 bg-zinc-950 hover:bg-zinc-850 text-zinc-300 text-xs flex items-center space-x-1 font-mono"
              >
                <Database className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">.JSON</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Defense Pipeline Controls & Presets */}
      <div className="pt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-950/60 p-3 rounded border border-zinc-800">
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={enableDefense}
              onChange={(e) => setEnableDefense(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20 focus:ring-offset-0"
            />
            <span className="text-xs font-mono font-semibold text-zinc-200 flex items-center space-x-1.5">
              <span>🛡️ Enable Multi-Tier Defense-in-Depth Pipeline</span>
            </span>
          </label>
          <span className="text-[11px] font-mono text-zinc-500 hidden md:inline">
            (Tier 1 Normalization & De-obfuscation + Tier 2 Context Sandboxing + Tier 3 Egress Canary Scrubbing)
          </span>
        </div>

        <button
          onClick={selectQuickTestPreset}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-indigo-950/80 border border-indigo-700 hover:bg-indigo-900 text-indigo-200 text-xs font-mono font-medium transition-colors shadow-sm self-start sm:self-auto"
          title="Quickly configure test against models with baseline vulnerabilities (claude-sonnet-5 & hy3 across extraction, ciphers, and indirect injection)"
        >
          <span>⚡ Quick Test: claude-sonnet-5 & hy3 (Defended vs Baseline)</span>
        </button>
      </div>

      {/* Selector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-zinc-800/80">
        {/* Categories Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400 uppercase tracking-wide">
              1. Attack Categories (100 tests each)
            </span>
            <button onClick={selectAllCategories} className="text-zinc-500 hover:text-zinc-300 text-[11px]">
              Select All
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {categories.map((cat) => {
              const checked = selectedCats.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`flex items-center space-x-2 p-2 rounded border text-left text-xs font-mono transition-colors ${
                    checked
                      ? 'bg-zinc-800/90 border-zinc-600 text-zinc-100'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-900'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${
                      checked ? 'border-zinc-300 bg-zinc-200 text-zinc-950' : 'border-zinc-700'
                    }`}
                  >
                    {checked && <div className="w-1.5 h-1.5 bg-zinc-950 rounded-sm" />}
                  </div>
                  <span className="capitalize text-[11px] truncate">{cat.replace('_', ' ')}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Models Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400 uppercase tracking-wide">
              2. Target Models Under Test
            </span>
            <button onClick={selectAllModels} className="text-zinc-500 hover:text-zinc-300 text-[11px]">
              Select All
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {models.map((model) => {
              const checked = selectedModels.includes(model);
              return (
                <button
                  key={model}
                  onClick={() => toggleModel(model)}
                  className={`flex items-center space-x-2 p-2 rounded border text-left text-xs font-mono transition-colors ${
                    checked
                      ? 'bg-zinc-800/90 border-zinc-600 text-zinc-100'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-900'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${
                      checked ? 'border-zinc-300 bg-zinc-200 text-zinc-950' : 'border-zinc-700'
                    }`}
                  >
                    {checked && <div className="w-1.5 h-1.5 bg-zinc-950 rounded-sm" />}
                  </div>
                  <span className="text-[11px] truncate" title={model}>
                    {model}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
