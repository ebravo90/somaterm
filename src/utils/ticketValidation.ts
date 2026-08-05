import { type KanbanTicket } from '../store/useAppStore';

/**
 * Validates whether a Kanban ticket can transition to a new status based on strict business rules.
 * 
 * Business Logic (The "Why"):
 * 1. **Canceled**: Any ticket can be canceled at any time, bypassing all other rules.
 * 2. **Accountability**: A ticket cannot leave the 'Open' backlog unless an assignee has taken responsibility.
 * 3. **Process Adherence**: Tickets cannot skip the development workflow. Moving straight from Open/Ready to Done is forbidden.
 * 4. **Quality Assurance**: Complex tickets ('Story', 'Bug') require formal User Acceptance Testing (UAT). They can only move to 'Done' from the 'UAT' state, preventing unverified code from reaching production.
 * 
 * @param ticket - The current ticket object.
 * @param newStatus - The target status requested.
 * @returns {boolean} True if the transition is allowed by the state machine, false otherwise.
 */
export const isValidTransition = (ticket: KanbanTicket, newStatus: KanbanTicket['status']): boolean => {
  // Rule 1: Cancellation is always allowed.
  if (newStatus === 'Canceled') return true;
  
  // No-op transition is valid
  if (newStatus === ticket.status) return true; 

  // Rule 2: CANNOT transition past Open without an assignee
  if (newStatus !== 'Open' && (!ticket.assignee || ticket.assignee.trim() === '')) {
    return false;
  }

  if (newStatus === 'Done') {
    // Rule 3: Cannot skip development phases directly to Done
    if (ticket.status === 'Open' || ticket.status === 'Ready') return false;

    // Rule 4: Stories and Bugs require UAT before Done
    if ((ticket.type === 'Story' || ticket.type === 'Bug') && ticket.status !== 'UAT') {
      return false;
    }
  }

  return true;
};
