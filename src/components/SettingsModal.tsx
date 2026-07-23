import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';

type SettingsTab = 'Environment' | 'QA & Debug' | 'Web Manager';

export const SettingsModal: React.FC = () => {
  const { isSettingsOpen, toggleSettings, isDebugModeEnabled, setDebugMode, settings, updateSettings } = useAppStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('Environment');

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

  const tabs: SettingsTab[] = ['Environment', 'QA & Debug', 'Web Manager'];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md"
      onClick={toggleSettings}
    >
      <div 
        className="w-[95%] max-w-4xl h-[80vh] max-h-[800px] bg-zinc-900 rounded-xl shadow-2xl overflow-hidden border border-zinc-800 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0 bg-zinc-950/50">
          <h2 className="text-lg font-semibold text-zinc-100">Somaterm Settings</h2>
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
        
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 bg-zinc-950/30 border-r border-zinc-800/50 flex flex-col p-4 gap-2 shrink-0">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-left px-4 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                  activeTab === tab 
                    ? 'bg-blue-500/10 text-blue-400' 
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-2xl">
              
              {activeTab === 'Environment' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <section>
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-6">Shell Configuration</h3>
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-zinc-800/50 pb-6">
                        <div className="pr-8">
                          <div className="text-zinc-200 font-medium">Use System PATH</div>
                          <div className="text-zinc-400 text-sm mt-1">Automatically inherit macOS GUI paths and user shims for terminal execution.</div>
                        </div>
                        <Toggle 
                          checked={settings.environment.useSystemPath} 
                          onChange={(val) => updateSettings('environment', { useSystemPath: val })} 
                        />
                      </div>

                      <div className="flex items-center justify-between border-b border-zinc-800/50 pb-6">
                        <div className="pr-8">
                          <div className="text-zinc-200 font-medium">Default Shell</div>
                          <div className="text-zinc-400 text-sm mt-1">Command used when spawning a new terminal.</div>
                        </div>
                        <select 
                          value={settings.environment.defaultShell}
                          onChange={(e) => updateSettings('environment', { defaultShell: e.target.value })}
                          className="bg-zinc-800 text-zinc-200 text-sm rounded-md border border-zinc-700 px-3 py-1.5 focus:outline-none focus:border-blue-500 outline-none"
                        >
                          <option value="zsh">zsh</option>
                          <option value="bash">bash</option>
                          <option value="sh">sh</option>
                        </select>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {activeTab === 'QA & Debug' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <section>
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-6">Diagnostic Tools</h3>
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-zinc-800/50 pb-6">
                        <div className="pr-8">
                          <div className="text-zinc-200 font-medium">Developer Debug Mode</div>
                          <div className="text-zinc-400 text-sm mt-1">Enable verbose logging and advanced developer tools for agents and webviews.</div>
                        </div>
                        <Toggle 
                          checked={isDebugModeEnabled} 
                          onChange={(val) => setDebugMode(val)} 
                        />
                      </div>

                      <div className="flex items-center justify-between border-b border-zinc-800/50 pb-6">
                        <div className="pr-8">
                          <div className="text-zinc-200 font-medium">Log Level Threshold</div>
                          <div className="text-zinc-400 text-sm mt-1">Minimum severity required to write logs to the internal console.</div>
                        </div>
                        <select 
                          value={settings.qa.logLevel}
                          onChange={(e) => updateSettings('qa', { logLevel: e.target.value })}
                          className="bg-zinc-800 text-zinc-200 text-sm rounded-md border border-zinc-700 px-3 py-1.5 focus:outline-none focus:border-blue-500 outline-none"
                        >
                          <option value="info">Info</option>
                          <option value="debug">Debug</option>
                          <option value="error">Error</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between border-b border-zinc-800/50 pb-6">
                        <div className="pr-8">
                          <div className="text-zinc-200 font-medium">Disable GUI Animations</div>
                          <div className="text-zinc-400 text-sm mt-1">Strip transition timings to optimize Playwright E2E testing speed and stability.</div>
                        </div>
                        <Toggle 
                          checked={settings.qa.disableAnimations} 
                          onChange={(val) => updateSettings('qa', { disableAnimations: val })} 
                        />
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {activeTab === 'Web Manager' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <section>
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-6">Webview Lifecycle</h3>
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-zinc-800/50 pb-6">
                        <div className="pr-8">
                          <div className="text-zinc-200 font-medium">Tab Hibernation Timeout</div>
                          <div className="text-zinc-400 text-sm mt-1">Minutes of inactivity before background tabs are suspended to save RAM. (Audio-playing tabs are exempt).</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            min="1" 
                            max="60"
                            value={settings.webManager.tabHibernationTimeout}
                            onChange={(e) => updateSettings('webManager', { tabHibernationTimeout: Number(e.target.value) || 5 })}
                            className="bg-zinc-800 text-zinc-200 text-sm rounded-md border border-zinc-700 px-3 py-1.5 w-20 focus:outline-none focus:border-blue-500 outline-none"
                          />
                          <span className="text-zinc-500 text-sm">min</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-b border-zinc-800/50 pb-6">
                        <div className="pr-8">
                          <div className="text-zinc-200 font-medium">Show Token Telemetry</div>
                          <div className="text-zinc-400 text-sm mt-1">Display an overlay of active authentication tokens within internal sub-frames.</div>
                        </div>
                        <Toggle 
                          checked={settings.webManager.showTokenTelemetry} 
                          onChange={(val) => updateSettings('webManager', { showTokenTelemetry: val })} 
                        />
                      </div>
                    </div>
                  </section>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Reusable Toggle Component
const Toggle: React.FC<{ checked: boolean; onChange: (checked: boolean) => void }> = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
      checked ? 'bg-blue-500' : 'bg-zinc-600'
    }`}
    role="switch"
    aria-checked={checked}
  >
    <span className="sr-only">Toggle</span>
    <span
      aria-hidden="true"
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);
