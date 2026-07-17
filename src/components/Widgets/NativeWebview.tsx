import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface NativeWebviewProps {
  id: string;
  url: string;
}

const createdWebViews = new Set<string>();

export function NativeWebview({ id, url }: NativeWebviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(false);

  useEffect(() => {
    let animationFrameId: number;
    let observer: ResizeObserver | null = null;
    let currentRect: DOMRect | null = null;

    const syncWebview = async (rect: DOMRect) => {
      if (!createdWebViews.has(id)) {
        // Initial create
        try {
          await invoke('create_webview', { 
            id, 
            url, 
            x: rect.x, 
            y: rect.y, 
            width: rect.width, 
            height: rect.height 
          });
          createdWebViews.add(id);
          isMounted.current = true;
        } catch (e) {
          console.error("Failed to create native webview:", e);
        }
      } else {
        // Update
        try {
          await invoke('update_webview', {
            id,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          });
        } catch (e) {
          console.error("Failed to update native webview:", e);
        }
      }
    };

    const handleResize = () => {
      if (containerRef.current) {
        currentRect = containerRef.current.getBoundingClientRect();
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(() => {
          if (currentRect) syncWebview(currentRect);
        });
      }
    };

    if (containerRef.current) {
      observer = new ResizeObserver(() => {
        handleResize();
      });
      observer.observe(containerRef.current);
      window.addEventListener('resize', handleResize);
      
      // Initial sync just in case observer is slow
      handleResize();
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener('resize', handleResize);
      
      // Hide webview instead of destroying it so audio persists
      invoke('hide_webview', { id }).catch(console.error);
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="h-10 shrink-0 bg-transparent" />
      <div ref={containerRef} className="flex-1 bg-transparent w-full" />
      <div className="h-10 flex items-center justify-center gap-6 border-t border-white/10 bg-transparent shrink-0">
        <button onClick={() => invoke('webview_back', { id })} className="text-gray-400 hover:text-white transition-colors" title="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <button onClick={() => invoke('webview_forward', { id })} className="text-gray-400 hover:text-white transition-colors" title="Forward">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
        <button onClick={() => invoke('webview_reload', { id })} className="text-gray-400 hover:text-white transition-colors" title="Reload">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
        </button>
        <button onClick={() => invoke('webview_open_devtools', { id })} className="text-gray-400 hover:text-white transition-colors" title="Developer Tools">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5"></polyline>
            <line x1="12" y1="19" x2="20" y2="19"></line>
          </svg>
        </button>
      </div>
    </div>
  );
}
