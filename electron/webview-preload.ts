// @ts-ignore
const { ipcRenderer } = require('electron');

// Platform Detectors & Selectors Map
const PLATFORM_CONFIGS = {
  zalo: {
    name: 'Zalo Web',
    contactSelectors: [
      '#chatView .header-title .title',
      '.chat-header-title .truncate',
      '.chat-box-header .truncate',
      'div[data-id="header_name"]',
      '.conv-item.active .conv-item-title__name',
      'div[data-id="div_TabMsg_ConvItem"].active .conv-item-title__name',
      '.header-title'
    ],
    messageContainer: '#chatView, .chat-message-list, #messageViewContainer, .message-view__body',
    messageItem: '.chat-item, .msg-item, .chat-message-item, [data-id="div_MsgItem"]',
    userMessageClass: ['me', 'chat-item--right', 'is-me', 'me-msg'],
    inputSelector: '#input_chat, #chat-input-content, div[contenteditable="true"], .rich-input__editor',
    sendButtonSelector: '.btn-send, .chat-input-send-btn, [data-id="btn_send"]'
  },
  messenger: {
    name: 'Facebook Messenger',
    contactSelectors: [
      'div[role="main"] header h2 span',
      'div[role="main"] header h2',
      'div[role="main"] header span.x1lliihq',
      'div[role="main"] header a span',
      'header h2 span',
      'header h2',
      'div[role="main"] h2',
      'div[role="main"] span.x1lliihq',
      'div[data-testid="conversation_header"] span',
      'div[role="navigation"] [role="row"][aria-selected="true"] span'
    ],
    messageContainer: 'div[role="main"] div[role="grid"], div[data-testid="message_list"]',
    messageItem: 'div[role="row"], div[data-testid="message_container"]',
    userMessageClass: ['me', 'outgoing'],
    inputSelector: 'div[role="textbox"][contenteditable="true"], div[aria-label="Tin nhắn"], div[aria-label="Message"]',
    sendButtonSelector: 'div[aria-label="Nhấn Enter để gửi"], div[aria-label="Gửi"], div[aria-label="Press Enter to send"], div[aria-label="Send"]'
  },
  telegram: {
    name: 'Telegram Web',
    contactSelectors: [
      '.chat-info .peer-title',
      '.top .person .name',
      '.sidebar-header .user-title',
      '.chat-info .title',
      '.ChatInfo .title',
      '.chatlist-chat.is-selected .title',
      '.chatlist-chat.active .title'
    ],
    messageContainer: '.bubbles-inner, .messages-container, .history-container, .MessageList',
    messageItem: '.bubble, .message, .history-message, .Message',
    userMessageClass: ['is-out', 'own', 'is-outgoing'],
    inputSelector: '#editable-message-text, .input-message-input, div[contenteditable="true"].form-control',
    sendButtonSelector: '.btn-send, .send, .btn-icon.tgico-send'
  }
};

let currentPlatform: 'zalo' | 'messenger' | 'telegram' = 'zalo';
if (window.location.hostname.includes('facebook') || window.location.hostname.includes('messenger')) {
  currentPlatform = 'messenger';
} else if (window.location.hostname.includes('telegram')) {
  currentPlatform = 'telegram';
} else if (window.location.hostname.includes('zalo')) {
  currentPlatform = 'zalo';
}

console.log(`[AI Assistant Webview Preload] Initialized for ${currentPlatform} on ${window.location.href}`);

