import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export type WidgetType = { type: 'webview' } | { type: 'agent' } | { type: 'web_manager' };

export interface TerminalSession {
  id: string;
  name?: string;
  activeProcess: boolean;
}

export type ChatMessage = { role: 'user' | 'assistant', content: string, meta?: string };
export type WebViewItem = { id: string, url: string, hasUnread: boolean, isHibernated: boolean, isAudioPlaying?: boolean, lastActiveAt: number };
export type LogEntry = { id: string, timestamp: number, level: 'INFO' | 'WARN' | 'ERROR' | 'MEDIA' | 'SYSTEM', source: string, message: string };
export interface AgentProfile {
  id: string;
  displayName: string;
  modelName: string;
  endpoint: string;
  apiKey?: string;
  status: 'offline' | 'online' | 'unknown' | 'checking';
  type?: 'local' | 'remote';
}

export interface Session {
  id: string;
  title: string;
  agentId: string | null;
  startDate: number;
  lastUsedDate: number;
  isPinned: boolean;
  messages: ChatMessage[];
  isGeneratingTitle?: boolean;
}

interface AppState {
  activeWidget: WidgetType | null;
  setActiveWidget: (widget: WidgetType | null) => void;
  closeWidget: () => void;
  
  webViews: WebViewItem[];
  activeWebId: string | null;
  addWebView: (url: string) => void;
  removeWebView: (id: string) => void;
  updateWebViewUrl: (id: string, newUrl: string) => void;
  setWebViewUnread: (id: string, hasUnread: boolean) => void;
  setWebViewHibernated: (id: string, hibernated: boolean) => void;
  setWebViewAudioStatus: (id: string, isPlaying: boolean) => void;
  receiveHeartbeat: (id: string, isPlaying: boolean, currentUrl: string) => void;
  setActiveWebId: (id: string) => void;

  isWidgetPanelOpen: boolean;
  toggleWidgetPanel: () => void;
  setWidgetPanelOpen: (isOpen: boolean) => void;
  
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

  isSettingsOpen: boolean;
  toggleSettings: () => void;
  isDebugModeEnabled: boolean;
  setDebugMode: (enabled: boolean) => void;
  debugLogs: LogEntry[];
  sessionId: string;
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;

  terminals: TerminalSession[];
  activeTerminalId: string | null;
  setActiveTerminalId: (id: string | null) => void;
  addTerminal: () => void;
  renameTerminal: (id: string, name: string) => void;
  closeTerminal: (id: string) => Promise<void>;
}

function normalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    
    // 1. Gmail background frame
    if (url.pathname.includes('/_/bscframe')) return url.origin + '/mail/';
    
    // 2. YouTube subdomains (Accounts/Studio)
    if (url.hostname.includes('accounts.youtube.com') || url.hostname.includes('studio.youtube.com')) {
        return 'https://www.youtube.com/';
    }
    
    // 3. Google Services
    if (url.hostname === 'ogs.google.com') return 'https://www.google.com/';
    
    // 4. Default return
    return url.href;
  } catch (e) {
    return rawUrl;
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  activeWidget: null,
  setActiveWidget: (widget) => set((state) => {
    let newActiveWebId = state.activeWebId;
    let newWebViews = state.webViews;
    
    if (widget?.type === 'web_manager' || widget?.type === 'agent') {
      newActiveWebId = null;
      if (state.activeWebId) {
        newWebViews = state.webViews.map(w => 
          w.id === state.activeWebId ? { ...w, lastActiveAt: Date.now() } : w
        );
      }
    }
    
    return { activeWidget: widget, activeWebId: newActiveWebId, webViews: newWebViews };
  }),
  closeWidget: () => set({ activeWidget: null }),
  
  webViews: [],
  activeWebId: null,
  addWebView: (url: string) => {
    let sanitizedUrl = url.trim();
    if (!/^https?:\/\//i.test(sanitizedUrl)) {
      sanitizedUrl = `https://${sanitizedUrl}`;
    }
    const finalUrl = normalizeUrl(sanitizedUrl);
    const id = Date.now().toString();
    set((state) => ({ 
      webViews: [...state.webViews, { 
        id, 
        url: finalUrl, 
        hasUnread: false, 
        isHibernated: false, 
        lastActiveAt: Date.now() 
      }],
      activeWebId: id,
      activeWidget: { type: 'webview' }
    }));
  },
  removeWebView: (id: string) => {
    set((state) => {
      const newWebViews = state.webViews.filter(w => w.id !== id);
      
      let newActiveWebId = state.activeWebId;
      let newActiveWidget = state.activeWidget;

      if (state.activeWebId === id) {
        newActiveWebId = null;
        if (state.activeWidget?.type === 'webview') {
          newActiveWidget = { type: 'web_manager' };
        }
      }

      return { 
        webViews: newWebViews, 
        activeWebId: newActiveWebId, 
        activeWidget: newActiveWidget 
      };
    });
  },
  updateWebViewUrl: (id: string, newUrl: string) => 
    set((state) => ({
      webViews: state.webViews.map(w => {
        if (w.id === id) {
          return { ...w, url: normalizeUrl(newUrl) };
        }
        return w;
      })
    })),
  setWebViewUnread: (id: string, hasUnread: boolean) => {
    set((state) => ({
      webViews: state.webViews.map(w => w.id === id ? { ...w, hasUnread: hasUnread } : w)
    }));
  },
  setWebViewHibernated: (id: string, hibernated: boolean) => {
    set((state) => ({
      webViews: state.webViews.map(w => w.id === id ? { ...w, isHibernated: hibernated } : w)
    }));
  },
  setWebViewAudioStatus: (id: string, isPlaying: boolean) => {
    set((state) => ({
      webViews: state.webViews.map(w => w.id === id ? { ...w, isAudioPlaying: isPlaying } : w)
    }));
  },
  receiveHeartbeat: (id: string, isPlaying: boolean, currentUrl: string) => {
    set((state) => ({
      webViews: state.webViews.map(w => {
        if (w.id === id) {
          const newUrl = currentUrl ? normalizeUrl(decodeURIComponent(currentUrl)) : w.url;
          return { 
            ...w, 
            isAudioPlaying: isPlaying, 
            url: newUrl, 
            lastActiveAt: isPlaying ? Date.now() : w.lastActiveAt 
          };
        }
        return w;
      })
    }));
  },
  setActiveWebId: (id: string) => {
    const state = get();
    const targetWebView = state.webViews.find(w => w.id === id);
    if (targetWebView?.isHibernated) {
      state.addLog({
        level: 'SYSTEM',
        source: 'WebManager',
        message: `Tab ${id} revived.`
      });
    }

    set((state) => ({
      webViews: state.webViews.map(w => {
        if (w.id === state.activeWebId && w.id !== id) {
          return { ...w, lastActiveAt: Date.now() };
        }
        if (w.id === id) {
          return { ...w, isHibernated: false, lastActiveAt: Date.now() };
        }
        return w;
      }),
      activeWebId: id, 
      activeWidget: { type: 'webview' }
    }));
  },

  isWidgetPanelOpen: false,
  toggleWidgetPanel: () => set((state) => ({ isWidgetPanelOpen: !state.isWidgetPanelOpen })),
  setWidgetPanelOpen: (isOpen) => set({ isWidgetPanelOpen: isOpen }),
  
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
        if (session.id === state.activeSessionId && session.messages.length > 0) {
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
              return { ...session, messages: updatedMessages };
            }
          }
        }
        return session;
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
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (activeAgent.apiKey && activeAgent.apiKey.trim() !== '') {
          headers['Authorization'] = `Bearer ${activeAgent.apiKey.trim()}`;
        }
        const titlePayload: any = {
          model: activeAgent.modelName.trim(),
          messages: [{ role: 'user', content: "Summarize the following prompt in 3 to 5 words to use as a chat title. Do not use quotes or punctuation: " + firstUserMessage }],
          stream: false
        };
        if (activeAgent.type === 'local') {
          titlePayload.keep_alive = 0;
        }

        const titleResponse = await fetch(activeAgent.endpoint.trim(), {
          method: 'POST',
          headers,
          body: JSON.stringify(titlePayload),
          signal: AbortSignal.timeout(10000)
        });
        if (titleResponse.ok) {
          const titleData = await titleResponse.json();
          let generatedTitle = titleData.choices?.[0]?.message?.content || titleData.message?.content || 'New Chat';
          generatedTitle = generatedTitle.replace(/["']/g, '').trim();
          
          get().addLog({ level: 'INFO', source: 'Agent', message: `[AutoTitle] Received title: ${generatedTitle}` });
          get().updateSession(sessionId, { title: generatedTitle, isGeneratingTitle: false });
          
          const finalState = get();
          invoke('save_history', { payload: JSON.stringify(finalState.sessions) }).catch(e => console.error("Failed to save history", e));
          get().addLog({ level: 'INFO', source: 'Agent', message: '[AutoTitle] Zustand state updated and history saved.' });
        } else {
          get().updateSession(sessionId, { isGeneratingTitle: false });
        }
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

    const userMessage: ChatMessage = { role: 'user', content: input };
    const currentSession = state.sessions.find(s => s.id === sessionId);
    const newMessages = [...(currentSession?.messages || []), userMessage];

    state.setActiveSession(sessionId);
    state.addMessageToActiveSession(userMessage);
    state.setIsGenerating(true);

    if (isFirstMessage) {
      state.generateChatTitle(sessionId);
    }

    const abortController = new AbortController();
    set({ abortController });

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (activeAgent.apiKey && activeAgent.apiKey.trim() !== '') {
        headers['Authorization'] = `Bearer ${activeAgent.apiKey.trim()}`;
      }

      const payload: any = {
        model: activeAgent.modelName.trim(),
        messages: newMessages,
        stream: true
      };
      
      if (activeAgent.type === 'local') {
        payload.keep_alive = 0;
        get().addLog({ level: 'INFO', source: 'Agent', message: '[Agent Lifecycle] Waking up local model. Expect cold start delay...' });
      }

      get().addLog({ level: 'INFO', source: 'Agent', message: `[Network] Dispatching generation request to: ${activeAgent.endpoint.trim()}` });
      const response = await fetch(activeAgent.endpoint.trim(), {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      if (!response.body) throw new Error("No response body");

      get().addMessageToActiveSession({ role: 'assistant', content: '' });
      get().addLog({ level: 'INFO', source: 'Agent', message: '[Agent Lifecycle] Stream started. Model loaded in RAM.' });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      // Ollama streams JSON objects separated by newline. OpenAI streams `data: {...}` separated by newline.
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n');
        buffer = parts.pop() || '';
        
        for (const part of parts) {
          const line = part.trim();
          if (!line || line === 'data: [DONE]') continue;
          
          let jsonStr = line;
          if (line.startsWith('data: ')) {
            jsonStr = line.replace('data: ', '');
          }
          
          try {
            const data = JSON.parse(jsonStr);
            const contentChunk = data.choices?.[0]?.delta?.content || data.message?.content || '';
            if (contentChunk) {
              get().appendMessageChunkToActiveSession(contentChunk);
            }
          } catch (e) {
            // Ignore incomplete JSON chunks, though they should be complete per line.
          }
        }
      }

      const updatedState = get();
      if (updatedState.activeWidget?.type !== 'agent') {
        updatedState.setHasUnread(true);
        new Audio('/ping.mp3').play().catch(() => {});
      }
      if (activeAgent.type === 'local') {
        get().addLog({ level: 'INFO', source: 'Agent', message: '[Agent Lifecycle] Stream complete. Ollama auto-unloading model...' });
      }
    } catch (error: any) {
      if (activeAgent.type === 'local') {
        get().addLog({ level: 'ERROR', source: 'Agent', message: '[Agent Lifecycle] Stream aborted/failed. Memory released.' });
      }
      if (error.name !== 'AbortError') {
        get().addMessageToActiveSession({ role: 'assistant', content: `Error: ${error.message || error}` });
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
    endpoint: 'http://localhost:11434/v1/chat/completions',
    modelName: 'llama3',
    status: 'checking'
  }],
  selectedAgentId: 'default-local',
  setAgents: (agents) => set({ agents }),
  isHydrated: false,
  setIsHydrated: (val) => set({ isHydrated: val }),
  addAgent: (agent) => set((state) => ({
    agents: [...state.agents, { ...agent, id: `agent-${Date.now()}`, status: 'checking' }]
  })),
  updateAgent: (id, updates) => set((state) => ({
    agents: state.agents.map(a => a.id === id ? { ...a, ...updates } : a)
  })),
  removeAgent: (id) => set((state) => {
    let newAgents = state.agents.filter(a => a.id !== id);
    if (newAgents.length === 0) {
      newAgents = [{
        id: `agent-${Date.now()}`,
        displayName: 'New Agent',
        type: 'local',
        endpoint: 'http://localhost:11434/v1/chat/completions',
        modelName: 'llama3',
        status: 'checking'
      }];
    }
    return {
      agents: newAgents,
      selectedAgentId: state.selectedAgentId === id 
        ? newAgents[0].id
        : state.selectedAgentId
    };
  }),
  setSelectedAgentId: (id) => set({ selectedAgentId: id }),

  isSettingsOpen: false,
  toggleSettings: () => {
    const willBeOpen = !get().isSettingsOpen;
    get().addLog({
      level: 'INFO',
      source: 'UX',
      message: willBeOpen ? 'Settings modal opened' : 'Settings modal closed'
    });
    set({ isSettingsOpen: willBeOpen });
  },
  isDebugModeEnabled: false,
  setDebugMode: (enabled) => set({ isDebugModeEnabled: enabled }),

  debugLogs: [],
  sessionId: Date.now().toString(),
  addLog: (log) => set((state) => {
    const newEntry: LogEntry = {
      ...log,
      id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
      timestamp: Date.now()
    };
    const newLogs = [...state.debugLogs, newEntry].slice(-200);
    
    const date = new Date(newEntry.timestamp);
    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    const ss = date.getSeconds().toString().padStart(2, '0');
    const mmm = date.getMilliseconds().toString().padStart(3, '0');
    const formattedString = `[${hh}:${mm}:${ss}.${mmm}] [${newEntry.level}] [${newEntry.source}] ${newEntry.message}`;
    
    invoke('write_debug_log', { sessionId: state.sessionId, logLine: formattedString }).catch(err => console.error("Failed to write log:", err));
    
    return { debugLogs: newLogs };
  }),
  clearLogs: () => set({ debugLogs: [], sessionId: Date.now().toString() }),

  terminals: [{ id: `term-${Date.now()}`, activeProcess: false }],
  activeTerminalId: null,
  setActiveTerminalId: (id) => set({ activeTerminalId: id }),
  
  addTerminal: () => set((state) => {
    if (state.terminals.length >= 4) return state;
    
    const baseName = "Terminal";
    let newName = baseName;
    let counter = 2;
    while (state.terminals.some(t => (t.name || t.id).toLowerCase() === newName.toLowerCase())) {
      newName = `${baseName} (${counter})`;
      counter++;
    }
    
    const newId = `term-${Date.now()}`;
    return {
      terminals: [...state.terminals, { id: newId, name: newName, activeProcess: false }],
      activeTerminalId: newId
    };
  }),

  renameTerminal: (id, name) => set((state) => {
    const originalTerminal = state.terminals.find(t => t.id === id);
    if (!originalTerminal) return state;
    
    if (originalTerminal.name === name) return state;
    
    let uniqueName = name;
    let counter = 2;
    while (state.terminals.some(t => t.id !== id && (t.name || t.id).toLowerCase() === uniqueName.toLowerCase())) {
      uniqueName = `${name} (${counter})`;
      counter++;
    }
    
    return {
      terminals: state.terminals.map(t => t.id === id ? { ...t, name: uniqueName } : t)
    };
  }),

  closeTerminal: async (id) => {
    const state = get();
    const session = state.terminals.find(t => t.id === id);
    if (session?.activeProcess) {
      const confirm = window.confirm("Process is still running. Force close?");
      if (!confirm) return;
    }

    try {
      await invoke('close_pty', { id });
    } catch (e) {
      console.error("Failed to close PTY:", e);
    }

    set((state) => {
      const newTerms = state.terminals.filter(t => t.id !== id);
      let newActiveId = state.activeTerminalId;
      if (newActiveId === id) {
        newActiveId = newTerms.length > 0 ? newTerms[newTerms.length - 1].id : null;
      }
      
      if (newTerms.length === 0) {
        const newId = `term-${Date.now()}`;
        return { 
          terminals: [{ id: newId, name: 'Terminal', activeProcess: false }],
          activeTerminalId: newId 
        };
      }
      return { terminals: newTerms, activeTerminalId: newActiveId };
    });
  }
}));
