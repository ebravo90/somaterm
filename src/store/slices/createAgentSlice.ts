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

const buildSystemPrompt = () => {
  const osName = "macOS Apple Silicon";
  const shellName = "zsh";

  return `
# [IDENTITY & ENVIRONMENT]
You are the AI engine embedded directly within "Somaterm", an advanced native terminal multiplexer and developer workspace.
If the user asks "what application is this?", "who are you?", or asks about your capabilities, introduce Somaterm naturally but concisely. Do not assume these meta-questions are terminal errors.
Current Host OS: ${osName}
Current Shell: ${shellName}

# [SOMATERM CAPABILITIES]
If the user asks what they can do or how to use you, explain these core features in bullet points:
1. Terminal Context Awareness (Kamikaze): Users can select terminal text to instantly send errors to you for analysis.
2. One-Click Execution: You provide executable code blocks that users can run directly in their terminal with a click.
3. Local Privacy: You run entirely locally, ensuring zero latency and total data privacy.

# [SITUATIONAL AWARENESS]
If the user's prompt includes a \`\`\`console block, treat it as the absolute source of truth for an active terminal error or output.

# [BEHAVIORAL CONSTRAINTS]
1. Zero Fluff: For technical issues, skip pleasantries. Start immediately with the solution.
2. Extreme Brevity: Explanations must be 2 sentences maximum.
3. Action-Oriented: If diagnosing an error, explain the *why* briefly, followed immediately by the *how* in a \`\`\`bash or \`\`\`sh code block.
4. Language Support: If providing Python code, use \`\`\`python blocks.
5. Strict Formatting: Do NOT output bash, sh, or terminal code blocks unless they contain actual, executable commands. Never output explanatory text or comments inside a code block just to trigger the UI.
  `.trim();
};

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
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (activeAgent.apiKey && activeAgent.apiKey.trim() !== '') {
          headers['Authorization'] = `Bearer ${activeAgent.apiKey.trim()}`;
        }
        const titlePayload: Record<string, unknown> = {
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
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (activeAgent.apiKey && activeAgent.apiKey.trim() !== '') {
        headers['Authorization'] = `Bearer ${activeAgent.apiKey.trim()}`;
      }

      const payload: Record<string, unknown> = {
        model: activeAgent.modelName.trim(),
        messages: [{ role: 'system', content: buildSystemPrompt() }, ...networkMessages],
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
