import { useDraggable } from '@dnd-kit/core';
import type { KanbanTicket } from '../../../types/store.types';
import { InlineStatusBadge, InlineAssigneeDropdown } from './KanbanInlineControls';

const KanbanTicketCard = ({ ticket, isSelected, onSelect }: { ticket: KanbanTicket, isSelected: boolean, onSelect: (id: string, view: 'preview') => void }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
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
        <InlineAssigneeDropdown ticket={ticket} />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs font-mono text-zinc-500">{ticket.id}</span>
        <div className="flex flex-wrap gap-1">
          <InlineStatusBadge ticket={ticket} />
          <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${ticket.priority === 'Critical' ? 'bg-red-500/10 text-red-400' : ticket.priority === 'High' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>
            {ticket.priority}
          </span>
          {ticket.type !== 'Cycle' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-zinc-700/50 text-zinc-400 font-medium">
              {ticket.type}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};


export { KanbanTicketCard };
