import React from 'react';
import { useAppStore } from '../../store/useAppStore';

const KANBAN_COLUMNS = ['Open', 'Ready', 'In Progress', 'Testing', 'UAT', 'Done'];

export const KanbanWidget: React.FC = () => {
  const { 
    kanbanMockTickets, 
    kanbanCurrentSection, 
    kanbanSelectedTicket, 
    kanbanTicketViewMode,
    setKanbanSection,
    selectKanbanTicket,
    navigateKanbanBack,
    navigateKanbanForward,
    kanbanHistory,
    kanbanHistoryIndex
  } = useAppStore();

  const selectedTicketObj = kanbanSelectedTicket ? kanbanMockTickets.find(t => t.id === kanbanSelectedTicket) : null;
  const canGoBack = kanbanHistoryIndex > 0;
  const canGoForward = kanbanHistoryIndex < kanbanHistory.length - 1;

  // Board Area Content
  const renderBoard = () => (
    <div className="flex h-full p-6 gap-4 min-w-max">
      {KANBAN_COLUMNS.map((colName) => {
        const columnTickets = kanbanMockTickets.filter(t => t.status === colName);
        return (
          <div key={colName} className="w-72 flex flex-col bg-zinc-900/50 border border-zinc-800/80 rounded-lg overflow-hidden shrink-0">
            <div className="p-3 border-b border-zinc-800/80 bg-zinc-900/80 flex items-center justify-between shrink-0">
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">{colName}</span>
              <span className="text-xs text-zinc-600 font-medium bg-zinc-800/50 px-2 py-0.5 rounded-full">{columnTickets.length}</span>
            </div>
            <div className="flex-1 p-2 flex flex-col gap-2 overflow-y-auto min-h-0 relative">
              {columnTickets.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-zinc-600 text-sm italic">No tasks</span>
                </div>
              ) : (
                columnTickets.map(ticket => (
                  <div 
                    key={ticket.id}
                    onClick={() => selectKanbanTicket(ticket.id, 'preview')}
                    className={`p-3 bg-zinc-800/40 hover:bg-zinc-800/70 border rounded-md cursor-pointer transition-all shadow-sm flex flex-col gap-2 ${kanbanSelectedTicket === ticket.id ? 'border-blue-500/50 ring-1 ring-blue-500/20' : 'border-zinc-700/50 hover:border-zinc-600'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-zinc-200 line-clamp-2">{ticket.title}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs font-mono text-zinc-500">{ticket.id}</span>
                      <div className="flex gap-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${ticket.priority === 'Critical' ? 'bg-red-500/10 text-red-400' : ticket.priority === 'High' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>
                          {ticket.priority}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-zinc-700/50 text-zinc-400 font-medium">
                          {ticket.type}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="@container w-full h-full flex bg-[#1e1e1e] relative overflow-hidden">
      
      {/* Left Internal Dock */}
      <div className="w-14 flex flex-col items-center py-4 border-r border-zinc-800 bg-zinc-950/80 shrink-0 z-10">
        <button 
          className="w-8 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-md shadow-sm transition-colors mb-6"
          title="Create Issue"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        
        <div className="flex flex-col gap-2 w-full px-2">
          <button 
            onClick={() => setKanbanSection('cycles')}
            className={`w-full aspect-square flex items-center justify-center rounded-md transition-colors ${kanbanCurrentSection === 'cycles' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
            title="Cycles (Board)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
              <line x1="15" y1="3" x2="15" y2="21"></line>
            </svg>
          </button>
          
          <button 
            onClick={() => setKanbanSection('backlog')}
            className={`w-full aspect-square flex items-center justify-center rounded-md transition-colors ${kanbanCurrentSection === 'backlog' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
            title="Backlog"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
          </button>

          <button 
            onClick={() => setKanbanSection('all')}
            className={`w-full aspect-square flex items-center justify-center rounded-md transition-colors ${kanbanCurrentSection === 'all' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
            title="All Tickets"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-6 border-b border-zinc-800 shrink-0 bg-zinc-950/50 z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 mr-2">
              <button 
                onClick={navigateKanbanBack}
                disabled={!canGoBack}
                className={`p-1 rounded transition-colors ${canGoBack ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200' : 'text-zinc-700 cursor-not-allowed'}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <button 
                onClick={navigateKanbanForward}
                disabled={!canGoForward}
                className={`p-1 rounded transition-colors ${canGoForward ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200' : 'text-zinc-700 cursor-not-allowed'}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
            <span className="text-zinc-200 font-medium text-sm capitalize">
              {kanbanCurrentSection} {kanbanTicketViewMode === 'full' && selectedTicketObj ? `/ ${selectedTicketObj.id}` : ''}
            </span>
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

        {/* Content Body */}
        {kanbanTicketViewMode === 'full' && selectedTicketObj ? (
          <div className="flex-1 bg-zinc-950 p-8 overflow-y-auto">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="flex items-center gap-3 text-sm">
                <span className="font-mono text-zinc-500">{selectedTicketObj.id}</span>
                <span className="text-zinc-700">•</span>
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full text-xs font-medium">{selectedTicketObj.status}</span>
              </div>
              <h1 className="text-2xl font-semibold text-zinc-100">{selectedTicketObj.title}</h1>
              <div className="prose prose-invert text-zinc-300">
                <p>{selectedTicketObj.description}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {/* The Board / List */}
            <div className={`w-full transition-all duration-300 overflow-hidden ${kanbanTicketViewMode === 'preview' ? 'h-[55%] min-h-[55%]' : 'h-full'}`}>
              <div className="h-full w-full overflow-x-auto overflow-y-hidden">
                {kanbanCurrentSection === 'cycles' ? renderBoard() : (
                  <div className="p-8 flex items-center justify-center h-full text-zinc-500 italic">
                    {kanbanCurrentSection} view placeholder
                  </div>
                )}
              </div>
            </div>

            {/* Preview Split Pane */}
            {kanbanTicketViewMode === 'preview' && selectedTicketObj && (
              <div className="h-[45%] border-t border-zinc-800 bg-zinc-950 flex flex-col shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.2)] z-20 transition-all duration-300">
                <div className="h-10 border-b border-zinc-800/50 flex items-center justify-between px-4 bg-zinc-900/30">
                  <span className="text-xs font-mono text-zinc-400">{selectedTicketObj.id} Preview</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => selectKanbanTicket(selectedTicketObj.id, 'full')}
                      className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-500/10 transition-colors"
                    >
                      Expand
                    </button>
                    <button 
                      onClick={() => selectKanbanTicket(null, null)}
                      className="text-zinc-500 hover:text-zinc-300 p-1"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                </div>
                <div className="flex-1 p-6 overflow-y-auto">
                  <h2 className="text-lg font-medium text-zinc-100 mb-2">{selectedTicketObj.title}</h2>
                  <div className="flex items-center gap-2 mb-6">
                    <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs font-medium">{selectedTicketObj.status}</span>
                    <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs font-medium">{selectedTicketObj.type}</span>
                    <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs font-medium">{selectedTicketObj.priority}</span>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">{selectedTicketObj.description}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
