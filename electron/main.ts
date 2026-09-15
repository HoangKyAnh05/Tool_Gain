import { app, BrowserWindow, ipcMain, session, shell } from 'electron';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { db } from './db/database';
import { geminiService } from './services/gemini';
import { autoReplyManager } from './services/autoReply';
import { web2apiServerManager } from './services/web2apiServer';
import { GenerateReplyRequest, TargetPlatform } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.setName('AIOmnichannelAssistant');

const appDataDir = app.getPath('appData');
const customUserData = path.join(appDataDir, 'AIOmnichannelAssistant_Data');
try {
  app.setPath('userData', customUserData);
} catch (e) {
  console.warn('Set userData path warning:', e);
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const iconPath = path.join(__dirname, '../assets/icon.ico');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    title: 'AI Omnichannel Chat Assistant',
    icon: iconPath,
    backgroundColor: '#090d16',
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true, // Enable embedded webviews for Zalo, Messenger, Telegram
      spellcheck: false
    }
  });

  autoReplyManager.setMainWindow(mainWindow);

  // Load Vite Dev Server URL or Production Index
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Setup Isolated Persistent Sessions for Platforms
function setupPlatformSessions() {
  const platforms = ['persist:zalo', 'persist:messenger', 'persist:telegram'];
  for (const partition of platforms) {
    const ses = session.fromPartition(partition);
    // Allow persistent cookies, local storage, media permissions
    ses.setPermissionRequestHandler((_webContents, _permission, callback) => {
      callback(true);
    });
    // Ensure persistence is flushed to disk
    try {
      ses.flushStorageData();
      ses.cookies.flushStore();
    } catch (e) {
      console.warn(`[Session Flush Warning ${partition}]:`, e);
    }
  }
}

// Setup IPC Handlers
function setupIpcHandlers() {
  // --- Settings ---
  ipcMain.handle('db:get-settings', () => db.getSettings());
  ipcMain.handle('db:update-settings', (_event, updates) => db.updateSettings(updates));

  // --- Personas ---
  ipcMain.handle('db:get-personas', () => db.getPersonas());
  ipcMain.handle('db:save-persona', (_event, persona) => db.savePersona(persona));
  ipcMain.handle('db:delete-persona', (_event, id) => db.deletePersona(id));

  // --- Contacts ---
  ipcMain.handle('db:get-contacts', () => db.getContacts());
  ipcMain.handle('db:get-or-create-contact', (_event, platform, name, externalId) => db.getOrCreateContact(platform, name, externalId));
  ipcMain.handle('db:save-contact-category', (_event, platform, name, category, personaId) => db.saveContactCategory(platform, name, category, personaId));
  ipcMain.handle('db:update-contact', (_event, id, updates) => db.updateContact(id, updates));
  ipcMain.handle('db:delete-contact', (_event, id) => db.deleteContact(id));

  // --- Knowledge Base ---
  ipcMain.handle('db:get-knowledge-items', () => db.getKnowledgeItems());
  ipcMain.handle('db:save-knowledge-item', (_event, item) => db.saveKnowledgeItem(item));
  ipcMain.handle('db:delete-knowledge-item', (_event, id) => db.deleteKnowledgeItem(id));

  // --- Chat Logs ---
  ipcMain.handle('db:get-chat-logs', (_event, limit) => db.getChatLogs(limit));

  // --- Gemini API & Web2API ---
  ipcMain.handle('gemini:test-key', async (_event, apiKey: string, modelName?: string) => {
    return await geminiService.testApiKey(apiKey, modelName);
  });

  ipcMain.handle('gemini:test-web2api', async (_event, baseUrl: string, apiKey: string, modelName?: string) => {
    return await geminiService.testWeb2Api(baseUrl, apiKey, modelName);
  });

  ipcMain.handle('gemini:test-groq', async (_event, apiKey: string, modelName?: string) => {
    return await geminiService.testGroq(apiKey, modelName);
  });

  ipcMain.handle('gemini:generate-reply', async (_event, req: GenerateReplyRequest) => {
    return await geminiService.generateReply(req);
  });

  // --- Auto-Reply Actions ---
  ipcMain.handle('autoreply:cancel', (_event, key: string) => {
    return autoReplyManager.cancelPending(key);
  });

  ipcMain.handle('autoreply:send-approved', (_event, { platform, contactName, text }: { platform: TargetPlatform; contactName: string; text: string }) => {
    autoReplyManager.executeSend(platform, contactName, text, false);
  });

  // --- App Lifecycle & Preload URLs ---
  ipcMain.handle('app:get-webview-preload-url', () => {
    const preloadPath = path.join(__dirname, 'webview-preload.cjs');
    return pathToFileURL(preloadPath).toString();
  });

  ipcMain.handle('app:restart', () => {
    app.relaunch();
    app.exit(0);
  });

  ipcMain.handle('shell:open-external', async (_event, url: string) => {
    if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
      await shell.openExternal(url);
      return true;
    }
    return false;
  });
}

app.whenReady().then(async () => {
  setupPlatformSessions();
  setupIpcHandlers();
  createWindow();

  // Automatically start Web2API background server
  web2apiServerManager.startServer().catch((e) => {
    console.warn('[Main] Auto-start Web2API server error:', e);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', async () => {
  // Gracefully stop background python server
  web2apiServerManager.stopServer();

  const platforms = ['persist:zalo', 'persist:messenger', 'persist:telegram'];
  for (const partition of platforms) {
    try {
      const ses = session.fromPartition(partition);
      await ses.flushStorageData();
      await ses.cookies.flushStore();
    } catch {}
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

