import { useAppStore } from '../../../store/useAppStore';
import type { AgentProfile } from '../../../store/useAppStore';

export interface ChatInputAreaProps {
  input: string;
  setInput: (val: string) => void;
  handleSend: () => void;
  selectedAgentId: string | null;
  onlineAgents: AgentProfile[];
}

export function ChatInputArea({ input, setInput, handleSend, selectedAgentId, onlineAgents }: ChatInputAreaProps) {
  const store = useAppStore();
  
  return (
    <div className="relative flex flex-col gap-2 w-full">
      <div className="relative flex items-center bg-[#1e1e1e] border border-soma-border rounded-full shadow-inner focus-within:border-soma-accent transition-colors">
        <button 
          type="button"
          onClick={() => {
            console.log("Context picker activated, switching to File Explorer");
            store.setContextPickerMode(true);
            store.setActiveWidget({ type: 'file_explorer' });
          }}
          className="absolute left-1.5 w-7 h-7 flex items-center justify-center rounded-full text-soma-text-muted hover:bg-soma-border/50 hover:text-soma-text transition-colors cursor-pointer z-10"
          title="Add Context Files"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <input 
          type="text" 
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask the agent..."
          disabled={!selectedAgentId || onlineAgents.length === 0}
          className="w-full bg-transparent rounded-full pl-10 pr-10 py-2.5 text-sm text-soma-text focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
        
        {store.isGenerating ? (
          <button
            onClick={() => store.stopGeneration()}
            className="absolute right-1.5 w-7 h-7 flex items-center justify-center rounded-full hover:bg-soma-border/50 transition-colors cursor-pointer z-10 group"
            title="Stop Generation"
          >
            <div className="w-3 h-3 bg-soma-text-muted group-hover:bg-red-500 rounded-[2px] transition-colors"></div>
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!selectedAgentId || onlineAgents.length === 0 || (!input.trim() && store.stagedContextFiles.length === 0)}
            className="absolute right-1.5 w-7 h-7 flex items-center justify-center rounded-full bg-soma-accent hover:bg-soma-accent/80 text-white transition-colors cursor-pointer z-10 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Send Message"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        )}
      </div>
      {onlineAgents.length === 0 && (
        <div className="text-[10px] text-red-400 pl-2">
          No verified agents. Go to Settings to configure an agent.
        </div>
      )}
    </div>
  );
}
