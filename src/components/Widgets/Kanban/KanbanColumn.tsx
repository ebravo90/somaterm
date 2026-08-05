import type { KanbanTicket } from '../../../types/store.types';
import { useDroppable } from '@dnd-kit/core';
import { KanbanTicketCard } from './KanbanTicketCard';

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


export { KanbanColumn };
