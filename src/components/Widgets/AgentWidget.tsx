import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { AgentProfile } from '../../store/useAppStore';
import { invoke } from '@tauri-apps/api/core';

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

      const res = await fetch(agent.endpoint.trim(), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: agent.modelName.trim(),
          messages: [{ role: 'system', content: 'hello' }],
          max_tokens: 1
        })
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
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-soma-text-muted mb-1">Endpoint URL</label>
            <input 
              type="text" 
              value={agent.endpoint}
              disabled={!isEditing}
              onChange={e => updateAgent(agent.id, { endpoint: e.target.value })}
              className="w-full bg-black/20 rounded-md px-3 py-2 text-sm text-soma-text focus:outline-none focus:ring-1 focus:ring-soma-accent disabled:opacity-50 disabled:bg-transparent transition-all"
            />
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

export function AgentWidget() {
  const { 
    closeWidget, 
    chatHistory, 
    addChatMessage,
    agents,
    selectedAgentId,
    setAgents,
    addAgent,
    updateAgent,
    removeAgent,
    setSelectedAgentId,
    isHydrated,
    setIsHydrated
  } = useAppStore();
  
  const [tab, setTab] = useState<'chat' | 'settings'>('chat');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);
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
  }, [tab]);

  useEffect(() => {
    async function load() {
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
      } catch (e) {
        console.error("Failed to load agents via IPC", e);
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSend = async () => {
    if (!input.trim() || !selectedAgentId) return;
    
    const activeAgent = agents.find(a => a.id === selectedAgentId);
    if (!activeAgent) return;

    const userMessage = { role: 'user' as const, content: input };
    const newMessages = [...chatHistory, userMessage];
    addChatMessage(userMessage);
    setInput('');
    setLoading(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (activeAgent.apiKey && activeAgent.apiKey.trim() !== '') {
        headers['Authorization'] = `Bearer ${activeAgent.apiKey.trim()}`;
      }

      const response = await fetch(activeAgent.endpoint.trim(), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: activeAgent.modelName.trim(),
          messages: newMessages
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const data = await response.json();
      const aiContent = data.choices?.[0]?.message?.content || data.message?.content || 'No response';
      
      let meta: string | undefined;
      if (data.eval_count && data.eval_duration) {
        const tks = (data.eval_count / (data.eval_duration / 1e9)).toFixed(2);
        meta = `${data.eval_count} tokens @ ${tks} tk/s`;
      }
      
      addChatMessage({ role: 'assistant', content: aiContent, meta });

      const store = useAppStore.getState();
      if (store.activeWidget?.type !== 'agent') {
        store.setHasUnread(true);
        new Audio('/ping.mp3').play().catch(() => {});
      }
    } catch (error) {
      addChatMessage({ role: 'assistant', content: `Error: ${error}` });
    } finally {
      setLoading(false);
    }
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
        
        return (
          <div key={index} className="my-2 bg-[#1e1e1e] rounded overflow-hidden border border-soma-border">
            <div className="flex justify-between items-center px-3 py-1 bg-[#2d2d2d] text-xs text-gray-400">
              <span>{lang || 'code'}</span>
              <button 
                onClick={() => invoke('inject_command', { command: code })}
                className="hover:text-white transition-colors bg-soma-accent text-white px-2 py-0.5 rounded cursor-pointer"
              >
                Run in Terminal
              </button>
            </div>
            <pre className="p-3 text-sm overflow-x-auto whitespace-pre-wrap">
              <code>{code}</code>
            </pre>
          </div>
        );
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
        {tab === 'chat' ? (
          <div className="flex flex-col h-full">
            <div className="px-4 py-2 border-b border-soma-border bg-soma-bg/50 backdrop-blur-md z-10 shrink-0 relative" ref={dropdownRef}>
              <button 
                onClick={() => {
                  if (onlineAgents.length > 0) setIsDropdownOpen(!isDropdownOpen);
                }}
                disabled={onlineAgents.length === 0}
                className="w-full bg-soma-bg border border-soma-border rounded-md px-3 py-1.5 text-sm text-soma-text flex justify-between items-center focus:outline-none focus:ring-1 focus:ring-soma-accent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

            <div className="grow overflow-y-auto p-4 space-y-4">
              {chatHistory.length === 0 && (
                <div className="hidden @[250px]:block text-center text-soma-text-muted mt-10">
                  <p>Send a message to start interacting with {agents.find(a => a.id === selectedAgentId)?.displayName || 'the agent'}.</p>
                </div>
              )}
              {chatHistory.map((msg, i) => (
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
              {loading && (
                <div className="flex items-start">
                  <div className="max-w-[90%] p-3 rounded-lg bg-soma-border text-soma-text animate-pulse">
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-soma-border bg-soma-bg">
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Ask the agent..."
                disabled={!selectedAgentId || onlineAgents.length === 0}
                className="w-full bg-soma-panel border border-soma-border rounded-md px-3 py-2 text-sm text-soma-text focus:outline-none focus:border-soma-accent disabled:opacity-50"
              />
              {onlineAgents.length === 0 && (
                <div className="mt-2 text-[10px] text-red-400">
                  No verified agents. Go to Settings to configure an agent.
                </div>
              )}
            </div>
          </div>
        ) : (
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
