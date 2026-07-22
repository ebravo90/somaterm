import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { AgentProfile, Session } from '../../store/useAppStore';
import { invoke } from '@tauri-apps/api/core';

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [isSent, setIsSent] = useState(false);

  const handleRun = async () => {
    try {
      const store = useAppStore.getState();
      const terminalId = store.activeTerminalId || (store.terminals && store.terminals.length > 0 ? store.terminals[0].id : null);
      if (!terminalId) {
        console.warn("No active terminal found.");
        return;
      }
      
      await invoke('write_to_pty', { 
        id: terminalId, 
        data: code + '\r'
      });
      
      setIsSent(true);
      setTimeout(() => setIsSent(false), 1500);
    } catch (e) {
      console.error("Failed to run code in terminal:", e);
    }
  };

  return (
    <div className="my-2 bg-[#1e1e1e] rounded overflow-hidden border border-soma-border">
      <div className="flex justify-between items-center px-3 py-1 bg-[#2d2d2d] text-xs text-gray-400">
        <span>{lang || 'code'}</span>
        <button 
          onClick={handleRun}
          className={`transition-colors px-2 py-0.5 rounded cursor-pointer ${
            isSent 
              ? 'bg-green-600 text-white' 
              : 'bg-soma-accent hover:text-white text-white'
          }`}
        >
          {isSent ? 'Sent! 🚀' : 'Run in Terminal'}
        </button>
      </div>
      <pre className="p-3 text-sm overflow-x-auto whitespace-pre-wrap">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function AgentSettingsItem({
  agent,
  isExpanded,
  onToggleExpand,
  removeAgent,
  updateAgent,
  agents
}: {
  agent: AgentProfile;
  isExpanded: boolean;
  onToggleExpand: () => void;
  removeAgent: (id: string) => void;
  updateAgent: (id: string, updates: Partial<AgentProfile>) => void;
  agents: AgentProfile[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [deleteState, setDeleteState] = useState<'idle' | 'counting' | 'ready'>('idle');
  const [deleteTimer, setDeleteTimer] = useState(5);
  const [hasManuallyEditedName, setHasManuallyEditedName] = useState(false);

  // Reset delete state when collapsed
  useEffect(() => {
    if (!isExpanded) {
      setDeleteState('idle');
      setDeleteTimer(5);
    }
  }, [isExpanded]);

  useEffect(() => {
    if (deleteState !== 'counting') return;
    if (deleteTimer === 0) {
      setDeleteState('ready');
      return;
    }
    const t = setTimeout(() => setDeleteTimer(deleteTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [deleteState, deleteTimer]);

  const handleDeleteClick = () => {
    const isPristine = agent.displayName.startsWith('New Agent') && agent.status === 'checking';
    if (agent.status === 'offline' || deleteState === 'ready' || isPristine) {
      removeAgent(agent.id);
    } else if (deleteState === 'idle') {
      setDeleteState('counting');
      setDeleteTimer(5);
    }
  };

  const handleVerify = async () => {
    updateAgent(agent.id, { status: 'checking' });
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (agent.apiKey && agent.apiKey.trim() !== '') {
        headers['Authorization'] = `Bearer ${agent.apiKey.trim()}`;
      }

      const verifyPayload: any = {
        model: agent.modelName.trim(),
        messages: [{ role: 'system', content: 'hello' }],
        max_tokens: 1
      };
      
      if (agent.type === 'local') {
        verifyPayload.keep_alive = 0;
      }

      const res = await fetch(agent.endpoint.trim(), {
        method: 'POST',
        headers,
        body: JSON.stringify(verifyPayload)
      });

      if (res.ok) {
        updateAgent(agent.id, { status: 'online' });
      } else {
        updateAgent(agent.id, { status: 'offline' });
      }
    } catch (e) {
      updateAgent(agent.id, { status: 'offline' });
    }
  };

  const handleModelNameChange = (newModelName: string) => {
    updateAgent(agent.id, { modelName: newModelName });
    if (!hasManuallyEditedName) {
      let uniqueName = newModelName;
      let counter = 1;
      while (agents.some(a => a.id !== agent.id && a.displayName === uniqueName)) {
        uniqueName = `${newModelName} (${counter})`;
        counter++;
      }
      updateAgent(agent.id, { displayName: uniqueName || 'New Agent' });
    }
  };

  return (
    <div className="overflow-hidden group">
      <div 
        className="flex justify-between items-center py-2 px-2 rounded hover:bg-soma-border/30 cursor-pointer transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            agent.status === 'online' ? 'bg-green-500' : 
            agent.status === 'offline' ? 'bg-red-500' : 
            'bg-yellow-500 animate-pulse'
          }`} />
          <span className="text-sm font-medium text-soma-text">{agent.displayName}</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform text-soma-text-muted ${isExpanded ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>
      
      {isExpanded && (
        <div className="py-2 px-2 space-y-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-soma-text-muted mb-1">Display Name</label>
            <input 
              type="text" 
              value={agent.displayName}
              disabled={!isEditing}
              onChange={e => {
                setHasManuallyEditedName(true);
                updateAgent(agent.id, { displayName: e.target.value });
              }}
              className="w-full bg-black/20 rounded-md px-3 py-2 text-sm text-soma-text focus:outline-none focus:ring-1 focus:ring-soma-accent disabled:opacity-50 disabled:bg-transparent transition-all"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[10px] uppercase tracking-wider text-soma-text-muted mb-1">Type</label>
              <select
                value={agent.type || 'remote'}
                disabled={!isEditing}
                onChange={e => {
                  const newType = e.target.value as 'local' | 'remote';
                  const newEndpoint = newType === 'local' 
                    ? 'http://localhost:11434/api/chat' 
                    : 'https://api.openai.com/v1/chat/completions';
                  updateAgent(agent.id, { type: newType, endpoint: newEndpoint });
                }}
                className="w-full bg-black/20 rounded-md px-3 py-2 text-sm text-soma-text focus:outline-none focus:ring-1 focus:ring-soma-accent disabled:opacity-50 disabled:bg-transparent transition-all"
              >
                <option value="remote">Remote (OpenAI, Anthropic, etc)</option>
                <option value="local">Local (Ollama)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-soma-text-muted mb-1">Endpoint URL</label>
            <input 
              type="text" 
              value={agent.endpoint}
              disabled={!isEditing}
              onChange={e => updateAgent(agent.id, { endpoint: e.target.value })}
              className="w-full bg-black/20 rounded-md px-3 py-2 text-sm text-soma-text focus:outline-none focus:ring-1 focus:ring-soma-accent disabled:opacity-50 disabled:bg-transparent transition-all"
            />
            {agent.type === 'local' && agent.endpoint.trim() !== 'http://localhost:11434/api/chat' && (
              <p className="mt-1 text-[10px] text-red-400">
                Warning: Local agents require the /api/chat endpoint to auto-unload and prevent severe memory leaks.
              </p>
            )}
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-soma-text-muted mb-1">Model Name</label>
            <input 
              type="text" 
              value={agent.modelName}
              disabled={!isEditing}
              onChange={e => handleModelNameChange(e.target.value)}
              className="w-full bg-black/20 rounded-md px-3 py-2 text-sm text-soma-text focus:outline-none focus:ring-1 focus:ring-soma-accent disabled:opacity-50 disabled:bg-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-soma-text-muted mb-1">API Key (optional)</label>
            <input 
              type="password" 
              value={agent.apiKey || ''}
              disabled={!isEditing}
              onChange={e => updateAgent(agent.id, { apiKey: e.target.value })}
              className="w-full bg-black/20 rounded-md px-3 py-2 text-sm text-soma-text focus:outline-none focus:ring-1 focus:ring-soma-accent disabled:opacity-50 disabled:bg-transparent transition-all"
            />
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                if (isEditing) {
                  handleVerify();
                }
                setIsEditing(!isEditing); 
              }}
              className="w-full py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-soma-text text-xs rounded transition-colors"
            >
              {isEditing ? 'Save' : 'Edit'}
            </button>
            <button 
              onClick={handleVerify}
              className="w-full py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-soma-text text-xs rounded transition-colors"
            >
              Verify Connection
            </button>
            <button 
              onClick={handleDeleteClick}
              disabled={deleteState === 'counting'}
              className={`w-full py-2 text-xs rounded transition-colors ${
                deleteState === 'counting' 
                  ? 'bg-red-600 text-white cursor-not-allowed'
                  : deleteState === 'ready'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-[#2d2d2d] hover:bg-red-500/30 text-soma-text-muted hover:text-red-400'
              }`}
            >
              {deleteState === 'counting' ? `Are you sure? (${deleteTimer}s)` : deleteState === 'ready' ? 'Ready to remove' : 'Remove Agent'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryItem({
  session,
  isExpanded,
  onToggleExpand,
  deleteSession,
  updateSession,
  agentDisplayName,
  isGenerating,
  onSelectSession
}: {
  session: Session;
  isExpanded: boolean;
  onToggleExpand: (e?: React.MouseEvent) => void;
  onSelectSession: () => void;
  deleteSession: (id: string) => void;
  updateSession: (id: string, updates: Partial<Session>) => void;
  agentDisplayName: string;
  isGenerating: boolean;
}) {
  const [deleteState, setDeleteState] = useState<'idle' | 'counting' | 'ready'>('idle');
  const [deleteTimer, setDeleteTimer] = useState(5);

  useEffect(() => {
    if (!isExpanded) {
      setDeleteState('idle');
      setDeleteTimer(5);
    }
  }, [isExpanded]);

  useEffect(() => {
    if (deleteState !== 'counting') return;
    if (deleteTimer === 0) {
      setDeleteState('ready');
      return;
    }
    const t = setTimeout(() => setDeleteTimer(deleteTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [deleteState, deleteTimer]);

  const handleDeleteClick = () => {
    if (isGenerating) return;
    if (deleteState === 'ready') {
      deleteSession(session.id);
    } else if (deleteState === 'idle') {
      setDeleteState('counting');
      setDeleteTimer(5);
    }
  };

  const formatDate = (ts: number) => {
    try {
      if (!ts) return "Unknown Date";
      const d = new Date(ts);
      return isNaN(d.getTime()) ? "Unknown Date" : d.toLocaleString();
    } catch {
      return "Unknown Date";
    }
  };

  return (
    <div className="overflow-hidden group">
      <div 
        className="flex justify-between items-center py-2 px-2 rounded hover:bg-soma-border/30 cursor-pointer transition-colors"
        onClick={onSelectSession}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {session.isPinned && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-soma-text-muted shrink-0">
              <path d="M12 17v5"></path>
              <path d="M9 10.5V7a3 3 0 0 1 6 0v3.5l2 4.5H7l2-4.5z"></path>
            </svg>
          )}
          {session.isGeneratingTitle ? (
            <div className="flex items-center gap-[2px] h-5 px-1">
              <div className="w-1 h-1 bg-soma-text-muted rounded-full animate-piston-1"></div>
              <div className="w-1 h-1 bg-soma-text-muted rounded-full animate-piston-2"></div>
              <div className="w-1 h-1 bg-soma-text-muted rounded-full animate-piston-3"></div>
            </div>
          ) : (
            <span className="text-sm font-medium text-soma-text truncate">{session.title}</span>
          )}
        </div>
        <div 
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="p-1 hover:bg-soma-border/50 rounded transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform shrink-0 text-soma-text-muted ${isExpanded ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div className="px-2 pb-4 space-y-3 mt-2">
          <div className="space-y-1">
            <p className="text-xs text-soma-text-muted">Agent: <span className="text-soma-text">{agentDisplayName}</span></p>
            <p className="text-xs text-soma-text-muted">Started: <span className="text-soma-text">{formatDate(session.startDate)}</span></p>
            <p className="text-xs text-soma-text-muted">Last Used: <span className="text-soma-text">{formatDate(session.lastUsedDate)}</span></p>
          </div>
          
          <div className="flex flex-col gap-2 pt-2">
            <button 
              onClick={() => {
                updateSession(session.id, { isPinned: !session.isPinned });
                onToggleExpand(); // Collapse the accordion
              }}
              className="w-full bg-soma-bg border border-soma-border hover:bg-soma-border/50 text-soma-text text-sm py-1.5 rounded transition-colors cursor-pointer"
            >
              {session.isPinned ? 'Unpin Session' : 'Pin Session'}
            </button>
            <button 
              onClick={handleDeleteClick}
              disabled={isGenerating}
              className={`w-full text-sm py-1.5 rounded transition-colors ${
                isGenerating 
                  ? 'bg-soma-bg border border-soma-border text-soma-text-muted opacity-50 cursor-not-allowed'
                  : deleteState === 'idle' 
                  ? 'bg-soma-bg border border-soma-border hover:bg-soma-border/50 text-soma-text cursor-pointer'
                  : deleteState === 'counting'
                  ? 'bg-red-600 text-white border border-red-600 cursor-pointer'
                  : 'bg-red-700 text-white border border-red-700 cursor-pointer'
              }`}
            >
              {deleteState === 'idle' ? 'Remove Session' : deleteState === 'counting' ? `Are you sure? (${deleteTimer}s)` : 'Ready to remove'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AgentWidget() {
  const { 
    closeWidget, 
    sessions,
    activeSessionId,
    deleteSession,
    updateSession,
    setActiveSession,
    agents,
    selectedAgentId,
    setAgents,
    addAgent,
    updateAgent,
    removeAgent,
    setSelectedAgentId,
    isHydrated,
    setIsHydrated,
    setSessions,
    isGenerating,
    hasLoadedHistory,
    setHasLoadedHistory
  } = useAppStore();
  
  const [tab, setTab] = useState<'chat' | 'history' | 'settings'>('chat');
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const accordionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleAccordionClickOutside(event: MouseEvent) {
      if (accordionRef.current && !accordionRef.current.contains(event.target as Node)) {
        setExpandedAgentId(null);
      }
    }
    
    if (expandedAgentId) {
      document.addEventListener('mousedown', handleAccordionClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleAccordionClickOutside);
    };
  }, [expandedAgentId]);

  useEffect(() => {
    setExpandedAgentId(null);
    setExpandedSessionId(null);
  }, [tab]);

  useEffect(() => {
    async function load() {
      if (hasLoadedHistory) return;
      try {
        const savedAgents: AgentProfile[] = await invoke('load_agents');
        const savedSelected = localStorage.getItem('soma_selected_agent');
        if (Array.isArray(savedAgents) && savedAgents.length > 0) {
          setAgents(savedAgents);
          if (savedSelected && savedAgents.some(a => a.id === savedSelected)) {
            setSelectedAgentId(savedSelected);
          } else {
            setSelectedAgentId(savedAgents[0].id);
          }
        }

        console.log("Loading history from vault...");
        const historyJson: string = await invoke('load_history');
        if (historyJson) {
          console.log("History loaded successfully, parsing JSON...");
          try {
            const parsed = JSON.parse(historyJson);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log(`Loaded ${parsed.length} sessions.`);
              setSessions(parsed);
              // Default to New Chat on Startup
              setActiveSession(null);
            } else {
              console.log("History array is empty or not an array.");
              setSessions([]);
            }
          } catch (e) {
            console.error("Failed to parse history JSON:", e);
            setSessions([]);
          }
        } else {
          console.log("Received empty history from backend.");
        }
        setHasLoadedHistory(true);
      } catch (e) {
        console.error("Failed to load data via IPC", e);
      } finally {
        setIsHydrated(true);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    
    if (agents.length > 0) {
      invoke('save_agents', { agents }).catch(e => console.error("Failed to save agents", e));
    }
    if (selectedAgentId) {
      localStorage.setItem('soma_selected_agent', selectedAgentId);
    }
  }, [agents, selectedAgentId, isHydrated]);

  useEffect(() => {
    if (!isHydrated || !hasLoadedHistory) return;
    
    // We always save sessions, even if empty, to allow deletion of all history
    invoke('save_history', { payload: JSON.stringify(sessions) }).catch(e => console.error("Failed to save history", e));
  }, [sessions, isHydrated, hasLoadedHistory]);

  // Auto-select first online agent if current is invalid
  useEffect(() => {
    const onlineAgents = agents.filter(a => a.status === 'online');
    const isSelectedOnline = onlineAgents.some(a => a.id === selectedAgentId);
    
    if (!isSelectedOnline && onlineAgents.length > 0) {
      setSelectedAgentId(onlineAgents[0].id);
    } else if (onlineAgents.length === 0 && selectedAgentId !== null) {
      setSelectedAgentId(null);
    }
  }, [agents, selectedAgentId, setSelectedAgentId]);

  const onlineAgents = agents.filter(a => a.status === 'online');

  const currentSession = sessions.find(s => s.id === activeSessionId);
  const currentMessages = currentSession?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  useEffect(() => {
    const unlistenPromise = import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      return getCurrentWindow().onCloseRequested(() => {
        const store = useAppStore.getState();
        const activeAgent = store.agents.find(a => a.id === store.selectedAgentId);
        if (activeAgent) {
          store.teardownAgentContext(activeAgent);
        }
      });
    });

    return () => {
      unlistenPromise.then(unlisten => unlisten());
    };
  }, []);

  const store = useAppStore();
  const handleSend = async () => {
    if (!input.trim() || !selectedAgentId) return;
    const sentInput = input;
    setInput('');
    await store.sendMessage(sentInput);
  };

  const handleAddAgent = () => {
    const defaultName = 'New Agent';
    let uniqueName = defaultName;
    let counter = 1;
    while (agents.some(a => a.displayName === uniqueName)) {
      uniqueName = `${defaultName} (${counter})`;
      counter++;
    }

    addAgent({
      displayName: uniqueName,
      type: 'remote',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      modelName: 'gpt-4o',
      apiKey: ''
    });
  };

  const renderMessageContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.split('\n');
        const lang = lines[0].slice(3).trim();
        const code = lines.slice(1, -1).join('\n');
        
        return <CodeBlock key={index} lang={lang} code={code} />;
      }
      return <span key={index} className="whitespace-pre-wrap">{part}</span>;
    });
  };

  return (
    <div className="@container w-full h-full flex flex-col bg-soma-panel relative">
      <div className="h-10 flex items-center justify-center @[250px]:justify-between px-4 border-b border-soma-border shrink-0">
        <div className="hidden @[250px]:flex gap-4">
          <button 
            onClick={() => setTab('chat')} 
            className={`text-sm font-medium transition-colors cursor-pointer ${tab === 'chat' ? 'text-soma-text' : 'text-soma-text-muted hover:text-soma-text'}`}
          >
            Chat
          </button>
          <button 
            onClick={() => setTab('history')} 
            className={`text-sm font-medium transition-colors cursor-pointer ${tab === 'history' ? 'text-soma-text' : 'text-soma-text-muted hover:text-soma-text'}`}
          >
            {sessions.length > 0 ? `History (${sessions.length})` : 'History'}
          </button>
          <button 
            onClick={() => setTab('settings')} 
            className={`text-sm font-medium transition-colors cursor-pointer ${tab === 'settings' ? 'text-soma-text' : 'text-soma-text-muted hover:text-soma-text'}`}
          >
            Settings
          </button>
        </div>
        <button 
          onClick={closeWidget}
          className="text-soma-text-muted hover:text-soma-text transition-colors cursor-pointer p-1 rounded hover:bg-soma-border"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div className="grow overflow-hidden relative">
        {tab === 'chat' && (
          <div className="flex flex-col h-full">
            <div className="px-4 py-2 border-b border-soma-border bg-soma-bg/50 backdrop-blur-md z-10 shrink-0 relative flex gap-2" ref={dropdownRef}>
              <button 
                onClick={() => {
                  if (onlineAgents.length > 0) setIsDropdownOpen(!isDropdownOpen);
                }}
                disabled={onlineAgents.length === 0}
                className="grow bg-soma-bg border border-soma-border rounded-md px-3 py-1.5 text-sm text-soma-text flex justify-between items-center focus:outline-none focus:ring-1 focus:ring-soma-accent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>
                  {onlineAgents.length === 0 
                    ? 'No agents available' 
                    : agents.find(a => a.id === selectedAgentId)?.displayName || 'Select an agent...'}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`transition-transform text-soma-text-muted ${isDropdownOpen ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              
              <button
                onClick={() => setActiveSession(null)}
                className="shrink-0 bg-soma-bg border border-soma-border hover:bg-soma-border/50 transition-colors text-soma-text rounded-md px-2 flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={onlineAgents.length === 0 || isGenerating}
                title="New Chat"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
              
              {isDropdownOpen && (
                <div className="absolute top-full left-4 right-4 mt-1 bg-soma-panel border border-soma-border rounded-md shadow-lg overflow-hidden z-50 max-h-48 overflow-y-auto">
                  {agents.filter(a => a.status === 'online').length === 0 ? (
                    <div className="px-3 py-2 text-sm text-soma-text-muted italic">No online agents</div>
                  ) : (
                    agents.filter(a => a.status === 'online').map(agent => (
                      <div 
                        key={agent.id} 
                        onClick={() => {
                          setSelectedAgentId(agent.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`px-3 py-2 text-sm cursor-pointer hover:bg-soma-border/50 transition-colors ${selectedAgentId === agent.id ? 'bg-soma-border/30 text-soma-accent' : 'text-soma-text'}`}
                      >
                        {agent.displayName} <span className="text-xs text-soma-text-muted ml-1">({agent.modelName})</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-4">
              {currentMessages.length === 0 && (
                <div className="hidden @[250px]:block text-center text-soma-text-muted mt-10">
                  <p>Send a message to start interacting with {agents.find(a => a.id === selectedAgentId)?.displayName || 'the agent'}.</p>
                </div>
              )}
              {currentMessages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[90%] p-3 rounded-lg break-words overflow-hidden ${msg.role === 'user' ? 'bg-soma-accent text-white' : 'bg-soma-border text-soma-text'}`}>
                    {renderMessageContent(msg.content)}
                  </div>
                  {msg.meta && (
                    <div className="text-[10px] text-gray-500 mt-1 pl-1">
                      {msg.meta}
                    </div>
                  )}
                </div>
              ))}
              {isGenerating && (
                <div className="flex items-start">
                  <div className="max-w-[90%] p-3 rounded-lg bg-soma-border text-soma-text animate-pulse">
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 pt-0 shrink-0 flex flex-col gap-2 relative">
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Ask the agent..."
                  disabled={!selectedAgentId || onlineAgents.length === 0 || isGenerating}
                  className="w-full bg-soma-panel border border-soma-border rounded-md px-3 py-2 text-sm text-soma-text focus:outline-none focus:border-soma-accent disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {isGenerating && (
                  <button
                    onClick={() => store.stopGeneration()}
                    className="hidden @[250px]:block bg-red-600/20 hover:bg-red-600/40 text-red-500 hover:text-red-400 p-2 rounded-md transition-colors border border-red-600/30 flex-shrink-0 cursor-pointer animate-pulse"
                    title="Stop Generation"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    </svg>
                  </button>
                )}
              </div>
              {onlineAgents.length === 0 && (
                <div className="text-[10px] text-red-400">
                  No verified agents. Go to Settings to configure an agent.
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="p-4 overflow-y-auto h-full pb-20">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-semibold text-soma-text">Chat History</h3>
              <button 
                onClick={() => {
                  setActiveSession(null);
                  setTab('chat');
                }}
                disabled={isGenerating}
                className="text-soma-text-muted hover:text-white transition-colors p-1 rounded hover:bg-soma-border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="New Chat"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
            
            <div className="bg-soma-bg/50 backdrop-blur-md rounded-lg p-2 space-y-1">
              {sessions.length === 0 && (
                <div className="p-4 text-center text-sm text-soma-text-muted">No history found.</div>
              )}
              {[...sessions]
                .sort((a, b) => {
                  if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                  return b.lastUsedDate - a.lastUsedDate;
                })
                .map(session => (
                  <HistoryItem
                    key={session.id}
                    session={session}
                    isExpanded={expandedSessionId === session.id}
                    onSelectSession={() => {
                      setActiveSession(session.id);
                      if (session.agentId) setSelectedAgentId(session.agentId);
                      setTab('chat');
                    }}
                    onToggleExpand={() => {
                      setExpandedSessionId(expandedSessionId === session.id ? null : session.id);
                    }}
                    deleteSession={deleteSession}
                    updateSession={updateSession}
                    agentDisplayName={agents.find(a => a.id === session.agentId)?.displayName || 'Unknown Agent'}
                    isGenerating={isGenerating}
                  />
              ))}
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="p-4 overflow-y-auto h-full pb-20">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-semibold text-soma-text">Agent Profiles</h3>
              <button 
                onClick={handleAddAgent}
                className="text-soma-text-muted hover:text-white transition-colors p-1 rounded hover:bg-soma-border"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            </div>
            
            <div className="bg-soma-bg/50 backdrop-blur-md rounded-lg p-2 space-y-1" ref={accordionRef}>
              {agents.map(agent => (
                <AgentSettingsItem
                  key={agent.id}
                  agent={agent}
                  isExpanded={expandedAgentId === agent.id}
                  onToggleExpand={() => setExpandedAgentId(expandedAgentId === agent.id ? null : agent.id)}
                  removeAgent={removeAgent}
                  updateAgent={updateAgent}
                  agents={agents}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
