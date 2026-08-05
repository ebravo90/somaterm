import React, { useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import type { ChatMessage } from '../../../store/useAppStore';
import { invoke } from '@tauri-apps/api/core';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [isSent, setIsSent] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const isRunnable = ['bash', 'sh', 'zsh'].includes(lang?.toLowerCase());

  const handleRun = async () => {
    setRunError(null);
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
    } catch (error: unknown) {
      const e = error as Error;
      console.error("Failed to run code in terminal:", e);
      setRunError(e.toString());
      setTimeout(() => setRunError(null), 5000);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setIsSent(true);
    setTimeout(() => setIsSent(false), 1500);
  };

  const baseBtnClasses = "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors inline-flex items-center justify-center cursor-pointer";

  return (
    <div className="my-2 bg-[#1e1e1e] rounded overflow-hidden border border-soma-border">
      <div className="flex justify-between items-center px-3 py-1 bg-[#2d2d2d] text-xs text-gray-400">
        <span>{lang || 'code'}</span>
        {isRunnable ? (
          <button 
            onClick={handleRun}
            className={`${baseBtnClasses} ${
              isSent ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {isSent ? 'Sent! 🚀' : 'Run in Terminal'}
          </button>
        ) : (
          <button 
            onClick={handleCopy}
            className={`${baseBtnClasses} ${
              isSent ? 'bg-green-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100'
            }`}
          >
            {isSent ? 'Copied!' : 'Copy'}
          </button>
        )}
      </div>
      <pre className="p-3 text-sm overflow-x-auto whitespace-pre-wrap">
        <code>{code}</code>
      </pre>
      {runError && (
        <div className="bg-red-900/50 text-red-200 text-xs p-2 border-t border-red-800">
          ⚠️ {runError}
        </div>
      )}
    </div>
  );
}

function GlobalCopyButton({ content }: { content: string }) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  return (
    <button 
      type="button"
      onClick={handleCopy}
      className="mt-1 flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors cursor-pointer relative z-10"
    >
      {isCopied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Copied
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          Copy
        </>
      )}
    </button>
  );
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'rs':
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
    case 'json':
    case 'md':
    case 'css':
    case 'html':
      return '📄';
    default:
      return '📄';
  }
}

export const MessageBubble = React.memo(function MessageBubble({ msg }: { msg: ChatMessage }) {
  return (
    <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
      <div className={`max-w-[90%] p-3 rounded-lg break-words overflow-hidden ${msg.role === 'user' ? 'bg-soma-accent text-white' : 'bg-soma-border text-soma-text'}`}>
        <div className={msg.role === 'assistant' ? "prose prose-sm prose-invert max-w-none" : ""}>
          <Markdown 
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-xl font-semibold mt-5 mb-3" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-lg font-medium mt-4 mb-2" {...props} />,
              p: ({node, ...props}) => <p className="mb-4 leading-relaxed" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1" {...props} />,
              code(props) {
                const {children, className, node, ...rest} = props;
                const match = /language-(\w+)/.exec(className || '');
                return match ? (
                  <CodeBlock lang={match[1]} code={String(children).replace(/\n$/, '')} />
                ) : (
                  <code {...rest} className={className}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {msg.content}
          </Markdown>
        </div>
        
        {msg.attachments && msg.attachments.length > 0 && (
          <details className={`mt-2 text-xs border-t pt-2 ${msg.role === 'user' ? 'border-white/20' : 'border-soma-border'}`}>
            <summary className="cursor-pointer opacity-80 hover:opacity-100 transition-opacity">
              📎 {msg.attachments.length} file(s) attached
            </summary>
            <div className="mt-2 space-y-1 pl-4 opacity-80">
              {msg.attachments.map((file: string, i: number) => (
                <div key={i} className="flex items-center gap-1">
                  <span>{getFileIcon(file)}</span>
                  <span className="truncate">{file}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
      {msg.role === 'assistant' && (
        <GlobalCopyButton content={msg.content} />
      )}
      {msg.meta && (
        <div className="text-[10px] text-gray-500 mt-1 pl-1">
          {msg.meta}
        </div>
      )}
    </div>
  );
});