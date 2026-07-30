import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { invoke } from '@tauri-apps/api/core';
import { homeDir } from '@tauri-apps/api/path';

interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileNode[];
}

function FileTreeItem({ node, level }: { node: FileNode; level: number }) {
  // Open root node by default
  const [isOpen, setIsOpen] = useState(level === 0);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.is_dir) {
      setIsOpen(!isOpen);
    }
  };

  const getIcon = () => {
    if (node.is_dir) return isOpen ? '📂' : '📁';
    if (node.name.endsWith('.rs')) return '🦀';
    if (node.name.endsWith('.ts') || node.name.endsWith('.tsx')) return '📘';
    if (node.name.endsWith('.md')) return '📝';
    return '📄';
  };

  return (
    <div className="select-none">
      <div 
        className="flex items-center py-1 px-2 hover:bg-soma-border/30 cursor-pointer transition-colors"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={toggle}
      >
        <span className="mr-2 text-sm opacity-80">{getIcon()}</span>
        <span className="text-sm font-medium text-soma-text truncate">{node.name}</span>
      </div>
      {node.is_dir && isOpen && node.children && (
        <div>
          {node.children.map((child, idx) => (
            <FileTreeItem key={`${child.path}-${idx}`} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileExplorerWidget() {
  const { closeWidget } = useAppStore();
  const [tree, setTree] = useState<FileNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTree() {
      try {
        let home = '.';
        try {
          home = await homeDir();
        } catch (e) {
          console.warn('homeDir API failed, falling back to .');
        }
        const root: FileNode = await invoke('get_file_tree', { targetPath: home });
        setTree(root);
      } catch (err: any) {
        setError(err.toString());
      } finally {
        setLoading(false);
      }
    }
    loadTree();
  }, []);

  return (
    <div className="@container w-full h-full flex flex-col bg-soma-panel relative">
      <div className="h-10 flex items-center justify-between px-4 border-b border-soma-border shrink-0">
        <h2 className="text-sm font-medium text-soma-text truncate flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
          </svg>
          File Explorer
        </h2>
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

      <div className="grow overflow-y-auto p-2">
        {loading && <div className="text-sm text-soma-text-muted p-4 text-center animate-pulse">Loading workspace...</div>}
        {error && <div className="text-sm text-red-500 p-4 bg-red-900/20 rounded border border-red-900/50">{error}</div>}
        {!loading && !error && tree && (
          <div className="pb-8">
            <FileTreeItem node={tree} level={0} />
          </div>
        )}
      </div>
    </div>
  );
}
