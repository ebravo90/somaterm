import { useState, useRef, useEffect } from 'react';
import { TerminalCanvas } from './components/TerminalCanvas';
import { useAppStore } from './store/useAppStore';
import { WebWidget } from './components/Widgets/WebWidget';
import { AgentWidget } from './components/Widgets/AgentWidget';

function App() {
  const activeWidget = useAppStore(state => state.activeWidget);
  const hasUnread = useAppStore(state => state.hasUnread);
  const [terminalWidth, setTerminalWidth] = useState(66.66); // percentage
  const isDragging = useRef(false);
  const [isDraggingState, setIsDraggingState] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      
      // If the left mouse button is no longer pressed (e.g. released outside window)
      if (e.buttons !== 1) {
        isDragging.current = false;
        setIsDraggingState(false);
        document.body.style.cursor = 'default';
        return;
      }
      
      const newWidth = (e.clientX / window.innerWidth) * 100;
      if (newWidth >= 20 && newWidth <= 90) {
        setTerminalWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      isDragging.current = false;
      setIsDraggingState(false);
      document.body.style.cursor = 'default';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-soma-bg text-soma-text overflow-hidden flex flex-row relative">
      <div 
        style={{ width: activeWidget ? `${terminalWidth}%` : '100%' }}
        className="h-full shrink-0 relative"
      >
        {/* Floating Agent Toggle */}
        <div className="absolute top-4 right-4 z-[100] transition-opacity duration-300">
          <button 
            onClick={() => {
              const store = useAppStore.getState();
              if (store.activeWidget?.type === 'agent') {
                store.closeWidget();
              } else {
                store.setActiveWidget({ type: 'agent' });
                store.setHasUnread(false);
              }
            }}
            className={`p-2 rounded-md transition-colors shadow-lg cursor-pointer bg-blue-600/30 hover:bg-blue-600/60 backdrop-blur-md text-blue-100 relative ${
              activeWidget?.type === 'agent' 
                ? 'ring-2 ring-blue-400/50' 
                : ''
            }`}
            title="Toggle AI Agent"
          >
            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-soma-bg" />
            )}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"></path>
            </svg>
          </button>
        </div>
        <TerminalCanvas />
      </div>
      
      {activeWidget && (
        <div 
          className="w-1 bg-soma-border hover:bg-gray-700 transition-colors cursor-col-resize shrink-0 z-50 relative"
          onMouseDown={() => {
            isDragging.current = true;
            setIsDraggingState(true);
            document.body.style.cursor = 'col-resize';
          }}
        />
      )}
      
      {activeWidget && (
        <div 
          style={{ 
            width: `calc(${100 - terminalWidth}% - 4px)`,
            pointerEvents: isDraggingState ? 'none' : 'auto' 
          }}
          className="h-full shrink-0"
        >
          {activeWidget.type === 'webview' ? (
            <WebWidget url={activeWidget.url} />
          ) : (
            <AgentWidget />
          )}
        </div>
      )}
    </div>
  );
}

export default App;
