import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';

const KANBAN_COLUMNS = ['Open', 'Ready', 'In Progress', 'Testing', 'UAT', 'Done'];

export const KanbanWidget: React.FC = () => {
  const { 
    kanbanMockCycles,
    kanbanActiveCycleId,
    kanbanMockTickets, 
    kanbanCurrentSection, 
    kanbanSelectedTicket, 
    kanbanTicketViewMode,
    setKanbanSection,
    selectKanbanTicket,
    setKanbanActiveCycle,
    navigateKanbanBack,
    navigateKanbanForward,
    kanbanHistory,
    kanbanHistoryIndex,
    updateKanbanTicket
  } = useAppStore();

  const [cyclesLayout, setCyclesLayout] = useState<'grid' | 'list'>('grid');
  const [allTicketsLayout, setAllTicketsLayout] = useState<'grid' | 'list'>('list');

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const selectedTicketObj = kanbanSelectedTicket ? kanbanMockTickets.find(t => t.id === kanbanSelectedTicket) : null;
  const activeCycleObj = kanbanActiveCycleId ? kanbanMockCycles.find(c => c.id === kanbanActiveCycleId) : null;
  const canGoBack = kanbanHistoryIndex > 0;
  const canGoForward = kanbanHistoryIndex < kanbanHistory.length - 1;

  // Reset edit state when selected ticket changes
  useEffect(() => {
    setIsEditing(false);
  }, [kanbanSelectedTicket]);

  const handleEditToggle = () => {
    if (!selectedTicketObj) return;
    
    if (isEditing) {
      // Save changes
      updateKanbanTicket(selectedTicketObj.id, {
        title: editTitle,
        description: editDescription
      });
      setIsEditing(false);
    } else {
      // Enter edit mode
      setEditTitle(selectedTicketObj.title);
      setEditDescription(selectedTicketObj.description);
      setIsEditing(true);
    }
  };

  // Board Area Content
  const renderBoard = () => {
    // Filter tickets by active cycle
    const boardTickets = kanbanMockTickets.filter(t => t.cycleId === kanbanActiveCycleId);
    
    return (
      <div className="flex h-full p-6 gap-4 min-w-max">
        {KANBAN_COLUMNS.map((colName) => {
          const columnTickets = boardTickets.filter(t => t.status === colName);
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
  };

  const renderCyclesList = () => {
    return (
      <div className="p-8 max-w-4xl mx-auto w-full h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold text-zinc-100">Cycles</h2>
          <div className="flex items-center gap-1 bg-zinc-900/50 border border-zinc-800/80 p-1 rounded-md">
            <button 
              onClick={() => setCyclesLayout('grid')}
              className={`p-1.5 rounded transition-colors ${cyclesLayout === 'grid' ? 'bg-zinc-800 text-zinc-200 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Grid View"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            </button>
            <button 
              onClick={() => setCyclesLayout('list')}
              className={`p-1.5 rounded transition-colors ${cyclesLayout === 'list' ? 'bg-zinc-800 text-zinc-200 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="List View"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            </button>
          </div>
        </div>
        
        <div className={cyclesLayout === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "flex flex-col gap-2"}>
          {kanbanMockCycles.map(cycle => {
            const cycleTickets = kanbanMockTickets.filter(t => t.cycleId === cycle.id);
            const total = cycleTickets.length;
            const done = cycleTickets.filter(t => t.status === 'Done').length;
            const progress = total === 0 ? 0 : Math.round((done / total) * 100);
            const isActive = kanbanActiveCycleId === cycle.id;
            
            if (cyclesLayout === 'grid') {
              return (
                <div 
                  key={cycle.id}
                  onClick={() => {
                    setKanbanActiveCycle(cycle.id);
                    setKanbanSection('board');
                  }}
                  className={`flex flex-col p-5 rounded-lg border cursor-pointer transition-all ${isActive ? 'bg-blue-500/5 border-blue-500/30' : 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700'}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-lg text-zinc-200">{cycle.name}</span>
                      {cycle.targetDate && (
                        <span className="text-sm text-zinc-500 flex items-center gap-1.5">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                          {cycle.targetDate}
                        </span>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cycle.status === 'Active' ? 'bg-green-500/10 text-green-400' : cycle.status === 'Completed' ? 'bg-zinc-800 text-zinc-400' : 'bg-orange-500/10 text-orange-400'}`}>
                      {cycle.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-sm text-zinc-400 min-w-[3rem] text-right">{progress}%</span>
                  </div>
                </div>
              );
            }

            // List View
            return (
              <div 
                key={cycle.id}
                onClick={() => {
                  setKanbanActiveCycle(cycle.id);
                  setKanbanSection('board');
                }}
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${isActive ? 'bg-blue-500/5 border-blue-500/30' : 'bg-zinc-900/50 border-zinc-800/50 hover:border-zinc-700'}`}
              >
                <div className="flex items-center gap-3 w-1/3">
                  <span className="font-medium text-sm text-zinc-200">{cycle.name}</span>
                </div>
                <div className="flex items-center gap-3 w-1/4">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cycle.status === 'Active' ? 'bg-green-500/10 text-green-400' : cycle.status === 'Completed' ? 'bg-zinc-800 text-zinc-400' : 'bg-orange-500/10 text-orange-400'}`}>
                    {cycle.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 w-1/4">
                  {cycle.targetDate && (
                    <span className="text-xs text-zinc-500 flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                      {cycle.targetDate}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-xs text-zinc-400 min-w-[2.5rem] text-right">{progress}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAllTickets = () => {
    return (
      <div className="p-8 max-w-5xl mx-auto w-full h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold text-zinc-100">All Tickets</h2>
          <div className="flex items-center gap-1 bg-zinc-900/50 border border-zinc-800/80 p-1 rounded-md">
            <button 
              onClick={() => setAllTicketsLayout('grid')}
              className={`p-1.5 rounded transition-colors ${allTicketsLayout === 'grid' ? 'bg-zinc-800 text-zinc-200 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Grid View"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            </button>
            <button 
              onClick={() => setAllTicketsLayout('list')}
              className={`p-1.5 rounded transition-colors ${allTicketsLayout === 'list' ? 'bg-zinc-800 text-zinc-200 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="List View"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            </button>
          </div>
        </div>
        
        <div className={allTicketsLayout === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-2"}>
          {kanbanMockTickets.map(ticket => {
            if (allTicketsLayout === 'grid') {
              return (
                <div 
                  key={ticket.id}
                  onClick={() => selectKanbanTicket(ticket.id, 'preview')}
                  className={`p-4 bg-zinc-900/50 hover:bg-zinc-800/50 border rounded-lg cursor-pointer transition-all flex flex-col gap-3 ${kanbanSelectedTicket === ticket.id ? 'border-blue-500/50 ring-1 ring-blue-500/20' : 'border-zinc-800/80 hover:border-zinc-700'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-base font-medium text-zinc-200 line-clamp-2">{ticket.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-zinc-500">{ticket.id}</span>
                    <span className="text-zinc-700">•</span>
                    <span className="text-zinc-400">{ticket.status}</span>
                  </div>
                  <div className="flex gap-2 mt-auto pt-2 border-t border-zinc-800/50">
                    <span className={`text-[10px] px-2 py-0.5 rounded-sm font-medium ${ticket.priority === 'Critical' ? 'bg-red-500/10 text-red-400' : ticket.priority === 'High' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>
                      {ticket.priority}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-sm bg-zinc-800 text-zinc-400 font-medium">
                      {ticket.type}
                    </span>
                  </div>
                </div>
              );
            }
            
            // List View
            return (
              <div 
                key={ticket.id}
                onClick={() => selectKanbanTicket(ticket.id, 'preview')}
                className={`flex items-center p-3 bg-zinc-900/30 border rounded-lg cursor-pointer transition-all ${kanbanSelectedTicket === ticket.id ? 'border-blue-500/50 bg-blue-500/5' : 'border-zinc-800/50 hover:border-zinc-700'}`}
              >
                <div className="w-24 shrink-0">
                  <span className="text-xs font-mono text-zinc-500">{ticket.id}</span>
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <span className="text-sm font-medium text-zinc-200 truncate block">{ticket.title}</span>
                </div>
                <div className="w-32 shrink-0">
                  <span className="px-2 py-0.5 bg-zinc-800/80 text-zinc-300 rounded text-[10px] font-medium">{ticket.status}</span>
                </div>
                <div className="w-24 shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-sm font-medium ${ticket.priority === 'Critical' ? 'bg-red-500/10 text-red-400' : ticket.priority === 'High' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>
                    {ticket.priority}
                  </span>
                </div>
                <div className="w-24 shrink-0 text-right">
                  <span className="text-[10px] px-2 py-0.5 rounded-sm bg-zinc-800/80 text-zinc-400 font-medium">
                    {ticket.type}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

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
          {/* Board Icon */}
          <button 
            onClick={() => setKanbanSection('board')}
            className={`w-full aspect-square flex items-center justify-center rounded-md transition-colors ${kanbanCurrentSection === 'board' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
            title="Board"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
              <line x1="15" y1="3" x2="15" y2="21"></line>
            </svg>
          </button>

          {/* Cycles Icon */}
          <button 
            onClick={() => setKanbanSection('cycles')}
            className={`w-full aspect-square flex items-center justify-center rounded-md transition-colors ${kanbanCurrentSection === 'cycles' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
            title="Cycles"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <circle cx="12" cy="12" r="6"></circle>
              <circle cx="12" cy="12" r="2"></circle>
            </svg>
          </button>
          
          {/* Backlog Icon */}
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

          {/* All Tickets Icon */}
          <button 
            onClick={() => setKanbanSection('all')}
            className={`w-full aspect-square flex items-center justify-center rounded-md transition-colors ${kanbanCurrentSection === 'all' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
            title="All Tickets"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-6 border-b border-zinc-800 shrink-0 bg-zinc-950/50 z-10">
          <div className="flex items-center gap-4">
            <span className="text-zinc-200 font-medium text-sm flex items-center gap-2">
              {kanbanCurrentSection === 'board' && activeCycleObj ? (
                <>
                  <span className="text-zinc-500">Feature:</span> 
                  {activeCycleObj.name}
                </>
              ) : kanbanCurrentSection === 'cycles' ? (
                'All Cycles'
              ) : (
                <span className="capitalize">{kanbanCurrentSection}</span>
              )}
              
              {kanbanTicketViewMode === 'full' && selectedTicketObj && (
                <>
                  <span className="text-zinc-600">/</span>
                  <span className="text-zinc-400 font-mono text-xs">{selectedTicketObj.id}</span>
                </>
              )}
            </span>
          </div>
          <div className="flex items-center">
            {kanbanTicketViewMode !== 'full' && (
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
            )}
          </div>
        </div>

        {/* Content Body */}
        {kanbanTicketViewMode === 'full' && selectedTicketObj ? (
          <div className="flex-1 bg-zinc-950 p-8 overflow-y-auto">
            <div className="max-w-3xl mx-auto">
              {/* Full view top actions */}
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-800/50">
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-mono text-zinc-500">{selectedTicketObj.id}</span>
                  <span className="text-zinc-700">•</span>
                  <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full text-xs font-medium">{selectedTicketObj.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleEditToggle}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 text-xs rounded transition-colors border border-zinc-700/50"
                  >
                    {isEditing ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Save
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        Edit
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {isEditing ? (
                <div className="mb-6">
                  <input 
                    type="text" 
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-3xl font-semibold text-zinc-100 bg-zinc-900 border border-zinc-700 rounded-md py-2 px-3 focus:outline-none focus:border-blue-500"
                  />
                </div>
              ) : (
                <h1 className="text-3xl font-semibold text-zinc-100 mb-6 leading-tight">{selectedTicketObj.title}</h1>
              )}
              
              <div className="flex items-center gap-2 mb-10">
                <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded text-xs font-medium flex items-center gap-1.5">
                  Type: <span className="text-zinc-200">{selectedTicketObj.type}</span>
                </span>
                <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded text-xs font-medium flex items-center gap-1.5">
                  Priority: <span className="text-zinc-200">{selectedTicketObj.priority}</span>
                </span>
              </div>
              
              <div className="prose prose-invert prose-zinc max-w-none text-zinc-300">
                <h3 className="text-lg font-medium text-zinc-200 mb-2">Description</h3>
                {isEditing ? (
                  <textarea 
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full h-48 bg-zinc-900 border border-zinc-700 rounded-md py-2 px-3 text-sm text-zinc-300 focus:outline-none focus:border-blue-500 resize-none"
                  />
                ) : (
                  <p className="leading-relaxed text-zinc-400 whitespace-pre-wrap">{selectedTicketObj.description}</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {/* The Board / List */}
            <div className={`w-full transition-all duration-300 overflow-hidden ${kanbanTicketViewMode === 'preview' ? 'h-[55%] min-h-[55%]' : 'h-full'}`}>
              <div className="h-full w-full overflow-x-auto overflow-y-hidden">
                {kanbanCurrentSection === 'board' ? renderBoard() : 
                 kanbanCurrentSection === 'cycles' ? renderCyclesList() : 
                 kanbanCurrentSection === 'all' ? renderAllTickets() : (
                  <div className="p-8 flex items-center justify-center h-full text-zinc-500 italic">
                    {kanbanCurrentSection} view placeholder
                  </div>
                )}
              </div>
            </div>

            {/* Preview Split Pane */}
            {kanbanTicketViewMode === 'preview' && selectedTicketObj && (
              <div className="h-[45%] border-t border-zinc-800 bg-zinc-950 flex flex-col shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.2)] z-20 transition-all duration-300">
                <div className="h-10 border-b border-zinc-800/50 flex items-center justify-between px-4 bg-zinc-900/30 shrink-0">
                  <span className="text-xs font-mono text-zinc-400">{selectedTicketObj.id} Preview</span>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={handleEditToggle}
                      className={`flex items-center gap-1 p-1 rounded transition-colors text-xs ${isEditing ? 'text-blue-400 hover:bg-blue-500/10' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                      title={isEditing ? "Save" : "Edit"}
                    >
                      {isEditing ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                      )}
                    </button>
                    <button 
                      onClick={() => selectKanbanTicket(selectedTicketObj.id, 'full')}
                      className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-800 transition-colors"
                      title="Expand to Full View"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
                    </button>
                    <div className="w-px h-4 bg-zinc-700/50 mx-1"></div>
                    <button 
                      onClick={() => selectKanbanTicket(null, null)}
                      className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-800 transition-colors"
                      title="Close"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                </div>
                <div className="flex-1 p-6 overflow-y-auto">
                  {isEditing ? (
                    <div className="flex flex-col gap-4">
                      <input 
                        type="text" 
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full text-lg font-medium text-zinc-100 bg-zinc-900 border border-zinc-700 rounded py-1.5 px-3 focus:outline-none focus:border-blue-500"
                      />
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs font-medium">{selectedTicketObj.status}</span>
                        <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs font-medium">{selectedTicketObj.type}</span>
                        <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs font-medium">{selectedTicketObj.priority}</span>
                      </div>
                      <textarea 
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full h-32 bg-zinc-900 border border-zinc-700 rounded py-2 px-3 text-sm text-zinc-300 focus:outline-none focus:border-blue-500 resize-none"
                      />
                    </div>
                  ) : (
                    <>
                      <h2 className="text-lg font-medium text-zinc-100 mb-2 leading-snug">{selectedTicketObj.title}</h2>
                      <div className="flex items-center gap-2 mb-6">
                        <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs font-medium">{selectedTicketObj.status}</span>
                        <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs font-medium">{selectedTicketObj.type}</span>
                        <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs font-medium">{selectedTicketObj.priority}</span>
                      </div>
                      <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{selectedTicketObj.description}</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom Navigation Bar */}
        <div className="h-10 flex items-center justify-center px-4 border-t border-zinc-800 shrink-0 bg-zinc-950/80 z-10 gap-2">
          <button 
            onClick={navigateKanbanBack}
            disabled={!canGoBack}
            className={`p-1 rounded transition-colors ${canGoBack ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200' : 'text-zinc-700 cursor-not-allowed'}`}
            title="Go Back"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button 
            onClick={navigateKanbanForward}
            disabled={!canGoForward}
            className={`p-1 rounded transition-colors ${canGoForward ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200' : 'text-zinc-700 cursor-not-allowed'}`}
            title="Go Forward"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
          <button 
            className="p-1 rounded text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors ml-1"
            title="Refresh"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
