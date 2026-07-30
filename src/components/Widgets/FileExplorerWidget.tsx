import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { invoke } from '@tauri-apps/api/core';
import { dirname } from '@tauri-apps/api/path';

interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileNode[];
}

function FileTreeItem({ node, level, onUpdateNode }: { node: FileNode; level: number; onUpdateNode: (path: string, children: FileNode[]) => void }) {
  const [isOpen, setIsOpen] = useState(level === 0);
  const [loading, setLoading] = useState(false);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.is_dir) {
      if (!isOpen && node.children === undefined) {
        setLoading(true);
        try {
          const root: FileNode = await invoke('get_file_tree', { targetPath: node.path, maxDepth: 1 });
          onUpdateNode(node.path, root.children || []);
        } catch (err) {
          console.error('Failed to fetch children', err);
        } finally {
          setLoading(false);
        }
      }
      setIsOpen(!isOpen);
    }
  };

  const getIcon = () => {
    if (loading) return '⏳';
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
            <FileTreeItem key={`${child.path}-${idx}`} node={child} level={level + 1} onUpdateNode={onUpdateNode} />
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
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    async function loadInitial() {
      try {
        let cwd = '.';
        try {
          const res = await invoke<string>('get_initial_cwd');
          if (typeof res === 'string') {
            cwd = res;
          }
        } catch (e) {
          console.warn('get_initial_cwd API failed, falling back to .');
        }
        setRootPath(cwd);
      } catch (err: any) {
        setError(err.toString());
      }
    }
    loadInitial();
  }, []);

  useEffect(() => {
    if (!rootPath) return;
    
    async function loadTree() {
      setLoading(true);
      setError(null);
      try {
        const root: FileNode = await invoke('get_file_tree', { targetPath: rootPath, maxDepth: 1 });
        setTree(root);
      } catch (err: any) {
        setError(err.toString());
      } finally {
        setLoading(false);
      }
    }
    loadTree();
  }, [rootPath]);

  const handleGoUp = async () => {
    if (!rootPath) return;
    try {
      if (rootPath === '/' || rootPath === 'C:\\') return;
      
      let parent = '';
      try {
        const res = await dirname(rootPath);
        if (typeof res === 'string') {
          parent = res;
        } else {
          throw new Error('mock fallback');
        }
      } catch (e) {
        // mock fallback
        parent = rootPath.substring(0, rootPath.lastIndexOf('/')) || '/';
      }
      setRootPath(parent);
    } catch (e) {
      console.error("Failed to get dirname", e);
    }
  };

  const handleUpdateNode = (path: string, newChildren: FileNode[]) => {
    setTree(prev => {
      if (!prev) return prev;
      
      const updateNode = (node: FileNode): FileNode => {
        if (node.path === path) {
          return { ...node, children: newChildren };
        }
        if (node.children) {
          return { ...node, children: node.children.map(updateNode) };
        }
        return node;
      };
      
      return updateNode(prev);
    });
  };

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
      
      <div className="h-10 flex items-center px-4 border-b border-soma-border shrink-0 bg-soma-background/50 relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-1.5 text-sm font-medium text-soma-text hover:text-white truncate cursor-pointer transition-colors max-w-full"
          title={rootPath || ''}
          aria-label="Workspace Dropdown"
        >
          <span className="truncate">{rootPath ? rootPath.split(/[/\\]/).pop() || rootPath : 'Loading...'}</span>
          <span className="text-[10px] opacity-70">▼</span>
        </button>

        {isDropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
            <div className="absolute top-10 left-4 z-50 mt-1 min-w-[200px] bg-soma-panel border border-soma-border rounded shadow-xl py-1">
              <button
                onClick={() => {
                  handleGoUp();
                  setIsDropdownOpen(false);
                }}
                disabled={rootPath === '/' || rootPath === 'C:\\'}
                aria-label="Go Up"
                className="w-full text-left px-3 py-1.5 text-sm text-soma-text hover:bg-soma-border transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span className="opacity-80">📁</span>
                <span>...</span>
              </button>
            </div>
          </>
        )}
      </div>

      <div className="grow overflow-y-auto p-2">
        {loading && <div className="text-sm text-soma-text-muted p-4 text-center animate-pulse">Loading workspace...</div>}
        {error && <div className="text-sm text-red-500 p-4 bg-red-900/20 rounded border border-red-900/50">{error}</div>}
        {!loading && !error && tree && (
          <div className="pb-8">
            <FileTreeItem node={tree} level={0} onUpdateNode={handleUpdateNode} />
          </div>
        )}
      </div>
    </div>
  );
}
