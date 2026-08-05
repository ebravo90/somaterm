import type { StateCreator } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { 
  AppState, KanbanTicket, KanbanCycle, KanbanNavState, 
  TicketLink, TicketRelation 
} from '../../types/store.types';
import { generateUpdatedTicketsWithHistory } from '../../utils/kanbanUtils';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const safeInvoke = async <T>(cmd: string, args?: any): Promise<T> => {
  if (!isTauri) {
    if (cmd === 'fetch_kanban_board') return [] as unknown as T;
    if (cmd === 'create_ticket') {
      return {
        id: args?.payload?.id,
        title: args?.payload?.title,
        description: args?.payload?.description,
        status: args?.payload?.status,
        priority: args?.payload?.priority,
        ticket_type: args?.payload?.ticket_type,
        cycle_id: args?.payload?.cycle_id,
        assignee_id: args?.payload?.assignee_id,
        reporter_id: args?.payload?.reporter_id,
      } as unknown as T;
    }
    if (cmd === 'update_ticket_status') return null as unknown as T;
    return null as unknown as T;
  }
  return invoke<T>(cmd, args);
};

export interface KanbanSlice {
  isKanbanEnabled: boolean;
  toggleKanban: (enabled: boolean) => void;
  kanbanMockCycles: KanbanCycle[];
  kanbanActiveCycleId: string | null;
  kanbanMockTickets: KanbanTicket[];
  kanbanCurrentSection: 'board' | 'cycles' | 'backlog' | 'all' | 'settings';
  kanbanSelectedTicket: string | null;
  kanbanTicketViewMode: 'preview' | 'full' | null;
  kanbanHistory: KanbanNavState[];
  kanbanHistoryIndex: number;
  kanbanSearchQuery: string;
  
  setKanbanSearchQuery: (query: string) => void;
  setKanbanSection: (section: 'board' | 'cycles' | 'backlog' | 'all' | 'settings') => void;
  selectKanbanTicket: (ticketId: string | null, viewMode: 'preview' | 'full' | null) => void;
  setKanbanActiveCycle: (cycleId: string) => void;
  navigateKanbanBack: () => void;
  navigateKanbanForward: () => void;
  fetchKanbanBoard: () => Promise<void>;
  updateKanbanTicket: (ticketId: string, updates: Partial<KanbanTicket>) => Promise<void>;
  addKanbanTicket: (ticket: Omit<KanbanTicket, 'id'>) => Promise<void>;
  addComment: (ticketId: string, content: string, author: string, role: 'human' | 'agent') => void;
  linkTickets: (sourceId: string, targetId: string, relation: TicketRelation) => void;
}

