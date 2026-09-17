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
        const loadedPersonas = [...DEFAULT_PERSONAS];
        if (parsed.personas && Array.isArray(parsed.personas)) {
          for (const p of parsed.personas) {
            const idx = loadedPersonas.findIndex(item => item.id === p.id);
            if (idx >= 0) {
              // Merge with default persona systemPrompt and tone
              const def = DEFAULT_PERSONAS.find(d => d.id === p.id);
              loadedPersonas[idx] = {
                ...p,
                systemPrompt: def?.systemPrompt || p.systemPrompt,
                tone: def?.tone || p.tone
              };
            } else {
              loadedPersonas.push(p);
            }
          }
        }

        const loadedKnowledge: KnowledgeItem[] = parsed.knowledgeItems && Array.isArray(parsed.knowledgeItems) ? [...parsed.knowledgeItems] : [...DEFAULT_KNOWLEDGE_ITEMS];
        for (const defKb of DEFAULT_KNOWLEDGE_ITEMS) {
          const idx = loadedKnowledge.findIndex(k => k.id === defKb.id);
          if (idx < 0) {
            loadedKnowledge.unshift(defKb);
          } else {
            loadedKnowledge[idx] = { ...defKb, ...loadedKnowledge[idx], content: defKb.content };
          }
        }

        const loadedContacts: Contact[] = (parsed.contacts || []).map((c: any) => ({
          ...c,
          autoReplyEnabled: c.autoReplyEnabled === true ? true : false
        }));

        return {
          settings: loadedSettings,
          personas: loadedPersonas,
          contacts: loadedContacts,
          knowledgeItems: loadedKnowledge,
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

  public reloadDatabase(): DatabaseSchema {
    this.data = this.loadDatabase();
    return this.data;
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
    const normalize = (s: string) => (s || '').toLowerCase().replace(/[\s\-_]+/g, '').trim();
    const targetNorm = normalize(name);

    if (!targetNorm) {
      const defaultCat: Contact['category'] = 'customer';
      const defaultP = this.getPersonaByCategory(defaultCat);
      return {
        id: 'contact_transient',
        platform,
        externalId: '',
        name: '',
        category: defaultCat,
        personaId: defaultP.id,
        autoReplyEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    const existing = this.data.contacts.find(
      c => c.platform === platform && (
        normalize(c.name) === targetNorm ||
        (targetNorm.length >= 3 && normalize(c.name).includes(targetNorm)) ||
        (normalize(c.name).length >= 3 && targetNorm.includes(normalize(c.name))) ||
        (externalId && c.externalId === externalId)
      )
    );
    if (existing) {
      if (!existing.personaId || existing.personaId === 'persona_customer') {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('đào phương hiền') || lowerName.includes('dao phuong hien') || lowerName.includes('phương hiền') || lowerName.includes('phuong hien') || lowerName.includes('hiền')) {
          existing.personaId = 'persona_dao_phuong_hien';
          existing.category = 'friend';
          this.saveDatabase();
        } else if (lowerName.includes('minh trí') || lowerName.includes('minh tri') || lowerName.includes('trí') || lowerName.includes('tri')) {
          existing.personaId = 'persona_minh_tri';
          existing.category = 'friend';
          this.saveDatabase();
        } else if (lowerName.includes('lý nguyễn') || lowerName.includes('ly nguyen')) {
          existing.personaId = 'persona_ly_nguyen';
          this.saveDatabase();
        } else if (lowerName.includes('lê hoàng long') || lowerName.includes('le hoang long') || lowerName.includes('hoàng long')) {
          existing.personaId = 'persona_le_hoang_long';
          existing.category = 'friend';
          this.saveDatabase();
        } else if (lowerName.includes('tấn vũ') || lowerName.includes('tan vu')) {
          existing.personaId = 'persona_tan_vu';
          existing.category = 'friend';
          this.saveDatabase();
        } else if (lowerName.includes('chu thanh hải') || lowerName.includes('chu thanh hai')) {
          existing.personaId = 'persona_chu_thanh_hai';
          existing.category = 'friend';
          this.saveDatabase();
        } else if (lowerName.includes('vy tường') || lowerName.includes('vy tuong')) {
          existing.personaId = 'persona_vy_tuong';
          existing.category = 'friend';
          this.saveDatabase();
        } else if (lowerName.includes('quang huy') || lowerName.includes('huy quang')) {
          existing.personaId = 'persona_quang_huy';
          existing.category = 'friend';
          this.saveDatabase();
        } else if (lowerName.includes('thúy viên viên') || lowerName.includes('thuý viên viên') || lowerName.includes('thuy vien vien')) {
          existing.personaId = 'persona_thuy_vien_vien';
          existing.category = 'friend';
          this.saveDatabase();
        } else if (lowerName.includes('trọng') || lowerName.includes('tino')) {
          existing.personaId = 'persona_tino_trong';
          existing.category = 'friend';
          this.saveDatabase();
        } else if (lowerName.includes('bố') || lowerName === 'ba' || lowerName.includes('bố yêu') || lowerName.includes('papa')) {
          existing.personaId = 'persona_family_dad';
          existing.category = 'friend';
          this.saveDatabase();
        } else if (lowerName.includes('mẹ') || lowerName === 'má' || lowerName.includes('mẹ yêu') || lowerName.includes('mama') || lowerName.includes('mom')) {
          existing.personaId = 'persona_family_mom';
          existing.category = 'friend';
          this.saveDatabase();
        }
      }
      return existing;
    }

    // Heuristic categorization based on name keywords
    let defaultCategory: Contact['category'] = 'customer';
    let assignedPersonaId: string | undefined = undefined;
    const lowerName = name.toLowerCase();

    if (lowerName.includes('bố') || lowerName === 'ba' || lowerName.includes('bố yêu') || lowerName.includes('papa')) {
      defaultCategory = 'friend';
      assignedPersonaId = 'persona_family_dad';
    } else if (lowerName.includes('mẹ') || lowerName === 'má' || lowerName.includes('mẹ yêu') || lowerName.includes('mama') || lowerName.includes('mom')) {
      defaultCategory = 'friend';
      assignedPersonaId = 'persona_family_mom';
    } else if (lowerName.includes('trọng') || lowerName.includes('tino')) {
      defaultCategory = 'friend';
      assignedPersonaId = 'persona_tino_trong';
    } else if (lowerName.includes('minh trí') || lowerName.includes('minh tri') || lowerName.includes('trí') || lowerName.includes('tri')) {
      defaultCategory = 'friend';
      assignedPersonaId = 'persona_minh_tri';
    } else if (lowerName.includes('tạ quang minh') || lowerName.includes('quang minh') || lowerName.includes('chip') || lowerName.includes('minh')) {
      defaultCategory = 'friend';
      assignedPersonaId = 'persona_ta_quang_minh';
    } else if (lowerName.includes('nguyễn duy quân') || lowerName.includes('duy quân') || lowerName.includes('dzy.wuan') || lowerName.includes('quân')) {
      defaultCategory = 'friend';
      assignedPersonaId = 'persona_nguyen_duy_quan';
    } else if (lowerName.includes('đào phương hiền') || lowerName.includes('dao phuong hien') || lowerName.includes('phương hiền') || lowerName.includes('phuong hien') || lowerName.includes('hiền')) {
      defaultCategory = 'friend';
      assignedPersonaId = 'persona_dao_phuong_hien';
    } else if (lowerName.includes('tấn vũ') || lowerName.includes('tan vu') || lowerName.includes('tấn') || lowerName === 'vũ' || lowerName.includes('vu tan')) {
      defaultCategory = 'friend';
      assignedPersonaId = 'persona_tan_vu';
    } else if (lowerName.includes('chu thanh hải') || lowerName.includes('chu thanh hai') || lowerName.includes('thanh hải') || lowerName.includes('thanh hai')) {
      defaultCategory = 'friend';
      assignedPersonaId = 'persona_chu_thanh_hai';
    } else if (lowerName.includes('lê hoàng long') || lowerName.includes('le hoang long') || lowerName.includes('hoàng long') || lowerName.includes('hoang long') || lowerName === 'long') {
      defaultCategory = 'friend';
      assignedPersonaId = 'persona_le_hoang_long';
    } else if (lowerName.includes('vy tường') || lowerName.includes('vy tuong') || lowerName.includes('tường') || lowerName.includes('tuong')) {
      defaultCategory = 'friend';
      assignedPersonaId = 'persona_vy_tuong';
    } else if (lowerName.includes('quang huy') || lowerName.includes('huy quang')) {
      defaultCategory = 'friend';
      assignedPersonaId = 'persona_quang_huy';
    } else if (lowerName.includes('thúy viên viên') || lowerName.includes('thuý viên viên') || lowerName.includes('thuy vien vien') || lowerName.includes('viên viên') || lowerName.includes('thúy') || lowerName.includes('thuý') || lowerName.includes('thuy')) {
      defaultCategory = 'friend';
      assignedPersonaId = 'persona_thuy_vien_vien';
    } else if (lowerName.includes('lý nguyễn') || lowerName.includes('ly nguyen') || lowerName.includes('lý') || lowerName === 'ly') {
      defaultCategory = 'customer';
      assignedPersonaId = 'persona_ly_nguyen';
    } else if (lowerName.includes('bạn') || lowerName.includes('em') || lowerName.includes('bro') || lowerName.includes('kỳ') || lowerName.includes('hoàng') || lowerName.includes('long') || lowerName.includes('anh') || lowerName.includes('tuấn')) {
      defaultCategory = 'friend';
    } else if (lowerName.includes('nv') || lowerName.includes('team') || lowerName.includes('nhân viên') || lowerName.includes('dev') || lowerName.includes('kế toán')) {
      defaultCategory = 'employee';
    }

    const defaultPersona = assignedPersonaId
      ? this.data.personas.find(p => p.id === assignedPersonaId) || this.getPersonaByCategory(defaultCategory)
      : this.getPersonaByCategory(defaultCategory);

    const newContact: Contact = {
      id: `contact_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      platform,
      externalId: externalId || name,
      name,
      category: defaultCategory,
      personaId: defaultPersona.id,
      autoReplyEnabled: false,
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
    if (contact.autoReplyEnabled === undefined) {
      contact.autoReplyEnabled = false;
    }
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
