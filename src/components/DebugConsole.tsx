import React, { useRef, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Ban } from 'lucide-react';

export const DebugConsole: React.FC = () => {
  const { isDebugModeEnabled, setDebugMode, debugLogs, clearLogs } = useAppStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [debugLogs, isDebugModeEnabled]);

  if (!isDebugModeEnabled) return null;

  return (
    <div className="h-48 shrink-0 bg-zinc-950 border-t border-zinc-800 flex flex-col font-mono text-xs">
      <div className="flex items-center justify-between p-2 border-b border-zinc-800 shrink-0 bg-zinc-900/50">
        <h2 className="font-semibold text-zinc-300 tracking-wider">DEBUG CONSOLE</h2>
        <div className="flex gap-3 items-center">
          <button 
            onClick={clearLogs}
            title="Clear"
            className="text-zinc-500 hover:text-red-400 transition-colors p-1 rounded hover:bg-zinc-800"
          >
            <Ban size={16} />
          </button>
          <button 
            onClick={() => setDebugMode(false)}
            className="text-zinc-400 hover:text-red-400 transition-colors p-1 rounded hover:bg-zinc-800"
            aria-label="Close debug console"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      
      <div className="p-2 grow overflow-y-auto">
        {debugLogs.length === 0 ? (
          <div className="text-zinc-600 italic">No logs received yet...</div>
        ) : (
          <div className="flex flex-col gap-1">
            {debugLogs.map((log) => {
              let colorClass = "text-zinc-300";
              if (log.level === "WARN") colorClass = "text-yellow-400";
              else if (log.level === "ERROR") colorClass = "text-red-400";
              else if (log.level === "INFO") colorClass = "text-zinc-400";
              else if (log.level === "MEDIA") colorClass = "text-emerald-400";

              const date = new Date(log.timestamp);
              const hh = date.getHours().toString().padStart(2, '0');
              const mm = date.getMinutes().toString().padStart(2, '0');
              const ss = date.getSeconds().toString().padStart(2, '0');
              const mmm = date.getMilliseconds().toString().padStart(3, '0');
              const timeStr = `${hh}:${mm}:${ss}.${mmm}`;

              return (
                <div key={log.id} className="flex gap-2 whitespace-pre-wrap break-all hover:bg-zinc-800/50 px-1 rounded transition-colors">
                  <span className="text-zinc-600 shrink-0">[{timeStr}]</span>
                  <span className={`shrink-0 ${colorClass}`}>[{log.level}]</span>
                  <span className="text-blue-400 shrink-0">[{log.source}]</span>
                  <span className="text-zinc-300">{log.message}</span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
};
