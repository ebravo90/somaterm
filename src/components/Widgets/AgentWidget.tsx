import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { invoke } from '@tauri-apps/api/core';

export function AgentWidget() {
  const { closeWidget, chatHistory, addChatMessage } = useAppStore();
  const [tab, setTab] = useState<'chat' | 'settings'>('chat');
  
  const [endpoint, setEndpoint] = useState(() => localStorage.getItem('agentEndpoint') || 'http://localhost:11434/v1/chat/completions');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('agentApiKey') || '');
  const [model, setModel] = useState(() => localStorage.getItem('agentModel') || 'llama3');
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('agentEndpoint', endpoint);
    localStorage.setItem('agentApiKey', apiKey);
    localStorage.setItem('agentModel', model);
  }, [endpoint, apiKey, model]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = { role: 'user' as const, content: input };
    const newMessages = [...chatHistory, userMessage];
    addChatMessage(userMessage);
    setInput('');
    setLoading(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (apiKey.trim() !== '') {
        headers['Authorization'] = `Bearer ${apiKey.trim()}`;
      }

      const response = await fetch(endpoint.trim(), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: model.trim(),
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

  const renderMessageContent = (content: string) => {
    // Simple regex to match markdown code blocks
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
    <div className="@container w-full h-full flex flex-col bg-soma-panel">
      {/* Header */}
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

      {/* Content */}
      <div className="grow overflow-hidden relative">
        {tab === 'chat' ? (
          <div className="flex flex-col h-full">
            <div className="grow overflow-y-auto p-4 space-y-4">
              {chatHistory.length === 0 && (
                <div className="hidden @[250px]:block text-center text-soma-text-muted mt-10">
                  <p>Send a message to start interacting with the agent.</p>
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
                className="w-full bg-soma-panel border border-soma-border rounded-md px-3 py-2 text-sm text-soma-text focus:outline-none focus:border-soma-accent"
              />
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4 overflow-y-auto h-full">
            <div>
              <label className="block text-xs text-soma-text-muted mb-1">Endpoint URL</label>
              <input 
                type="text" 
                value={endpoint}
                onChange={e => setEndpoint(e.target.value)}
                className="w-full bg-soma-bg border border-soma-border rounded-md px-3 py-2 text-sm text-soma-text focus:outline-none focus:border-soma-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-soma-text-muted mb-1">Model Name</label>
              <input 
                type="text" 
                value={model}
                onChange={e => setModel(e.target.value)}
                className="w-full bg-soma-bg border border-soma-border rounded-md px-3 py-2 text-sm text-soma-text focus:outline-none focus:border-soma-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-soma-text-muted mb-1">API Key (optional)</label>
              <input 
                type="password" 
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="w-full bg-soma-bg border border-soma-border rounded-md px-3 py-2 text-sm text-soma-text focus:outline-none focus:border-soma-accent"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
