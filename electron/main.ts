import { app, BrowserWindow, ipcMain, session, shell, webContents } from 'electron';
import path from 'path';
import fs from 'fs';
import http from 'http';
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

    // Automatically flush cookies to disk in REAL TIME whenever cookies change (e.g. after login)
    ses.cookies.on('changed', (_event, _cookie, _cause, removed) => {
      if (!removed) {
        ses.cookies.flushStore().catch(() => {});
        try { ses.flushStorageData(); } catch {}
      }
    });

    // Ensure persistence is flushed to disk on startup
    try {
      ses.flushStorageData();
      ses.cookies.flushStore().catch(() => {});
    } catch (e) {
      console.warn(`[Session Flush Warning ${partition}]:`, e);
    }
  }

  // Periodic persistence flush every 20s
  setInterval(() => {
    for (const partition of platforms) {
      try {
        const ses = session.fromPartition(partition);
        ses.flushStorageData();
        ses.cookies.flushStore().catch(() => {});
      } catch {}
    }
  }, 20000);
}

// Setup IPC Handlers
function setupIpcHandlers() {
  // --- Settings ---
  ipcMain.handle('db:get-settings', () => db.getSettings());
  ipcMain.handle('db:update-settings', (_event, updates) => {
    const updated = db.updateSettings(updates);
    if (updates && updates.globalAutoReply !== undefined) {
      autoReplyManager.setGlobalAutoReply(updates.globalAutoReply, updates.globalAutoReply ? 'Đã bật Auto-Reply tổng' : 'Đã tắt Auto-Reply tổng');
    }
    return updated;
  });

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

  ipcMain.handle('autoreply:send-approved', (_event, { platform, contactName, text, insertOnly }: { platform: TargetPlatform; contactName: string; text: string; insertOnly?: boolean }) => {
    autoReplyManager.executeSend(platform, contactName, text, false, Boolean(insertOnly));
  });

  ipcMain.handle('autoreply:handle-incoming', async (_event, { platform, contactName, messageText, recentMessages }: { platform: TargetPlatform; contactName: string; messageText: string; recentMessages?: Array<{ sender: string; text: string }> }) => {
    return await autoReplyManager.handleIncomingMessage(platform, contactName, messageText, recentMessages || []);
  });

  ipcMain.handle('autoreply:user-message', (_event, { platform, contactName, text }: { platform: TargetPlatform; contactName: string; text: string }) => {
    return autoReplyManager.handleUserMessage(platform, contactName, text);
  });

  ipcMain.handle('simulator:incoming-message', async (_event, { platform, contactName, text }: { platform: TargetPlatform; contactName: string; text: string }) => {
    return await autoReplyManager.handleIncomingMessage(platform, contactName, text, []);
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

  // Webview Direct IPC Bridges (Fail-safe communication)
  ipcMain.on('webview:message-clicked', (_event, data) => {
    console.log('[Main Process Bridge] webview:message-clicked forwarded:', data?.messageText);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('event:message-clicked', data);
    }
  });

  ipcMain.on('webview:chat-update', (_event, data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('event:chat-update', data);
    }
  });

  ipcMain.on('webview:incoming-message', async (_event, data) => {
    if (data && data.contactName && data.messageText) {
      console.log(`[Main Process Bridge] webview:incoming-message received for "${data.contactName}": "${data.messageText}"`);
      await autoReplyManager.handleIncomingMessage(
        data.platform || 'messenger',
        data.contactName,
        data.messageText,
        data.recentMessages || []
      );
    }
  });

  ipcMain.on('webview:request-hardware-enter', () => {
    try {
      const allWc = webContents.getAllWebContents();
      for (const wc of allWc) {
        const u = (wc.getURL() || '').toLowerCase();
        if (u.includes('messenger.com') || u.includes('facebook.com') || u.includes('zalo.me') || u.includes('web.telegram.org')) {
          wc.sendInputEvent({ type: 'keyDown', keyCode: 'Return' });
          wc.sendInputEvent({ type: 'char', keyCode: '\r' });
          wc.sendInputEvent({ type: 'keyUp', keyCode: 'Return' });
          console.log('[Main Process] Dispatched hardware Return key event to webview');
        }
      }
    } catch (e) {
      console.warn('[Main Process] Failed to dispatch hardware enter:', e);
    }
  });

  ipcMain.handle('app:get-ticked-contacts', async () => {
    const contacts = db.getContacts();
    return contacts.filter(c => c.autoReplyEnabled).map(c => c.name);
  });

  ipcMain.handle('app:clear-cache', async () => {
    let freedBytes = 0;

    const cleanDir = (dirPath: string) => {
      if (!fs.existsSync(dirPath)) return;
      try {
        const files = fs.readdirSync(dirPath);
        for (const f of files) {
          const full = path.join(dirPath, f);
          try {
            const stat = fs.statSync(full);
            if (stat.isDirectory()) {
              cleanDir(full);
              try { fs.rmdirSync(full); } catch {}
            } else {
              freedBytes += stat.size;
              fs.unlinkSync(full);
            }
          } catch {}
        }
      } catch {}
    };

    // 1. Clear session caches via Electron Session API (preserves login cookies & localStorage)
    const partitions = ['persist:zalo', 'persist:messenger', 'persist:telegram'];
    for (const p of partitions) {
      try {
        const s = session.fromPartition(p);
        await s.clearCache();
        await s.clearStorageData({
          storages: ['cachestorage', 'shadercache', 'serviceworkers']
        });
      } catch (e) {
        console.warn(`[Clear Cache] Partition ${p} warning:`, e);
      }
    }
    try {
      await session.defaultSession.clearCache();
      await session.defaultSession.clearStorageData({
        storages: ['cachestorage', 'shadercache', 'serviceworkers']
      });
    } catch {}

    // 2. Clean cache folders on disk in customUserData
    const cacheDirsToClean = [
      'Cache',
      'GPUCache',
      'Code Cache',
      'DawnGraphiteCache',
      'DawnWebGPUCache',
      'ShaderCache',
      'Crashpad',
      path.join('Partitions', 'persist:messenger', 'Cache'),
      path.join('Partitions', 'persist:messenger', 'GPUCache'),
      path.join('Partitions', 'persist:messenger', 'Code Cache'),
      path.join('Partitions', 'persist:messenger', 'DawnWebGPUCache'),
      path.join('Partitions', 'persist:messenger', 'DawnGraphiteCache'),
      path.join('Partitions', 'persist:zalo', 'Cache'),
      path.join('Partitions', 'persist:zalo', 'GPUCache'),
      path.join('Partitions', 'persist:zalo', 'Code Cache'),
      path.join('Partitions', 'persist:zalo', 'DawnWebGPUCache'),
      path.join('Partitions', 'persist:zalo', 'DawnGraphiteCache'),
      path.join('Partitions', 'persist:telegram', 'Cache'),
      path.join('Partitions', 'persist:telegram', 'GPUCache'),
      path.join('Partitions', 'persist:telegram', 'Code Cache'),
      path.join('Partitions', 'persist:telegram', 'DawnWebGPUCache'),
      path.join('Partitions', 'persist:telegram', 'DawnGraphiteCache'),
    ];

    for (const rel of cacheDirsToClean) {
      const fullPath = path.join(customUserData, rel);
      cleanDir(fullPath);
    }

    const mbFreed = Math.max(1, Math.round(freedBytes / (1024 * 1024)));
    console.log(`[Cache Cleaner] Freed ~${mbFreed} MB of cached files.`);
    return { success: true, mbFreed };
  });
}

