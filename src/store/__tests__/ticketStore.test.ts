import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(async (cmd, args) => {
    if (cmd === 'create_ticket') {
      return {
        id: args.payload.id,
        title: args.payload.title,
        description: args.payload.description,
        status: args.payload.status,
        priority: args.payload.priority,
        ticket_type: args.payload.ticket_type,
        cycle_id: args.payload.cycle_id,
        assignee_id: args.payload.assignee_id,
        reporter_id: args.payload.reporter_id,
      };
    }
    if (cmd === 'fetch_kanban_board') return [];
    if (cmd === 'update_ticket_status') return null;
    return null;
  })
}));
import { useAppStore, type KanbanTicket } from '../useAppStore';
import { filterTickets } from '../../utils/ticketFilters';

describe('ticketStore actions and filtering', () => {
  beforeEach(() => {
    // Reset Zustand store state before each test if necessary
    useAppStore.setState({ kanbanMockTickets: [] });
  });

  it('addKanbanTicket creates a new ticket with default reporter as Human Orchestrator', async () => {
    const newTicket: Omit<KanbanTicket, 'id'> = {
      title: 'New Feature',
      description: 'Implement a new feature',
      status: 'Open',
      type: 'Story',
      priority: 'Medium',
      history: []
    };

    await useAppStore.getState().addKanbanTicket(newTicket);
    const tickets = useAppStore.getState().kanbanMockTickets;
    
    expect(tickets).toHaveLength(1);
    expect(tickets[0].title).toBe('New Feature');
    expect(tickets[0].reporter).toBe('Human Orchestrator'); // The default set in createTicket logic
  });

  describe('advanced filtering logic (filterTickets)', () => {
    const mockTickets: KanbanTicket[] = [
      { id: 'T-1', title: 'DB Setup', description: 'desc', status: 'Open', type: 'Task', priority: 'High', assignee: 'Agent Gemini', reporter: 'Human Orchestrator', cycleId: 'CYCLE-1', history: [] },
      { id: 'T-2', title: 'UI Polish', description: 'desc', status: 'In Progress', type: 'Story', priority: 'Low', assignee: 'Human Orchestrator', reporter: 'Agent Qwen', cycleId: 'CYCLE-2', history: [] },
      { id: 'T-3', title: 'Auth Bug', description: 'fix it', status: 'Blocked', type: 'Bug', priority: 'Critical', reporter: 'Human Orchestrator', history: [] }, // Unassigned, no cycle
    ];

    it('returns all tickets when filters are set to All', () => {
      const result = filterTickets(mockTickets, {
        searchQuery: '', priority: 'All', type: 'All', assignee: 'All', reporter: 'All', cycleId: 'All'
      });
      expect(result).toHaveLength(3);
    });

    it('filters by Type (e.g. Story)', () => {
      const result = filterTickets(mockTickets, {
        searchQuery: '', priority: 'All', type: 'Story', assignee: 'All', reporter: 'All', cycleId: 'All'
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('T-2');
    });

    it('filters by multiple combinations (Type = Task AND Priority = High)', () => {
      const result = filterTickets(mockTickets, {
        searchQuery: '', priority: 'High', type: 'Task', assignee: 'All', reporter: 'All', cycleId: 'All'
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('T-1');
    });

    it('filters by Unassigned assignee', () => {
      const result = filterTickets(mockTickets, {
        searchQuery: '', priority: 'All', type: 'All', assignee: 'Unassigned', reporter: 'All', cycleId: 'All'
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('T-3');
    });

    it('filters by None cycleId', () => {
      const result = filterTickets(mockTickets, {
        searchQuery: '', priority: 'All', type: 'All', assignee: 'All', reporter: 'All', cycleId: 'None'
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('T-3');
    });

    it('filters by text search across title and description', () => {
      const result1 = filterTickets(mockTickets, {
        searchQuery: 'auth', priority: 'All', type: 'All', assignee: 'All', reporter: 'All', cycleId: 'All'
      });
      expect(result1).toHaveLength(1);
      expect(result1[0].id).toBe('T-3');

      const result2 = filterTickets(mockTickets, {
        searchQuery: 'desc', priority: 'All', type: 'All', assignee: 'All', reporter: 'All', cycleId: 'All'
      });
      expect(result2).toHaveLength(2); // T-1, T-2 have 'desc' in description
    });
  });
});
