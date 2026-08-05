import type { StateCreator } from 'zustand';
import type { AppState, Session, ChatMessage, AgentProfile } from '../../types/store.types';
import { invoke } from '@tauri-apps/api/core';

export interface AgentSlice {
  sessions: Session[];
  activeSessionId: string | null;
  setSessions: (sessions: Session[]) => void;
  createSession: (agentId: string | null) => string;
  updateSession: (id: string, updates: Partial<Session>) => void;
  deleteSession: (id: string) => void;
  setActiveSession: (id: string | null) => void;
  addMessageToActiveSession: (message: ChatMessage) => void;
  appendMessageChunkToActiveSession: (chunk: string) => void;
  clearActiveSession: () => void;
  
  isGenerating: boolean;
  setIsGenerating: (val: boolean) => void;
  
  hasLoadedHistory: boolean;
  setHasLoadedHistory: (val: boolean) => void;
  
  hasUnread: boolean;
  setHasUnread: (value: boolean) => void;

  sendMessage: (input: string) => Promise<void>;
  abortController: AbortController | null;
  stopGeneration: () => void;
  generateChatTitle: (sessionId: string) => void;

  agents: AgentProfile[];
  selectedAgentId: string | null;
  isHydrated: boolean;
  setIsHydrated: (val: boolean) => void;
  addAgent: (agent: Omit<AgentProfile, 'id' | 'status'>) => void;
  updateAgent: (id: string, updates: Partial<AgentProfile>) => void;
  removeAgent: (id: string) => void;
  setSelectedAgentId: (id: string | null) => void;
  setAgents: (agents: AgentProfile[]) => void;

  stagedContextFiles: string[];
  addContextFile: (path: string) => void;
  removeContextFile: (path: string) => void;
  clearContextFiles: () => void;
  isContextPickerMode: boolean;
  setContextPickerMode: (active: boolean) => void;
}

import { generateTitleWithLLM, buildSystemPrompt } from '../../services/llmService';
import { listen } from '@tauri-apps/api/event';
import type { UnlistenFn } from '@tauri-apps/api/event';

