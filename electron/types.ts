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
  defaultAutoReplyOption?: 1 | 2 | 3;
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

export interface InjectedMessageEvent {
  platform: TargetPlatform;
  contactName: string;
  contactAvatar?: string;
  messageText: string;
  timestamp: number;
  isIncoming: boolean;
}
