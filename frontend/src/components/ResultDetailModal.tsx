import React from 'react';
import { SingleTestResult } from '../types';
import { X, KeyRound, Clock, Cpu, AlertCircle } from 'lucide-react';

interface ResultDetailModalProps {
  result: SingleTestResult | null;
  onClose: () => void;
  canaryToken: string;
}

export const ResultDetailModal: React.FC<ResultDetailModalProps> = ({
  result,
  onClose,
  canaryToken,
}) => {
  if (!result) return null;

  const highlightCanary = (text: string) => {
    if (!canaryToken || !text.includes(canaryToken)) return text;
    const parts = text.split(canaryToken);
    return (
      <>
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {part}
            {i < parts.length - 1 && (
              <span className="bg-red-500/20 text-red-400 font-bold px-1 rounded border border-red-500/40">
                {canaryToken}
              </span>
            )}
          </React.Fragment>
        ))}
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-mono text-xs">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-zinc-400 font-semibold">{result.test_id}</span>
              <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px]">
                {result.category}
              </span>
              <span className="text-zinc-500">|</span>
              <span className="text-zinc-200 font-bold">{result.name}</span>
            </div>
            <div className="flex items-center space-x-3 text-[11px] text-zinc-400">
              <span className="flex items-center space-x-1">
                <Cpu className="w-3 h-3 text-zinc-500" />
                <span>Model: {result.model}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Clock className="w-3 h-3 text-zinc-500" />
                <span>Latency: {Math.round(result.latency_ms)} ms</span>
              </span>
              {result.is_error && (
                <span className="text-amber-400 font-semibold">
                  (Excluded from vulnerability scores)
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Judge Verdict Box or API Error Box */}
          {result.is_error ? (
            <div className="p-4 rounded border bg-amber-950/20 border-amber-800/40 text-amber-300 space-y-2">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-sm uppercase">
                  UPSTREAM API / GATEWAY ERROR
                </span>
              </div>
              <p className="text-zinc-300 font-sans text-xs leading-relaxed">
                <span className="font-semibold text-zinc-200">Error Description: </span>
                {result.error_message || result.judge.reasoning}
              </p>
              <div className="text-[11px] text-amber-400/90 font-mono">
                Notice: This attempt did not receive a valid completion from the model provider. It is marked as an API Error and excluded from the Attack Success Rate (ASR) calculation so it does not skew your security results.
              </div>
            </div>
          ) : (
            <div
              className={`p-4 rounded border ${
                result.judge.score === 0
                  ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                  : result.judge.score === 1
                  ? 'bg-amber-950/20 border-amber-800/40 text-amber-300'
                  : 'bg-red-950/20 border-red-800/40 text-red-300'
              }`}
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800/40">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-sm uppercase">
                    SCORE {result.judge.score}: {result.judge.verdict}
                  </span>
                  {result.judge.canary_leaked && (
                    <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-red-900/60 border border-red-700 text-red-200 font-bold text-[10px]">
                      <KeyRound className="w-3 h-3" />
                      <span>CANARY EXFILTRATED</span>
                    </span>
                  )}
                </div>
              </div>
              <p className="text-zinc-300 font-sans text-xs leading-relaxed">
                <span className="font-semibold text-zinc-200">Judge Rationale: </span>
                {result.judge.reasoning}
              </p>
            </div>
          )}

          {/* Side by Side: Payload vs Response */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-400 uppercase tracking-wider text-[10px] mb-1">
                Adversarial Attack Payload
              </label>
              <pre className="bg-zinc-950 border border-zinc-800 rounded p-3 text-zinc-300 whitespace-pre-wrap max-h-72 overflow-y-auto font-mono text-[11px] leading-relaxed">
                {result.prompt}
              </pre>
            </div>

            <div>
              <label className="block text-zinc-400 uppercase tracking-wider text-[10px] mb-1">
                Target Model Response (Stateless Single Turn)
              </label>
              <pre className="bg-zinc-950 border border-zinc-800 rounded p-3 text-zinc-200 whitespace-pre-wrap max-h-72 overflow-y-auto font-mono text-[11px] leading-relaxed">
                {highlightCanary(result.response || '[Empty or Failed Response]')}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded border border-zinc-700 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 font-mono text-xs"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
