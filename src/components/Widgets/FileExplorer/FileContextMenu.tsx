import React, { useState } from 'react';

export interface FileContextMenuProps {
  x: number;
  y: number;
  onAddContext: (e: React.MouseEvent, target: 'active' | 'new') => void;
}

export function FileContextMenu({ x, y, onAddContext }: FileContextMenuProps) {
  const [showSubMenu, setShowSubMenu] = useState(false);

  return (
    <div 
      className="fixed z-50 bg-soma-panel border border-soma-border rounded shadow-md py-1 min-w-[160px]"
      style={{ top: y, left: x }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center w-full relative">
        <button 
          className="flex-1 text-left px-3 py-1 text-sm text-soma-text hover:bg-soma-border transition-colors flex items-center gap-2"
          onClick={(e) => onAddContext(e, 'active')}
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
               onClick={(e) => onAddContext(e, 'active')}
             >
               Active Chat
             </button>
             <button 
               className="w-full text-left px-3 py-1 text-sm text-soma-text hover:bg-soma-border transition-colors"
               onClick={(e) => onAddContext(e, 'new')}
             >
               New Chat
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