function isTimestampOrMetadata(text: string): boolean {
  if (!text) return true;
  const s = text.trim().toLowerCase();
  if (s.length === 0) return true;
  if (/^(\d{1,2}:\d{2}(\s*(am|pm|ch|sa))?)$/i.test(s)) return true;
  if (/^(đã gửi|đã nhận|đã xem|seen|delivered|sent)?\s*\d+\s*(phút|giờ|ngày|giây|m|h|d|s|min|mins|hour|hours)?\s*(trước|ago)?$/i.test(s)) return true;
  if (/^(đã gửi|đã nhận|đã xem|seen|delivered|sent|vừa xong|just now|active now|đang hoạt động|hoạt động\s+\d+.*)$/i.test(s)) return true;
  if (/^(thứ\s+(hai|ba|tư|năm|sáu|bảy)|chủ nhật|hôm qua|hôm nay)(\s+\d{1,2}:\d{2})?$/i.test(s)) return true;
  if (/^đã bày tỏ cảm xúc/i.test(s)) return true;
  if (/^(đã chỉnh sửa|edited)$/i.test(s)) return true;
  return false;
}

// Helper: Clean raw text
function cleanMessageText(text: string): string {
  if (!text) return '';
  let t = text.trim();
  if (isTimestampOrMetadata(t)) return '';

  t = t.replace(/^(nhập,\s*)?(tin nhắn\s+(do|của)|message from)\s+[^:]*gửi lúc[^:]*:/i, '');
  t = t.replace(/^(nhập,\s*)?(tin nhắn\s+(do|của)|message from)\s+[^:]*:/i, '');
  t = t.replace(/^(bạn đã gửi|you sent)(\s+lúc[^:]*)?:/i, '');
  t = t.replace(/\b(thứ\s+(hai|ba|tư|năm|sáu|bảy)|chủ nhật)\s+\d{1,2}:\d{2}(ch|sa|am|pm)?/gi, '');
  t = t.replace(/\b\d{1,2}:\d{2}\s*(am|pm|ch|sa)?\b/gi, '');
  t = t.replace(/\b(đã nhận|đã gửi|đã xem|seen|delivered|sent|đã bày tỏ cảm xúc.*)\b/gi, '');
  t = t.replace(/\b\d+\s*(phút|giờ|ngày|giây)\s*trước\b/gi, '');
  t = t.replace(/^\s*\d{1,2}(:\d{2})?\s*(ch|sa|am|pm)?\s*:\s*/i, '');
  t = t.replace(/^\s*[:\d\w]+\s*:\s*/i, '');
  t = t.trim();

  if (isTimestampOrMetadata(t)) return '';
  return t;
}

function isInsideSidebar(el: HTMLElement | null): boolean {
  if (!el) return false;
  if (el.closest('div[role="navigation"], nav, [aria-label*="Đoạn chat"], [aria-label*="Chats"], [data-testid="mwthreadlist"], [data-testid="MWThreadList"], #conversationList, .chat-list, .chatlist')) {
    return true;
  }
  const mainChat = el.closest('div[role="main"], #chatView, .chat-info, .bubbles-inner, .messages-container, .MessageList');
  if (!mainChat) {
    const r = el.getBoundingClientRect();
    if (r.left < 380) return true;
  }
  return false;
}

// @ts-ignore
if (!window.__ai_contact_cache) window.__ai_contact_cache = {};

