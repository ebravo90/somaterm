import type { KanbanTicket, TicketHistoryEvent } from '../types/store.types';

/**
 * Generates an updated array of Kanban tickets, safely applying partial updates and 
 * automatically generating an immutable history timeline event for every modified field.
 * 
 * Business Logic:
 * We append history events to the FRONT of the array (descending order) so the UI 
 * always shows the most recent changes first. This ensures auditability for state machine transitions.
 * 
 * @param currentTickets - The current state array of all Kanban tickets.
 * @param ticketId - The ID of the ticket being updated.
 * @param updates - The partial object containing the fields to update.
 * @param actor - The user or agent performing the action.
 * @returns {KanbanTicket[]} A new array of tickets with the updated ticket and history.
 */
export function generateUpdatedTicketsWithHistory(
  currentTickets: KanbanTicket[],
  ticketId: string,
  updates: Partial<KanbanTicket>,
  actor: string = 'Human'
): KanbanTicket[] {
  const timestamp = Date.now();
  
  return currentTickets.map(t => {
    if (t.id !== ticketId) return t;
    
    const newHistoryEvents: TicketHistoryEvent[] = [];
    Object.entries(updates).forEach(([field, newValue]) => {
      const oldValue = (t as unknown as Record<string, unknown>)[field];
      if (oldValue !== newValue) {
        newHistoryEvents.push({
          id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp,
          actor,
          field,
          oldValue: String(oldValue || ''),
          newValue: String(newValue || '')
        });
      }
    });

    return { 
      ...t, 
      ...updates, 
      history: [...newHistoryEvents, ...(t.history || [])]
    };
  });
}
