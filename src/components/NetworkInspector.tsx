import React, { useState } from 'react';
import {
  Activity,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  HardDrive,
  Filter
} from 'lucide-react';
import { NetworkLogItem } from '../types';
import { formatFileSize } from '../utils/mime';

interface NetworkInspectorProps {
  logs: NetworkLogItem[];
  onClearLogs: () => void;
}

export const NetworkInspector: React.FC<NetworkInspectorProps> = ({ logs, onClearLogs }) => {
  const [filter, setFilter] = useState('');

  const filteredLogs = logs.filter(log => {
    if (!filter) return true;
    return log.url.toLowerCase().includes(filter.toLowerCase()) ||
      log.virtualPath.toLowerCase().includes(filter.toLowerCase()) ||
      log.mimeType.toLowerCase().includes(filter.toLowerCase());
  });

  const totalBytes = logs.reduce((acc, l) => acc + (l.size || 0), 0);

  return (
    <div className="flex flex-col h-full bg-slate-950 font-mono text-xs overflow-hidden select-text">
      {/* Network Toolbar */}
      <div className="h-9 border-b border-slate-800 px-3 bg-slate-900/80 flex items-center justify-between gap-2 select-none shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-bold text-[11px] text-slate-300 uppercase tracking-wider">
            Network & Virtual Assets
          </span>

          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
            {logs.length} requests ({formatFileSize(totalBytes)})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter requests..."
            className="w-36 bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-[11px] text-slate-300 placeholder-slate-600 outline-none"
          />

          <button
            onClick={onClearLogs}
            title="Clear Network History"
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Network Table */}
      <div className="flex-1 overflow-y-auto">
        {filteredLogs.length === 0 ? (
          <div className="text-slate-600 italic py-6 text-center text-xs">
            No virtual fetch or network requests recorded yet
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-900/40 text-[11px] text-slate-500 font-sans select-none">
                <th className="py-1.5 px-3">Status</th>
                <th className="py-1.5 px-3">Method</th>
                <th className="py-1.5 px-3">Asset / URL</th>
                <th className="py-1.5 px-3">Type</th>
                <th className="py-1.5 px-3">Size</th>
                <th className="py-1.5 px-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {filteredLogs.map(item => {
                const isSuccess = item.status >= 200 && item.status < 300;
                return (
                  <tr key={item.id} className="hover:bg-slate-900/60 text-xs">
                    <td className="py-1.5 px-3 shrink-0">
                      <span className={`inline-flex items-center gap-1 font-bold ${
                        isSuccess ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isSuccess ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        <span>{item.status || 'ERR'}</span>
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-slate-400 font-bold">{item.method}</td>
                    <td className="py-1.5 px-3 text-slate-200 max-w-xs truncate" title={item.url}>
                      {item.virtualPath || item.url}
                    </td>
                    <td className="py-1.5 px-3 text-slate-400 truncate max-w-[120px]">{item.mimeType || 'text/plain'}</td>
                    <td className="py-1.5 px-3 text-slate-400">{formatFileSize(item.size)}</td>
                    <td className="py-1.5 px-3 text-slate-500">{item.timeMs} ms</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
