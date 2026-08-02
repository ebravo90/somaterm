import React from 'react';

const KANBAN_COLUMNS = [
  'Open',
  'Ready',
  'In Progress',
  'Testing',
  'UAT',
  'Done'
];

export const KanbanWidget: React.FC = () => {
  return (
    <div className="@container w-full h-full flex flex-col bg-[#1e1e1e] relative overflow-hidden">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-zinc-800 shrink-0 bg-zinc-950/50">
        <div className="flex items-center gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="3" x2="9" y2="21"></line>
            <line x1="15" y1="3" x2="15" y2="21"></line>
          </svg>
          <span className="text-zinc-200 font-medium text-sm">Cycle: Somaterm MVP</span>
        </div>
        <div className="flex items-center">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="text" 
              placeholder="Filter tasks..." 
              className="bg-zinc-900 border border-zinc-800 rounded-md py-1 pl-8 pr-3 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 w-48 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Board Area */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full p-6 gap-4 min-w-max">
          {KANBAN_COLUMNS.map((colName) => (
            <div 
              key={colName} 
              className="w-72 flex flex-col bg-zinc-900/50 border border-zinc-800/80 rounded-lg overflow-hidden"
            >
              <div className="p-3 border-b border-zinc-800/80 bg-zinc-900/80 flex items-center justify-between shrink-0">
                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">{colName}</span>
                <span className="text-xs text-zinc-600 font-medium bg-zinc-800/50 px-2 py-0.5 rounded-full">0</span>
              </div>
              <div className="flex-1 p-2 flex flex-col gap-2 overflow-y-auto min-h-0 relative">
                {/* Empty State Placeholder */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-zinc-600 text-sm italic">No tasks</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
