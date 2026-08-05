import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AppState } from '../types/store.types';
import { createUISlice } from './slices/createUISlice';
import { createTerminalSlice } from './slices/createTerminalSlice';
import { createAgentSlice } from './slices/createAgentSlice';
import { createKanbanSlice } from './slices/createKanbanSlice';
import { createSettingsSlice } from './slices/createSettingsSlice';

export const useAppStore = create<AppState>()(
  persist(
    (...a) => ({
      ...createUISlice(...a),
      ...createTerminalSlice(...a),
      ...createAgentSlice(...a),
      ...createKanbanSlice(...a),
      ...createSettingsSlice(...a)
    }),
    { 
      name: 'somaterm-storage',
      partialize: (state) => ({
        isKanbanEnabled: state.isKanbanEnabled,
        kanbanMockTickets: state.kanbanMockTickets,
        kanbanMockCycles: state.kanbanMockCycles,
        kanbanActiveCycleId: state.kanbanActiveCycleId,
        kanbanCurrentSection: state.kanbanCurrentSection,
        kanbanSelectedTicket: state.kanbanSelectedTicket,
        kanbanTicketViewMode: state.kanbanTicketViewMode,
        kanbanHistory: state.kanbanHistory,
        kanbanHistoryIndex: state.kanbanHistoryIndex,
        kanbanSearchQuery: state.kanbanSearchQuery,
        settings: state.settings
      })
    }
  )
);
export * from '../types/store.types';
