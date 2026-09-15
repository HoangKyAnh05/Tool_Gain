// @ts-ignore
const { contextBridge, ipcRenderer } = require('electron');
import { AppSettings, Persona, Contact, KnowledgeItem, ChatMessageRecord, GenerateReplyRequest, GenerateReplyResponse, TargetPlatform } from './types';

const electronAPI = {
  // Settings
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('db:get-settings'),
  updateSettings: (updates: Partial<AppSettings>): Promise<AppSettings> => ipcRenderer.invoke('db:update-settings', updates),

  // Personas
  getPersonas: (): Promise<Persona[]> => ipcRenderer.invoke('db:get-personas'),
  savePersona: (persona: Persona): Promise<Persona> => ipcRenderer.invoke('db:save-persona', persona),
  deletePersona: (id: string): Promise<boolean> => ipcRenderer.invoke('db:delete-persona', id),

  // Contacts
  getContacts: (): Promise<Contact[]> => ipcRenderer.invoke('db:get-contacts'),
  getOrCreateContact: (platform: TargetPlatform, name: string, externalId?: string): Promise<Contact> =>
    ipcRenderer.invoke('db:get-or-create-contact', platform, name, externalId),
  saveContactCategory: (platform: TargetPlatform, name: string, category: Contact['category'], personaId?: string): Promise<Contact> =>
    ipcRenderer.invoke('db:save-contact-category', platform, name, category, personaId),
  updateContact: (id: string, updates: Partial<Contact>): Promise<Contact | null> => ipcRenderer.invoke('db:update-contact', id, updates),
  deleteContact: (id: string): Promise<boolean> => ipcRenderer.invoke('db:delete-contact', id),

  // Knowledge Base
  getKnowledgeItems: (): Promise<KnowledgeItem[]> => ipcRenderer.invoke('db:get-knowledge-items'),
  saveKnowledgeItem: (item: KnowledgeItem): Promise<KnowledgeItem> => ipcRenderer.invoke('db:save-knowledge-item', item),
  deleteKnowledgeItem: (id: string): Promise<boolean> => ipcRenderer.invoke('db:delete-knowledge-item', id),

  // Chat Logs
  getChatLogs: (limit?: number): Promise<ChatMessageRecord[]> => ipcRenderer.invoke('db:get-chat-logs', limit),

  // AI & Gemini Services
  testApiKey: (apiKey: string, modelName?: string): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke('gemini:test-key', apiKey, modelName),
  testWeb2Api: (baseUrl: string, apiKey: string, modelName?: string): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke('gemini:test-web2api', baseUrl, apiKey, modelName),
  testGroq: (apiKey: string, modelName?: string): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke('gemini:test-groq', apiKey, modelName),
  generateReply: (req: GenerateReplyRequest): Promise<GenerateReplyResponse> =>
    ipcRenderer.invoke('gemini:generate-reply', req),

  // Auto-Reply and Messaging Controls
  cancelAutoReply: (key: string): Promise<boolean> =>
    ipcRenderer.invoke('autoreply:cancel', key),
  approveAndSendReply: (platform: TargetPlatform, contactName: string, text: string, insertOnly: boolean = false): Promise<void> =>
    ipcRenderer.invoke('autoreply:send-approved', { platform, contactName, text, insertOnly }),
  fillChatInput: (platform: TargetPlatform, contactName: string, text: string): Promise<void> =>
    ipcRenderer.invoke('autoreply:send-approved', { platform, contactName, text, insertOnly: true }),
  simulateIncomingMessage: (platform: TargetPlatform, contactName: string, text: string): Promise<GenerateReplyResponse> =>
    ipcRenderer.invoke('simulator:incoming-message', { platform, contactName, text }),
  handleIncomingMessage: (platform: TargetPlatform, contactName: string, text: string, recentMessages?: Array<{ sender: string; text: string }>): Promise<GenerateReplyResponse> =>
    ipcRenderer.invoke('autoreply:handle-incoming', { platform, contactName, messageText: text, recentMessages }),

  // System Lifecycle & Shell
  restartApp: (): Promise<void> => ipcRenderer.invoke('app:restart'),
  openExternal: (url: string): Promise<boolean> => ipcRenderer.invoke('shell:open-external', url),
  getWebviewPreloadUrl: (): Promise<string> => ipcRenderer.invoke('app:get-webview-preload-url'),

  // Subscriptions / Event Listeners
  onNewSuggestion: (callback: (data: any) => void) => {
    const sub = (_: any, data: any) => callback(data);
    ipcRenderer.on('event:new-suggestion', sub);
    return () => ipcRenderer.removeListener('event:new-suggestion', sub);
  },
  onAutoReplyTick: (callback: (data: any) => void) => {
    const sub = (_: any, data: any) => callback(data);
    ipcRenderer.on('event:auto-reply-tick', sub);
    return () => ipcRenderer.removeListener('event:auto-reply-tick', sub);
  },
  onAutoReplyCancelled: (callback: (data: any) => void) => {
    const sub = (_: any, data: any) => callback(data);
    ipcRenderer.on('event:auto-reply-cancelled', sub);
    return () => ipcRenderer.removeListener('event:auto-reply-cancelled', sub);
  },
  onDispatchSendToWebview: (callback: (data: any) => void) => {
    const sub = (_: any, data: any) => callback(data);
    ipcRenderer.on('command:dispatch-send-to-webview', sub);
    return () => ipcRenderer.removeListener('command:dispatch-send-to-webview', sub);
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
