import React, { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

export const SettingsModal: React.FC = () => {
  const { isSettingsOpen, toggleSettings, isDebugModeEnabled, setDebugMode } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSettingsOpen) {
        toggleSettings();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, toggleSettings]);

  if (!isSettingsOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={toggleSettings}
    >
      <div 
        className="w-[90%] max-w-2xl max-h-[85vh] bg-zinc-900 rounded-xl shadow-2xl overflow-y-auto border border-zinc-800 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0">
          <h2 className="text-lg font-semibold text-zinc-100">Settings</h2>
          <button 
            onClick={toggleSettings}
            className="text-zinc-400 hover:text-zinc-100 transition-colors p-1 rounded hover:bg-zinc-800"
            aria-label="Close settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div className="p-6 grow overflow-y-auto">
          <section>
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Developer / Advanced</h3>
            <div className="flex items-center justify-between border-b border-zinc-800/50 pb-4 mb-4">
              <div>
                <div className="text-zinc-200 font-medium">Debug Mode</div>
                <div className="text-zinc-400 text-sm mt-1">Enable verbose logging and developer tools for the agent and webviews.</div>
              </div>
              <button
                onClick={() => setDebugMode(!isDebugModeEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                  isDebugModeEnabled ? 'bg-blue-500' : 'bg-zinc-600'
                }`}
                role="switch"
                aria-checked={isDebugModeEnabled}
              >
                <span className="sr-only">Toggle Debug Mode</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isDebugModeEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