let localHttpServer: http.Server | null = null;

function startLocalHttpServer(port: number = 45678) {
  try {
    localHttpServer = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.method === 'POST' && req.url === '/api/select-message') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            const messageText = (data.message || data.text || data.messageText || '').toString().trim();
            const contactName = (data.contact || data.contactName || 'Hội thoại đang mở').toString().trim();
            const platform = (data.platform || 'messenger') as TargetPlatform;

            if (!messageText) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'Missing message parameter' }));
              return;
            }

            console.log(`[Local API] Selected message received: "${messageText}" for "${contactName}"`);
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('event:message-clicked', {
                platform,
                contactName,
                messageText,
                recentMessages: []
              });
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, message: 'Message forwarded to app UI', selected: { platform, contactName, messageText } }));
            } else {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'App main window is not active' }));
            }
          } catch (err: any) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
        return;
      }

      if (req.method === 'GET' && req.url === '/api/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          name: 'AI Omnichannel Assistant',
          port
        }));
        return;
      }

      if (req.method === 'GET' && req.url === '/api/contacts') {
        const contacts = db.getContacts();
        const settings = db.getSettings();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          globalAutoReply: settings.globalAutoReply,
          defaultAutoReplyOption: settings.defaultAutoReplyOption || 1,
          contacts
        }));
        return;
      }

      if (req.method === 'POST' && req.url === '/api/settings') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            const updated = db.updateSettings(data);
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('event:settings-updated', updated);
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, settings: updated }));
          } catch (e: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: e.message }));
          }
        });
        return;
      }

      if (req.method === 'POST' && req.url === '/api/signal') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            const text = (data.text || '').toString().trim();
            const contactName = (data.contact || 'Người dùng').toString().trim();
            const platform = (data.platform || 'messenger') as TargetPlatform;
            autoReplyManager.handleUserMessage(platform, contactName, text);
            const settings = db.getSettings();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, signal: text, globalAutoReply: settings.globalAutoReply }));
          } catch (e: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: e.message }));
          }
        });
        return;
      }

      if (req.method === 'POST' && req.url === '/api/trigger-incoming') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const contactName = (data.contact || data.contactName || '').toString().trim();
            const messageText = (data.message || data.text || data.messageText || '').toString().trim();
            const platform = (data.platform || 'messenger') as TargetPlatform;

            if (!contactName || !messageText) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'contact and message parameters are required' }));
              return;
            }

            console.log(`[Local API] trigger-incoming for "${contactName}": "${messageText}"`);
            const replyResp = await autoReplyManager.handleIncomingMessage(platform, contactName, messageText, [], false);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, replyResponse: replyResp }));
          } catch (e: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: e.message }));
          }
        });
        return;
      }

      if (req.method === 'POST' && req.url === '/api/switch-chat') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            const contactName = (data.contact || data.contactName || '').toString().trim();
            if (!contactName) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'contactName is required' }));
              return;
            }

            console.log(`[Local API] switch-chat requested to: "${contactName}"`);
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('command:switch-chat', { contactName });
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: `Switching to chat: ${contactName}` }));
          } catch (e: any) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: e.message }));
          }
        });
        return;
      }

      if (req.method === 'POST' && req.url === '/api/generate-reply') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const contactName = (data.contact || data.contactName || 'Người dùng').toString().trim();
            const messageText = (data.message || data.text || '').toString().trim();
            const platform = (data.platform || 'messenger') as TargetPlatform;

            if (!messageText) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'message parameter is required' }));
              return;
            }

            console.log(`[Local API] generate-reply for "${contactName}": "${messageText}"`);
            const contact = db.getOrCreateContact(platform, contactName);
            const persona = db.getPersonaById(contact.personaId) || db.getPersonaByCategory(contact.category);
            const replyResp = await geminiService.generateReply({
              platform,
              contactName,
              currentMessage: messageText,
              recentMessages: data.history || [],
              personaId: persona.id,
              contactCategory: contact.category
            });

            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('event:message-clicked', {
                platform,
                contactName,
                messageText,
                recentMessages: data.history || []
              });
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              contactName,
              suggestedReplies: replyResp.suggestedReplies || [],
              persona: replyResp.persona?.name || '',
              category: replyResp.contactCategory
            }));
          } catch (e: any) {
            console.error('[Local API] generate-reply error:', e);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: e.message }));
          }
        });
        return;
      }

      if (req.method === 'POST' && req.url === '/api/toggle-contact') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            const contactName = (data.contact || data.contactName || '').toString().trim();
            const platform = (data.platform || 'messenger') as TargetPlatform;
            const enabled = !!data.enabled;

            if (!contactName) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'contactName is required' }));
              return;
            }

            console.log(`[Local API] toggle-contact "${contactName}" -> ${enabled}`);
            const contact = db.getOrCreateContact(platform, contactName);
            db.updateContact(contact.id, { autoReplyEnabled: enabled });

            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('event:contacts-updated', db.getContacts());
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, contactName, autoReplyEnabled: enabled }));
          } catch (e: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: e.message }));
          }
        });
        return;
      }

      if (req.method === 'POST' && req.url === '/api/send-message') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            const text = (data.text || data.message || '').toString().trim();
            const contactName = (data.contact || data.contactName || 'Đoạn chat đang mở').toString().trim();
            const platform = (data.platform || 'messenger') as TargetPlatform;

            if (!text) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'text or message parameter is required' }));
              return;
            }

            console.log(`[Local API] send-message to "${contactName}" (${platform}): "${text}"`);
            autoReplyManager.executeSend(platform, contactName, text, false, false);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: `Dispatched message to "${contactName}": ${text}` }));
          } catch (e: any) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: e.message }));
          }
        });
        return;
      }

      if (req.method === 'GET' && req.url === '/api/session-status') {
        (async () => {
          try {
            const messengerSes = session.fromPartition('persist:messenger');
            const messengerCookies = await messengerSes.cookies.get({});
            const zaloSes = session.fromPartition('persist:zalo');
            const zaloCookies = await zaloSes.cookies.get({});
            const fbCookies = messengerCookies.filter(c => (c.domain || '').includes('facebook') || (c.domain || '').includes('messenger'));
            const isFbLoggedIn = fbCookies.some(c => c.name === 'c_user' || c.name === 'xs');

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              messenger: {
                totalCookies: messengerCookies.length,
                facebookCookies: fbCookies.length,
                isLoggedIn: isFbLoggedIn
              },
              zalo: {
                totalCookies: zaloCookies.length
              }
            }));
          } catch (e: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: e.message }));
          }
        })();
        return;
      }

      if (req.method === 'POST' && req.url === '/api/eval-webview') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const script = data.script || '';
            const allWc = webContents.getAllWebContents();
            const webviewWc = allWc.find(wc => {
              const u = wc.getURL() || '';
              return u.includes('messenger.com') || u.includes('facebook.com') || u.includes('zalo.me') || u.includes('web.telegram.org');
            });
            if (webviewWc) {
              const result = await webviewWc.executeJavaScript(script);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, result }));
            } else {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'Webview not found' }));
            }
          } catch (e: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: e.message }));
          }
        });
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
    });

    localHttpServer.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[Local API] Port ${port} in use, trying ${port + 1}...`);
        startLocalHttpServer(port + 1);
      } else {
        console.warn('[Local API] Server error:', err);
      }
    });

    localHttpServer.listen(port, '127.0.0.1', () => {
      console.log(`[Local API Server] Running at http://127.0.0.1:${port}`);
    });
  } catch (err) {
    console.warn('[Local API] Failed to start server:', err);
  }
}

app.whenReady().then(async () => {
  setupPlatformSessions();
  setupIpcHandlers();
  createWindow();

  // Start internal local HTTP server for external Python tools
  startLocalHttpServer();

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
  // Gracefully stop local HTTP server
  if (localHttpServer) {
    try { localHttpServer.close(); } catch {}
  }

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

