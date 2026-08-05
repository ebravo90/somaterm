import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { FileNode } from './types';

export function FileTreeItem({ node, level, onUpdateNode, onContextMenuNode, onSelectNode, selectedPaths = [], showRelativePath = false }: { node: FileNode; level: number; onUpdateNode: (path: string, updates: Partial<FileNode>) => void, onContextMenuNode?: (e: React.MouseEvent, path: string) => void, onSelectNode?: (e: React.MouseEvent, path: string, is_dir?: boolean) => void, selectedPaths?: string[], showRelativePath?: boolean }) {
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
