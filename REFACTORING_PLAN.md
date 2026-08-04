# Somaterm Frontend Refactoring Plan

This document outlines a phased refactoring strategy to eliminate technical debt, enforce strict typing, and modularize the frontend architecture in preparation for advanced LLM orchestration features.

## 🚨 Codebase Audit Summary: The Worst Technical Debt
Our initial audit revealed significant violations of the Single Responsibility Principle (SRP) and strict typing rules. The most pressing issues are:
1. **The "God Component" (`KanbanWidget.tsx`):** At 1,826 lines, it handles drag-and-drop context, ticket filtering, inline editing, UI rendering for columns/cards, and modal management. It must be split.
2. **The "Bloated Store" (`useAppStore.ts`):** At 1,135 lines, this Zustand store manages everything from terminal states and settings to LLM chat sessions and Kanban data. It urgently requires the Zustand Slice Pattern.
3. **The "Fat Agent" (`AgentWidget.tsx`):** At 1,060 lines, this component mixes UI layout rendering with complex API streaming, prompt construction, and state management.
4. **Prevalence of `any` Types:** Over 40 usages of `any` found across the codebase (e.g., `catch (error: any)`, `const payload: any`, `e.target.value as any`). This bypasses the TS compiler and introduces runtime risks.

---

## 🛠️ Phase 1: Types & State Management
**Goal:** Enforce strict typing and modularize the global state.

### 1. Eradicate `any` Types
- Audit and replace all `any` casts in `KanbanWidget.tsx` (e.g., `setCreateStatus(e.target.value as any)` -> cast to `KanbanTicket['status']`).
- Fix `any` types in `AgentWidget.tsx` (e.g., `MessageBubble({ msg }: { msg: ChatMessage })`).
- Strongly type all API payloads and error boundaries (`catch (error: unknown)`).
- Ensure `window.__store` and test injections (`(window as any).__term_for_test`) are strictly typed via a global `window` interface declaration.

### 2. Slicing `useAppStore.ts`
Break the monolithic `useAppStore.ts` into manageable domain-driven slices using the standard Zustand slice pattern:
- **`createUISlice`**: Manages active widgets, context menus, and split-pane layout state.
- **`createTerminalSlice`**: Manages active terminals, PTY sessions, and layout grids.
- **`createAgentSlice`**: Manages LLM sessions, message history, and context files.
- **`createKanbanSlice`**: Manages ticket mocks, history, and cycles.
- **`createSettingsSlice`**: Manages themes, avatars, and configuration.
- **Main `useAppStore`**: Solely responsible for composing and merging the slices.

---

## 🧱 Phase 2: Component Deconstruction
**Goal:** Apply the Single Responsibility Principle (SRP) to massive UI components.

### 1. Deconstruct `KanbanWidget.tsx`
Create a new directory: `src/components/Widgets/Kanban/` and split the file into:
- `KanbanBoard.tsx`: The main container and layout.
- `KanbanColumn.tsx`: Handles Droppable context and rendering a column.
- `KanbanTicketCard.tsx`: The Draggable ticket UI.
- `KanbanControls.tsx`: The top bar with search and advanced filter chips.
- `KanbanForms/`: Directory for `CreateTicketForm.tsx` and `EditTicketForm.tsx` components.

### 2. Deconstruct `AgentWidget.tsx`
Create a new directory: `src/components/Widgets/Agent/` and split the file into:
- `AgentChatContainer.tsx`: Main layout.
- `MessageBubble.tsx`: Individual user/assistant message rendering (already memoized, just needs extraction).
- `ChatInputArea.tsx`: The text area and token counter logic.
- `ContextFilePicker.tsx`: The UI for selecting context files to attach to prompts.

### 3. Deconstruct `FileExplorerWidget.tsx`
- Extract the recursive `FileTreeItem` rendering into its own component.
- Extract the context menu UI into a `FileContextMenu.tsx` component.

---

## 🧠 Phase 3: Utilities & Logic Extraction
**Goal:** Separate pure business logic from React components to enable proper unit testing and reuse.

1. **Agent Prompt Logic:** Extract the prompt construction and LLM streaming logic from `AgentWidget.tsx` into a pure utility service (e.g., `src/services/llmService.ts`).
2. **Zustand Actions:** Any complex store action (e.g., recursive tree updates or history timeline generation) should be moved to utility functions in `src/utils/` and imported into the slices.
3. **Documentation:** Add thorough JSDoc comments to all state machine transition rules and complex filtering logic explaining the *why* (business rules), not just the *what*.

---

*This plan must be executed incrementally, running the existing E2E and Unit test suite after every file extraction to ensure zero regressions.*
