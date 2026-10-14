import React, { useState } from 'react';
import { GlobalConfig } from '../types';
import { Server, Cpu, Gauge, Check, AlertCircle, RefreshCw, Scale } from 'lucide-react';
import { api } from '../api/client';

interface ConfigPanelProps {
  config: GlobalConfig | null;
  onConfigSaved: () => void;
  canaryToken: string;
  setCanaryToken: (token: string) => void;
  customSystemPrompt: string;
  setCustomSystemPrompt: (prompt: string) => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  config,
  onConfigSaved,
  canaryToken,
  setCanaryToken,
  customSystemPrompt,
  setCustomSystemPrompt,
}) => {
  const [baseUrl, setBaseUrl] = useState(config?.openai_base_url || '');
  const [apiKey, setApiKey] = useState('');
  const [targetModelsText, setTargetModelsText] = useState(
    config?.target_models ? config.target_models.join('\n') : ''
  );

  // Judge Selection
  const modelsList = targetModelsText
    .split('\n')
    .map((m) => m.trim())
    .filter(Boolean);

  const [judgeChoiceMode, setJudgeChoiceMode] = useState<'target_model' | 'custom_model'>('custom_model');
  const [selectedTargetJudge, setSelectedTargetJudge] = useState<string>(
    config?.judge_model || (modelsList[0] || 'gemini-3.8-flash-high')
  );
  const [customJudgeModel, setCustomJudgeModel] = useState<string>(config?.judge_model || 'gemini-3.8-flash-high');

  // Separate Judge Endpoint & Key Config
  const [useSeparateJudgeConfig, setUseSeparateJudgeConfig] = useState<boolean>(
    config?.use_separate_judge_config ?? true
  );
  const [judgeBaseUrl, setJudgeBaseUrl] = useState<string>(config?.judge_base_url || '');
  const [judgeApiKey, setJudgeApiKey] = useState<string>('');

  const [concurrency, setConcurrency] = useState(config?.max_concurrency || 5);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: string; message?: string; models_available?: string[] } | null>(null);

  const [testingJudge, setTestingJudge] = useState(false);
  const [testJudgeResult, setTestJudgeResult] = useState<{ status: string; message?: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      const activeJudge = judgeChoiceMode === 'target_model' ? selectedTargetJudge : customJudgeModel;

      await api.updateConfig({
        openai_base_url: baseUrl,
        ...(apiKey ? { openai_api_key: apiKey } : {}),
        target_models: modelsList,
        judge_model: activeJudge,
        use_separate_judge_config: useSeparateJudgeConfig,
        judge_base_url: useSeparateJudgeConfig ? judgeBaseUrl : null,
        ...(useSeparateJudgeConfig && judgeApiKey ? { judge_api_key: judgeApiKey } : {}),
        max_concurrency: Number(concurrency),
      });

      onConfigSaved();
      alert('Configuration updated successfully!');
    } catch (err: any) {
      alert(`Failed to save config: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testConnection();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ status: 'error', message: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleTestJudgeConnection = async () => {
    setTestingJudge(true);
    setTestJudgeResult(null);
    try {
      const res = await api.testJudgeConnection();
      setTestJudgeResult(res);
    } catch (err: any) {
      setTestJudgeResult({ status: 'error', message: err.message });
    } finally {
      setTestingJudge(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-100 uppercase tracking-wider font-mono">
          System & Gateway Configuration
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Configure global target models, select your evaluator/judge model, and assign shared or dedicated endpoints.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Endpoint & Auth */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded p-5 space-y-4">
          <div className="flex items-center space-x-2 text-zinc-200 font-medium text-xs uppercase tracking-wide">
            <Server className="w-4 h-4 text-zinc-400" />
            <span>Target Models Gateway (OpenAI Compatible)</span>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1">
              Base URL (e.g. OpenRouter, LiteLLM, vLLM, Ollama)
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1">
              Global API Key {config?.openai_api_key_set && <span className="text-emerald-400">(Configured)</span>}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-... (Leave empty to keep existing key)"
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded border border-zinc-700 bg-zinc-850 hover:bg-zinc-800 text-xs font-mono text-zinc-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Testing...' : 'Probe Gateway /models'}</span>
            </button>

            {testResult && (
              <span
                className={`text-xs font-mono flex items-center space-x-1 ${
                  testResult.status === 'connected' ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {testResult.status === 'connected' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Connected ({testResult.models_available?.length || 0} models)</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Failed</span>
                  </>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Target Models */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded p-5 space-y-4">
          <div className="flex items-center space-x-2 text-zinc-200 font-medium text-xs uppercase tracking-wide">
            <Cpu className="w-4 h-4 text-zinc-400" />
            <span>Target Benchmark Models ({modelsList.length})</span>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1">
              Active Models (One model ID per line)
            </label>
            <textarea
              rows={6}
              value={targetModelsText}
              onChange={(e) => setTargetModelsText(e.target.value)}
              placeholder="deepseek-v4-flash-0731&#10;gpt-6-luna&#10;claude-sonnet-5"
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1">Parallel Worker Threads</label>
            <input
              type="number"
              min={1}
              max={30}
              value={concurrency}
              onChange={(e) => setConcurrency(Number(e.target.value))}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-500"
            />
          </div>
        </div>
      </div>

      {/* Evaluator / Judge Configuration */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded p-5 space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center space-x-2 text-zinc-200 font-medium text-xs uppercase tracking-wide">
            <Scale className="w-4 h-4 text-zinc-400" />
            <span>Frontier Evaluator / Judge Model Configuration</span>
          </div>
        </div>

        {/* Option 1: Select which model acts as Judge */}
        <div className="space-y-3">
          <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wide">
            1. Select Judge Model
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`flex items-start space-x-3 p-3 rounded border cursor-pointer font-mono text-xs ${
                judgeChoiceMode === 'target_model'
                  ? 'bg-zinc-800/80 border-zinc-600 text-zinc-100'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900'
              }`}
            >
              <input
                type="radio"
                name="judgeMode"
                checked={judgeChoiceMode === 'target_model'}
                onChange={() => setJudgeChoiceMode('target_model')}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <span className="font-semibold block text-zinc-200">Pick from Target Models</span>
                <span className="text-[11px] text-zinc-500 block">
                  Use one of the models listed in your active benchmark test list.
                </span>
                {judgeChoiceMode === 'target_model' && (
                  <select
                    value={selectedTargetJudge}
                    onChange={(e) => setSelectedTargetJudge(e.target.value)}
                    className="w-full mt-2 bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none"
                  >
                    {modelsList.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </label>

            <label
              className={`flex items-start space-x-3 p-3 rounded border cursor-pointer font-mono text-xs ${
                judgeChoiceMode === 'custom_model'
                  ? 'bg-zinc-800/80 border-zinc-600 text-zinc-100'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900'
              }`}
            >
              <input
                type="radio"
                name="judgeMode"
                checked={judgeChoiceMode === 'custom_model'}
                onChange={() => setJudgeChoiceMode('custom_model')}
                className="mt-0.5"
              />
              <div className="space-y-1 w-full">
                <span className="font-semibold block text-zinc-200">Custom Frontier Judge</span>
                <span className="text-[11px] text-zinc-500 block">
                  Specify a dedicated frontier model ID (e.g. gpt-4o, claude-3-5-sonnet).
                </span>
                {judgeChoiceMode === 'custom_model' && (
                  <input
                    type="text"
                    value={customJudgeModel}
                    onChange={(e) => setCustomJudgeModel(e.target.value)}
                    placeholder="gpt-4o"
                    className="w-full mt-2 bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none"
                  />
                )}
              </div>
            </label>
          </div>
        </div>

        {/* Option 2: Same Endpoint or Separate Dedicated Endpoint */}
        <div className="pt-2 border-t border-zinc-800/80 space-y-3">
          <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wide">
            2. Judge Endpoint & API Key Routing
          </label>

          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 text-xs font-mono text-zinc-300 cursor-pointer">
              <input
                type="radio"
                name="endpointRouting"
                checked={!useSeparateJudgeConfig}
                onChange={() => setUseSeparateJudgeConfig(false)}
              />
              <span>Use Same Global Gateway Endpoint & API Key</span>
            </label>

            <label className="flex items-center space-x-2 text-xs font-mono text-zinc-300 cursor-pointer">
              <input
                type="radio"
                name="endpointRouting"
                checked={useSeparateJudgeConfig}
                onChange={() => setUseSeparateJudgeConfig(true)}
              />
              <span>Use Separate Dedicated Endpoint for Judge</span>
            </label>
          </div>

          {useSeparateJudgeConfig && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 bg-zinc-950/70 p-4 rounded border border-zinc-800">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">
                  Judge Base URL (Dedicated Endpoint)
                </label>
                <input
                  type="text"
                  value={judgeBaseUrl}
                  onChange={(e) => setJudgeBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1 or custom judge proxy"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">
                  Judge API Key {config?.judge_api_key_set && <span className="text-emerald-400">(Configured)</span>}
                </label>
                <input
                  type="password"
                  value={judgeApiKey}
                  onChange={(e) => setJudgeApiKey(e.target.value)}
                  placeholder="sk-... (Leave empty to keep existing key)"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="md:col-span-2 flex items-center justify-between pt-1">
                <button
                  onClick={handleTestJudgeConnection}
                  disabled={testingJudge}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded border border-zinc-700 bg-zinc-850 hover:bg-zinc-800 text-xs font-mono text-zinc-200 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingJudge ? 'animate-spin' : ''}`} />
                  <span>{testingJudge ? 'Testing...' : 'Probe Dedicated Judge Endpoint'}</span>
                </button>

                {testJudgeResult && (
                  <span
                    className={`text-xs font-mono flex items-center space-x-1 ${
                      testJudgeResult.status === 'connected' ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {testJudgeResult.status === 'connected' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Dedicated Judge Gateway Connected</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Connection Failed: {testJudgeResult.message}</span>
                      </>
                    )}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Baseline System Prompt & Canary Configuration */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-zinc-200 font-medium text-xs uppercase tracking-wide">
            <Gauge className="w-4 h-4 text-zinc-400" />
            <span>Baseline System Prompt & Ground-Truth Canary Guardrail</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-zinc-400">Canary Secret:</span>
            <input
              type="text"
              value={canaryToken}
              onChange={(e) => setCanaryToken(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1 text-xs font-mono text-emerald-400 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono text-zinc-400 mb-1">
            Enterprise System Prompt Template (Applied statelessly across all target models; use &#123;CANARY_TOKEN&#125;)
          </label>
          <textarea
            rows={5}
            value={customSystemPrompt}
            onChange={(e) => setCustomSystemPrompt(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-300 focus:outline-none focus:border-zinc-500"
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 rounded bg-zinc-100 hover:bg-white text-zinc-950 font-mono font-medium text-xs transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
};