// Helper: Extract current active contact name across all channels
function getActiveContactName(): string {
  if (currentPlatform === 'messenger') {
    const curPath = window.location.pathname;
    const winWidth = window.innerWidth || 1200;
    const navSidebar = document.querySelector('div[role="navigation"], nav, [aria-label*="Đoạn chat"], [aria-label*="Chats"], [data-testid="mwthreadlist"]');
    let minChatX = 340;
    if (navSidebar) {
      const nr = navSidebar.getBoundingClientRect();
      if (nr.width > 80) minChatX = nr.right;
    } else {
      minChatX = Math.max(320, winWidth * 0.28);
    }

    let contactName = '';

    // Priority 1: Inside div[role="main"] Header (100% Guaranteed Active Chat)
    const mainContainer = document.querySelector('div[role="main"]');
    if (mainContainer) {
      const headerEl = mainContainer.querySelector('header, [role="banner"], div[role="region"] header') || mainContainer;
      const nameNodes = Array.from(headerEl.querySelectorAll('h1, h2, h3, a[role="link"] span, span[dir="auto"], span')).filter(el => {
        const r = el.getBoundingClientRect();
        return r.top >= 0 && r.top <= 90 && r.height >= 12;
      });

      for (const node of nameNodes) {
        const t = (node.textContent || '').trim();
        const lt = t.toLowerCase();
        if (t.length >= 2 && t.length <= 45 &&
            !/^(hoạt động|active|đang hoạt động|messenger|bắt đầu|cuộc gọi|video|thông tin|aa|tìm kiếm|nhập|chi tiết|tùy chỉnh)/i.test(lt) &&
            !['bạn', 'gửi', 'bạn:', 'bạn đã gửi', 'đoạn chat', 'tin nhắn', 'tìm kiếm'].includes(lt) &&
            !/^\d{1,2}:\d{2}/.test(t) &&
            !/\d+\s*(giờ|phút|ngày|tuần|giây|m|h|d|s|min)/.test(t) &&
            !/^đã bày tỏ cảm xúc/i.test(t)) {
          if (!node.querySelector('h1, h2, h3, span[dir="auto"]')) {
            contactName = t.replace(/\.\.\.$/, '').trim();
            break;
          }
        }
      }
    }

    // Priority 2: Middle Header Status Proximity (strictly outside sidebar)
    if (!contactName) {
      const statusNodes = Array.from(document.querySelectorAll('span, div, p')).filter(el => {
        if (isInsideSidebar(el as HTMLElement)) return false;
        const t = (el.textContent || '').trim();
        const r = el.getBoundingClientRect();
        return r.top >= 0 && r.top <= 90 && r.left >= minChatX &&
               /^(hoạt động|đang hoạt động|active|vừa mới|trực tuyến|\d+\s*(thành viên|members)|active\s+\d+)/i.test(t);
      });

      for (const stNode of statusNodes) {
        let curr: HTMLElement | null = stNode.parentElement;
        for (let depth = 0; depth < 5 && curr; depth++) {
          if (isInsideSidebar(curr)) break;
          const candidates = Array.from(curr.querySelectorAll('span[dir="auto"], h1, h2, h3, a span, span'));
          for (const cand of candidates) {
            const t = cand.textContent?.trim() || '';
            const lt = t.toLowerCase();
            if (t.length >= 2 && t.length <= 45 &&
                !/^(hoạt động|active|đang hoạt động|messenger|bắt đầu|cuộc gọi|video|thông tin|aa)/i.test(lt)) {
              contactName = t.replace(/\.\.\.$/, '').trim();
              break;
            }
          }
          if (contactName) break;
          curr = curr.parentElement;
        }
        if (contactName) break;
      }
    }

    // Priority 3: Geometric middle header text scan
    if (!contactName) {
      const allHeaderTexts = Array.from(document.querySelectorAll('span, a, h1, h2, h3')).filter(el => {
        if (isInsideSidebar(el as HTMLElement)) return false;
        const r = el.getBoundingClientRect();
        return r.top >= 0 && r.top <= 80 && r.left >= minChatX && r.right <= winWidth - 70 && r.height >= 14;
      });

      for (const el of allHeaderTexts) {
        const txt = el.textContent?.trim() || '';
        const lt = txt.toLowerCase();
        if (txt.length >= 2 && txt.length <= 45 &&
            !/^(hoạt động|active|đang hoạt động|messenger|tin nhắn|đoạn chat|tìm kiếm|chi tiết|thông tin|aa)/i.test(lt) &&
            !['bạn', 'gửi', 'cuộc gọi', 'video', 'gọi thoại', 'gọi video', 'bắt đầu cuộc gọi thoại', 'bắt đầu gọi video'].includes(lt)) {
          if (!el.querySelector('span, a, h1, h2, h3')) {
            contactName = txt.replace(/\.\.\.$/, '').trim();
            break;
          }
        }
      }
    }

    // Priority 4: Right Details Panel (if opened)
    if (!contactName) {
      const detailsPanel = document.querySelector('div[role="complementary"], [aria-label*="Thông tin về đoạn chat"], [aria-label*="Chat details"], [aria-label*="Chi tiết"]');
      if (detailsPanel) {
        const dHeadings = Array.from(detailsPanel.querySelectorAll('h1, h2, h3, a span, span[dir="auto"], span'));
        for (const dh of dHeadings) {
          const t = dh.textContent?.trim() || '';
          const lt = t.toLowerCase();
          if (t.length >= 2 && t.length <= 45 &&
              !/^(hoạt động|active|thông tin|tùy chỉnh|file|quyền riêng tư|trang cá nhân|tắt thông báo|tìm kiếm|thành viên)/i.test(lt)) {
            contactName = t;
            break;
          }
        }
      }
    }

    // Priority 4: Left sidebar active/selected thread item (only matching curPath)
    if (!contactName && curPath && curPath.length > 3 && curPath !== '/') {
      const activeLink = document.querySelector('div[role="navigation"] a[href*="' + curPath + '"]');
      if (activeLink) {
        const spans = Array.from(activeLink.querySelectorAll('span[dir="auto"], span'));
        for (const sp of spans) {
          const t = sp.textContent?.trim() || '';
          const lt = t.toLowerCase();
          if (t && t.length >= 2 && t.length <= 45 &&
              !['bạn', 'gửi', 'bạn:', 'bạn đã gửi', 'đoạn chat', 'tin nhắn', 'tìm kiếm'].includes(lt) &&
              !/^\d{1,2}:\d{2}/.test(t) &&
              !/\d+\s*(giờ|phút|ngày|tuần|giây|m|h|d|s|min)/.test(t) &&
              !/^đã bày tỏ cảm xúc/i.test(t) &&
              !/^(đã gửi|đã nhận|đã xem|seen|delivered|sent)/i.test(t)) {
            contactName = t;
            break;
          }
        }
      }
    }

    // Priority 5: document.title
    if (!contactName) {
      const docTitle = document.title || '';
      if (docTitle) {
        let cleanT = docTitle.replace(/^\(\d+\+?\)\s*/, '').trim();
        cleanT = cleanT.replace(/\s*[|\-–—]\s*(Messenger|Facebook|Meta).*$/i, '').trim();
        const lowerT = cleanT.toLowerCase();
        if (cleanT && cleanT.length >= 2 && !['messenger', 'facebook', 'tin nhắn', 'chats', 'inbox', 'đoạn chat'].includes(lowerT) && !lowerT.startsWith('hoạt động') && !lowerT.startsWith('active')) {
          contactName = cleanT;
        }
      }
    }

    // Channel 5: URL-to-Name cache lookup / store
    // @ts-ignore
    if (contactName && curPath && curPath !== '/') {
      // @ts-ignore
      window.__ai_contact_cache[curPath] = contactName;
      // @ts-ignore
    } else if (!contactName && curPath && window.__ai_contact_cache[curPath]) {
      // @ts-ignore
      contactName = window.__ai_contact_cache[curPath];
    }

    if (contactName) {
      // @ts-ignore
      window.__ai_last_contact = contactName;
      return contactName;
    }

    // @ts-ignore
    return window.__ai_last_contact || '';
  } else if (currentPlatform === 'zalo') {
    const zaloSelectors = [
      '#chatView .header-title .title',
      '.chat-header-title .truncate',
      '.chat-box-header .truncate',
      'div[data-id="header_name"]',
      '.conv-item.active .conv-item-title__name',
      '.header-title'
    ];
    for (const sel of zaloSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent) {
        const text = el.textContent.trim();
        if (text && text !== 'Zalo' && text !== 'Chats') return text;
      }
    }
  } else if (currentPlatform === 'telegram') {
    const teleSelectors = [
      '.chat-info .peer-title',
      '.top .person .name',
      '.sidebar-header .user-title',
      '.chat-info .title',
      '.ChatInfo .title',
      '.chatlist-chat.is-selected .title',
      '.chatlist-chat.active .title'
    ];
    for (const sel of teleSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent) {
        const text = el.textContent.trim();
        if (text && text !== 'Telegram') return text;
      }
    }
  }

  return '';
}

