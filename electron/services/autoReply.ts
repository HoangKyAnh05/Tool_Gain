import { BrowserWindow, webContents } from 'electron';
import { db } from '../db/database';
import { geminiService } from './gemini';
import { GenerateReplyRequest, GenerateReplyResponse, TargetPlatform } from '../types';

interface PendingAutoReply {
  id: string;
  platform: TargetPlatform;
  contactName: string;
  messageText: string;
  chosenReply: string;
  remainingSeconds: number;
  timer: NodeJS.Timeout | null;
}

export function parseUserSignal(text: string): 'pause' | 'resume' | null {
  if (!text) return null;
  const s = text.trim();
  if (s === '.' || s === '..' || s === '. ' || s === ' .') {
    return 'pause';
  }
  if (s === '...' || s === '…' || s === '....' || /^(\.{3,}|…|…\.+|\.\.+…)$/.test(s.replace(/\s+/g, ''))) {
    return 'resume';
  }
  return null;
}

export class AutoReplyManager {
  private activePendingReplies: Map<string, PendingAutoReply> = new Map();
  private mainWindow: BrowserWindow | null = null;

  public setMainWindow(win: BrowserWindow) {
    this.mainWindow = win;
  }

  /**
   * Handle manual signal from user typing/sending:
   * - Single dot "." -> Understand user is manually typing, turn OFF auto-reply for all ticked chats.
   * - Three dots "..." -> Turn ON auto-reply for all ticked chats.
   */
  public handleUserMessage(platform: TargetPlatform, contactName: string, messageText: string) {
    const signal = parseUserSignal(messageText);

    if (signal === 'pause') {
      console.log(`[AutoReply Manager] Detected User Signal "." from ${contactName} -> PAUSING Auto-Reply for all chats.`);
      this.setGlobalAutoReply(false, "Nhận diện tin nhắn '.' từ bạn (Đã tạm dừng Auto-Reply)");
      return;
    }

    if (signal === 'resume') {
      console.log(`[AutoReply Manager] Detected User Signal "..." from ${contactName} -> RESUMING Auto-Reply for all ticked chats.`);
      this.setGlobalAutoReply(true, "Nhận diện tin nhắn '...' từ bạn (Đã kích hoạt Auto-Reply cho các đoạn chat đã tích)");
      return;
    }
  }

