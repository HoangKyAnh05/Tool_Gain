export type TargetPlatform = 'zalo' | 'messenger' | 'telegram' | 'simulator';

export type ContactCategory = 'customer' | 'employee' | 'friend' | 'other';

export interface Persona {
  id: string;
  name: string;
  category: ContactCategory;
  description: string;
  tone: string;
  systemPrompt: string;
  replyMode: 'copilot' | 'auto_reply';
  autoDelaySeconds: number;
  temperature: number;
  icon: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  platform: TargetPlatform;
  externalId: string;
  name: string;
  avatar?: string;
  category: ContactCategory;
  personaId: string;
  customNotes?: string;
  autoReplyEnabled: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeItem {
  id: string;
  category: string;
  title: string;
  keywords: string[];
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageRecord {
  id: string;
  platform: TargetPlatform;
  contactName: string;
  contactId?: string;
  messageText: string;
  sender: 'contact' | 'assistant' | 'user';
  timestamp: string;
  suggestedReplies?: string[];
  chosenReply?: string;
  actionStatus: 'suggested' | 'approved_sent' | 'auto_sent' | 'rejected' | 'manual';
  personaUsedId?: string;
}

export type AIProvider = 'groq' | 'gemini_official' | 'gemini_web2api';

export interface AppSettings {
  aiProvider: AIProvider;
  geminiApiKey: string;
  geminiModel: string;
  web2ApiBaseUrl: string;
  web2ApiKey: string;
  groqApiKey: string;
  groqModel: string;
  globalAutoReply: boolean;
  autoReplyMinDelay: number;
  autoReplyMaxDelay: number;
  showTypingSimulation: boolean;
  soundNotification: boolean;
  theme: 'dark' | 'light';
}

export interface GenerateReplyRequest {
  platform: TargetPlatform;
  contactName: string;
  contactCategory?: ContactCategory;
  recentMessages: Array<{ sender: string; text: string; time?: string }>;
  currentMessage: string;
  personaId?: string;
}

export interface GenerateReplyResponse {
  success: boolean;
  contactCategory: ContactCategory;
  persona: Persona;
  suggestedReplies: string[];
  matchedKnowledge?: KnowledgeItem[];
  detectedIntent?: string;
  recommendedAction: 'copilot_review' | 'auto_reply';
  error?: string;
}

export interface SuggestionEventData {
  platform: TargetPlatform;
  contactName: string;
  contactCategory: ContactCategory;
  incomingMessage: string;
  replyResponse: GenerateReplyResponse;
  isAutoReplyScheduled: boolean;
  scheduledDelay: number;
}

export interface AutoReplyTickData {
  key: string;
  pendingId: string;
  remainingSeconds: number;
  platform: TargetPlatform;
  contactName: string;
}

declare global {
  interface Window {
    electronAPI: {
      getSettings: () => Promise<AppSettings>;
      updateSettings: (updates: Partial<AppSettings>) => Promise<AppSettings>;
      getPersonas: () => Promise<Persona[]>;
      savePersona: (persona: Persona) => Promise<Persona>;
      deletePersona: (id: string) => Promise<boolean>;
      getContacts: () => Promise<Contact[]>;
      getOrCreateContact: (platform: TargetPlatform, name: string, externalId?: string) => Promise<Contact>;
      saveContactCategory: (platform: TargetPlatform, name: string, category: ContactCategory, personaId?: string) => Promise<Contact>;
      updateContact: (id: string, updates: Partial<Contact>) => Promise<Contact | null>;
      deleteContact: (id: string) => Promise<boolean>;
      getKnowledgeItems: () => Promise<KnowledgeItem[]>;
      saveKnowledgeItem: (item: KnowledgeItem) => Promise<KnowledgeItem>;
      deleteKnowledgeItem: (id: string) => Promise<boolean>;
      getChatLogs: (limit?: number) => Promise<ChatMessageRecord[]>;
      testApiKey: (apiKey: string, modelName?: string) => Promise<{ success: boolean; message: string }>;
      testWeb2Api: (baseUrl: string, apiKey: string, modelName?: string) => Promise<{ success: boolean; message: string }>;
      testGroq: (apiKey: string, modelName?: string) => Promise<{ success: boolean; message: string }>;
      generateReply: (req: GenerateReplyRequest) => Promise<GenerateReplyResponse>;
      cancelAutoReply: (key: string) => Promise<boolean>;
      approveAndSendReply: (platform: TargetPlatform, contactName: string, text: string, insertOnly?: boolean) => Promise<void>;
      fillChatInput: (platform: TargetPlatform, contactName: string, text: string) => Promise<void>;
      simulateIncomingMessage: (platform: TargetPlatform, contactName: string, text: string) => Promise<GenerateReplyResponse>;
      handleIncomingMessage: (platform: TargetPlatform, contactName: string, text: string, recentMessages?: Array<{ sender: string; text: string }>) => Promise<GenerateReplyResponse>;
      restartApp: () => Promise<void>;
      openExternal: (url: string) => Promise<boolean>;
      getWebviewPreloadUrl: () => Promise<string>;
      onNewSuggestion: (callback: (data: SuggestionEventData) => void) => () => void;
      onAutoReplyTick: (callback: (data: AutoReplyTickData) => void) => () => void;
      onAutoReplyCancelled: (callback: (data: { key: string }) => void) => () => void;
      onDispatchSendToWebview: (callback: (data: { platform: TargetPlatform; contactName: string; text: string; isAuto: boolean; insertOnly?: boolean }) => void) => () => void;
    };
  }
}

