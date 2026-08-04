import React, { useState, useEffect } from 'react';
import { useAppStore, type KanbanTicket, type TicketRelation } from '../../store/useAppStore';
import { DndContext, useDraggable, useDroppable, DragOverlay, useSensor, useSensors, PointerSensor, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const KANBAN_COLUMNS: KanbanTicket['status'][] = ['Ready', 'Blocked', 'In Progress', 'Testing', 'UAT', 'Done'];
const STATUS_OPTIONS: KanbanTicket['status'][] = ['Open', 'Ready', 'Blocked', 'In Progress', 'Testing', 'UAT', 'Done', 'Canceled'];
const PRIORITY_OPTIONS: KanbanTicket['priority'][] = ['Low', 'Medium', 'High', 'Critical'];
const TYPE_OPTIONS: KanbanTicket['type'][] = ['Story', 'Task', 'Bug', 'Spike', 'Cycle'];

const isValidTransition = (ticket: KanbanTicket, newStatus: KanbanTicket['status']): boolean => {
  if (newStatus === 'Canceled') return true;
  if (newStatus === ticket.status) return true; // Same state is valid

  if (newStatus === 'Done') {
    // Rule 2
    if (ticket.status === 'Open' || ticket.status === 'Ready') return false;

    // Rule 3
    if ((ticket.type === 'Story' || ticket.type === 'Bug') && ticket.status !== 'UAT') {
      return false;
    }
  }

  return true;
};

const KanbanTicketCard = ({ ticket, isSelected, onSelect }: { ticket: KanbanTicket, isSelected: boolean, onSelect: (id: string, view: 'preview') => void }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: ticket.id,
  });

  const style = {
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onSelect(ticket.id, 'preview')}
      className={`p-3 bg-zinc-800/40 hover:bg-zinc-800/70 border rounded-md cursor-pointer transition-all shadow-sm flex flex-col gap-2 ${isSelected ? 'border-blue-500/50 ring-1 ring-blue-500/20' : 'border-zinc-700/50 hover:border-zinc-600'} ${isDragging ? 'opacity-30' : ''} ${ticket.status === 'Canceled' ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`text-sm font-medium text-zinc-200 line-clamp-2 ${ticket.status === 'Canceled' ? 'line-through text-zinc-400' : ''}`}>{ticket.title}</span>
        {ticket.assignee && (
          <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[9px] font-medium text-zinc-300 shrink-0 border border-zinc-600" title={`Assignee: ${ticket.assignee}`}>
            {ticket.assignee.substring(0, 2).toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs font-mono text-zinc-500">{ticket.id}</span>
        <div className="flex flex-wrap gap-1">
          <InlineStatusBadge ticket={ticket} />
          <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${ticket.priority === 'Critical' ? 'bg-red-500/10 text-red-400' : ticket.priority === 'High' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>
            {ticket.priority}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-zinc-700/50 text-zinc-400 font-medium">
            {ticket.type}
          </span>
        </div>
      </div>
    </div>
  );
};

const InlineStatusBadge = ({ ticket, isFullView }: { ticket: KanbanTicket, isFullView?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { updateKanbanTicket } = useAppStore();

  const baseStyle = isFullView 
    ? "px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full text-xs font-medium border border-blue-500/20"
    : ticket.status === 'Blocked'
      ? "px-2 py-0.5 rounded text-[10px] font-medium border bg-red-500/10 text-red-400 border-red-500/20"
      : "px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-[10px] font-medium border border-zinc-700/50";

  return (
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <div 
        className={`${baseStyle} cursor-pointer hover:ring-1 hover:ring-blue-500/50 transition-all flex items-center gap-1.5 select-none w-max h-full`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {ticket.status}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />
          <div className="absolute top-full left-0 mt-1 w-32 bg-zinc-900 border border-zinc-700 rounded-md shadow-xl overflow-hidden z-50 py-1">
            {STATUS_OPTIONS.map(status => {
              const valid = isValidTransition(ticket, status);
              return (
                <button
                  key={status}
                  disabled={!valid}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${!valid ? 'opacity-50 cursor-not-allowed text-zinc-500' : status === ticket.status ? 'text-blue-400 bg-blue-500/5 cursor-pointer hover:bg-zinc-800' : 'text-zinc-300 cursor-pointer hover:bg-zinc-800'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (valid) {
                      updateKanbanTicket(ticket.id, { status });
                      setIsOpen(false);
                    }
                  }}
                >
                  {status}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

const KanbanColumn = ({ colName, columnTickets, selectedTicket, onSelect }: { colName: string, columnTickets: KanbanTicket[], selectedTicket: string | null, onSelect: (id: string, view: 'preview') => void }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: colName,
  });

  return (
    <div
      ref={setNodeRef}
      className={`w-72 flex flex-col bg-zinc-900/50 rounded-lg overflow-hidden shrink-0 transition-all duration-200 border ${
        isOver
          ? 'border-blue-500 ring-2 ring-blue-500/40 bg-blue-500/10' // Highlighted drop target
          : 'border-zinc-800/80' // Normal state
      }`}
    >
      <div className="p-3 border-b border-zinc-800/80 bg-zinc-900/80 flex items-center justify-between shrink-0 pointer-events-none">
        <span className={`text-xs font-semibold uppercase tracking-wider ${colName === 'Blocked' ? 'text-red-400' : 'text-zinc-300'}`}>{colName}</span>
        <span className="text-xs text-zinc-600 font-medium bg-zinc-800/50 px-2 py-0.5 rounded-full">{columnTickets.length}</span>
      </div>
      <div className="flex-1 p-2 flex flex-col gap-2 overflow-y-auto min-h-[200px] h-full relative">
        {columnTickets.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-zinc-600 text-sm italic">No tasks</span>
          </div>
        ) : (
          columnTickets.map(ticket => (
            <KanbanTicketCard 
              key={ticket.id} 
              ticket={ticket} 
              isSelected={selectedTicket === ticket.id}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
};

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
    updateKanbanTicket,
    addKanbanTicket,
    linkTickets,
    kanbanSearchQuery,
    setKanbanSearchQuery,
    userAvatar,
    setUserAvatar,
    availableActors
  } = useAppStore();

  const [cyclesLayout, setCyclesLayout] = useState<'grid' | 'list'>('grid');
  const [cyclesItemsPerPage, setCyclesItemsPerPage] = useState(10);
  const [cyclesPage, setCyclesPage] = useState(1);

  const [allTicketsLayout, setAllTicketsLayout] = useState<'grid' | 'list'>('list');
  const [allTicketsItemsPerPage, setAllTicketsItemsPerPage] = useState(20);
  const [allTicketsPage, setAllTicketsPage] = useState(1);

  const handleCyclesLayoutChange = (layout: 'grid' | 'list') => {
    setCyclesLayout(layout);
    setCyclesItemsPerPage(layout === 'grid' ? 10 : 20);
    setCyclesPage(1);
  };

  const handleAllTicketsLayoutChange = (layout: 'grid' | 'list') => {
    setAllTicketsLayout(layout);
    setAllTicketsItemsPerPage(layout === 'grid' ? 10 : 20);
    setAllTicketsPage(1);
  };

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAcc, setEditAcc] = useState('');
  const [editDod, setEditDod] = useState('');
  const [editStatus, setEditStatus] = useState<KanbanTicket['status']>('Open');
  const [editPriority, setEditPriority] = useState<KanbanTicket['priority']>('Medium');
  const [editType, setEditType] = useState<KanbanTicket['type']>('Story');
  const [editCycleId, setEditCycleId] = useState<string>('');
  const [editAssignee, setEditAssignee] = useState<string>('');
  const [editReporter, setEditReporter] = useState<string>('Human Orchestrator');

  const [historyLimit, setHistoryLimit] = useState(5);

  // When selected ticket changes, reset history limit and comment state
  useEffect(() => {
    setHistoryLimit(5);
    setNewComment('');
  }, [kanbanSelectedTicket]);

  const [newComment, setNewComment] = useState('');

  // Link Ticket State
  const [linkSearch, setLinkSearch] = useState('');
  const [linkRelation, setLinkRelation] = useState<TicketRelation>('Relates to');
  const [showLinkDropdown, setShowLinkDropdown] = useState(false);

  // DnD State
  const [activeId, setActiveId] = useState<string | null>(null);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createAcc, setCreateAcc] = useState('');
  const [createDod, setCreateDod] = useState('');
  const [createStatus, setCreateStatus] = useState<KanbanTicket['status']>('Open');
  const [createPriority, setCreatePriority] = useState<KanbanTicket['priority']>('Medium');
  const [createType, setCreateType] = useState<KanbanTicket['type']>('Story');
  const [createCycleId, setCreateCycleId] = useState<string>('');
  const [createAssignee, setCreateAssignee] = useState<string>('');
  const [createReporter, setCreateReporter] = useState<string>('Human Orchestrator');

  const selectedTicketObj = kanbanSelectedTicket ? kanbanMockTickets.find(t => t.id === kanbanSelectedTicket) : null;
  const activeCycleObj = kanbanActiveCycleId ? kanbanMockCycles.find(c => c.id === kanbanActiveCycleId) : null;
  const canGoBack = kanbanHistoryIndex > 0;
  const canGoForward = kanbanHistoryIndex < kanbanHistory.length - 1;

  // Global Filtered Tickets
  const filteredTickets = kanbanMockTickets.filter(t => 
    !kanbanSearchQuery || 
    t.title.toLowerCase().includes(kanbanSearchQuery.toLowerCase()) || 
    t.description.toLowerCase().includes(kanbanSearchQuery.toLowerCase())
  );

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
        description: editDescription,
        acc: editType === 'Cycle' || editType === 'Spike' ? undefined : editAcc,
        dod: editType === 'Cycle' ? undefined : editDod,
        status: editStatus,
        priority: editPriority,
        type: editType,
        cycleId: editCycleId || undefined,
        assignee: editAssignee || undefined,
        reporter: editReporter || 'Human Orchestrator'
      });
      setIsEditing(false);
    } else {
      // Enter edit mode
      setEditTitle(selectedTicketObj.title);
      setEditDescription(selectedTicketObj.description);
      setEditAcc(selectedTicketObj.acc || '');
      setEditDod(selectedTicketObj.dod || '');
      setEditStatus(selectedTicketObj.status);
      setEditPriority(selectedTicketObj.priority);
      setEditType(selectedTicketObj.type);
      setEditCycleId(selectedTicketObj.cycleId || '');
      setEditAssignee(selectedTicketObj.assignee || '');
      setEditReporter(selectedTicketObj.reporter || 'Human Orchestrator');
      setIsEditing(true);
    }
  };

  const handleCreateTicket = () => {
    if (!createTitle.trim()) return;
    
    addKanbanTicket({
      title: createTitle,
      description: createDescription,
      acc: createType === 'Cycle' || createType === 'Spike' ? undefined : createAcc,
      dod: createType === 'Cycle' ? undefined : createDod,
      status: createStatus,
      priority: createPriority,
      type: createType,
      cycleId: createCycleId || undefined,
      assignee: createAssignee || undefined,
      reporter: createReporter || 'Human Orchestrator'
    });

    // Reset and close
    setCreateTitle('');
    setCreateDescription('');
    setCreateAcc('');
    setCreateDod('');
    setCreateStatus('Open');
    setCreatePriority('Medium');
    setCreateType('Story');
    setCreateCycleId('');
    setCreateAssignee('');
    setCreateReporter('Human Orchestrator');
    setShowCreateModal(false);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setUserAvatar(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const renderSettingsView = () => {
    return (
      <div className="flex flex-col h-full bg-zinc-950 p-8 overflow-y-auto">
        <h2 className="text-2xl font-bold text-zinc-100 mb-6">Settings</h2>
        
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 max-w-2xl">
          <h3 className="text-lg font-medium text-zinc-200 mb-4 border-b border-zinc-800 pb-2">User Profile</h3>
          
          <div className="flex items-center gap-6">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-zinc-700 bg-zinc-800">
                {userAvatar ? (
                  <img src={userAvatar} alt="User Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-500">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-1 flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Avatar Image</label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded transition-colors text-sm font-medium inline-block">
                    Upload new image
                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                  </label>
                  {userAvatar && (
                    <button 
                      onClick={() => setUserAvatar('')}
                      className="text-sm text-red-400 hover:text-red-300 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-2">Recommended: Square image, max 2MB. Supports PNG, JPG, GIF.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Board Area Content
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over) {
      const ticket = kanbanMockTickets.find(t => t.id === active.id);
      const newStatus = over.id as KanbanTicket['status'];
      if (ticket && isValidTransition(ticket, newStatus)) {
        updateKanbanTicket(ticket.id, { status: newStatus });
      }
    }
    setActiveId(null);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const renderBoard = () => {
    // Filter tickets by active cycle
    const boardTickets = filteredTickets.filter(t => t.cycleId === kanbanActiveCycleId);
    const activeTicket = activeId ? kanbanMockTickets.find(t => t.id === activeId) : null;

    return (
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex h-full p-6 gap-4 min-w-max">
          {KANBAN_COLUMNS.map((colName) => {
            const columnTickets = boardTickets.filter(t => t.status === colName || (colName === 'Done' && t.status === 'Canceled'));
            return (
              <KanbanColumn
                key={colName}
                colName={colName}
                columnTickets={columnTickets}
                selectedTicket={kanbanSelectedTicket}
                onSelect={selectKanbanTicket}
              />
            );
          })}
        </div>
        <DragOverlay>
          {activeTicket ? (
            <div className="p-3 bg-zinc-800/80 border border-blue-500/50 ring-1 ring-blue-500/20 rounded-md shadow-2xl flex flex-col gap-2 rotate-2 opacity-95">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-zinc-200 line-clamp-2">{activeTicket.title}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs font-mono text-zinc-500">{activeTicket.id}</span>
                <div className="flex flex-wrap gap-1">
                  {activeTicket.status === 'Blocked' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-sm font-medium bg-red-500/10 text-red-400">
                      Blocked
                    </span>
                  )}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${activeTicket.priority === 'Critical' ? 'bg-red-500/10 text-red-400' : activeTicket.priority === 'High' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>
                    {activeTicket.priority}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-zinc-700/50 text-zinc-400 font-medium">
                    {activeTicket.type}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  };

  const renderCyclesList = () => {
    const startIdx = (cyclesPage - 1) * cyclesItemsPerPage;
    const paginatedCycles = kanbanMockCycles.slice(startIdx, startIdx + cyclesItemsPerPage);
    const totalPages = Math.max(1, Math.ceil(kanbanMockCycles.length / cyclesItemsPerPage));

    return (
      <div className="p-8 max-w-5xl mx-auto w-full h-full overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between mb-8 shrink-0">
          <h2 className="text-2xl font-semibold text-zinc-100">Cycles</h2>
          <div className="flex items-center gap-3">
            <select
              value={cyclesItemsPerPage}
              onChange={(e) => {
                setCyclesItemsPerPage(Number(e.target.value));
                setCyclesPage(1);
              }}
              className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 rounded px-2 py-1.5 outline-none cursor-pointer hover:border-zinc-700 transition-colors"
            >
              {cyclesLayout === 'grid' ? (
                <>
                  <option value={10}>10 / page</option>
                  <option value={15}>15 / page</option>
                  <option value={20}>20 / page</option>
                </>
              ) : (
                <>
                  <option value={20}>20 / page</option>
                  <option value={30}>30 / page</option>
                  <option value={50}>50 / page</option>
                </>
              )}
            </select>
            <div className="flex items-center gap-1 bg-zinc-900/50 border border-zinc-800/80 p-1 rounded-md">
              <button 
                onClick={() => handleCyclesLayoutChange('grid')}
                className={`p-1.5 rounded transition-colors ${cyclesLayout === 'grid' ? 'bg-zinc-800 text-zinc-200 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="Grid View"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              </button>
              <button 
                onClick={() => handleCyclesLayoutChange('list')}
                className={`p-1.5 rounded transition-colors ${cyclesLayout === 'list' ? 'bg-zinc-800 text-zinc-200 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="List View"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
              </button>
            </div>
          </div>
        </div>
        
        <div className={`flex-1 ${cyclesLayout === 'grid' ? "grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 content-start" : "flex flex-col gap-2"}`}>
          {paginatedCycles.length === 0 ? (
            <div className="col-span-full py-12 text-center text-zinc-500">No cycles found.</div>
          ) : (
            paginatedCycles.map(cycle => {
              // Note: using filteredTickets instead of kanbanMockTickets
              const cycleTickets = filteredTickets.filter(t => t.cycleId === cycle.id);
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
                    className={`flex flex-col p-5 rounded-lg border cursor-pointer transition-all min-h-[140px] ${isActive ? 'bg-blue-500/5 border-blue-500/30' : 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700'}`}
                  >
                    <div className="flex items-start justify-between mb-4 gap-3">
                      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                        <span className="font-medium text-lg text-zinc-200 line-clamp-2">{cycle.name}</span>
                        {cycle.targetDate && (
                          <span className="text-sm text-zinc-500 flex items-center gap-1.5">
                            <svg className="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            {cycle.targetDate}
                          </span>
                        )}
                      </div>
                      <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${cycle.status === 'Active' ? 'bg-green-500/10 text-green-400' : cycle.status === 'Completed' ? 'bg-zinc-800 text-zinc-400' : 'bg-orange-500/10 text-orange-400'}`}>
                        {cycle.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-auto">
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
                  <div className="flex items-center gap-3 w-1/3 min-w-0 pr-4">
                    <span className="font-medium text-sm text-zinc-200 truncate">{cycle.name}</span>
                  </div>
                  <div className="flex items-center gap-3 w-1/4 shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cycle.status === 'Active' ? 'bg-green-500/10 text-green-400' : cycle.status === 'Completed' ? 'bg-zinc-800 text-zinc-400' : 'bg-orange-500/10 text-orange-400'}`}>
                      {cycle.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 w-1/4 shrink-0">
                    {cycle.targetDate && (
                      <span className="text-xs text-zinc-500 flex items-center gap-1.5">
                        <svg className="shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        {cycle.targetDate}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-1 min-w-[120px]">
                    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-xs text-zinc-400 w-10 text-right">{progress}%</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {/* Pagination Controls */}
        <div className="flex justify-between items-center mt-8 pt-4 border-t border-zinc-800/50 shrink-0">
          <button 
            disabled={cyclesPage === 1}
            onClick={() => setCyclesPage(p => Math.max(1, p - 1))}
            className="text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            Previous
          </button>
          <span className="text-xs text-zinc-500 font-medium">Page {cyclesPage} of {totalPages}</span>
          <button 
            disabled={cyclesPage >= totalPages}
            onClick={() => setCyclesPage(p => Math.min(totalPages, p + 1))}
            className="text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            Next
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      </div>
    );
  };

  const renderAllTickets = (isBacklog: boolean = false) => {
    const sourceTickets = isBacklog ? filteredTickets.filter(t => t.status === 'Open') : filteredTickets;
    
    const startIdx = (allTicketsPage - 1) * allTicketsItemsPerPage;
    const paginatedTickets = sourceTickets.slice(startIdx, startIdx + allTicketsItemsPerPage);
    const totalPages = Math.max(1, Math.ceil(sourceTickets.length / allTicketsItemsPerPage));

    return (
      <div className="p-8 max-w-5xl mx-auto w-full h-full overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between mb-8 shrink-0">
          <h2 className="text-2xl font-semibold text-zinc-100">{isBacklog ? 'Backlog' : 'All Tickets'}</h2>
          <div className="flex items-center gap-3">
            <select
              value={allTicketsItemsPerPage}
              onChange={(e) => {
                setAllTicketsItemsPerPage(Number(e.target.value));
                setAllTicketsPage(1);
              }}
              className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 rounded px-2 py-1.5 outline-none cursor-pointer hover:border-zinc-700 transition-colors"
            >
              {allTicketsLayout === 'grid' ? (
                <>
                  <option value={10}>10 / page</option>
                  <option value={15}>15 / page</option>
                  <option value={20}>20 / page</option>
                </>
              ) : (
                <>
                  <option value={20}>20 / page</option>
                  <option value={30}>30 / page</option>
                  <option value={50}>50 / page</option>
                </>
              )}
            </select>
            <div className="flex items-center gap-1 bg-zinc-900/50 border border-zinc-800/80 p-1 rounded-md">
              <button 
                onClick={() => handleAllTicketsLayoutChange('grid')}
                className={`p-1.5 rounded transition-colors ${allTicketsLayout === 'grid' ? 'bg-zinc-800 text-zinc-200 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="Grid View"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              </button>
              <button 
                onClick={() => handleAllTicketsLayoutChange('list')}
                className={`p-1.5 rounded transition-colors ${allTicketsLayout === 'list' ? 'bg-zinc-800 text-zinc-200 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="List View"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
              </button>
            </div>
          </div>
        </div>
        
        <div className={`flex-1 ${allTicketsLayout === 'grid' ? "grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 content-start" : "flex flex-col gap-2"}`}>
          {paginatedTickets.length === 0 ? (
            <div className="col-span-full py-12 text-center text-zinc-500">No tickets found.</div>
          ) : (
            paginatedTickets.map(ticket => {
              if (allTicketsLayout === 'grid') {
                return (
                  <div 
                    key={ticket.id}
                    onClick={() => selectKanbanTicket(ticket.id, 'preview')}
                    className={`p-5 bg-zinc-900/50 hover:bg-zinc-800/50 border rounded-lg cursor-pointer transition-all flex flex-col gap-3 min-h-[140px] ${kanbanSelectedTicket === ticket.id ? 'border-blue-500/50 ring-1 ring-blue-500/20' : 'border-zinc-800/80 hover:border-zinc-700'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-base font-medium text-zinc-200 line-clamp-2 min-w-0 flex-1">{ticket.title}</span>
                      <span className="shrink-0 font-mono text-xs text-zinc-500">{ticket.id}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-auto pt-2 border-t border-zinc-800/50">
                      <InlineStatusBadge ticket={ticket} />
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium border ${ticket.priority === 'Critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' : ticket.priority === 'High' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                        {ticket.priority}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800/50 text-zinc-400 font-medium border border-zinc-700/30">
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
                    <InlineStatusBadge ticket={ticket} />
                  </div>
                  <div className="w-24 shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium border ${ticket.priority === 'Critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' : ticket.priority === 'High' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                      {ticket.priority}
                    </span>
                  </div>
                  <div className="w-24 shrink-0 text-right">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 font-medium border border-zinc-700/50">
                      {ticket.type}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls */}
        <div className="flex justify-between items-center mt-8 pt-4 border-t border-zinc-800/50 shrink-0">
          <button 
            disabled={allTicketsPage === 1}
            onClick={() => setAllTicketsPage(p => Math.max(1, p - 1))}
            className="text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            Previous
          </button>
          <span className="text-xs text-zinc-500 font-medium">Page {allTicketsPage} of {totalPages}</span>
          <button 
            disabled={allTicketsPage >= totalPages}
            onClick={() => setAllTicketsPage(p => Math.min(totalPages, p + 1))}
            className="text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            Next
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="@container w-full h-full flex bg-[#1e1e1e] relative overflow-hidden">
      
      {/* Create Ticket Modal Overlay */}
      {showCreateModal && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center backdrop-blur-sm">
          <div className="w-[500px] bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-950/50">
              <h3 className="text-lg font-medium text-zinc-100">Create New Ticket</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[60vh]">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Title</label>
                <input 
                  type="text" 
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 rounded py-2 px-3 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Ticket title..."
                  autoFocus
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Status</label>
                  <select 
                    value={createStatus}
                    onChange={(e) => setCreateStatus(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 rounded py-2 px-3 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Priority</label>
                  <select 
                    value={createPriority}
                    onChange={(e) => setCreatePriority(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 rounded py-2 px-3 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Type</label>
                  <select 
                    value={createType}
                    onChange={(e) => setCreateType(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 rounded py-2 px-3 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Cycle</label>
                  <select 
                    value={createCycleId}
                    onChange={(e) => setCreateCycleId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 rounded py-2 px-3 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="">None</option>
                    {kanbanMockCycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Reporter</label>
                  <select 
                    value={createReporter}
                    onChange={(e) => setCreateReporter(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 rounded py-2 px-3 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    {availableActors?.map(actor => <option key={actor} value={actor}>{actor}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Assignee</label>
                  <select 
                    value={createAssignee}
                    onChange={(e) => setCreateAssignee(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 rounded py-2 px-3 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="">Unassigned</option>
                    {availableActors?.map(actor => <option key={actor} value={actor}>{actor}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
                <textarea 
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  className="w-full h-32 bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 rounded py-2 px-3 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  placeholder="Ticket details..."
                />
              </div>
              {createType !== 'Cycle' && (
                <div className="flex gap-4">
                  {createType !== 'Spike' && (
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Acceptance Criteria</label>
                      <textarea 
                        value={createAcc}
                        onChange={(e) => setCreateAcc(e.target.value)}
                        className="w-full h-24 bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 rounded py-2 px-3 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                        placeholder="ACC..."
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Definition of Done</label>
                    <textarea 
                      value={createDod}
                      onChange={(e) => setCreateDod(e.target.value)}
                      className="w-full h-24 bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 rounded py-2 px-3 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                      placeholder="DoD..."
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-zinc-800/50 flex items-center justify-end gap-3 bg-zinc-950/50">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-1.5 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateTicket}
                disabled={!createTitle.trim()}
                className="px-4 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left Internal Dock */}
      <div className="w-14 flex flex-col items-center py-4 border-r border-zinc-800 bg-zinc-950/80 shrink-0 z-10">
        <button 
          onClick={() => { setShowCreateModal(true); setCreateCycleId(kanbanActiveCycleId || ''); }}
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
        
        <div className="flex-1" />
        
        <div className="flex flex-col w-full px-2 mb-4">
          {/* Settings Icon */}
          <button 
            onClick={() => setKanbanSection('settings')}
            className={`w-full aspect-square flex items-center justify-center rounded-md transition-colors ${kanbanCurrentSection === 'settings' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
            title="Settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
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
            {kanbanCurrentSection === 'board' ? (
              <div className="w-8 h-8 rounded-full overflow-hidden border border-zinc-700 bg-zinc-800 flex items-center justify-center">
                {userAvatar ? (
                  <img src={userAvatar} alt="User Avatar" className="w-full h-full object-cover" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                )}
              </div>
            ) : kanbanTicketViewMode !== 'full' && (
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input 
                  type="text" 
                  value={kanbanSearchQuery}
                  onChange={(e) => setKanbanSearchQuery(e.target.value)}
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
                  <InlineStatusBadge ticket={selectedTicketObj} isFullView />
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
                <div className="mb-6 flex flex-col gap-4">
                  <input 
                    type="text" 
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-3xl font-semibold text-zinc-100 bg-zinc-900 border border-zinc-700 rounded-md py-2 px-3 focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex items-center gap-4">
                    <select 
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as any)}
                      className="bg-zinc-900 border border-zinc-700 text-sm text-zinc-200 rounded py-1.5 px-2 focus:outline-none focus:border-blue-500"
                    >
                      {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select 
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value as any)}
                      className="bg-zinc-900 border border-zinc-700 text-sm text-zinc-200 rounded py-1.5 px-2 focus:outline-none focus:border-blue-500"
                    >
                      {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select 
                      value={editCycleId}
                      onChange={(e) => setEditCycleId(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-sm text-zinc-200 rounded py-1.5 px-2 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">No Cycle</option>
                      {kanbanMockCycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select 
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="bg-zinc-900 border border-zinc-700 text-sm text-zinc-200 rounded py-1.5 px-2 focus:outline-none focus:border-blue-500"
                    >
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select 
                      value={editReporter}
                      onChange={(e) => setEditReporter(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-sm text-zinc-200 rounded py-1.5 px-2 focus:outline-none focus:border-blue-500"
                    >
                      {availableActors?.map(actor => <option key={actor} value={actor}>{actor}</option>)}
                    </select>
                    <select 
                      value={editAssignee}
                      onChange={(e) => setEditAssignee(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-sm text-zinc-200 rounded py-1.5 px-2 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Unassigned</option>
                      {availableActors?.map(actor => <option key={actor} value={actor}>{actor}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-3xl font-semibold text-zinc-100 mb-6 leading-tight">{selectedTicketObj.title}</h1>
                  <div className="flex items-center gap-2 mb-10">
                    <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded text-xs font-medium flex items-center gap-1.5">
                      Type: <span className="text-zinc-200">{selectedTicketObj.type}</span>
                    </span>
                    <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded text-xs font-medium flex items-center gap-1.5">
                      Priority: <span className="text-zinc-200">{selectedTicketObj.priority}</span>
                    </span>
                    <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded text-xs font-medium flex items-center gap-1.5">
                      Reporter: <span className="text-zinc-200">{selectedTicketObj.reporter || 'Unknown'}</span>
                    </span>
                    <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded text-xs font-medium flex items-center gap-1.5">
                      Assignee: <span className="text-zinc-200">{selectedTicketObj.assignee || 'Unassigned'}</span>
                    </span>
                  </div>
                </>
              )}
              
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
                
                {(!isEditing ? selectedTicketObj.type : editType) !== 'Cycle' && (
                  <>
                    {(!isEditing ? selectedTicketObj.type : editType) !== 'Spike' && (
                      <>
                        <h3 className="text-lg font-medium text-zinc-200 mt-6 mb-2">Acceptance Criteria</h3>
                        {isEditing ? (
                          <textarea 
                            value={editAcc}
                            onChange={(e) => setEditAcc(e.target.value)}
                            className="w-full h-32 bg-zinc-900 border border-zinc-700 rounded-md py-2 px-3 text-sm text-zinc-300 focus:outline-none focus:border-blue-500 resize-none"
                          />
                        ) : (
                          <p className="leading-relaxed text-zinc-400 whitespace-pre-wrap">{selectedTicketObj.acc || 'Not specified.'}</p>
                        )}
                      </>
                    )}
                    
                    <h3 className="text-lg font-medium text-zinc-200 mt-6 mb-2">Definition of Done</h3>
                    {isEditing ? (
                      <textarea 
                        value={editDod}
                        onChange={(e) => setEditDod(e.target.value)}
                        className="w-full h-32 bg-zinc-900 border border-zinc-700 rounded-md py-2 px-3 text-sm text-zinc-300 focus:outline-none focus:border-blue-500 resize-none"
                      />
                    ) : (
                      <p className="leading-relaxed text-zinc-400 whitespace-pre-wrap">{selectedTicketObj.dod || 'Not specified.'}</p>
                    )}
                  </>
                )}

                {/* Linked Tickets Section */}
                {!isEditing && selectedTicketObj && (
                  <div className="mt-12 border-t border-zinc-800/50 pt-6">
                    <h3 className="text-lg font-medium text-zinc-200 mb-4 flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                      Linked Tickets
                    </h3>
                    
                    <div className="flex flex-col gap-3 mb-4">
                      {selectedTicketObj.links?.map((link, idx) => {
                        const target = kanbanMockTickets.find(t => t.id === link.targetTicketId);
                        if (!target) return null;
                        return (
                          <div key={idx} className="flex items-center gap-3 p-2 rounded-md bg-zinc-900 border border-zinc-800/50">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-medium border ${link.relation === 'Blocks' ? 'bg-red-500/10 text-red-400 border-red-500/20' : link.relation === 'Blocked by' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                              {link.relation}
                            </span>
                            <span className="font-mono text-xs text-zinc-500 shrink-0">{target.id}</span>
                            <span className="text-sm text-zinc-300 truncate cursor-pointer hover:text-blue-400 transition-colors" onClick={() => selectKanbanTicket(target.id, 'full')}>{target.title}</span>
                          </div>
                        );
                      })}
                      {(!selectedTicketObj.links || selectedTicketObj.links.length === 0) && (
                        <div className="text-sm text-zinc-500 italic mb-2">No tickets linked.</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 relative">
                      <select 
                        value={linkRelation}
                        onChange={(e) => setLinkRelation(e.target.value as TicketRelation)}
                        className="bg-zinc-900 border border-zinc-700 text-sm text-zinc-200 rounded py-1.5 px-2 focus:outline-none focus:border-blue-500 h-9"
                      >
                        <option value="Relates to">Relates to</option>
                        <option value="Blocks">Blocks</option>
                        <option value="Blocked by">Blocked by</option>
                      </select>
                      
                      <div className="relative flex-1">
                        <input 
                          type="text"
                          value={linkSearch}
                          onChange={(e) => {
                            setLinkSearch(e.target.value);
                            setShowLinkDropdown(true);
                          }}
                          onFocus={() => setShowLinkDropdown(true)}
                          placeholder="Search ticket to link (e.g., SOMA-1)..."
                          className="w-full bg-zinc-900 border border-zinc-700 rounded py-1.5 px-3 text-sm text-zinc-300 focus:outline-none focus:border-blue-500 h-9"
                        />
                        {showLinkDropdown && linkSearch && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowLinkDropdown(false)} />
                            <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-md shadow-xl overflow-y-auto max-h-48 z-20 py-1">
                              {kanbanMockTickets
                                .filter(t => t.id !== selectedTicketObj.id && (t.id.toLowerCase().includes(linkSearch.toLowerCase()) || t.title.toLowerCase().includes(linkSearch.toLowerCase())))
                                .slice(0, 10)
                                .map(t => (
                                  <div 
                                    key={t.id}
                                    className="px-3 py-2 hover:bg-zinc-800 cursor-pointer flex items-center gap-2"
                                    onClick={() => {
                                      linkTickets(selectedTicketObj.id, t.id, linkRelation);
                                      setLinkSearch('');
                                      setShowLinkDropdown(false);
                                    }}
                                  >
                                    <span className="font-mono text-xs text-zinc-500">{t.id}</span>
                                    <span className="text-sm text-zinc-300 truncate">{t.title}</span>
                                  </div>
                                ))}
                              {kanbanMockTickets.filter(t => t.id !== selectedTicketObj.id && (t.id.toLowerCase().includes(linkSearch.toLowerCase()) || t.title.toLowerCase().includes(linkSearch.toLowerCase()))).length === 0 && (
                                <div className="px-3 py-2 text-sm text-zinc-500 italic">No tickets found</div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!isEditing && selectedTicketObj.history && selectedTicketObj.history.length > 0 && (
                  <div className="mt-12 border-t border-zinc-800/50 pt-6">
                    <h3 className="text-lg font-medium text-zinc-200 mb-4 flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      History
                    </h3>
                    <div className="flex flex-col gap-3 pl-2 border-l border-zinc-800/50 ml-2">
                      {[...selectedTicketObj.history]
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .slice(0, historyLimit)
                        .map((evt) => (
                          <div key={evt.id} className="relative pl-4">
                            <div className="absolute w-2 h-2 rounded-full bg-zinc-700 -left-[5px] top-1.5 border-2 border-zinc-950"></div>
                            <div className="text-xs text-zinc-500 mb-0.5">
                              {new Date(evt.timestamp).toLocaleString()} • {evt.actor}
                            </div>
                            <div className="text-sm text-zinc-300">
                              {evt.field === 'Created' ? (
                                <span>{evt.newValue}</span>
                              ) : (
                                <span>
                                  Changed <span className="font-medium text-zinc-200">{evt.field}</span> from <span className="text-zinc-400 line-through mr-1">{evt.oldValue || 'none'}</span> to <span className="text-blue-400 font-medium">{evt.newValue || 'none'}</span>
                                </span>
                              )}
                            </div>
                          </div>
                      ))}
                    </div>
                    {selectedTicketObj.history.length > historyLimit && (
                      <button 
                        onClick={() => setHistoryLimit(l => l + 5)}
                        className="mt-4 text-xs font-medium text-zinc-400 hover:text-blue-400 transition-colors pl-6"
                      >
                        Load More ({selectedTicketObj.history.length - historyLimit} remaining)
                      </button>
                    )}
                  </div>
                )}
                
                {/* Comments Section */}
                <div className="mt-12 border-t border-zinc-800/50 pt-6">
                  <h3 className="text-lg font-medium text-zinc-200 mb-4 flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                    Comments
                  </h3>
                  
                  {selectedTicketObj.comments && selectedTicketObj.comments.length > 0 && (
                    <div className="flex flex-col gap-4 mb-6">
                      {selectedTicketObj.comments.map((comment) => (
                        <div key={comment.id} className={`flex flex-col ${comment.role === 'human' ? 'items-end' : 'items-start'}`}>
                          <div className={`flex gap-3 max-w-[80%] ${comment.role === 'human' ? 'flex-row-reverse' : 'flex-row'}`}>
                            {comment.role === 'human' && (
                              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-zinc-700 bg-zinc-800 flex items-center justify-center">
                                {userAvatar ? (
                                  <img src={userAvatar} alt="Human" className="w-full h-full object-cover" />
                                ) : (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                )}
                              </div>
                            )}
                            {comment.role === 'agent' && (
                              <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center flex-shrink-0">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>
                              </div>
                            )}
                            <div className={`rounded-lg px-4 py-2 ${comment.role === 'human' ? 'bg-blue-600/20 border border-blue-500/30 text-blue-100' : 'bg-zinc-800 border border-zinc-700 text-zinc-200'}`}>
                              <div className="text-xs opacity-60 mb-1 flex justify-between gap-4">
                              <span>{comment.author}</span>
                              <span>{new Date(comment.timestamp).toLocaleString()}</span>
                            </div>
                              <div className="text-sm whitespace-pre-wrap">{comment.content}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!isEditing && (
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="w-full h-24 bg-zinc-900 border border-zinc-700 rounded-md py-2 px-3 text-sm text-zinc-300 focus:outline-none focus:border-blue-500 resize-none"
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            if (newComment.trim()) {
                              useAppStore.getState().addComment(selectedTicketObj.id, newComment.trim(), 'Human', 'human');
                              setNewComment('');
                            }
                          }}
                          disabled={!newComment.trim()}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {/* The Board / List */}
            <div className={`w-full transition-all duration-300 overflow-hidden ${kanbanTicketViewMode === 'preview' ? 'h-[55%] min-h-[55%]' : 'h-full'}`}>
              <div className="h-full w-full overflow-x-auto overflow-y-hidden bg-zinc-950/30">
                {kanbanCurrentSection === 'board' ? renderBoard() : 
                 kanbanCurrentSection === 'cycles' ? renderCyclesList() : 
                 kanbanCurrentSection === 'all' ? renderAllTickets(false) : 
                 kanbanCurrentSection === 'backlog' ? renderAllTickets(true) : 
                 kanbanCurrentSection === 'settings' ? renderSettingsView() : (
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
                        <select 
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as any)}
                          className="bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 rounded py-1 px-1.5 focus:outline-none focus:border-blue-500"
                        >
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select 
                          value={editType}
                          onChange={(e) => setEditType(e.target.value as any)}
                          className="bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 rounded py-1 px-1.5 focus:outline-none focus:border-blue-500"
                        >
                          {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select 
                          value={editPriority}
                          onChange={(e) => setEditPriority(e.target.value as any)}
                          className="bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 rounded py-1 px-1.5 focus:outline-none focus:border-blue-500"
                        >
                          {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <select 
                          value={editCycleId}
                          onChange={(e) => setEditCycleId(e.target.value)}
                          className="bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 rounded py-1 px-1.5 focus:outline-none focus:border-blue-500"
                        >
                          <option value="">No Cycle</option>
                          {kanbanMockCycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <textarea 
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full h-32 bg-zinc-900 border border-zinc-700 rounded py-2 px-3 text-sm text-zinc-300 focus:outline-none focus:border-blue-500 resize-none"
                        placeholder="Description..."
                      />
                      {editType !== 'Cycle' && (
                        <>
                          {editType !== 'Spike' && (
                            <textarea 
                              value={editAcc}
                              onChange={(e) => setEditAcc(e.target.value)}
                              className="w-full h-24 bg-zinc-900 border border-zinc-700 rounded py-2 px-3 text-sm text-zinc-300 focus:outline-none focus:border-blue-500 resize-none mt-2"
                              placeholder="Acceptance Criteria..."
                            />
                          )}
                          <textarea 
                            value={editDod}
                            onChange={(e) => setEditDod(e.target.value)}
                            className="w-full h-24 bg-zinc-900 border border-zinc-700 rounded py-2 px-3 text-sm text-zinc-300 focus:outline-none focus:border-blue-500 resize-none mt-2"
                            placeholder="Definition of Done..."
                          />
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      <h2 className="text-lg font-medium text-zinc-100 mb-2 leading-snug">{selectedTicketObj.title}</h2>
                      <div className="flex items-center gap-2 mb-6">
                        <InlineStatusBadge ticket={selectedTicketObj} />
                        <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs font-medium border border-zinc-700/50">{selectedTicketObj.type}</span>
                        <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs font-medium border border-zinc-700/50">{selectedTicketObj.priority}</span>
                      </div>
                      <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{selectedTicketObj.description}</p>
                      {selectedTicketObj.acc && (
                        <div className="mt-4 border-t border-zinc-800/50 pt-3">
                          <h4 className="text-xs font-medium text-zinc-200 mb-1">Acceptance Criteria</h4>
                          <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{selectedTicketObj.acc}</p>
                        </div>
                      )}
                      {selectedTicketObj.dod && (
                        <div className="mt-4 border-t border-zinc-800/50 pt-3">
                          <h4 className="text-xs font-medium text-zinc-200 mb-1">Definition of Done</h4>
                          <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{selectedTicketObj.dod}</p>
                        </div>
                      )}
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
