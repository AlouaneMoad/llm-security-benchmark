import React, { useState } from 'react';
import { TestCase } from '../types';
import { Search, Filter, Play, CheckCircle2, ShieldAlert, FileCode } from 'lucide-react';

interface TestSuiteExplorerProps {
  tests: TestCase[];
  categories: string[];
  models: string[];
  onRunSingle: (testId: string, model: string) => void;
  runningTestId: string | null;
}

export const TestSuiteExplorer: React.FC<TestSuiteExplorerProps> = ({
  tests,
  categories,
  models,
  onRunSingle,
  runningTestId,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTest, setSelectedTest] = useState<TestCase | null>(null);
  const [targetModel, setTargetModel] = useState<string>(models[0] || 'gpt-4o');

  const filteredTests = tests.filter((t) => {
    const matchesCat = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.sub_technique.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Test List Column */}
      <div className="lg:col-span-7 space-y-4">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search 500 test cases by ID, name, technique, or payload..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded pl-9 pr-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-zinc-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-2 text-xs font-mono text-zinc-300 focus:outline-none"
            >
              <option value="all">All Categories ({tests.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c.replace('_', ' ').toUpperCase()} (100)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Test List Table */}
        <div className="border border-zinc-800 rounded bg-zinc-900/30 overflow-hidden">
          <div className="max-h-[640px] overflow-y-auto divide-y divide-zinc-800/60">
            {filteredTests.map((test) => {
              const isSelected = selectedTest?.id === test.id;
              const isRunning = runningTestId === test.id;

              return (
                <div
                  key={test.id}
                  onClick={() => setSelectedTest(test)}
                  className={`p-3.5 cursor-pointer transition-colors text-xs flex items-start justify-between ${
                    isSelected ? 'bg-zinc-800/80 border-l-2 border-zinc-200' : 'hover:bg-zinc-850/50'
                  }`}
                >
                  <div className="space-y-1 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-[11px] font-semibold text-zinc-300">
                        {test.id}
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400">
                        {test.category}
                      </span>
                      {test.canary_targeted && (
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-950 border border-amber-900/50 text-amber-400">
                          Canary Target
                        </span>
                      )}
                    </div>
                    <div className="text-zinc-200 font-medium">{test.name}</div>
                    <div className="text-zinc-500 font-mono text-[11px] truncate max-w-lg">
                      {test.prompt.replace(/\n/g, ' ')}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRunSingle(test.id, targetModel);
                    }}
                    disabled={isRunning}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded border border-zinc-700 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 font-mono text-[11px] shrink-0 disabled:opacity-50"
                  >
                    <Play className={`w-3 h-3 ${isRunning ? 'animate-spin' : ''}`} />
                    <span>{isRunning ? 'Running' : 'Run'}</span>
                  </button>
                </div>
              );
            })}

            {filteredTests.length === 0 && (
              <div className="p-8 text-center text-xs font-mono text-zinc-500">
                No test cases matched your filter.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Test Detail Inspector Column */}
      <div className="lg:col-span-5 space-y-4">
        {selectedTest ? (
          <div className="border border-zinc-800 rounded bg-zinc-900/50 p-5 space-y-4 sticky top-20">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="font-mono text-xs text-zinc-400">{selectedTest.id}</span>
                <h3 className="text-sm font-semibold text-zinc-100">{selectedTest.name}</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                {selectedTest.sub_technique}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                Target Execution Model
              </label>
              <select
                value={targetModel}
                onChange={(e) => setTargetModel(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none"
              >
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                Attack Payload
              </label>
              <pre className="bg-zinc-950 border border-zinc-800 rounded p-3 text-[11px] font-mono text-zinc-300 whitespace-pre-wrap max-h-56 overflow-y-auto">
                {selectedTest.prompt}
              </pre>
            </div>

            {selectedTest.context && (
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                  Simulated Untrusted Context
                </label>
                <pre className="bg-zinc-950 border border-zinc-800 rounded p-3 text-[11px] font-mono text-zinc-400 whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {selectedTest.context}
                </pre>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                Expected Secure Policy
              </label>
              <div className="bg-zinc-950 border border-zinc-800 rounded p-2.5 text-xs text-zinc-300">
                {selectedTest.expected_behavior}
              </div>
            </div>

            <div className="text-[11px] font-mono text-zinc-500 pt-1">
              Source: {selectedTest.source_reference}
            </div>

            <button
              onClick={() => onRunSingle(selectedTest.id, targetModel)}
              disabled={runningTestId === selectedTest.id}
              className="w-full py-2 rounded bg-zinc-100 hover:bg-white text-zinc-950 font-mono font-medium text-xs flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>
                {runningTestId === selectedTest.id
                  ? 'Executing Stateless Evaluation...'
                  : `Execute Attack on ${targetModel}`}
              </span>
            </button>
          </div>
        ) : (
          <div className="border border-zinc-800 border-dashed rounded p-12 text-center text-xs font-mono text-zinc-500">
            Select a test case from the catalog to inspect payload, technique, and execute an isolated attack.
          </div>
        )}
      </div>
    </div>
  );
};
