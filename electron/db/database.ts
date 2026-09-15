import fs from 'fs';
import path from 'path';
import { Persona, Contact, KnowledgeItem, ChatMessageRecord, AppSettings, TargetPlatform } from '../types';
import { DEFAULT_PERSONAS, DEFAULT_KNOWLEDGE_ITEMS, DEFAULT_SETTINGS } from './defaultData';

export interface DatabaseSchema {
  settings: AppSettings;
  personas: Persona[];
  contacts: Contact[];
  knowledgeItems: KnowledgeItem[];
  chatLogs: ChatMessageRecord[];
}

export class DatabaseManager {
  private dbPath: string;
  private data: DatabaseSchema;

  constructor() {
    let baseDir = path.join(process.cwd(), '.data');
    try {
      if (process.versions && (process.versions as any).electron) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const electron = require('electron');
        if (electron?.app) {
          baseDir = electron.app.getPath('userData');
        }
      }
    } catch {
      baseDir = path.join(process.cwd(), '.data');
    }

    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    this.dbPath = path.join(baseDir, 'ai_assistant_store.json');
    this.data = this.loadDatabase();
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (fs.existsSync(this.dbPath)) {
        const raw = fs.readFileSync(this.dbPath, 'utf-8');
        const parsed = JSON.parse(raw);
        const loadedSettings = { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) };
        if (!loadedSettings.groqApiKey) {
          loadedSettings.groqApiKey = '';
        }
        if (!loadedSettings.groqModel) {
          loadedSettings.groqModel = 'openai/gpt-oss-120b';
        }
        if (loadedSettings.geminiModel === 'gemini-2.0-flash' || !loadedSettings.geminiModel) {
          loadedSettings.geminiModel = 'gemini-3.7-flash';
        }
        return {
          settings: loadedSettings,
          personas: parsed.personas && parsed.personas.length > 0 ? parsed.personas : DEFAULT_PERSONAS,
          contacts: parsed.contacts || [],
          knowledgeItems: parsed.knowledgeItems && parsed.knowledgeItems.length > 0 ? parsed.knowledgeItems : DEFAULT_KNOWLEDGE_ITEMS,
          chatLogs: parsed.chatLogs || []
        };
      }
    } catch (err) {
      console.error('[DB] Error loading db file, re-initializing defaults:', err);
    }

    const initial: DatabaseSchema = {
      settings: DEFAULT_SETTINGS,
      personas: DEFAULT_PERSONAS,
      contacts: [],
      knowledgeItems: DEFAULT_KNOWLEDGE_ITEMS,
      chatLogs: []
    };
    this.saveDatabase(initial);
    return initial;
  }

  private saveDatabase(dataToSave?: DatabaseSchema) {
    try {
      const payload = dataToSave || this.data;
      fs.writeFileSync(this.dbPath, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Error saving to db:', err);
    }
  }

  // --- Settings ---
  public getSettings(): AppSettings {
    return this.data.settings;
  }

  public updateSettings(updates: Partial<AppSettings>): AppSettings {
    this.data.settings = { ...this.data.settings, ...updates };
    this.saveDatabase();
    return this.data.settings;
  }

  // --- Personas ---
  public getPersonas(): Persona[] {
    return this.data.personas;
  }

  public getPersonaById(id: string): Persona | undefined {
    return this.data.personas.find(p => p.id === id);
  }

  public getPersonaByCategory(category: string): Persona {
    const found = this.data.personas.find(p => p.category === category && p.isDefault);
    return found || this.data.personas[0] || DEFAULT_PERSONAS[0];
  }

  public savePersona(persona: Persona): Persona {
    const index = this.data.personas.findIndex(p => p.id === persona.id);
    if (index >= 0) {
      this.data.personas[index] = { ...persona, updatedAt: new Date().toISOString() };
    } else {
      this.data.personas.push({
        ...persona,
        id: persona.id || `persona_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    this.saveDatabase();
    return persona;
  }

  public deletePersona(id: string): boolean {
    const initialLen = this.data.personas.length;
    this.data.personas = this.data.personas.filter(p => p.id !== id);
    if (this.data.personas.length !== initialLen) {
      this.saveDatabase();
      return true;
    }
    return false;
  }

  // --- Contacts ---
  public getContacts(): Contact[] {
    return this.data.contacts;
  }

  public getOrCreateContact(platform: TargetPlatform, name: string, externalId?: string): Contact {
    const existing = this.data.contacts.find(
      c => c.platform === platform && (c.name.toLowerCase() === name.toLowerCase() || (externalId && c.externalId === externalId))
    );
    if (existing) {
      return existing;
    }

    // Heuristic categorization based on name keywords
    let defaultCategory: Contact['category'] = 'customer';
    const lowerName = name.toLowerCase();
    if (lowerName.includes('bạn') || lowerName.includes('em') || lowerName.includes('bro') || lowerName.includes('kỳ') || lowerName.includes('hoàng') || lowerName.includes('long') || lowerName.includes('anh')) {
      defaultCategory = 'friend';
    } else if (lowerName.includes('nv') || lowerName.includes('team') || lowerName.includes('nhân viên') || lowerName.includes('dev') || lowerName.includes('kế toán')) {
      defaultCategory = 'employee';
    }

    const defaultPersona = this.getPersonaByCategory(defaultCategory);

    const newContact: Contact = {
      id: `contact_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      platform,
      externalId: externalId || name,
      name,
      category: defaultCategory,
      personaId: defaultPersona.id,
      autoReplyEnabled: defaultCategory === 'customer',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data.contacts.push(newContact);
    this.saveDatabase();
    return newContact;
  }

  public saveContactCategory(platform: TargetPlatform, name: string, category: Contact['category'], personaId?: string): Contact {
    const contact = this.getOrCreateContact(platform, name);
    const targetPersonaId = personaId || this.getPersonaByCategory(category).id;
    contact.category = category;
    contact.personaId = targetPersonaId;
    contact.autoReplyEnabled = category === 'customer';
    contact.updatedAt = new Date().toISOString();
    this.saveDatabase();
    return contact;
  }

  public updateContact(id: string, updates: Partial<Contact>): Contact | null {
    const index = this.data.contacts.findIndex(c => c.id === id);
    if (index >= 0) {
      const current = this.data.contacts[index];
      const newCategory = updates.category || current.category;
      let newPersonaId = updates.personaId || current.personaId;
      if (updates.category && updates.category !== current.category && !updates.personaId) {
        newPersonaId = this.getPersonaByCategory(newCategory).id;
      }

      this.data.contacts[index] = {
        ...current,
        ...updates,
        category: newCategory,
        personaId: newPersonaId,
        updatedAt: new Date().toISOString()
      };
      this.saveDatabase();
      return this.data.contacts[index];
    }
    return null;
  }


  public deleteContact(id: string): boolean {
    const initLen = this.data.contacts.length;
    this.data.contacts = this.data.contacts.filter(c => c.id !== id);
    if (this.data.contacts.length !== initLen) {
      this.saveDatabase();
      return true;
    }
    return false;
  }

  // --- Knowledge Base ---
  public getKnowledgeItems(): KnowledgeItem[] {
    return this.data.knowledgeItems;
  }

  public saveKnowledgeItem(item: KnowledgeItem): KnowledgeItem {
    const index = this.data.knowledgeItems.findIndex(k => k.id === item.id);
    if (index >= 0) {
      this.data.knowledgeItems[index] = { ...item, updatedAt: new Date().toISOString() };
    } else {
      this.data.knowledgeItems.push({
        ...item,
        id: item.id || `kb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    this.saveDatabase();
    return item;
  }

  public deleteKnowledgeItem(id: string): boolean {
    const initLen = this.data.knowledgeItems.length;
    this.data.knowledgeItems = this.data.knowledgeItems.filter(k => k.id !== id);
    if (this.data.knowledgeItems.length !== initLen) {
      this.saveDatabase();
      return true;
    }
    return false;
  }

  // --- Chat Logs ---
  public getChatLogs(limit: number = 50): ChatMessageRecord[] {
    return this.data.chatLogs.slice(-limit).reverse();
  }

  public addChatLog(record: Omit<ChatMessageRecord, 'id' | 'timestamp'>): ChatMessageRecord {
    const newLog: ChatMessageRecord = {
      ...record,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString()
    };
    this.data.chatLogs.push(newLog);
    // Keep max 1000 logs
    if (this.data.chatLogs.length > 1000) {
      this.data.chatLogs = this.data.chatLogs.slice(-1000);
    }
    this.saveDatabase();
    return newLog;
  }
}

export const db = new DatabaseManager();
