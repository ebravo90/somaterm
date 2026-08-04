import { type KanbanTicket } from '../store/useAppStore';

export const isValidTransition = (ticket: KanbanTicket, newStatus: KanbanTicket['status']): boolean => {
  if (newStatus === 'Canceled') return true;
  if (newStatus === ticket.status) return true; // Same state is valid

  // New Rule: CANNOT transition past Open without an assignee
  if (newStatus !== 'Open' && (!ticket.assignee || ticket.assignee.trim() === '')) {
    return false;
  }

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
