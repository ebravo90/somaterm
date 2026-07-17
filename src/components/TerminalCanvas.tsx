import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { UnlistenFn } from '@tauri-apps/api/event';

// Import xterm default CSS
import '@xterm/xterm/css/xterm.css';

export function TerminalCanvas() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const term = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const [error, setError] = useState<string | null>(null);

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

    term.current.open(terminalRef.current);
    fitAddon.current.fit();

    let unlistenPromise: Promise<UnlistenFn> | null = null;

    const setupIpc = async () => {
      try {
        // Listen to incoming data from Rust
        unlistenPromise = listen<string>('pty-read', (event) => {
          if (term.current) {
            term.current.write(event.payload);
          }
        });

        // Send keystrokes to Rust
        term.current?.onData((data) => {
          invoke('write_to_pty', { data }).catch((e) => {
            console.error(e);
            setError(String(e));
          });
        });

        // Spawn the shell process on mount
        await invoke('spawn_pty');
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
          // Inform Rust backend about new dimensions
          invoke('resize_pty', {
            rows: term.current.rows,
            cols: term.current.cols,
          }).catch(console.error);
        }
      }, 150);
    });

    resizeObserver.observe(terminalRef.current);

    return () => {
      clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
      if (unlistenPromise) {
        unlistenPromise.then(unlisten => unlisten());
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
      {/* Invisible drag region for macOS frameless window */}
      <div 
        data-tauri-drag-region="true"
        className="w-full h-[36px] shrink-0 z-10"
        style={{ cursor: 'default' }}
      />
      
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
    </div>
  );
}
