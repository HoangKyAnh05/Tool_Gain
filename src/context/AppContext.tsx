import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  AppSettings,
  Persona,
  Contact,
  KnowledgeItem,
  ChatMessageRecord,
  SuggestionEventData,
  TargetPlatform,
  GenerateReplyResponse,
  ContactCategory
} from '../types';

export type NavTab = 'zalo' | 'messenger' | 'telegram' | 'simulator' | 'personas' | 'knowledge' | 'contacts' | 'logs' | 'settings' | 'setup';

interface SimulatorMessage {
  id: string;
  sender: 'contact' | 'assistant' | 'user';
  senderName: string;
  text: string;
  timestamp: string;
  status?: 'sending' | 'auto_sent' | 'sent';
}

interface AppContextType {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  settings: AppSettings | null;
  personas: Persona[];
  contacts: Contact[];
  knowledgeItems: KnowledgeItem[];
  chatLogs: ChatMessageRecord[];
  currentSuggestion: SuggestionEventData | null;
  setCurrentSuggestion: (s: SuggestionEventData | null) => void;
  activeTimers: Record<string, number>; // key -> seconds remaining
  simulatorMessages: SimulatorMessage[];
  isLoading: boolean;
  apiKeyValid: boolean | null;
  
  // Actions
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  savePersona: (persona: Persona) => Promise<void>;
  deletePersona: (id: string) => Promise<void>;
  updateContact: (id: string, updates: Partial<Contact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  saveKnowledgeItem: (item: KnowledgeItem) => Promise<void>;
  deleteKnowledgeItem: (id: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  approveAndSendReply: (platform: TargetPlatform, contactName: string, text: string) => Promise<void>;
  fillChatInput: (platform: TargetPlatform, contactName: string, text: string) => Promise<void>;
  cancelAutoReply: (key: string) => Promise<void>;
  regenerateReply: (platform: TargetPlatform, contactName: string, message: string, personaId?: string) => Promise<GenerateReplyResponse>;
  sendSimulatorContactMessage: (contactName: string, text: string, category: ContactCategory) => Promise<void>;
  handleActiveChatScanned: (platform: TargetPlatform, contactName: string, recentMessages: Array<{ sender: string; text: string }>, incomingMessage?: string) => Promise<void>;
  handleMessageSelected: (platform: TargetPlatform, contactName: string, messageText: string, recentMessages?: Array<{ sender: string; text: string }>) => Promise<void>;
  setContactCategory: (platform: TargetPlatform, contactName: string, category: ContactCategory, personaId?: string) => Promise<void>;
  clearSimulatorHistory: () => void;
}


const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<NavTab>('simulator');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [chatLogs, setChatLogs] = useState<ChatMessageRecord[]>([]);
  const [currentSuggestion, setCurrentSuggestion] = useState<SuggestionEventData | null>(null);
  const [activeTimers, setActiveTimers] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null);

