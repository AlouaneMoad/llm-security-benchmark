import React from 'react';
import { Shield, Server, Terminal, Settings as SettingsIcon, Play, Database, FileText } from 'lucide-react';

interface HeaderProps {
  activeTab: 'runner' | 'explorer' | 'history' | 'settings';
  setActiveTab: (tab: 'runner' | 'explorer' | 'history' | 'settings') => void;
  apiConnected: boolean;
  endpointUrl: string;
  judgeModel: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  apiConnected,
  endpointUrl,
  judgeModel,
}) => {
  return (
    <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Platform Name */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded border border-zinc-700 bg-zinc-800/80 flex items-center justify-center text-zinc-200">
              <Shield className="w-4 h-4 text-zinc-100" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold tracking-tight text-zinc-100 uppercase">
                  LLM Security Benchmark
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400">
                  RESEARCH v1.0
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('runner')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                activeTab === 'runner'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Runner & Matrix</span>
            </button>

            <button
              onClick={() => setActiveTab('explorer')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                activeTab === 'explorer'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Test Suite (500)</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Past Runs</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
              }`}
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              <span>Config</span>
            </button>
          </nav>

          {/* Gateway Status Badge */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-zinc-400 bg-zinc-950 px-2.5 py-1 rounded border border-zinc-800">
              <span className="text-zinc-500">Judge:</span>
              <span className="text-zinc-200">{judgeModel}</span>
            </div>

            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  apiConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                }`}
              />
              <span className="text-zinc-300">
                {apiConnected ? 'Gateway Ready' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
