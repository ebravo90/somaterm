import { type KanbanTicket } from '../store/useAppStore';

export interface TicketFilters {
  searchQuery: string;
  priority: string;
  type: string;
  assignee: string;
  reporter: string;
  cycleId: string;
}

export const filterTickets = (tickets: KanbanTicket[], filters: TicketFilters): KanbanTicket[] => {
  return tickets.filter(t => {
    const matchesSearch = !filters.searchQuery || 
      t.title.toLowerCase().includes(filters.searchQuery.toLowerCase()) || 
      t.description.toLowerCase().includes(filters.searchQuery.toLowerCase());
    
    const matchesPriority = filters.priority === 'All' || t.priority === filters.priority;
    const matchesType = filters.type === 'All' || t.type === filters.type;
    const matchesAssignee = filters.assignee === 'All' || (filters.assignee === 'Unassigned' ? !t.assignee : t.assignee === filters.assignee);
    const matchesReporter = filters.reporter === 'All' || t.reporter === filters.reporter;
    const matchesCycleId = filters.cycleId === 'All' || (filters.cycleId === 'None' ? !t.cycleId : t.cycleId === filters.cycleId);

    return matchesSearch && matchesPriority && matchesType && matchesAssignee && matchesReporter && matchesCycleId;
  });
};
