import { useState } from 'react';
import { STATUS_OPTIONS } from './KanbanConstants';
import { isValidTransition } from '../../../utils/ticketValidation';
import type { KanbanTicket } from '../../../types/store.types';
import { useAppStore } from '../../../store/useAppStore';

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


const InlineAssigneeDropdown = ({ ticket, isFullView, isPreviewView }: { ticket: KanbanTicket, isFullView?: boolean, isPreviewView?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { updateKanbanTicket, agents, userAvatar } = useAppStore();

  const availableActorsList = [
    { id: 'Human Orchestrator', name: 'Human Orchestrator', avatar: userAvatar },
    ...agents.filter(a => a.status === 'online').map(a => ({
      id: a.displayName,
      name: a.displayName,
      avatar: null
    }))
  ];

  const currentActor = availableActorsList.find(a => a.id === ticket.assignee);

  if (isFullView || isPreviewView) {
    return (
      <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
        <div 
          className={
            isPreviewView 
              ? "px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs font-medium border border-zinc-700/50 flex items-center gap-1.5 cursor-pointer hover:border-zinc-600 transition-colors h-full"
              : "px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded text-xs font-medium flex items-center gap-2 cursor-pointer hover:border-zinc-700 transition-colors"
          }
          onClick={() => setIsOpen(!isOpen)}
        >
          {!isPreviewView && <span>Assignee:</span>}
          {currentActor ? (
            <div className={`flex items-center ${isPreviewView ? 'gap-1' : 'gap-1.5'} text-zinc-200`}>
              <div className={`${isPreviewView ? 'w-3.5 h-3.5' : 'w-4 h-4'} rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700`}>
                {currentActor.avatar ? (
                  <img src={currentActor.avatar} alt={currentActor.name} className="w-full h-full object-cover" />
                ) : (
                  <span className={`${isPreviewView ? 'text-[7px]' : 'text-[8px]'} font-medium text-zinc-300`}>{currentActor.name.substring(0, 2).toUpperCase()}</span>
                )}
              </div>
              <span>{currentActor.name}</span>
            </div>
          ) : (
            <div className={`flex items-center ${isPreviewView ? 'gap-1' : 'gap-1.5'} text-zinc-500`}>
              {isPreviewView && <svg className="w-3 h-3 border-dashed" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 12h8"></path></svg>}
              <span>Unassigned</span>
            </div>
          )}
          <svg className="w-3 h-3 ml-0.5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>
        
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />
            <div className="absolute top-full left-0 mt-1 w-48 bg-zinc-900 border border-zinc-700 rounded-md shadow-xl overflow-hidden z-50 py-1">
              <button
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${!ticket.assignee ? 'text-blue-400 bg-blue-500/5' : 'text-zinc-300 hover:bg-zinc-800'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  updateKanbanTicket(ticket.id, { assignee: undefined });
                  setIsOpen(false);
                }}
              >
                <div className="w-5 h-5 rounded-full border border-dashed border-zinc-600 flex items-center justify-center bg-zinc-800/50">
                  <svg className="text-zinc-500 w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                Unassigned
              </button>
              {availableActorsList.map(actor => (
                <button
                  key={actor.id}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${actor.id === ticket.assignee ? 'text-blue-400 bg-blue-500/5' : 'text-zinc-300 hover:bg-zinc-800'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateKanbanTicket(ticket.id, { assignee: actor.id });
                    setIsOpen(false);
                  }}
                >
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-zinc-700 flex items-center justify-center shrink-0 border border-zinc-600">
                    {actor.avatar ? (
                      <img src={actor.avatar} alt={actor.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[9px] font-medium text-zinc-300">{actor.name.substring(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="truncate">{actor.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Kanban Card View
  return (
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <div 
        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 border cursor-pointer hover:ring-1 hover:ring-blue-500/50 transition-all bg-zinc-800 border-zinc-700 overflow-hidden" 
        title={currentActor ? `Assignee: ${currentActor.name}` : 'Unassigned'}
        onClick={() => setIsOpen(!isOpen)}
      >
        {currentActor ? (
          currentActor.avatar ? (
            <img src={currentActor.avatar} alt={currentActor.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[9px] font-medium text-zinc-300">{currentActor.name.substring(0, 2).toUpperCase()}</span>
          )
        ) : (
          <svg className="text-zinc-500 w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5"></circle><path d="M20 21a8 8 0 0 0-16 0"></path></svg>
        )}
      </div>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />
          <div className="absolute top-full right-0 mt-1 w-48 bg-zinc-900 border border-zinc-700 rounded-md shadow-xl overflow-hidden z-50 py-1">
            <button
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${!ticket.assignee ? 'text-blue-400 bg-blue-500/5' : 'text-zinc-300 hover:bg-zinc-800'}`}
              onClick={(e) => {
                e.stopPropagation();
                updateKanbanTicket(ticket.id, { assignee: undefined });
                setIsOpen(false);
              }}
            >
              <div className="w-5 h-5 rounded-full border border-dashed border-zinc-600 flex items-center justify-center bg-zinc-800/50">
                <svg className="text-zinc-500 w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </div>
              Unassigned
            </button>
            {availableActorsList.map(actor => (
              <button
                key={actor.id}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${actor.id === ticket.assignee ? 'text-blue-400 bg-blue-500/5' : 'text-zinc-300 hover:bg-zinc-800'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  updateKanbanTicket(ticket.id, { assignee: actor.id });
                  setIsOpen(false);
                }}
              >
                <div className="w-5 h-5 rounded-full overflow-hidden bg-zinc-700 flex items-center justify-center shrink-0 border border-zinc-600">
                  {actor.avatar ? (
                    <img src={actor.avatar} alt={actor.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[9px] font-medium text-zinc-300">{actor.name.substring(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <span className="truncate">{actor.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};


export { InlineStatusBadge, InlineAssigneeDropdown };
