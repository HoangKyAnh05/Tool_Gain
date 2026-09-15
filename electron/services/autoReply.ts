import { BrowserWindow } from 'electron';
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

export class AutoReplyManager {
  private activePendingReplies: Map<string, PendingAutoReply> = new Map();
  private mainWindow: BrowserWindow | null = null;

  public setMainWindow(win: BrowserWindow) {
    this.mainWindow = win;
  }

  /**
   * Process an incoming message and trigger Auto-reply or Copilot review
   */
  public async handleIncomingMessage(
    platform: TargetPlatform,
    contactName: string,
    messageText: string,
    recentMessages: Array<{ sender: string; text: string }> = []
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

    const chosenReply = replyResponse.suggestedReplies[0] || 'Dạ em đã nhận được tin nhắn ạ.';

    // Check if auto-reply should be scheduled
    const isAutoReplyAllowed =
      settings.globalAutoReply &&
      contact.autoReplyEnabled &&
      replyResponse.recommendedAction === 'auto_reply';

    if (isAutoReplyAllowed) {
      this.scheduleAutoReply(platform, contactName, messageText, chosenReply, replyResponse.persona.autoDelaySeconds || 4);
    }

    // Broadcast new suggestion event to UI
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('event:new-suggestion', {
        platform,
        contactName,
        contactCategory: replyResponse.contactCategory,
        incomingMessage: messageText,
        replyResponse,
        isAutoReplyScheduled: isAutoReplyAllowed,
        scheduledDelay: isAutoReplyAllowed ? (replyResponse.persona.autoDelaySeconds || 4) : 0
      });
    }

    return replyResponse;
  }

  /**
   * Schedule auto-reply with countdown ticks
   */
  public scheduleAutoReply(
    platform: TargetPlatform,
    contactName: string,
    messageText: string,
    replyText: string,
    delaySeconds: number
  ) {
    const key = `${platform}_${contactName}`;
    this.cancelPending(key);

    const pendingId = `pending_${Date.now()}`;
    let remaining = Math.max(2, delaySeconds);

    const pendingItem: PendingAutoReply = {
      id: pendingId,
      platform,
      contactName,
      messageText,
      chosenReply: replyText,
      remainingSeconds: remaining,
      timer: null
    };

    const interval = setInterval(() => {
      remaining -= 1;
      pendingItem.remainingSeconds = remaining;

      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('event:auto-reply-tick', {
          key,
          pendingId,
          remainingSeconds: remaining,
          platform,
          contactName
        });
      }

      if (remaining <= 0) {
        clearInterval(interval);
        this.activePendingReplies.delete(key);
        this.executeSend(platform, contactName, replyText, true);
      }
    }, 1000);

    pendingItem.timer = interval;
    this.activePendingReplies.set(key, pendingItem);
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
   * Execute send message via Webview or Simulator
   */
  public executeSend(platform: TargetPlatform, contactName: string, textToSend: string, isAuto: boolean = false) {
    const contact = db.getOrCreateContact(platform, contactName);

    // Save log
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

    // Send IPC command to main window to dispatch to target webview
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('command:dispatch-send-to-webview', {
        platform,
        contactName,
        text: textToSend,
        isAuto
      });
    }
  }
}

export const autoReplyManager = new AutoReplyManager();