// Helper: Extract recent messages in active conversation
function getRecentMessages(limit = 12): Array<{ sender: string; text: string }> {
  const results: Array<{ sender: string; text: string }> = [];

  if (currentPlatform === 'messenger') {
    const winWidth = window.innerWidth || 1200;
    const winHeight = window.innerHeight || 800;
    const minChatX = winWidth * 0.18;

    const allNodes = Array.from(document.querySelectorAll('div[dir="auto"], span[dir="auto"]'));
    const messageNodes = allNodes.filter(el => {
      const r = el.getBoundingClientRect();
      const isMiddle = r.top >= 70 && r.bottom <= winHeight - 65 && r.left >= minChatX && r.height > 10;
      return isMiddle &&
             !el.closest('div[role="complementary"]') &&
             !el.closest('div[aria-label*="Thông tin"]') &&
             !el.closest('div[aria-label*="Details"]') &&
             !el.closest('footer') &&
             !el.closest('form') &&
             !el.closest('[role="textbox"]') &&
             !el.closest('[aria-label*="Nhấn Enter"]') &&
             !el.closest('[aria-label*="Press Enter"]') &&
             !el.closest('[aria-label*="Gửi"]') &&
             !el.closest('[aria-label*="Send"]');
    });

    messageNodes.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

    const blacklist = [
      'nhấn enter để gửi', 'press enter to send', 'gửi', 'send',
      'đang hoạt động', 'active now', 'thông tin về đoạn chat', 'tùy chỉnh đoạn chat',
      'file phương tiện và file', 'file phương tiện', 'quyền riêng tư và hỗ trợ',
      'quyền riêng tư', 'bạn', 'messenger', 'tìm kiếm trên messenger',
      'tìm kiếm', 'search', 'xem trang cá nhân', 'nhập', 'được mã hóa đầu cuối',
      'aa', 'bắt đầu cuộc gọi', 'bắt đầu gọi video'
    ];

    const parsedItems: Array<{ sender: string; text: string }> = [];

    for (const el of messageNodes) {
      if (el.querySelector('div[dir="auto"], span[dir="auto"]')) continue;

      const rawText = el.textContent || '';
      const cleaned = cleanMessageText(rawText);
      if (!cleaned || cleaned.length < 1 || cleaned.length > 500) continue;
      const lower = cleaned.toLowerCase();
      if (blacklist.some(b => lower === b || lower.startsWith(b))) continue;

      let isUser = false;
      const r = el.getBoundingClientRect();
      if (r.left > minChatX + ((winWidth - minChatX) * 0.44)) {
        isUser = true;
      } else {
        const parentRow = el.closest('div[role="row"]') || el.closest('[data-testid="message_container"]') || el.parentElement;
        if (parentRow) {
          const aria = (parentRow.getAttribute('aria-label') || '') + ' ' + (parentRow.parentElement?.getAttribute('aria-label') || '');
          if (aria.includes('Bạn đã gửi') || aria.includes('You sent') || aria.includes('Outgoing') || parentRow.querySelector('[data-testid="outgoing_message"]')) {
            isUser = true;
          }
        }
      }

      parsedItems.push({
        sender: isUser ? 'user' : 'contact',
        text: cleaned
      });
    }

    // Deduplicate consecutive
    for (let i = 0; i < parsedItems.length; i++) {
      if (i === 0 || parsedItems[i].text !== parsedItems[i - 1].text || parsedItems[i].sender !== parsedItems[i - 1].sender) {
        results.push(parsedItems[i]);
      }
    }
  } else {
    const cfg = PLATFORM_CONFIGS[currentPlatform];
    const items = Array.from(document.querySelectorAll(cfg.messageItem)).slice(-limit);

    for (const item of items) {
      const textEl = item.querySelector('.bubble-content, .text, .chat-message-text, [dir="auto"], .text-content') || item;
      const rawText = textEl.textContent?.trim() || '';
      const cleaned = cleanMessageText(rawText);
      if (!cleaned) continue;

      let isUser = false;
      for (const cls of cfg.userMessageClass) {
        if (item.classList.contains(cls)) {
          isUser = true;
          break;
        }
      }
      results.push({
        sender: isUser ? 'user' : 'contact',
        text: cleaned
      });
    }
  }

  return results.slice(-limit);
}

