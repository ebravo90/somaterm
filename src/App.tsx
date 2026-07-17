import { useState, useRef, useEffect } from 'react';
import { TerminalCanvas } from './components/TerminalCanvas';
import { useAppStore } from './store/useAppStore';
import { WebWidget } from './components/Widgets/WebWidget';

function App() {
  const activeWidget = useAppStore(state => state.activeWidget);
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
    <div className="w-screen h-screen bg-soma-bg text-soma-text overflow-hidden flex flex-row">
      <div 
        style={{ width: activeWidget ? `${terminalWidth}%` : '100%' }}
        className="h-full shrink-0"
      >
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
          <WebWidget url={activeWidget.url} />
        </div>
      )}
    </div>
  );
}

export default App;
