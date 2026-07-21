import React, { useState, useEffect, useRef } from 'react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { TerminalCanvas } from './TerminalCanvas';
import { useAppStore } from '../store/useAppStore';
import type { TerminalSession } from '../store/useAppStore';

const TerminalLabel: React.FC<{
  session: TerminalSession;
  onChangeName: (id: string, name: string) => void;
  onClose: () => void;
  showClose: boolean;
}> = ({ session, onChangeName, onClose, showClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(session.name || session.id);
  const [isHoveringTop, setIsHoveringTop] = useState(false);

  const handleSave = () => {
    setIsEditing(false);
    if (editValue.trim() !== '') {
      onChangeName(session.id, editValue.trim());
    } else {
      setEditValue(session.name || session.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setEditValue(session.name || session.id);
      setIsEditing(false);
    }
  };

  const isVisible = isHoveringTop || isEditing;

  return (
    <>
      {/* Invisible Top Interaction Zone */}
      <div 
        className="absolute top-0 left-0 w-full h-1/4 z-20 pointer-events-none"
        onMouseEnter={() => setIsHoveringTop(true)}
        onMouseLeave={() => setIsHoveringTop(false)}
      >
        <div className="w-full h-full pointer-events-auto" />
      </div>

      <div 
        className={`absolute top-0 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 transition-all duration-300 bg-black/50 backdrop-blur-sm rounded-b-md ${isVisible ? 'opacity-70 hover:opacity-100' : 'opacity-0 pointer-events-none'}`}
        onMouseEnter={() => setIsHoveringTop(true)}
        onMouseLeave={() => setIsHoveringTop(false)}
      >
        {isEditing ? (
          <input
            autoFocus
            className="px-2 py-0.5 bg-zinc-800/80 text-zinc-300 rounded text-xs border border-blue-500 shadow outline-none pointer-events-auto min-w-[100px]"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <div 
            onClick={() => setIsEditing(true)}
            className="px-2 py-0.5 text-zinc-300 hover:text-white cursor-text text-xs font-medium flex items-center transition-colors pointer-events-auto"
            title="Click to rename"
          >
            {session.name || session.id}
          </div>
        )}
        {showClose && (
          <button 
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-red-400 rounded hover:bg-zinc-800/80 transition-colors pointer-events-auto"
            title="Close Terminal"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </div>
    </>
  );
};

export const TerminalGrid: React.FC = () => {
  const { terminals, activeTerminalId, setActiveTerminalId, addTerminal, renameTerminal, closeTerminal } = useAppStore();
  const [containerWidth, setContainerWidth] = useState<number>(1000);
  const [showBadge, setShowBadge] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
        setShowBadge(true);
        
        if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = setTimeout(() => {
          setShowBadge(false);
        }, 3000);
      }
    });
    
    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handleInteraction = () => {
      if (showBadge) {
        setShowBadge(false);
      }
    };

    window.addEventListener('keydown', handleInteraction, { capture: true });
    window.addEventListener('mousedown', handleInteraction, { capture: true });

    return () => {
      window.removeEventListener('keydown', handleInteraction, { capture: true });
      window.removeEventListener('mousedown', handleInteraction, { capture: true });
    };
  }, [showBadge]);

  const isSmallScreen = containerWidth < 600;
  const visibleTerminals = isSmallScreen ? terminals.slice(0, 1) : terminals;
  const hiddenCount = terminals.length - visibleTerminals.length;

  const renderTerminal = (session: TerminalSession) => (
    <div 
      key={session.id} 
      className={`flex flex-col w-full h-full relative bg-soma-bg transition-colors duration-200 ${activeTerminalId === session.id ? 'ring-1 ring-inset ring-soma-accent' : ''}`}
      onClick={() => setActiveTerminalId(session.id)}
      onFocusCapture={() => setActiveTerminalId(session.id)}
    >
      <TerminalLabel 
        session={session}
        onChangeName={renameTerminal}
        onClose={() => closeTerminal(session.id)}
        showClose={terminals.length > 1}
      />
      <TerminalCanvas id={session.id} />
    </div>
  );

  const renderResizeHandle = () => (
    <PanelResizeHandle className="w-[2px] h-full bg-zinc-900 hover:bg-blue-500/50 active:bg-blue-500 transition-colors cursor-col-resize z-50 relative" />
  );

  const renderHorizontalResizeHandle = () => (
    <PanelResizeHandle className="h-[2px] w-full bg-zinc-900 hover:bg-blue-500/50 active:bg-blue-500 transition-colors cursor-row-resize z-50 relative" />
  );

  const renderLayout = () => {
    if (visibleTerminals.length === 1) {
      return renderTerminal(visibleTerminals[0]);
    }

    if (visibleTerminals.length === 2) {
      return (
        <PanelGroup orientation="horizontal">
          <Panel minSize={20}>{renderTerminal(visibleTerminals[0])}</Panel>
          {renderResizeHandle()}
          <Panel minSize={20}>{renderTerminal(visibleTerminals[1])}</Panel>
        </PanelGroup>
      );
    }

    if (visibleTerminals.length === 3) {
      return (
        <PanelGroup orientation="horizontal">
          <Panel minSize={20}>
            <PanelGroup orientation="vertical">
              <Panel minSize={20}>{renderTerminal(visibleTerminals[0])}</Panel>
              {renderHorizontalResizeHandle()}
              <Panel minSize={20}>{renderTerminal(visibleTerminals[1])}</Panel>
            </PanelGroup>
          </Panel>
          {renderResizeHandle()}
          <Panel minSize={20}>{renderTerminal(visibleTerminals[2])}</Panel>
        </PanelGroup>
      );
    }

    if (visibleTerminals.length === 4) {
      return (
        <PanelGroup orientation="horizontal">
          <Panel minSize={20}>
            <PanelGroup orientation="vertical">
              <Panel minSize={20}>{renderTerminal(visibleTerminals[0])}</Panel>
              {renderHorizontalResizeHandle()}
              <Panel minSize={20}>{renderTerminal(visibleTerminals[1])}</Panel>
            </PanelGroup>
          </Panel>
          {renderResizeHandle()}
          <Panel minSize={20}>
            <PanelGroup orientation="vertical">
              <Panel minSize={20}>{renderTerminal(visibleTerminals[2])}</Panel>
              {renderHorizontalResizeHandle()}
              <Panel minSize={20}>{renderTerminal(visibleTerminals[3])}</Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      );
    }

    return null;
  };

  return (
    <div ref={containerRef} className="w-full h-full relative bg-soma-bg">
      {renderLayout()}

      {/* Action Buttons Overlay */}
      <div className="absolute bottom-4 right-4 z-50 flex gap-2">
        {terminals.length < 4 && (
          <button 
            onClick={addTerminal}
            className="w-10 h-10 flex items-center justify-center bg-zinc-800 text-zinc-300 rounded-full border border-zinc-700 shadow-lg cursor-pointer transition-all duration-300 opacity-20 hover:opacity-100 hover:bg-zinc-700"
            title="Add Terminal"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        )}
      </div>

      {/* Hidden terminals badge */}
      {hiddenCount > 0 && (
        <>
          <div 
            className="absolute bottom-0 left-0 w-32 h-24 z-40"
            onMouseEnter={() => setShowBadge(true)}
            onMouseLeave={() => setShowBadge(false)}
          />
          <div className={`absolute bottom-4 left-4 z-50 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500/70 text-xs font-semibold rounded-full shadow-lg backdrop-blur-sm pointer-events-none transition-opacity duration-300 ${showBadge ? 'opacity-100' : 'opacity-0'}`}>
            +{hiddenCount} hidden
          </div>
        </>
      )}
    </div>
  );
};
