import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../../store/useAppStore';

interface NativeWebviewProps {
  id: string;
  url: string;
}

const createdWebViews = new Set<string>();

export const untrackWebView = (id: string) => {
  createdWebViews.delete(id);
};

export function NativeWebview({ id, url }: NativeWebviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(false);
  const removeWebView = useAppStore(state => state.removeWebView);
  const isSettingsOpen = useAppStore(state => state.isSettingsOpen);

  useEffect(() => {

    const syncWebview = async (rect: DOMRect) => {
      console.log("[DEBUG] React sending bounds to Rust:", { id, x: rect.x, y: rect.y, width: rect.width, height: rect.height });
      if (rect.width === 0 || rect.height === 0) return;
      if (!createdWebViews.has(id)) {
        // Initial create
        createdWebViews.add(id); // Add synchronously to prevent race conditions
        try {
          await invoke('create_webview', { 
            id, 
            url, 
            x: rect.x, 
            y: rect.y, 
            width: rect.width, 
            height: rect.height,
            heightOffset: 40.0
          });
          isMounted.current = true;
        } catch (e) {
          createdWebViews.delete(id); // Revert on failure
          console.error("Failed to create native webview:", e);
        }
      } else {
        // Update
        try {
          await invoke('resize_webview', {
            id,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            heightOffset: 40.0
          });
        } catch (e) {
          console.error("Failed to update native webview:", e);
        }
      }
    };

    let observer: ResizeObserver | null = null;
    let animationFrameId: number | null = null;

    if (containerRef.current) {
      observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
          }
          animationFrameId = requestAnimationFrame(() => {
            syncWebview(entry.target.getBoundingClientRect());
          });
        }
      });
      observer.observe(containerRef.current);
      
      // Initial sync
      syncWebview(containerRef.current.getBoundingClientRect());
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      // Hide webview instead of destroying it so audio persists
      invoke('hide_webview', { id }).catch(console.error);
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isSettingsOpen]); // Re-sync when settings toggle so it adjusts to visibility

  return (
    <div className={`@container flex flex-col h-full w-full pt-8 ${isSettingsOpen ? 'hidden' : ''}`}>
      <div className="flex-1 relative w-full min-h-0 bg-transparent">
        <div 
          ref={containerRef} 
          className="absolute inset-0 w-full h-full" 
        />
      </div>
      <div className="h-10 flex items-center justify-center gap-6 border-t border-white/10 bg-transparent shrink-0">
        <button onClick={() => invoke('webview_back', { id })} className="hidden @[250px]:block text-gray-400 hover:text-white transition-colors" title="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <button onClick={() => invoke('webview_forward', { id })} className="hidden @[250px]:block text-gray-400 hover:text-white transition-colors" title="Forward">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
        <button onClick={() => invoke('webview_reload', { id })} className="hidden @[250px]:block text-gray-400 hover:text-white transition-colors" title="Reload">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
        </button>
        <button onClick={() => invoke('webview_open_devtools', { id })} className="hidden @[250px]:block text-gray-400 hover:text-white transition-colors" title="Developer Tools">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5"></polyline>
            <line x1="12" y1="19" x2="20" y2="19"></line>
          </svg>
        </button>
        <button 
          onClick={() => {
            invoke('destroy_webview', { id }).catch(console.error);
            removeWebView(id);
          }} 
          className="text-gray-400 hover:text-red-400 transition-colors" 
          title="Close session"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  );
}
