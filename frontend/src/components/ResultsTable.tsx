import React, { useState } from 'react';
import { SingleTestResult } from '../types';
import { Eye, ShieldCheck, AlertTriangle, ShieldX, KeyRound, AlertCircle, RotateCw } from 'lucide-react';

interface ResultsTableProps {
  results: SingleTestResult[];
  onSelectResult: (result: SingleTestResult) => void;
  onRerunErrors?: () => void;
  isRerunningErrors?: boolean;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
  results,
  onSelectResult,
  onRerunErrors,
  isRerunningErrors = false,
}) => {
  const [filterScore, setFilterScore] = useState<string>('all');
  const [search, setSearch] = useState('');

  const errorCount = results.filter((r) => r.is_error || r.judge.score === -1).length;

  const filtered = results.filter((r) => {
    const matchScore =
      filterScore === 'all'
        ? true
        : filterScore === 'error'
        ? r.is_error || r.judge.score === -1
        : r.judge.score.toString() === filterScore;

    const matchSearch =
      !search ||
      r.test_id.toLowerCase().includes(search.toLowerCase()) ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.model.toLowerCase().includes(search.toLowerCase()) ||
      r.judge.reasoning.toLowerCase().includes(search.toLowerCase()) ||
      (r.error_message && r.error_message.toLowerCase().includes(search.toLowerCase()));

    return matchScore && matchSearch;
  });

  return (
    <div className="space-y-3">
      {/* API Errors Alert Banner if errors exist */}
      {errorCount > 0 && (
        <div className="bg-amber-950/40 border border-amber-800/60 rounded p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-amber-300">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>{errorCount} test(s)</strong> failed due to upstream API / Gateway errors and were excluded from vulnerability metrics.
            </span>
          </div>
          {onRerunErrors && (
            <button
              onClick={onRerunErrors}
              disabled={isRerunningErrors}
              className="flex items-center space-x-1.5 px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono font-bold text-xs transition-colors disabled:opacity-50"
            >
              <RotateCw className={`w-3 h-3 ${isRerunningErrors ? 'animate-spin' : ''}`} />
              <span>{isRerunningErrors ? 'Rerunning Errors...' : `Rerun ${errorCount} Errors Now`}</span>
            </button>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search evaluation traces by model, test ID, reasoning..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-80 bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 text-xs font-mono flex-wrap gap-1">
          <span className="text-zinc-500">Filter Verdict:</span>
          {[
            { id: 'all', label: 'All' },
            { id: '0', label: '0 Defended' },
            { id: '1', label: '1 Partial' },
            { id: '2', label: '2 Breached' },
            { id: 'error', label: `⚠ API Error (${errorCount})` },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setFilterScore(s.id)}
              className={`px-2.5 py-1 rounded border text-[11px] transition-colors ${
                filterScore === s.id
                  ? 'bg-zinc-800 text-zinc-100 border-zinc-600'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-900'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="border border-zinc-800 rounded bg-zinc-900/30 overflow-hidden">
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 sticky top-0 z-10">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Target Model</th>
                <th className="p-3">Attack Name</th>
                <th className="p-3 text-center">Score / Status</th>
                <th className="p-3 text-center">Canary Leak</th>
                <th className="p-3 text-center">Latency</th>
                <th className="p-3">Judge Justification / Error</th>
                <th className="p-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filtered.map((r, idx) => {
                let badge = (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 text-[10px]">
                    <ShieldCheck className="w-3 h-3" />
                    <span>0 DEFENDED</span>
                  </span>
                );

                if (r.is_error || r.judge.score === -1) {
                  badge = (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-zinc-800 border border-amber-800/60 text-amber-400 text-[10px]" title="API error: not counted in score/ASR">
                      <AlertCircle className="w-3 h-3" />
                      <span>API ERROR</span>
                    </span>
                  );
                } else if (r.judge.score === 1) {
                  badge = (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-950/40 border border-amber-800/50 text-amber-400 text-[10px]">
                      <AlertTriangle className="w-3 h-3" />
                      <span>1 PARTIAL</span>
                    </span>
                  );
                } else if (r.judge.score === 2) {
                  badge = (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-red-950/40 border border-red-800/50 text-red-400 text-[10px]">
                      <ShieldX className="w-3 h-3" />
                      <span>2 BREACHED</span>
                    </span>
                  );
                }

                return (
                  <tr
                    key={`${r.test_id}-${r.model}-${idx}`}
                    onClick={() => onSelectResult(r)}
                    className={`hover:bg-zinc-850/40 cursor-pointer transition-colors ${
                      r.is_error ? 'bg-amber-950/10' : ''
                    }`}
                  >
                    <td className="p-3 font-semibold text-zinc-300">{r.test_id}</td>
                    <td className="p-3 text-zinc-300 truncate max-w-[150px]" title={r.model}>
                      {r.model}
                    </td>
                    <td className="p-3 text-zinc-200 font-sans truncate max-w-[200px]" title={r.name}>
                      {r.name}
                    </td>
                    <td className="p-3 text-center">{badge}</td>
                    <td className="p-3 text-center">
                      {r.judge.canary_leaked ? (
                        <span className="inline-flex items-center space-x-1 text-red-400 font-bold text-[10px] bg-red-950/50 px-1.5 py-0.5 rounded border border-red-900/60">
                          <KeyRound className="w-3 h-3" />
                          <span>LEAKED</span>
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-[11px]">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center text-zinc-500 text-[11px]">
                      {Math.round(r.latency_ms)}ms
                    </td>
                    <td
                      className={`p-3 text-[11px] truncate max-w-xs ${
                        r.is_error ? 'text-amber-400/90' : 'text-zinc-400'
                      }`}
                      title={r.error_message || r.judge.reasoning}
                    >
                      {r.is_error ? `⚠ ${r.error_message}` : r.judge.reasoning}
                    </td>
                    <td className="p-3 text-right">
                      <button className="text-zinc-400 hover:text-zinc-100 p-1">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-500">
                    No results found matching filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
