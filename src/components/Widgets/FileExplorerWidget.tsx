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

function FileTreeItem({ node, level, onUpdateNode, onContextMenuNode, onSelectNode, selectedPaths = [], showRelativePath = false }: { node: FileNode; level: number; onUpdateNode: (path: string, updates: Partial<FileNode>) => void, onContextMenuNode?: (e: React.MouseEvent, path: string) => void, onSelectNode?: (e: React.MouseEvent, path: string, is_dir?: boolean) => void, selectedPaths?: string[], showRelativePath?: boolean }) {
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
        className={`flex items-center py-1 px-2 hover:bg-soma-border/30 cursor-pointer transition-colors group ${selectedPaths.includes(node.path) ? 'bg-soma-border/50' : ''}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={(e) => {
          if (onSelectNode) onSelectNode(e, node.path, node.is_dir);
          toggle(e);
        }}
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
        <div className="flex flex-col overflow-hidden">
          <span className="text-sm text-soma-text truncate">{node.name}</span>
          {showRelativePath && (
            <span className="text-[10px] text-gray-500 truncate mt-[-2px]">{node.path.split(/[/\\]/).slice(0, -1).join('/') || '/'}</span>
          )}
        </div>
      </div>
      {node.is_dir && isExpanded && node.children && (
        <div>
          {node.children.length === 0 ? (
            <div className="py-1 text-xs text-soma-text-muted italic opacity-50 select-none" style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}>
              Empty folder
            </div>
          ) : (
            node.children.map((child, idx) => (
              <FileTreeItem key={`${child.path}-${idx}`} node={child} level={level + 1} onUpdateNode={onUpdateNode} onContextMenuNode={onContextMenuNode} onSelectNode={onSelectNode} selectedPaths={selectedPaths} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function FileExplorerWidget() {
  const { closeWidget, addContextFile, removeContextFile, stagedContextFiles, setActiveWidget, createSession, setActiveSession, selectedAgentId, activeSessionId, isContextPickerMode, setContextPickerMode } = useAppStore();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string } | null>(null);
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [tree, setTree] = useState<FileNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rootPath, setRootPath] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FileNode[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  useEffect(() => {
    return () => {
      setContextPickerMode(false);
    };
  }, [setContextPickerMode]);

  useEffect(() => {
    if (!searchQuery.trim() || !rootPath) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await invoke<FileNode[]>('search_files', { targetPath: rootPath, query: searchQuery });
        setSearchResults(results);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, rootPath]);

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

  const handleSelectNode = (e: React.MouseEvent, path: string, is_dir?: boolean) => {
    e.stopPropagation();
    
    if (isContextPickerMode) {
      if (is_dir === false) {
        if (stagedContextFiles.includes(path)) {
          removeContextFile(path);
        } else {
          addContextFile(path);
        }
      }
      return;
    }
    
    if (e.metaKey || e.ctrlKey) {
      setSelectedPaths(prev => 
        prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
      );
    } else {
      setSelectedPaths([path]);
    }
  };

  const handleContextMenuNode = (e: React.MouseEvent, path: string) => {
    if (!selectedPaths.includes(path)) {
      setSelectedPaths([path]);
    }
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      path,
    });
    setShowSubMenu(false);
  };

  useEffect(() => {
    const closeMenu = () => {
      setContextMenu(null);
      setShowSubMenu(false);
    };
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const handleAddContext = (e: React.MouseEvent, target: 'active' | 'new') => {
    e.stopPropagation();
    if (contextMenu) {
      if (target === 'new') {
        if (selectedAgentId) {
          const newSessionId = createSession(selectedAgentId);
          setActiveSession(newSessionId);
        }
      }
      selectedPaths.forEach(p => addContextFile(p));
      setContextMenu(null);
      setShowSubMenu(false);
      setActiveWidget({ type: 'agent' });
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

      <div className="px-3 py-2 border-b border-soma-border shrink-0 bg-soma-background/50 relative">
        <div className="relative flex items-center">
          <svg className="absolute left-2 text-soma-text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input 
            type="text" 
            placeholder="Search workspace..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-soma-border rounded-md pl-8 pr-3 py-1.5 text-xs text-soma-text focus:outline-none focus:border-soma-accent transition-colors"
          />
        </div>
      </div>

      <div className="grow overflow-y-auto p-2">
        {loading && !searchQuery && <div className="text-sm text-soma-text-muted p-4 text-center animate-pulse">Loading workspace...</div>}
        {isSearching && <div className="text-sm text-soma-text-muted p-4 text-center animate-pulse">Searching...</div>}
        {error && <div className="text-sm text-red-500 p-4 bg-red-900/20 rounded border border-red-900/50">{error}</div>}
        
        {searchQuery.trim() && !isSearching && searchResults.length === 0 && (
          <div className="text-xs text-soma-text-muted p-4 text-center">No results found for "{searchQuery}"</div>
        )}
        
        {searchQuery.trim() && searchResults.length > 0 && (
          <div className="pb-8">
            {searchResults.map((node, idx) => (
              <FileTreeItem 
                key={`${node.path}-${idx}`} 
                node={node} 
                level={0} 
                onUpdateNode={handleUpdateNode} 
                onContextMenuNode={handleContextMenuNode} 
                onSelectNode={handleSelectNode} 
                selectedPaths={selectedPaths} 
                showRelativePath={true}
              />
            ))}
          </div>
        )}

        {!searchQuery.trim() && !loading && !error && tree && (
          <div className="pb-8">
            <FileTreeItem node={tree} level={0} onUpdateNode={handleUpdateNode} onContextMenuNode={handleContextMenuNode} onSelectNode={handleSelectNode} selectedPaths={selectedPaths} />
          </div>
        )}
      </div>

      {contextMenu && (
        <div 
          className="fixed z-50 bg-soma-panel border border-soma-border rounded shadow-md py-1 min-w-[160px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center w-full relative">
            <button 
              className="flex-1 text-left px-3 py-1 text-sm text-soma-text hover:bg-soma-border transition-colors flex items-center gap-2"
              onClick={(e) => handleAddContext(e, 'active')}
            >
              ✨ Send to Agent
            </button>
            <button 
              className="px-2 py-1 text-soma-text hover:bg-soma-border transition-colors border-l border-soma-border/50"
              onClick={(e) => { e.stopPropagation(); setShowSubMenu(!showSubMenu); }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>

            {showSubMenu && (
              <div className="absolute top-0 left-full ml-1 bg-soma-panel border border-soma-border rounded shadow-md py-1 min-w-[140px]">
                 <button 
                   className="w-full text-left px-3 py-1 text-sm text-soma-text hover:bg-soma-border transition-colors"
                   onClick={(e) => handleAddContext(e, 'active')}
                 >
                   Active Chat
                 </button>
                 <button 
                   className="w-full text-left px-3 py-1 text-sm text-soma-text hover:bg-soma-border transition-colors"
                   onClick={(e) => handleAddContext(e, 'new')}
                 >
                   New Chat
                 </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