export const createAgentSlice: StateCreator<AppState, [], [], AgentSlice> = (set, get) => ({
  sessions: [],
  activeSessionId: null,
  setSessions: (sessions) => set({ sessions }),
  createSession: (agentId) => {
    const id = `session-${Date.now()}`;
    const newSession: Session = {
      id,
      title: 'New Chat',
      agentId,
      startDate: Date.now(),
      lastUsedDate: Date.now(),
      isPinned: false,
      messages: []
    };
    set((state) => ({
      sessions: [...state.sessions, newSession],
      activeSessionId: id
    }));
    return id;
  },
  updateSession: (id, updates) => set((state) => ({
    sessions: state.sessions.map(s => s.id === id ? { ...s, ...updates } : s)
  })),
  deleteSession: (id) => set((state) => {
    const newSessions = state.sessions.filter(s => s.id !== id);
    return {
      sessions: newSessions,
      activeSessionId: state.activeSessionId === id ? null : state.activeSessionId
    };
  }),
  setActiveSession: (id) => set({ activeSessionId: id }),
  addMessageToActiveSession: (message) => set((state) => {
    if (!state.activeSessionId) return state;
    return {
      sessions: state.sessions.map(s => 
        s.id === state.activeSessionId 
          ? { ...s, messages: [...s.messages, message], lastUsedDate: Date.now() } 
          : s
      )
    };
  }),
  appendMessageChunkToActiveSession: (chunk: string) => set((state) => {
    if (!state.activeSessionId) return state;
    return {
      sessions: state.sessions.map(s => {
        if (s.id !== state.activeSessionId || s.messages.length === 0) return s;
        const lastMessageIndex = s.messages.length - 1;
        const lastMessage = s.messages[lastMessageIndex];
        
        // Only append if the last message is from the assistant
        if (lastMessage.role !== 'assistant') return s;
        
        const newMessages = [...s.messages];
        newMessages[lastMessageIndex] = {
          ...lastMessage,
          content: lastMessage.content + chunk
        };
        
        return { ...s, messages: newMessages, lastUsedDate: Date.now() };
      })
    };
  }),
  clearActiveSession: () => set((state) => {
    if (!state.activeSessionId) return state;
    return {
      sessions: state.sessions.map(s => 
        s.id === state.activeSessionId 
          ? { ...s, messages: [], lastUsedDate: Date.now() } 
          : s
      )
    };
  }),
  isGenerating: false,
  setIsGenerating: (val) => set({ isGenerating: val }),
  abortController: null,
  stopGeneration: () => {
    const state = get();
    if (state.abortController) {
      state.abortController.abort();
    }

    let newSessions = state.sessions;
    if (state.activeSessionId) {
      newSessions = state.sessions.map(session => {
        let updatedSession = session;
        if (session.id === state.activeSessionId) {
          if (session.messages.length > 0) {
            const lastIndex = session.messages.length - 1;
            const lastMessage = session.messages[lastIndex];
            if (lastMessage.role === 'assistant') {
              const backtickCount = (lastMessage.content.match(/```/g) || []).length;
              if (backtickCount % 2 !== 0) {
                const updatedMessages = [...session.messages];
                updatedMessages[lastIndex] = {
                  ...lastMessage,
                  content: lastMessage.content + '\n```\n'
                };
                updatedSession = { ...updatedSession, messages: updatedMessages };
              }
            }
          }
          if (updatedSession.title === 'New Chat' || updatedSession.title === '') {
            updatedSession = { ...updatedSession, title: 'Untitled' };
          }
        }
        return updatedSession;
      });
    }

    set({
      isGenerating: false,
      abortController: new AbortController(),
      sessions: newSessions
    });
  },
  hasLoadedHistory: false,
  setHasLoadedHistory: (val) => set({ hasLoadedHistory: val }),
  hasUnread: false,
  setHasUnread: (value) => set({ hasUnread: value }),

  generateChatTitle: (sessionId: string) => {
    setTimeout(async () => {
      const state = get();
      const currentSession = state.sessions.find(s => s.id === sessionId);
      if (!currentSession) return;
      
      const userMsgCount = currentSession.messages.filter(m => m.role === 'user').length;
      if (userMsgCount !== 1 || currentSession.title !== 'New Chat') return;

      const activeAgent = state.agents.find(a => a.id === currentSession.agentId);
      if (!activeAgent) return;

      const firstUserMessage = currentSession.messages.find(m => m.role === 'user')?.content || '';

      get().addLog({ level: 'INFO', source: 'Agent', message: `[AutoTitle] Triggered for session: ${sessionId}` });
      get().addLog({ level: 'INFO', source: 'Agent', message: '[AutoTitle] Fetching from LLM...' });

      try {
        const generatedTitle = await generateTitleWithLLM(activeAgent, firstUserMessage);
        get().addLog({ level: 'INFO', source: 'Agent', message: `[AutoTitle] Received title: ${generatedTitle}` });
        get().updateSession(sessionId, { title: generatedTitle, isGeneratingTitle: false });
        
        const finalState = get();
        invoke('save_history', { payload: JSON.stringify(finalState.sessions) }).catch(e => console.error("Failed to save history", e));
        get().addLog({ level: 'INFO', source: 'Agent', message: '[AutoTitle] Zustand state updated and history saved.' });
      } catch (e) {
        get().addLog({ level: 'ERROR', source: 'Agent', message: `Auto-titling failed or timed out: ${e}` });
        get().updateSession(sessionId, { isGeneratingTitle: false });
      }
    }, 0);
  },

  sendMessage: async (input: string) => {
    const state = get();
    if (state.isGenerating) return;
    if (!input.trim() || !state.selectedAgentId) return;

    if (input.length > 10000) {
      const sessionId = state.activeSessionId || state.createSession(state.selectedAgentId);
      state.setActiveSession(sessionId);
      state.addMessageToActiveSession({ role: 'user', content: input.substring(0, 500) + '... [TRUNCATED]' });
      state.addMessageToActiveSession({ role: 'assistant', content: '⚠️ **Security Warning**: Context Limit Exceeded. Input is too large (over 10,000 characters) and has been blocked to prevent Context Overload.' });
      return;
    }

    let finalInput = input;
    const { stagedContextFiles, clearContextFiles } = get();
    
    if (stagedContextFiles.length > 0) {
      let fileContents = "";
      for (const path of stagedContextFiles) {
        try {
          const content = await invoke<string>('read_file_content', { path });
          const filename = path.split('/').pop() || path;
          fileContents += `\n\n--- File: ${filename} ---\n\`\`\`\n${content}\n\`\`\``;
        } catch (e) {
          console.error(`Failed to read staged file ${path}:`, e);
          fileContents += `\n\n--- File: ${path} ---\n[Error reading file content]`;
        }
      }
      
      finalInput = `${input}\n\n<Attached Context>${fileContents}\n</Attached Context>`;
    }

    const activeAgent = state.agents.find(a => a.id === state.selectedAgentId);
    if (!activeAgent) return;

    let sessionId = state.activeSessionId;
    let isFirstMessage = false;

    if (!sessionId) {
      sessionId = state.createSession(state.selectedAgentId);
      state.updateSession(sessionId, { isGeneratingTitle: true });
      isFirstMessage = true;
    } else {
      const currentSession = state.sessions.find(s => s.id === sessionId);
      if (currentSession && currentSession.messages.length === 0) {
        state.updateSession(sessionId, { isGeneratingTitle: true });
        isFirstMessage = true;
      }
    }

    const attachmentNames = stagedContextFiles.length > 0 
      ? stagedContextFiles.map(f => f.split('/').pop() || f) 
      : undefined;

    const userMessage: ChatMessage = { role: 'user', content: input, attachments: attachmentNames };
    const currentSession = state.sessions.find(s => s.id === sessionId);
    
    const networkUserMessage = { role: 'user', content: finalInput };
    const networkMessages = [...(currentSession?.messages || []).map(m => ({ role: m.role, content: m.content })), networkUserMessage];
    
    state.setActiveSession(sessionId);
    state.addMessageToActiveSession(userMessage);
    
    if (stagedContextFiles.length > 0) {
      clearContextFiles();
    }
    
    state.setIsGenerating(true);

    if (isFirstMessage) {
      state.generateChatTitle(sessionId);
    }

    const abortController = new AbortController();
    set({ abortController });

    try {
      get().addMessageToActiveSession({ role: 'assistant', content: '' });

      const provider = activeAgent.type === 'local' ? 'ollama' : 'openai';
      const systemPrompt = buildSystemPrompt();
      const promptText = `${systemPrompt}\n\n` + networkMessages.map(m => `${m.role.toUpperCase()}:\n${m.content}`).join('\n\n');

      const unlisten = await listen<{ sessionId: string, text: string, isDone: boolean }>('llm-stream-chunk', (event) => {
        if (event.payload.sessionId !== sessionId) return;
        
        if (event.payload.isDone) {
          unlisten();
        } else {
          get().appendMessageChunkToActiveSession(event.payload.text || "");
        }
      });

      await invoke('stream_llm_response', {
        url: activeAgent.endpoint.trim(),
        payload: {
          sessionId,
          provider,
          agentId: activeAgent.id,
          model: activeAgent.modelName.trim(),
          prompt: promptText
        }
      });

      const updatedState = get();
      if (updatedState.activeWidget?.type !== 'agent') {
        updatedState.setHasUnread(true);
        new Audio('/ping.mp3').play().catch(() => {});
      }
    } catch (error: unknown) {
      const err = error as Error;
      if (activeAgent.type === 'local') {
        get().addLog({ level: 'ERROR', source: 'Agent', message: '[Agent Lifecycle] Stream aborted/failed. Memory released.' });
      }
      if (err.name !== 'AbortError') {
        console.error("FETCH ERROR", err); get().addMessageToActiveSession({ role: 'assistant', content: `Error: ${err.message || String(err)}` });
      }
    } finally {
      const finalState = get();
      finalState.setIsGenerating(false);
      
      if (sessionId) {
        finalState.generateChatTitle(sessionId);
      }
      
      set({ abortController: null });
      invoke('save_history', { payload: JSON.stringify(finalState.sessions) }).catch(e => console.error("Failed to save history", e));
    }
  },

  agents: [{
    id: 'default-local',
    displayName: 'Local Llama 3',
    type: 'local',
    modelName: 'llama3:latest',
    endpoint: 'http://localhost:11434/api/chat',
    status: 'unknown'
  }],
  selectedAgentId: 'default-local',
  isHydrated: false,
  setIsHydrated: (val) => set({ isHydrated: val }),
  addAgent: (agent) => set((state) => ({ 
    agents: [...state.agents, { ...agent, id: crypto.randomUUID(), status: 'unknown' }] 
  })),
  updateAgent: (id, updates) => set((state) => ({
    agents: state.agents.map(a => a.id === id ? { ...a, ...updates } : a)
  })),
  removeAgent: (id) => set((state) => ({
    agents: state.agents.filter(a => a.id !== id),
    selectedAgentId: state.selectedAgentId === id ? (state.agents.find(a => a.id !== id)?.id || null) : state.selectedAgentId
  })),
  setSelectedAgentId: (id) => set({ selectedAgentId: id }),
  setAgents: (agents) => set({ agents }),

  stagedContextFiles: [],
  addContextFile: (path) => set((state) => ({
    stagedContextFiles: state.stagedContextFiles.includes(path) ? state.stagedContextFiles : [...state.stagedContextFiles, path]
  })),
  removeContextFile: (path) => set((state) => ({
    stagedContextFiles: state.stagedContextFiles.filter(p => p !== path)
  })),
  clearContextFiles: () => set({ stagedContextFiles: [] }),
  isContextPickerMode: false,
  setContextPickerMode: (active) => set({ isContextPickerMode: active }),
});