// Helper: Insert text into contenteditable or input
function fillChatInput(text: string): boolean {
  const cfg = PLATFORM_CONFIGS[currentPlatform];
  const inputEl = (document.querySelector(cfg.inputSelector) as HTMLElement) || document.querySelector('div[contenteditable="true"]');
  if (!inputEl) {
    return false;
  }

  inputEl.focus();

  if (inputEl.tagName === 'INPUT' || inputEl.tagName === 'TEXTAREA') {
    (inputEl as HTMLInputElement).value = text;
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    document.execCommand('selectAll', false, undefined);
    document.execCommand('delete', false, undefined);
    document.execCommand('insertText', false, text);
  }

  return true;
}

// Helper: Send text
function sendChatMessage(text: string): boolean {
  const filled = fillChatInput(text);
  if (!filled) return false;

  const cfg = PLATFORM_CONFIGS[currentPlatform];
  setTimeout(() => {
    const sendBtn = document.querySelector(cfg.sendButtonSelector) as HTMLElement;
    if (sendBtn) {
      sendBtn.click();
    } else {
      const inputEl = (document.querySelector(cfg.inputSelector) as HTMLElement) || document.querySelector('div[contenteditable="true"]');
      if (inputEl) {
        inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        inputEl.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        inputEl.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      }
    }
  }, 150);

  return true;
}

