import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
  Search
} from 'lucide-react';
import { ConsoleMessage } from '../types';

interface ConsolePanelProps {
  logs: ConsoleMessage[];
  onClearLogs: () => void;
}

export const ConsolePanel: React.FC<ConsolePanelProps> = ({ logs, onClearLogs }) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  const filteredLogs = logs.filter(log => {
    if (filterType !== 'all' && log.type !== filterType) return false;
    if (search) {
      const serialized = JSON.stringify(log.args).toLowerCase();
      if (!serialized.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const errorCount = logs.filter(l => l.type === 'error').length;
  const warnCount = logs.filter(l => l.type === 'warn').length;

  const handleCopyLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${JSON.stringify(l.args)}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderArg = (arg: any, index: number) => {
    if (typeof arg === 'string') {
      return <span key={index} className="text-slate-200">{arg}</span>;
    }
    if (typeof arg === 'number' || typeof arg === 'boolean') {
      return <span key={index} className="text-amber-300 font-mono">{String(arg)}</span>;
    }
    if (arg === null) {
      return <span key={index} className="text-slate-500 font-mono italic">null</span>;
    }
    if (arg === undefined) {
      return <span key={index} className="text-slate-500 font-mono italic">undefined</span>;
    }
    if (typeof arg === 'object') {
      if (arg.message && arg.stack) {
        return (
          <div key={index} className="text-rose-300 font-mono text-xs mt-1">
            <div className="font-bold">{arg.name || 'Error'}: {arg.message}</div>
            <pre className="text-[11px] text-rose-400/80 mt-1 whitespace-pre-wrap">{arg.stack}</pre>
          </div>
        );
      }
      return (
        <span key={index} className="text-cyan-300 font-mono text-xs">
          {JSON.stringify(arg, null, 2)}
        </span>
      );
    }
    return <span key={index}>{String(arg)}</span>;
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 font-mono text-xs overflow-hidden select-text">
      {/* Console Toolbar */}
      <div className="h-9 border-b border-slate-800 px-3 bg-slate-900/80 flex items-center justify-between gap-2 select-none shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold text-[11px] text-slate-300 uppercase tracking-wider">
            Console Logs
          </span>

          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2 py-0.5 rounded text-[11px] font-sans ${
                filterType === 'all' ? 'bg-slate-700 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({logs.length})
            </button>
            <button
              onClick={() => setFilterType('error')}
              className={`px-2 py-0.5 rounded text-[11px] font-sans flex items-center gap-1 ${
                filterType === 'error' ? 'bg-rose-500/30 text-rose-300 font-semibold' : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              <AlertCircle className="w-3 h-3 text-rose-400" />
              <span>{errorCount}</span>
            </button>
            <button
              onClick={() => setFilterType('warn')}
              className={`px-2 py-0.5 rounded text-[11px] font-sans flex items-center gap-1 ${
                filterType === 'warn' ? 'bg-amber-500/30 text-amber-300 font-semibold' : 'text-slate-400 hover:text-amber-400'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>{warnCount}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Filter */}
          <div className="relative w-36">
            <Search className="w-3 h-3 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter..."
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 pl-6 py-0.5 text-[11px] text-slate-300 placeholder-slate-600 outline-none"
            />
          </div>

          <button
            onClick={handleCopyLogs}
            title="Copy logs"
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onClearLogs}
            title="Clear Console"
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Logs Scroll Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredLogs.length === 0 ? (
          <div className="text-slate-600 italic py-6 text-center text-xs">
            No console output recorded
          </div>
        ) : (
          filteredLogs.map((log) => {
            let badgeBg = 'bg-slate-800 text-slate-400';
            let itemBg = 'hover:bg-slate-900/60';

            if (log.type === 'error') {
              badgeBg = 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
              itemBg = 'bg-rose-950/20 border-l-2 border-rose-500';
            } else if (log.type === 'warn') {
              badgeBg = 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
              itemBg = 'bg-amber-950/20 border-l-2 border-amber-500';
            } else if (log.type === 'info') {
              badgeBg = 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30';
            }

            return (
              <div
                key={log.id}
                className={`flex items-start gap-2.5 px-2.5 py-1.5 rounded text-xs transition-colors ${itemBg}`}
              >
                <span className="text-[10px] text-slate-600 shrink-0 font-mono mt-0.5">
                  {log.timestamp}
                </span>

                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase shrink-0 ${badgeBg}`}>
                  {log.type}
                </span>

                <div className="flex-1 flex flex-wrap items-baseline gap-2 min-w-0">
                  {log.args.map((arg, idx) => renderArg(arg, idx))}
                </div>
              </div>
            );
          })
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};