export const createKanbanSlice: StateCreator<AppState, [], [], KanbanSlice> = (set) => ({
  isKanbanEnabled: false,
  toggleKanban: (enabled) => set({ isKanbanEnabled: enabled }),
  
  kanbanMockCycles: [],
  kanbanActiveCycleId: null,
  
  kanbanMockTickets: [],
  
  setKanbanSearchQuery: (query) => set({ kanbanSearchQuery: query }),
  kanbanCurrentSection: 'board',
  kanbanSelectedTicket: null,
  kanbanTicketViewMode: null,
  kanbanHistory: [{ section: 'board', selectedTicket: null, viewMode: null }],
  kanbanHistoryIndex: 0,
  kanbanSearchQuery: '',
  
  setKanbanSection: (section) => set((state) => {
    const newState: KanbanNavState = { section, selectedTicket: null, viewMode: null };
    const newHistory = state.kanbanHistory.slice(0, state.kanbanHistoryIndex + 1);
    newHistory.push(newState);
    return {
      kanbanCurrentSection: section,
      kanbanSelectedTicket: null,
      kanbanTicketViewMode: null,
      kanbanHistory: newHistory,
      kanbanHistoryIndex: newHistory.length - 1
    };
  }),
  
  setKanbanActiveCycle: (cycleId) => set({ kanbanActiveCycleId: cycleId }),
  
  selectKanbanTicket: (ticketId, viewMode) => set((state) => {
    const newState: KanbanNavState = { section: state.kanbanCurrentSection, selectedTicket: ticketId, viewMode };
    const newHistory = state.kanbanHistory.slice(0, state.kanbanHistoryIndex + 1);
    newHistory.push(newState);
    return {
      kanbanSelectedTicket: ticketId,
      kanbanTicketViewMode: viewMode,
      kanbanHistory: newHistory,
      kanbanHistoryIndex: newHistory.length - 1
    };
  }),

  fetchKanbanBoard: async () => {
    try {
      const backendTickets = await safeInvoke<any[]>('fetch_kanban_board');
      const tickets: KanbanTicket[] = backendTickets.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description || '',
        status: t.status,
        priority: t.priority,
        type: t.ticket_type,
        cycleId: t.cycle_id,
        assignee: t.assignee_id,
        reporter: t.reporter_id,
        history: [],
        comments: [],
        links: []
      }));
      set({ kanbanMockTickets: tickets });
    } catch (error) {
      console.error('Failed to fetch kanban board:', error);
    }
  },

  updateKanbanTicket: async (ticketId, updates) => {
    set((state) => ({
      kanbanMockTickets: generateUpdatedTicketsWithHistory(state.kanbanMockTickets, ticketId, updates)
    }));
    if (updates.status) {
      try {
        await safeInvoke('update_ticket_status', { id: ticketId, new_status: updates.status });
      } catch (error) {
        console.error('Failed to update ticket status:', error);
      }
    }
  },

  addKanbanTicket: async (ticket) => {
    try {
      const newId = `SOMA-${Date.now()}`;
      const payload = {
        id: newId,
        title: ticket.title,
        description: ticket.description || null,
        status: ticket.status,
        priority: ticket.priority,
        ticket_type: ticket.type,
        cycle_id: ticket.cycleId || null,
        assignee_id: ticket.assignee || null,
        reporter_id: ticket.reporter || 'Human Orchestrator'
      };
      const backendTicket = await safeInvoke<any>('create_ticket', { payload });
      const newTicket: KanbanTicket = {
        id: backendTicket.id,
        title: backendTicket.title,
        description: backendTicket.description || '',
        status: backendTicket.status,
        priority: backendTicket.priority,
        type: backendTicket.ticket_type,
        cycleId: backendTicket.cycle_id,
        assignee: backendTicket.assignee_id,
        reporter: backendTicket.reporter_id,
        history: [{
          id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          actor: 'Human',
          field: 'Created',
          oldValue: '',
          newValue: 'Ticket Created'
        }],
        comments: [],
        links: []
      };
      set((state) => ({ 
        kanbanMockTickets: [newTicket, ...state.kanbanMockTickets] 
      }));
    } catch (error) {
      console.error('Failed to create ticket:', error);
    }
  },
  
  addComment: (ticketId, content, author, role) => set((state) => {
    const ticket = state.kanbanMockTickets.find(t => t.id === ticketId);
    if (!ticket) return {};
    return {
      kanbanMockTickets: state.kanbanMockTickets.map(t => 
        t.id === ticketId ? { 
          ...t, 
          comments: [...(t.comments || []), {
            id: `comment-${Date.now()}`,
            content,
            author,
            role,
            timestamp: Date.now()
          }]
        } : t
      )
    };
  }),

  linkTickets: (sourceId, targetId, relation) => set((state) => {
    const inverseRelation = relation === 'Blocks' ? 'Blocked by' : relation === 'Blocked by' ? 'Blocks' : 'Relates to';
    return {
      kanbanMockTickets: state.kanbanMockTickets.map(t => {
        if (t.id === sourceId) {
          const newLink: TicketLink = { targetTicketId: targetId, relation };
          return { ...t, links: [...(t.links || []), newLink] };
        }
        if (t.id === targetId) {
          const newLink: TicketLink = { targetTicketId: sourceId, relation: inverseRelation };
          return { ...t, links: [...(t.links || []), newLink] };
        }
        return t;
      })
    };
  }),
  
  navigateKanbanBack: () => set((state) => {
    if (state.kanbanHistoryIndex > 0) {
      const newIndex = state.kanbanHistoryIndex - 1;
      const navState = state.kanbanHistory[newIndex];
      return {
        kanbanHistoryIndex: newIndex,
        kanbanCurrentSection: navState.section,
        kanbanSelectedTicket: navState.selectedTicket,
        kanbanTicketViewMode: navState.viewMode
      };
    }
    return state;
  }),
  
  navigateKanbanForward: () => set((state) => {
    if (state.kanbanHistoryIndex < state.kanbanHistory.length - 1) {
      const newIndex = state.kanbanHistoryIndex + 1;
      const navState = state.kanbanHistory[newIndex];
      return {
        kanbanHistoryIndex: newIndex,
        kanbanCurrentSection: navState.section,
        kanbanSelectedTicket: navState.selectedTicket,
        kanbanTicketViewMode: navState.viewMode
      };
    }
    return state;
  })
});
