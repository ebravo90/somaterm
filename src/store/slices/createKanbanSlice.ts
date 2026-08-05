import type { StateCreator } from 'zustand';
import type { 
  AppState, KanbanTicket, KanbanCycle, KanbanNavState, 
  TicketLink, TicketRelation 
} from '../../types/store.types';
import { generateUpdatedTicketsWithHistory } from '../../utils/kanbanUtils';

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
  updateKanbanTicket: (ticketId: string, updates: Partial<KanbanTicket>) => void;
  addKanbanTicket: (ticket: Omit<KanbanTicket, 'id'>) => void;
  addComment: (ticketId: string, content: string, author: string, role: 'human' | 'agent') => void;
  linkTickets: (sourceId: string, targetId: string, relation: TicketRelation) => void;
}

export const createKanbanSlice: StateCreator<AppState, [], [], KanbanSlice> = (set) => ({
  isKanbanEnabled: false,
  toggleKanban: (enabled) => set({ isKanbanEnabled: enabled }),
  
  kanbanMockCycles: [
    { id: 'CYCLE-1', name: 'Somaterm MVP', status: 'Active', targetDate: '2026-08-15', description: 'This cycle covers the foundational architecture of the Somaterm agentic environment. It includes the Kanban UI, local database setup, and basic state management.' },
    { id: 'CYCLE-2', name: 'Phase 2: IDE Features', status: 'On Hold', targetDate: '2026-09-01', description: 'This upcoming cycle focuses on expanding the IDE capabilities, including advanced code editing, a native file explorer, and tighter LLM integration for automated test generation.' },
    { id: 'CYCLE-3', name: 'Foundation Polish', status: 'Completed', targetDate: '2026-07-30', description: 'Initial work to set up Tauri, React, Tailwind, and basic window chrome.' },
  ],
  kanbanActiveCycleId: 'CYCLE-1',
  
  kanbanMockTickets: [
    { id: 'SOMA-1', title: 'Implement Kanban UI', status: 'In Progress', description: 'Create the base structure for the Kanban widget.', type: 'Story', priority: 'High', cycleId: 'CYCLE-1', assignee: 'Human Orchestrator', reporter: 'Human Orchestrator', history: [] },
    { id: 'SOMA-2', title: 'Add Kanban State', status: 'Ready', description: 'Add mock state and navigation history to Zustand.', type: 'Task', priority: 'Medium', cycleId: 'CYCLE-1', assignee: 'Human Orchestrator', reporter: 'Human Orchestrator', history: [] },
    { id: 'SOMA-3', title: 'Fix Header Alignment', status: 'Blocked', description: 'The header buttons are slightly off-center on Windows.', type: 'Bug', priority: 'Low', cycleId: 'CYCLE-2', assignee: 'Human Orchestrator', reporter: 'Human Orchestrator', history: [] },
    { id: 'SOMA-4', title: 'Research new AI model', status: 'Open', description: 'Check out Llama 3 for local inference.', type: 'Spike', priority: 'Critical', cycleId: 'CYCLE-1', assignee: undefined, reporter: 'Human Orchestrator', history: [] },
  ],
  
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

  updateKanbanTicket: (ticketId, updates) => set((state) => ({
    kanbanMockTickets: generateUpdatedTicketsWithHistory(state.kanbanMockTickets, ticketId, updates)
  })),

  addKanbanTicket: (ticket) => set((state) => {
    const newId = `SOMA-${state.kanbanMockTickets.length + 1}`;
    const newTicket: KanbanTicket = {
      ...ticket,
      id: newId,
      history: [{
        id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        actor: 'Human',
        field: 'Created',
        oldValue: '',
        newValue: 'Ticket Created'
      }],
      comments: [],
      reporter: ticket.reporter || 'Human Orchestrator'
    };
    return { 
      kanbanMockTickets: [newTicket, ...state.kanbanMockTickets] 
    };
  }),
  
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