// State tracking
let lastActiveContact = '';
let scanDebounceTimer: any = null;
const lastSeenIncomingMessageByContact: Record<string, string> = {};

// Core Scanner
function scanActiveConversation(force = false) {
  const contactName = getActiveContactName();
  if (!contactName) return;

  const contactChanged = contactName !== lastActiveContact;
  const recentMessages = getRecentMessages(12);
  const lastMsg = recentMessages.length > 0 ? recentMessages[recentMessages.length - 1] : null;

  if (force || contactChanged) {
    lastActiveContact = contactName;

    console.log(`[Webview Scanned] Active Chat: "${contactName}" | Messages: ${recentMessages.length}`);

    // If initial scan on this contact, record current last message so we don't trigger on old history
    if (lastMsg && lastMsg.sender === 'contact' && lastSeenIncomingMessageByContact[contactName] === undefined) {
      lastSeenIncomingMessageByContact[contactName] = lastMsg.text;
    }

    ipcRenderer.sendToHost('webview:active-chat-scanned', {
      platform: currentPlatform,
      contactName,
      lastMessage: '',
      recentMessages,
      timestamp: Date.now()
    });
  }

  // Check for newly arrived incoming messages from the other person
  if (lastMsg && lastMsg.sender === 'contact' && lastMsg.text) {
    const prevSeen = lastSeenIncomingMessageByContact[contactName];
    if (prevSeen !== undefined && prevSeen !== lastMsg.text) {
      lastSeenIncomingMessageByContact[contactName] = lastMsg.text;
      console.log(`[New Incoming Message from "${contactName}"]: "${lastMsg.text}"`);
      ipcRenderer.sendToHost('webview:incoming-message', {
        platform: currentPlatform,
        contactName,
        messageText: lastMsg.text,
        recentMessages,
        isNewIncoming: true,
        timestamp: Date.now()
      });
    } else if (prevSeen === undefined) {
      lastSeenIncomingMessageByContact[contactName] = lastMsg.text;
    }
  }
}

