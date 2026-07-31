import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { invoke } from '@tauri-apps/api/core';
import { dirname } from '@tauri-apps/api/path';

interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileNode[];
  isExpanded?: boolean;
}

function FileTreeItem({ node, level, onUpdateNode, onContextMenuNode }: { node: FileNode; level: number; onUpdateNode: (path: string, updates: Partial<FileNode>) => void, onContextMenuNode?: (e: React.MouseEvent, path: string) => void }) {
  const [loading, setLoading] = useState(false);
  const isExpanded = level === 0 || !!node.isExpanded;

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.is_dir) {
      if (!isExpanded && !node.children) {
        setLoading(true);
        try {
          const root: FileNode = await invoke('get_file_tree', { targetPath: node.path, maxDepth: 1 });
          console.log('Fetched children:', root.children);
          onUpdateNode(node.path, { children: root.children || [], isExpanded: true });
        } catch (err) {
          console.error(`Failed to fetch children for path: ${node.path}`, err);
        } finally {
          setLoading(false);
        }
      } else {
        onUpdateNode(node.path, { isExpanded: !isExpanded });
      }
    }
  };

  const getIcon = () => {
    if (loading) return '⏳';
    if (node.is_dir) return isExpanded ? '📂' : '📁';
    if (node.name.endsWith('.rs')) return '🦀';
    if (node.name.endsWith('.ts') || node.name.endsWith('.tsx')) return '📘';
    if (node.name.endsWith('.md')) return '📝';
    return '📄';
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!node.is_dir && onContextMenuNode) {
      e.preventDefault();
      onContextMenuNode(e, node.path);
    }
  };

  return (
    <div className="select-none">
      <div 
        className="flex items-center py-1 px-2 hover:bg-soma-border/30 cursor-pointer transition-colors group"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={toggle}
        onContextMenu={handleContextMenu}
      >
        <div className="w-4 h-4 flex items-center justify-center mr-1 shrink-0">
          {node.is_dir && (
            <svg 
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform duration-200 text-soma-text-muted group-hover:text-soma-text ${isExpanded ? 'rotate-90' : ''}`}
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          )}
        </div>
        <span className="mr-1.5 text-sm opacity-80">{getIcon()}</span>
        <span className="text-sm text-soma-text truncate">{node.name}</span>
      </div>
      {node.is_dir && isExpanded && node.children && (
        <div>
          {node.children.length === 0 ? (
            <div className="py-1 text-xs text-soma-text-muted italic opacity-50 select-none" style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}>
              Empty folder
            </div>
          ) : (
            node.children.map((child, idx) => (
              <FileTreeItem key={`${child.path}-${idx}`} node={child} level={level + 1} onUpdateNode={onUpdateNode} onContextMenuNode={onContextMenuNode} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function FileExplorerWidget() {
  const { closeWidget, addContextFile, setActiveWidget } = useAppStore();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string } | null>(null);
  const [tree, setTree] = useState<FileNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rootPath, setRootPath] = useState<string | null>(null);

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

  const loadTree = async () => {
    if (!rootPath) return;
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
  };

  useEffect(() => {
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

  const handleUpdateNode = (path: string, updates: Partial<FileNode>) => {
    setTree(prev => {
      if (!prev) return prev;
      
      const updateNodeInTree = (node: FileNode): FileNode => {
        if (node.path === path) {
          return { ...node, ...updates };
        }
        if (node.children) {
          let changed = false;
          const updatedChildren = node.children.map(child => {
            const updatedChild = updateNodeInTree(child);
            if (updatedChild !== child) {
              changed = true;
            }
            return updatedChild;
          });
          if (changed) {
            return { ...node, children: updatedChildren };
          }
        }
        return node;
      };
      
      return updateNodeInTree(prev);
    });
  };

  const handleContextMenuNode = (e: React.MouseEvent, path: string) => {
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      path,
    });
  };

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const handleAddContext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (contextMenu) {
      addContextFile(contextMenu.path);
      setContextMenu(null);
      setActiveWidget({ type: 'ai_chat' });
    }
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
      
      <div className="h-9 flex items-center justify-between px-3 border-b border-soma-border shrink-0 bg-soma-background/50 relative">
        <span className="truncate flex-1 text-xs text-soma-text-muted font-semibold uppercase tracking-wider mr-2">
          {rootPath ? rootPath.split(/[/\\]/).pop() || rootPath : 'WORKSPACE'}
        </span>
        <div className="flex items-center gap-1">
          <button 
            onClick={handleGoUp} 
            disabled={rootPath === '/' || rootPath === 'C:\\'} 
            className="p-1 text-soma-text-muted hover:text-soma-text hover:bg-soma-border rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors" 
            title="Go Up"
            aria-label="Go Up"
          >
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          </button>
          <button 
            onClick={loadTree} 
            className="p-1 text-soma-text-muted hover:text-soma-text hover:bg-soma-border rounded transition-colors" 
            title="Refresh"
          >
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6M3 12a9 9 0 1 0 2.6-6.4L2 8"/></svg>
          </button>
          <button 
            className="p-1 text-soma-text-muted hover:text-soma-text hover:bg-soma-border rounded transition-colors opacity-50 cursor-not-allowed" 
            title="New File (Coming Soon)"
          >
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
          </button>
          <button 
            className="p-1 text-soma-text-muted hover:text-soma-text hover:bg-soma-border rounded transition-colors opacity-50 cursor-not-allowed" 
            title="New Folder (Coming Soon)"
          >
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
          </button>
        </div>
      </div>

      <div className="grow overflow-y-auto p-2">
        {loading && <div className="text-sm text-soma-text-muted p-4 text-center animate-pulse">Loading workspace...</div>}
        {error && <div className="text-sm text-red-500 p-4 bg-red-900/20 rounded border border-red-900/50">{error}</div>}
        {!loading && !error && tree && (
          <div className="pb-8">
            <FileTreeItem node={tree} level={0} onUpdateNode={handleUpdateNode} onContextMenuNode={handleContextMenuNode} />
          </div>
        )}
      </div>

      {contextMenu && (
        <div 
          className="fixed z-50 bg-soma-panel border border-soma-border rounded shadow-md py-1 min-w-[140px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="w-full text-left px-3 py-1 text-sm text-soma-text hover:bg-soma-border transition-colors flex items-center gap-2"
            onClick={handleAddContext}
          >
            ✨ Send to Agent
          </button>
        </div>
      )}
    </div>
  );
}