  // Simulator Message List
  const [simulatorMessages, setSimulatorMessages] = useState<SimulatorMessage[]>([
    {
      id: 'init_1',
      sender: 'contact',
      senderName: 'Nguyễn Văn Minh (Khách hàng)',
      text: 'Shop ơi, em muốn hỏi phí ship về Đà Nẵng bao nhiêu và mấy ngày nhận được hàng ạ?',
      timestamp: new Date(Date.now() - 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    {
      id: 'init_2',
      sender: 'assistant',
      senderName: 'AI Copilot',
      text: 'Dạ em chào anh Minh, bên em giao hàng toàn quốc 2-4 ngày làm việc là tới Đà Nẵng ạ. Đơn từ 500k bên em freeship hoàn toàn, đơn dưới 500k phí ship đồng giá chỉ 25k thôi anh nhé!',
      timestamp: new Date(Date.now() - 45000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'auto_sent'
    }
  ]);

  // Load all initial data from electronAPI
  const refreshAll = useCallback(async () => {
    try {
      if (!window.electronAPI) return;
      const [s, p, c, k, l] = await Promise.all([
        window.electronAPI.getSettings(),
        window.electronAPI.getPersonas(),
        window.electronAPI.getContacts(),
        window.electronAPI.getKnowledgeItems(),
        window.electronAPI.getChatLogs(100)
      ]);
      setSettings(s);
      setPersonas(p);
      setContacts(c);
      setKnowledgeItems(k);
      setChatLogs(l);

      if (s.geminiApiKey) {
        setApiKeyValid(true);
      }
    } catch (err) {
      console.error('[AppContext] Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Listen to Electron Events
  useEffect(() => {
    if (!window.electronAPI) return;

    const unsubSuggestion = window.electronAPI.onNewSuggestion((data: SuggestionEventData) => {
      console.log('[New Suggestion Event]:', data);
      setCurrentSuggestion(data);
    });

    const unsubTick = window.electronAPI.onAutoReplyTick((data) => {
      setActiveTimers(prev => ({
        ...prev,
        [data.key]: data.remainingSeconds
      }));

      // If finished countdown
      if (data.remainingSeconds <= 0) {
        setActiveTimers(prev => {
          const next = { ...prev };
          delete next[data.key];
          return next;
        });
      }
    });

    const unsubCancelled = window.electronAPI.onAutoReplyCancelled((data) => {
      setActiveTimers(prev => {
        const next = { ...prev };
        delete next[data.key];
        return next;
      });
    });

    const unsubDispatch = window.electronAPI.onDispatchSendToWebview((data) => {
      console.log('[Dispatch Send]:', data);
      // If on simulator platform, append to simulator chat
      if (data.platform === 'simulator') {
        setSimulatorMessages(prev => [
          ...prev,
          {
            id: `msg_${Date.now()}`,
            sender: 'assistant',
            senderName: 'AI Copilot',
            text: data.text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: data.isAuto ? 'auto_sent' : 'sent'
          }
        ]);
      }
      refreshAll();
    });

    return () => {
      unsubSuggestion();
      unsubTick();
      unsubCancelled();
      unsubDispatch();
    };
  }, [refreshAll]);

  // Actions
  const updateSettings = async (updates: Partial<AppSettings>) => {
    if (!window.electronAPI) return;
    const updated = await window.electronAPI.updateSettings(updates);
    setSettings(updated);
  };

  const savePersona = async (persona: Persona) => {
    if (!window.electronAPI) return;
    await window.electronAPI.savePersona(persona);
    await refreshAll();
  };

  const deletePersona = async (id: string) => {
    if (!window.electronAPI) return;
    await window.electronAPI.deletePersona(id);
    await refreshAll();
  };

  const updateContact = async (id: string, updates: Partial<Contact>) => {
    if (!window.electronAPI) return;
    await window.electronAPI.updateContact(id, updates);
    await refreshAll();
  };

  const deleteContact = async (id: string) => {
    if (!window.electronAPI) return;
    await window.electronAPI.deleteContact(id);
    await refreshAll();
  };

  const saveKnowledgeItem = async (item: KnowledgeItem) => {
    if (!window.electronAPI) return;
    await window.electronAPI.saveKnowledgeItem(item);
    await refreshAll();
  };

  const deleteKnowledgeItem = async (id: string) => {
    if (!window.electronAPI) return;
    await window.electronAPI.deleteKnowledgeItem(id);
    await refreshAll();
  };

  const approveAndSendReply = async (platform: TargetPlatform, contactName: string, text: string) => {
    if (!window.electronAPI) return;
    await window.electronAPI.approveAndSendReply(platform, contactName, text);
    // Cancel any active timer for this
    const key = `${platform}_${contactName}`;
    setActiveTimers(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const fillChatInput = async (platform: TargetPlatform, contactName: string, text: string) => {
    if (!window.electronAPI) return;
    await window.electronAPI.fillChatInput(platform, contactName, text);
    const key = `${platform}_${contactName}`;
    setActiveTimers(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const cancelAutoReply = async (key: string) => {
    if (!window.electronAPI) return;
    await window.electronAPI.cancelAutoReply(key);
    setActiveTimers(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const lastRecentMessagesRef = useRef<Array<{ sender: string; text: string }>>([]);
  const lastProcessedKeyRef = useRef<string>('');
  const isGeneratingRef = useRef<boolean>(false);

  const regenerateReply = async (
    platform: TargetPlatform,
    contactName: string,
    message: string,
    personaId?: string
  ): Promise<GenerateReplyResponse> => {
    if (!window.electronAPI) throw new Error('No electron API');
    
    isGeneratingRef.current = true;
    const key = `${platform}::${(contactName || '').trim().toLowerCase()}::${(message || '').trim().toLowerCase()}`;
    lastProcessedKeyRef.current = key;

    try {
      const res = await window.electronAPI.generateReply({
        platform,
        contactName,
        recentMessages: lastRecentMessagesRef.current || [],
        currentMessage: message,
        personaId
      });
      setCurrentSuggestion({
        platform,
        contactName,
        contactCategory: res.contactCategory || 'customer',
        incomingMessage: message,
        replyResponse: res,
        isAutoReplyScheduled: false,
        scheduledDelay: 0
      });
      return res;
    } finally {
      setTimeout(() => {
        isGeneratingRef.current = false;
      }, 500);
    }
  };

  const sendSimulatorContactMessage = async (
    contactName: string,
    text: string,
    category: ContactCategory
  ) => {
    // 1. Append contact message to simulator UI
    setSimulatorMessages(prev => [
      ...prev,
      {
        id: `msg_contact_${Date.now()}`,
        sender: 'contact',
        senderName: `${contactName} (${category === 'customer' ? 'Khách hàng' : category === 'employee' ? 'Nhân viên' : 'Bạn bè'})`,
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    // 2. Trigger simulator event via backend
    if (window.electronAPI) {
      const resp = await window.electronAPI.simulateIncomingMessage('simulator', contactName, text);
      console.log('[Simulator Response Generated]:', resp);
    }
  };

  const handleActiveChatScanned = async (
    platform: TargetPlatform,
    contactName: string,
    recentMessages: Array<{ sender: string; text: string }>,
    _incomingMessage?: string
  ) => {
    if (!window.electronAPI || !contactName) return;

    lastRecentMessagesRef.current = recentMessages;
    
    // Auto-resolve persona and category
    const normalizeName = (s?: string) => (s || '').toLowerCase().replace(/[\s\-_]+/g, '').trim();
    const matchedContact = contacts.find(c => normalizeName(c.name) === normalizeName(contactName));
    const personaId = matchedContact?.personaId;
    const defaultPersona = personas.find(p => p.id === personaId) || personas[0];
    const cat = matchedContact?.category || defaultPersona?.category || 'customer';

    // Immediately update active contact and display in Copilot without auto-filling or auto-generating
    setCurrentSuggestion(prev => {
      const isSameContact = Boolean(prev?.contactName && normalizeName(prev.contactName) === normalizeName(contactName));
      const preservedIncoming = isSameContact ? (prev?.incomingMessage || '') : '';

      return {
        platform,
        contactName,
        contactCategory: (isSameContact && prev) ? prev.contactCategory : cat,
        incomingMessage: preservedIncoming,
        replyResponse: (isSameContact && prev?.replyResponse) ? prev.replyResponse : {
          success: true,
          contactCategory: cat,
          persona: defaultPersona,
          suggestedReplies: [],
          detectedIntent: preservedIncoming ? 'Đã chọn tin nhắn' : 'Chưa chọn tin nhắn',
          matchedKnowledge: [],
          recommendedAction: 'copilot_review'
        },
        isAutoReplyScheduled: false,
        scheduledDelay: 0
      };
    });
  };

  const handleMessageSelected = async (
    platform: TargetPlatform,
    contactName: string,
    messageText: string,
    recentMessages: Array<{ sender: string; text: string }> = []
  ) => {
    if (!contactName || !messageText) return;

    console.log(`[handleMessageSelected] User clicked message: "${messageText}" for "${contactName}"`);
    if (recentMessages.length > 0) {
      lastRecentMessagesRef.current = recentMessages;
    }

    // Auto-resolve persona
    const normalizeName = (s?: string) => (s || '').toLowerCase().replace(/[\s\-_]+/g, '').trim();
    const matchedContact = contacts.find(c => normalizeName(c.name) === normalizeName(contactName));
    const personaId = matchedContact?.personaId;
    const defaultPersona = personas.find(p => p.id === personaId) || personas[0];
    const cat = matchedContact?.category || defaultPersona?.category || 'customer';

    // Update current selected message and clear previous suggestions until user clicks "Tạo lại"
    setCurrentSuggestion(prev => {
      const isSameContact = Boolean(prev?.contactName && normalizeName(prev.contactName) === normalizeName(contactName));
      const activeCat = (isSameContact && prev) ? prev.contactCategory : cat;
      const activePersona = (isSameContact && prev?.replyResponse?.persona) ? prev.replyResponse.persona : defaultPersona;

      return {
        platform,
        contactName,
        contactCategory: activeCat,
        incomingMessage: messageText,
        replyResponse: {
          success: true,
          contactCategory: activeCat,
          persona: activePersona,
          suggestedReplies: [],
          detectedIntent: 'Đã chọn tin nhắn • Bấm "Tạo lại" để sinh phản hồi',
          matchedKnowledge: [],
          recommendedAction: 'copilot_review'
        },
        isAutoReplyScheduled: false,
        scheduledDelay: 0
      };
    });
  };

  const setContactCategory = async (
    platform: TargetPlatform,
    contactName: string,
    category: ContactCategory,
    personaId?: string
  ) => {
    if (!window.electronAPI || !contactName) return;
    const targetPersona = personaId ? personas.find(p => p.id === personaId) : (personas.find(p => p.category === category && p.isDefault) || personas[0]);

    if (window.electronAPI.saveContactCategory) {
      await window.electronAPI.saveContactCategory(platform, contactName, category, targetPersona?.id);
    }
    
    setCurrentSuggestion(prev => prev ? {
      ...prev,
      contactCategory: category,
      replyResponse: prev.replyResponse ? {
        ...prev.replyResponse,
        contactCategory: category,
        persona: targetPersona || prev.replyResponse.persona
      } : prev.replyResponse
    } : null);

    await refreshAll();
  };

  const clearSimulatorHistory = () => {
    setSimulatorMessages([]);
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        settings,
        personas,
        contacts,
        knowledgeItems,
        chatLogs,
        currentSuggestion,
        setCurrentSuggestion,
        activeTimers,
        simulatorMessages,
        isLoading,
        apiKeyValid,
        updateSettings,
        savePersona,
        deletePersona,
        updateContact,
        deleteContact,
        saveKnowledgeItem,
        deleteKnowledgeItem,
        refreshAll,
        approveAndSendReply,
        fillChatInput,
        cancelAutoReply,
        regenerateReply,
        sendSimulatorContactMessage,
        handleActiveChatScanned,
        handleMessageSelected,
        setContactCategory,
        clearSimulatorHistory
      }}
    >
      {children}
    </AppContext.Provider>
  );

};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