function requestScan(delay = 200) {
  clearTimeout(scanDebounceTimer);
  scanDebounceTimer = setTimeout(() => {
    scanActiveConversation();
  }, delay);
}

function extractTextFromClickTarget(target: HTMLElement | null): string {
  if (!target) return '';
  if (target.closest('input, textarea, [contenteditable="true"], button, header, footer, form, div[role="complementary"], [aria-label*="Thông tin"], [aria-label*="Details"], [aria-label*="Nhấn Enter"], [aria-label*="Press Enter"], [aria-label*="Gửi"], [aria-label*="Send"]')) {
    return '';
  }

  const textEl = (target.closest('div[dir="auto"], span[dir="auto"], .bubble-content, .text, .chat-message-text, .content-text, .text-content, .translatable-message') as HTMLElement) || target;
  let raw = textEl.textContent?.trim() || '';
  let cleaned = cleanMessageText(raw);

  if (!cleaned && target.parentElement) {
    const parentRow = (target.closest('div[role="row"], .chat-item, .bubble, .msg-item') as HTMLElement);
    if (parentRow) {
      const inner = parentRow.querySelector('div[dir="auto"], span[dir="auto"], .bubble-content, .text, .chat-message-text, .content-text')?.textContent || '';
      cleaned = cleanMessageText(inner);
    }
  }

  const lower = (cleaned || '').toLowerCase();
  if (lower === 'nhấn enter để gửi' || lower === 'gửi' || lower === 'send' || lower === 'press enter to send' || lower === 'aa') {
    return '';
  }

  return cleaned;
}

function setupUserInteractionListeners() {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target) {
      // If clicking inside navigation sidebar or thread list, request a rescan of active chat instead of message selection
      if (isInsideSidebar(target)) {
        requestScan(350);
        return;
      }

      const clickedMsg = extractTextFromClickTarget(target);
      const contact = getActiveContactName();
      if (clickedMsg && clickedMsg.length > 0 && contact) {
        console.log(`[Webview Bubble Clicked] Contact: "${contact}", Text: "${clickedMsg}"`);
        const recentMessages = getRecentMessages(12);
        try {
          ipcRenderer.sendToHost('webview:message-clicked', {
            platform: currentPlatform,
            contactName: contact,
            messageText: clickedMsg,
            recentMessages,
            timestamp: Date.now()
          });
          console.log('__AI_MSG_CLICKED__:' + JSON.stringify({
            platform: currentPlatform,
            contactName: contact,
            messageText: clickedMsg
          }));
        } catch (err) {
          console.warn('[Webview Click Error]:', err);
        }
      }
    }

    requestScan(200);
  }, true);

  window.addEventListener('hashchange', () => requestScan(250));
  window.addEventListener('popstate', () => requestScan(250));
}

function setupMutationObserver() {
  const observer = new MutationObserver(() => {
    requestScan(300);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

setInterval(() => {
  scanActiveConversation();
}, 1500);

ipcRenderer.on('host:fill-text', (_event: any, data: { text: string }) => {
  fillChatInput(data.text);
});

ipcRenderer.on('host:send-text', (_event: any, data: { text: string }) => {
  sendChatMessage(data.text);
});

ipcRenderer.on('host:request-active-context', () => {
  scanActiveConversation(true);
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setupUserInteractionListeners();
    setupMutationObserver();
    setTimeout(() => scanActiveConversation(true), 1200);
  });
} else {
  setupUserInteractionListeners();
  setupMutationObserver();
  setTimeout(() => scanActiveConversation(true), 1200);
}