  /**
   * Turn ON/OFF Auto-Reply globally and notify UI
   */
  public setGlobalAutoReply(enabled: boolean, reason?: string) {
    db.updateSettings({ globalAutoReply: enabled });

    if (!enabled) {
      // Cancel all active pending auto-replies immediately
      for (const [key, pending] of this.activePendingReplies.entries()) {
        if (pending.timer) clearInterval(pending.timer);
      }
      this.activePendingReplies.clear();
    }

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('event:auto-reply-global-toggled', {
        globalAutoReply: enabled,
        reason: reason || (enabled ? "Lệnh '...'" : "Lệnh '.'")
      });
    }
  }

  /**
   * Process an incoming message and trigger Auto-reply or Copilot review
   */
  public async handleIncomingMessage(
    platform: TargetPlatform,
    contactName: string,
    messageText: string,
    recentMessages: Array<{ sender: string; text: string }> = [],
    executeLocalSend: boolean = true
  ): Promise<GenerateReplyResponse> {
    const contact = db.getOrCreateContact(platform, contactName);
    const settings = db.getSettings();

    // Log the incoming message
    db.addChatLog({
      platform,
      contactName,
      contactId: contact.id,
      messageText,
      sender: 'contact',
      actionStatus: 'suggested'
    });

    // Request Gemini / Context Engine to generate reply
    const replyResponse = await geminiService.generateReply({
      platform,
      contactName,
      contactCategory: contact.category,
      recentMessages,
      currentMessage: messageText,
      personaId: contact.personaId
    });

    const optionIndex = Math.max(0, Math.min(2, ((settings.defaultAutoReplyOption || 1) - 1)));
    const chosenReply = replyResponse.suggestedReplies[optionIndex] || replyResponse.suggestedReplies[0] || '';

    console.log(`[AutoReply Manager] handleIncomingMessage for "${contactName}": "${messageText}" -> Manual sending mode (Copilot only)`);

    // Broadcast new suggestion event to UI (Manual mode only)
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('event:new-suggestion', {
        platform,
        contactName,
        contactCategory: replyResponse.contactCategory,
        incomingMessage: messageText,
        replyResponse,
        isAutoReplyScheduled: false,
        scheduledDelay: 0,
        isChatTicked: false,
        isGlobalOn: false
      });
    }

    return replyResponse;
  }

  /**
   * Schedule auto-reply with countdown ticks (Disabled: user sends manually)
   */
  public scheduleAutoReply(
    platform: TargetPlatform,
    contactName: string,
    messageText: string,
    replyText: string,
    delaySeconds: number
  ) {
    // Disabled: All automatic sending has been removed. User chooses and sends manually.
    console.log(`[AutoReply Manager] scheduleAutoReply skipped for "${contactName}" (Manual sending mode)`);
  }

  /**
   * Cancel pending auto-reply
   */
  public cancelPending(key: string): boolean {
    const pending = this.activePendingReplies.get(key);
    if (pending && pending.timer) {
      clearInterval(pending.timer);
      this.activePendingReplies.delete(key);
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('event:auto-reply-cancelled', { key });
      }
      return true;
    }
    return false;
  }

  /**
   * Execute send or fill message into Webview or Simulator
   */
  public executeSend(platform: TargetPlatform, contactName: string, textToSend: string, isAuto: boolean = false, insertOnly: boolean = false) {
    const contact = db.getOrCreateContact(platform, contactName);
    console.log(`[AutoReply Manager] >>> EXECUTING SEND to "${contactName}" (${platform}) (isAuto=${isAuto}): "${textToSend}"`);

    if (!insertOnly) {
      // Save log only when actually sending
      db.addChatLog({
        platform,
        contactName,
        contactId: contact.id,
        messageText: textToSend,
        sender: 'assistant',
        chosenReply: textToSend,
        actionStatus: isAuto ? 'auto_sent' : 'approved_sent',
        personaUsedId: contact.personaId
      });

      // Update contact last message
      db.updateContact(contact.id, {
        lastMessage: textToSend,
        lastMessageTime: new Date().toISOString()
      });
    }

    // 1. Send IPC command to main window to dispatch to target webview
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('command:dispatch-send-to-webview', {
        platform,
        contactName,
        text: textToSend,
        isAuto,
        insertOnly
      });
    }

    // 2. Fail-safe: Direct dispatch to any WebContents whose URL matches the platform
    try {
      const allWc = webContents.getAllWebContents();
      for (const wc of allWc) {
        const u = (wc.getURL() || '').toLowerCase();
        const matchesPlatform =
          (platform === 'messenger' && (u.includes('messenger.com') || u.includes('facebook.com'))) ||
          (platform === 'zalo' && u.includes('zalo.me')) ||
          (platform === 'telegram' && u.includes('web.telegram.org'));

        if (matchesPlatform) {
          wc.send('host:send-text', { text: textToSend, insertOnly: Boolean(insertOnly) });
          if (!insertOnly) {
            setTimeout(() => {
              try {
                wc.sendInputEvent({ type: 'keyDown', keyCode: 'Return' });
                wc.sendInputEvent({ type: 'char', keyCode: '\r' });
                wc.sendInputEvent({ type: 'keyUp', keyCode: 'Return' });
              } catch {}
            }, 300);
          }
        }
      }
    } catch (e) {
      console.warn('[AutoReply] Direct webContents dispatch failed:', e);
    }
  }
}

export const autoReplyManager = new AutoReplyManager();
