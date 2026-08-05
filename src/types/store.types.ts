export type WidgetType = { type: 'webview' } | { type: 'agent' } | { type: 'web_manager' } | { type: 'file_explorer' } | { type: 'kanban' };

export interface TerminalSession {
  id: string;
  name?: string;
  activeProcess: boolean;
}

export type ChatMessage = { role: 'user' | 'assistant', content: string, meta?: string, attachments?: string[] };
export type WebViewItem = { id: string, url: string, hasUnread: boolean, isHibernated: boolean, isAudioPlaying?: boolean, lastActiveAt: number };
export type LogEntry = { id: string, timestamp: number, level: 'INFO' | 'WARN' | 'ERROR' | 'MEDIA' | 'SYSTEM', source: string, message: string };

export interface AppSettings {
  environment: {
    useSystemPath: boolean;
    defaultShell: string;
  };
  qa: {
    logLevel: 'info' | 'debug' | 'error';
    disableAnimations: boolean;
  };
  webManager: {
    tabHibernationTimeout: number; // in minutes
  };
  agents: {
    showTokenTelemetry: boolean;
  };
}

export interface AgentProfile {
  id: string;
  displayName: string;
  modelName: string;
  endpoint: string;
  apiKey?: string;
  status: 'offline' | 'online' | 'unknown' | 'checking';
  type?: 'local' | 'remote';
}

export interface ChatSession {
  id: string;
  agentId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  isGeneratingTitle?: boolean;
}

export interface Session {
  id: string;
  title: string;
  agentId: string | null;
  startDate: number;
  lastUsedDate: number;
  isPinned: boolean;
  messages: ChatMessage[];
  isGeneratingTitle?: boolean;
}

export interface TicketHistoryEvent {
  id: string;
  timestamp: number;
  actor: string;
  field: string;
  oldValue: string;
  newValue: string;
}

export interface TicketComment {
  id: string;
  timestamp: number;
  author: string;
  role: 'human' | 'agent';
  content: string;
}

export type TicketRelation = 'Blocks' | 'Blocked by' | 'Relates to';

export interface TicketLink {
  targetTicketId: string;
  relation: TicketRelation;
}

export interface KanbanTicket {
  id: string;
  title: string;
  status: 'Open' | 'Ready' | 'In Progress' | 'Blocked' | 'Testing' | 'UAT' | 'Done' | 'Canceled';
  description: string;
  acc?: string;
  dod?: string;
  type: 'Story' | 'Task' | 'Bug' | 'Spike' | 'Cycle';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  cycleId?: string;
  history: TicketHistoryEvent[];
  comments?: TicketComment[];
  links?: TicketLink[];
  reporter?: string;
  assignee?: string;
}

export interface KanbanCycle {
  id: string;
  name: string;
  status: 'Active' | 'On Hold' | 'Completed';
  targetDate?: string;
  description?: string;
}

export interface KanbanNavState {
  section: 'board' | 'cycles' | 'backlog' | 'all' | 'settings';
  selectedTicket: string | null;
  viewMode: 'preview' | 'full' | null;
}

export interface AppState {
  activeWidget: WidgetType | null;
  setActiveWidget: (widget: WidgetType | null) => void;
  closeWidget: () => void;
  
  webViews: WebViewItem[];
  activeWebId: string | null;
  addWebView: (url: string) => void;
  removeWebView: (id: string) => void;
  updateWebViewUrl: (id: string, newUrl: string) => void;
  setWebViewUnread: (id: string, hasUnread: boolean) => void;
  setWebViewHibernated: (id: string, hibernated: boolean) => void;
  setWebViewAudioStatus: (id: string, isPlaying: boolean) => void;
  receiveHeartbeat: (id: string, isPlaying: boolean, currentUrl: string) => void;
  setActiveWebId: (id: string) => void;

  isWidgetPanelOpen: boolean;
  toggleWidgetPanel: () => void;
  setWidgetPanelOpen: (isOpen: boolean) => void;
  
  sessions: Session[];
  activeSessionId: string | null;
  setSessions: (sessions: Session[]) => void;
  createSession: (agentId: string | null) => string;
  updateSession: (id: string, updates: Partial<Session>) => void;
  deleteSession: (id: string) => void;
  setActiveSession: (id: string | null) => void;
  addMessageToActiveSession: (message: ChatMessage) => void;
  appendMessageChunkToActiveSession: (chunk: string) => void;
  clearActiveSession: () => void;
  
  isGenerating: boolean;
  setIsGenerating: (val: boolean) => void;
  
  hasLoadedHistory: boolean;
  setHasLoadedHistory: (val: boolean) => void;
  
  hasUnread: boolean;
  setHasUnread: (value: boolean) => void;

  sendMessage: (input: string) => Promise<void>;
  abortController: AbortController | null;
  stopGeneration: () => void;
  generateChatTitle: (sessionId: string) => void;

  agents: AgentProfile[];
  selectedAgentId: string | null;
  isHydrated: boolean;
  setIsHydrated: (val: boolean) => void;
  addAgent: (agent: Omit<AgentProfile, 'id' | 'status'>) => void;
  updateAgent: (id: string, updates: Partial<AgentProfile>) => void;
  removeAgent: (id: string) => void;
  setSelectedAgentId: (id: string | null) => void;
  setAgents: (agents: AgentProfile[]) => void;

  isSettingsOpen: boolean;
  toggleSettings: () => void;
  settings: AppSettings;
  updateSettings: (category: keyof AppSettings, updates: Partial<any>) => void;
  
  isDebugModeEnabled: boolean;
  setDebugMode: (enabled: boolean) => void;
  debugLogs: LogEntry[];
  sessionId: string;
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;

  terminals: TerminalSession[];
  activeTerminalId: string | null;
  setActiveTerminalId: (id: string | null) => void;
  addTerminal: () => void;
  renameTerminal: (id: string, name: string) => void;
  closeTerminal: (id: string) => Promise<void>;
  
  stagedContextFiles: string[];
  addContextFile: (path: string) => void;
  removeContextFile: (path: string) => void;
  clearContextFiles: () => void;
  isContextPickerMode: boolean;
  setContextPickerMode: (active: boolean) => void;
  
  isKanbanEnabled: boolean;
  toggleKanban: (enabled: boolean) => void;
  
  kanbanMockCycles: KanbanCycle[];
  kanbanActiveCycleId: string | null;
  kanbanMockTickets: KanbanTicket[];
  kanbanCurrentSection: 'board' | 'cycles' | 'backlog' | 'all' | 'settings';
  kanbanSelectedTicket: string | null;
  kanbanTicketViewMode: 'preview' | 'full' | null;
  kanbanHistory: KanbanNavState[];
  kanbanHistoryIndex: number;
  
  setKanbanSection: (section: 'board' | 'cycles' | 'backlog' | 'all' | 'settings') => void;
  selectKanbanTicket: (ticketId: string | null, viewMode: 'preview' | 'full' | null) => void;
  setKanbanActiveCycle: (cycleId: string) => void;
  navigateKanbanBack: () => void;
  navigateKanbanForward: () => void;
  updateKanbanTicket: (ticketId: string, updates: Partial<KanbanTicket>) => void;
  addKanbanTicket: (ticket: Omit<KanbanTicket, 'id'>) => void;
  addComment: (ticketId: string, content: string, author: string, role: 'human' | 'agent') => void;
  linkTickets: (sourceId: string, targetId: string, relation: TicketRelation) => void;
  kanbanSearchQuery: string;
  setKanbanSearchQuery: (query: string) => void;
  userAvatar: string;
  setUserAvatar: (avatarData: string) => void;
}
