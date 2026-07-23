import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store/useAppStore';
import { listen } from '@tauri-apps/api/event';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { Wand2, ChevronDown, Check } from 'lucide-react';

// Import xterm default CSS
import '@xterm/xterm/css/xterm.css';

export function TerminalCanvas({ id }: { id: string }) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const term = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [buttonPos, setButtonPos] = useState<number | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isGenerating, agents, selectedAgentId, setSelectedAgentId } = useAppStore();

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

  const triggerKamikaze = (text: string) => {
    const store = useAppStore.getState();
    const prompt = `Please analyze the following terminal output and explain the error or suggest a fix:\n\n\`\`\`console\n${text}\n\`\`\``;
    store.setActiveWidget({ type: 'agent' });
    setTimeout(() => {
      store.sendMessage(prompt);
    }, 100);
    term.current?.clearSelection();
  };

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize Terminal with a modern dark theme
    term.current = new Terminal({
      cursorBlink: true,
      fontFamily: "'JetBrainsMono Nerd Font', 'FiraCode Nerd Font', 'MesloLGS NF', monospace",
      fontSize: 14,
      theme: {
        background: '#000000', // match soma-bg
        foreground: '#f4f4f5', // match soma-text
        cursor: '#3b82f6', // match soma-accent
        black: '#18181b',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#d946ef',
        cyan: '#06b6d4',
        white: '#f4f4f5',
        brightBlack: '#27272a',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#60a5fa',
        brightMagenta: '#e879f9',
        brightCyan: '#22d3ee',
        brightWhite: '#fafafa',
      },
      allowProposedApi: true,
    });

    fitAddon.current = new FitAddon();
    term.current.loadAddon(fitAddon.current);

    const addWebView = useAppStore.getState().addWebView;
    const webLinksAddon = new WebLinksAddon((event, uri) => {
      event.preventDefault();
      addWebView(uri);
    });
    term.current.loadAddon(webLinksAddon);

    term.current.onResize(({ cols, rows }) => {
      invoke('resize_pty', { id, rows, cols }).catch(console.error);
    });

    term.current.open(terminalRef.current);
    fitAddon.current.fit();

    term.current.onSelectionChange(() => {
      if (term.current && term.current.hasSelection()) {
        setSelectedText(term.current.getSelection().trim());
      } else {
        setSelectedText('');
        setButtonPos(null);
        setIsDropdownOpen(false);
      }
    });

    term.current.attachCustomKeyEventHandler((e) => {
      if (e.type === 'keydown' && (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
        if (term.current && term.current.hasSelection()) {
          triggerKamikaze(term.current.getSelection().trim());
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
      return true;
    });

    const handleMouseUp = (e: MouseEvent) => {
      if (term.current && term.current.hasSelection() && terminalRef.current) {
        const rect = terminalRef.current.getBoundingClientRect();
        setButtonPos(e.clientY - rect.top);
      }
    };
    terminalRef.current.addEventListener('mouseup', handleMouseUp);

    let unlistenPromise: Promise<UnlistenFn> | null = null;

    const setupIpc = async () => {
      try {
        // Listen to incoming data from Rust
        unlistenPromise = listen<string>(`pty-read-${id}`, (event) => {
          if (term.current) {
            if (typeof event.payload !== 'string') {
              useAppStore.getState().addLog({ level: 'ERROR', source: 'Terminal', message: `Received malformed IPC payload for ${id}: ${typeof event.payload}` });
              return;
            }
            term.current.write(event.payload);
          }
        });

        // Send keystrokes to Rust
        term.current?.onData((data) => {
          invoke('write_to_pty', { id, data }).catch((e) => {
            console.error(e);
            setError(String(e));
          });
        });

        // Spawn the shell process on mount with initial dimensions
        const rows = term.current?.rows || 24;
        const cols = term.current?.cols || 80;
        await invoke('spawn_pty', { id, rows, cols });
      } catch (e) {
        console.error("IPC Error:", e);
        setError(String(e));
      }
    };

    setupIpc();

    // Resize handling
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (fitAddon.current && term.current) {
          fitAddon.current.fit();
          // fit() recalculates rows/cols and triggers onResize automatically
        }
      }, 50);
    });

    resizeObserver.observe(terminalRef.current);

    const clearHandler = (e: any) => {
      if (e.detail.id === id && term.current) {
        term.current.clear();
      }
    };
    window.addEventListener('somaterm-clear-buffer', clearHandler);

    return () => {
      clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
      window.removeEventListener('somaterm-clear-buffer', clearHandler);
      if (unlistenPromise) {
        unlistenPromise.then(unlisten => { try { const p = unlisten() as any; if (p && p.catch) p.catch(() => {}); } catch(e){} }).catch(() => {});
      }
      if (terminalRef.current) {
        terminalRef.current.removeEventListener('mouseup', handleMouseUp);
      }
      term.current?.dispose();
    };
  }, []);

  return (
    <div
      className="w-full h-full overflow-hidden relative flex flex-col"
      style={{
        backgroundColor: '#000000',
      }}
    >
      {/* Terminal Container */}
      <div
        ref={terminalRef}
        className="w-full grow overflow-hidden relative"
        style={{
          padding: '0 16px 16px 16px',
          boxSizing: 'border-box'
        }}
      >
        {error && (
          <div className="absolute top-0 left-0 bg-red-900 text-white p-4 z-50 w-full whitespace-pre-wrap">
            Error initializing terminal: {error}
          </div>
        )}
      </div>

      {selectedText && buttonPos !== null && (
        <div 
          ref={dropdownRef}
          className="absolute right-16 z-50 flex flex-col items-end animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ top: `${Math.max(0, buttonPos - 20)}px` }}
        >
          <div className="flex items-stretch shadow-lg rounded-md overflow-hidden bg-soma-accent text-white transition-opacity">
            <button 
              onClick={() => triggerKamikaze(selectedText)}
              disabled={isGenerating}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/20 transition-colors text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Wand2 size={16} />
              <span>{isGenerating ? "Thinking..." : "Ask AI"}</span>
            </button>
            <div className="w-[1px] bg-white/30" />
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={isGenerating}
              className="px-2 hover:bg-white/20 transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronDown size={16} />
            </button>
          </div>
          
          {isDropdownOpen && (
            <div className="mt-2 w-48 bg-soma-panel border border-soma-border rounded-md shadow-xl py-1 z-50 text-sm overflow-hidden text-soma-text">
              {agents.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => {
                    setSelectedAgentId(agent.id);
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center px-3 py-2 hover:bg-soma-border/30 transition-colors cursor-pointer text-left"
                >
                  <span className="flex-1 truncate pr-2">{agent.displayName}</span>
                  {selectedAgentId === agent.id && <Check size={14} className="text-soma-accent shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
