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

// Helper: Clean contact name from system wrappers and prefixes
function cleanContactName(raw: string): string {
  if (!raw) return '';
  let name = raw.trim();
  // Remove notification counts like (1), (99+), etc.
  name = name.replace(/^\(\d+\+?\)\s*/, '');
  // Remove Facebook / Messenger document title suffix
  name = name.replace(/\s*[|\-–—]\s*(Messenger|Facebook|Meta).*$/i, '');
  // Strip conversational prefixes in Vietnamese & English
  name = name.replace(/^(cuộc trò chuyện (với|của)|đoạn chat (với|của)|trò chuyện (với|của)|nhắn tin (với|của)|chat with|chats with|conversation with)\s+/i, '');
  // Strip trailing ellipses and punctuation
  name = name.replace(/[\.…]+$/, '').trim();
  name = name.replace(/\s+/g, ' ');
  return name;
}

function isValidContactName(name: string): boolean {
  if (!name || name.length < 2 || name.length > 50) return false;
  const lower = name.toLowerCase();
  const blacklist = [
    'messenger', 'facebook', 'bạn', 'gửi', 'cuộc gọi', 'video', 'gọi thoại', 'gọi video',
    'bắt đầu cuộc gọi thoại', 'bắt đầu gọi video', 'thông tin', 'thông tin về đoạn chat',
    'tùy chỉnh đoạn chat', 'chi tiết', 'tìm kiếm', 'tìm kiếm trên messenger',
    'aa', 'trực tuyến', 'hoạt động', 'đang hoạt động', 'active now', 'active',
    'vừa xong', 'just now', 'thành viên', 'members', 'tin nhắn', 'đoạn chat',
    'file phương tiện', 'quyền riêng tư', 'trang cá nhân', 'xem trang cá nhân'
  ];
  if (blacklist.includes(lower)) return false;
  if (/^(hoạt động|đang hoạt động|active|trực tuyến)/i.test(lower)) return false;
  if (/^\d{1,2}:\d{2}/.test(lower)) return false;
  return true;
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
  return Boolean(el.closest('div[role="navigation"], nav, [aria-label*="Đoạn chat"], [aria-label*="Chats"], [data-testid="mwthreadlist"]'));
}

// @ts-ignore
if (!window.__ai_contact_cache) window.__ai_contact_cache = {};

// Helper: Extract current active contact name across all channels
function getActiveContactName(): string {
  if (currentPlatform === 'messenger') {
    const curPath = window.location.pathname;
    const winWidth = window.innerWidth || 1200;
    
    // Clear stale contact if chat URL path changed
    // @ts-ignore
    if (window.__ai_last_chat_path !== curPath) {
      // @ts-ignore
      window.__ai_last_chat_path = curPath;
      // @ts-ignore
      window.__ai_last_contact = '';
    }

    const navSidebar = document.querySelector('div[role="navigation"], nav, [aria-label*="Đoạn chat"], [aria-label*="Chats"], [data-testid="mwthreadlist"]');
    let minChatX = 320;
    if (navSidebar) {
      const nr = navSidebar.getBoundingClientRect();
      if (nr.width > 80) minChatX = nr.right;
    } else {
      minChatX = Math.max(300, winWidth * 0.3);
    }

    let contactName = '';

    // Priority 1: Direct Main Header check
    const mainHeaders = Array.from(document.querySelectorAll('div[role="main"] header, [role="main"] div[role="banner"], div[role="main"] [data-testid="conversation_header"], header'));
    for (const hdr of mainHeaders) {
      if (isInsideSidebar(hdr as HTMLElement)) continue;
      const hr = hdr.getBoundingClientRect();
      if (hr.top > 100 || hr.left < minChatX - 50) continue;
      
      const candidates = Array.from(hdr.querySelectorAll('h1, h2, h3, a[role="link"] span, span[dir="auto"], [dir="auto"]'));
      for (const cand of candidates) {
        const cleaned = cleanContactName(cand.textContent || '');
        if (isValidContactName(cleaned)) {
          contactName = cleaned;
          break;
        }
      }
      if (contactName) break;
    }

    // Priority 2: Middle Header Status Proximity (deep parent walk)
    if (!contactName) {
      const statusNodes = Array.from(document.querySelectorAll('span, div, p')).filter(el => {
        if (isInsideSidebar(el as HTMLElement)) return false;
        const t = (el.textContent || '').trim();
        const r = el.getBoundingClientRect();
        return r.top >= 0 && r.top <= 90 && r.left >= minChatX - 40 &&
               /^(hoạt động|đang hoạt động|active|vừa mới|trực tuyến|\d+\s*(thành viên|members)|active\s+\d+)/i.test(t);
      });

      for (const stNode of statusNodes) {
        let curr: HTMLElement | null = stNode.parentElement;
        for (let depth = 0; depth < 5 && curr; depth++) {
          const candidates = Array.from(curr.querySelectorAll('span[dir="auto"], h1, h2, h3, a span, span'));
          for (const cand of candidates) {
            const cleaned = cleanContactName(cand.textContent || '');
            if (isValidContactName(cleaned)) {
              contactName = cleaned;
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
        return r.top >= 0 && r.top <= 85 && r.left >= minChatX && r.right <= winWidth - 70 && r.height >= 14;
      });

      for (const el of allHeaderTexts) {
        if (el.querySelector('span, a, h1, h2, h3')) continue;
        const cleaned = cleanContactName(el.textContent || '');
        if (isValidContactName(cleaned)) {
          contactName = cleaned;
          break;
        }
      }
    }

    // Priority 4: Left sidebar active/selected thread item
    if (!contactName) {
      const activeLink = document.querySelector('div[role="navigation"] [role="row"][aria-selected="true"], div[role="navigation"] a[aria-current="page"]' + (curPath && curPath.length > 3 && curPath !== '/' ? `, div[role="navigation"] a[href*="${curPath}"]` : ''));
      if (activeLink) {
        const ariaLabel = activeLink.getAttribute('aria-label') || '';
        const cleanedAria = cleanContactName(ariaLabel);
        if (isValidContactName(cleanedAria)) {
          contactName = cleanedAria;
        } else {
          const spans = Array.from(activeLink.querySelectorAll('span[dir="auto"], span'));
          for (const sp of spans) {
            const cleaned = cleanContactName(sp.textContent || '');
            if (isValidContactName(cleaned)) {
              contactName = cleaned;
              break;
            }
          }
        }
      }
    }

    // Priority 5: Right Details Panel (if opened)
    if (!contactName) {
      const detailsPanel = document.querySelector('div[role="complementary"], [aria-label*="Thông tin về đoạn chat"], [aria-label*="Chat details"], [aria-label*="Chi tiết"]');
      if (detailsPanel) {
        const dHeadings = Array.from(detailsPanel.querySelectorAll('h1, h2, h3, a span, span[dir="auto"], span'));
        for (const dh of dHeadings) {
          const cleaned = cleanContactName(dh.textContent || '');
          if (isValidContactName(cleaned)) {
            contactName = cleaned;
            break;
          }
        }
      }
    }

    // Priority 6: document.title
    if (!contactName) {
      const docTitle = document.title || '';
      if (docTitle) {
        const cleanedTitle = cleanContactName(docTitle);
        if (isValidContactName(cleanedTitle)) {
          contactName = cleanedTitle;
        }
      }
    }

    // Cache lookup / store
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

    return '';
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
        const cleaned = cleanContactName(el.textContent);
        if (isValidContactName(cleaned)) return cleaned;
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
        const cleaned = cleanContactName(el.textContent);
        if (isValidContactName(cleaned)) return cleaned;
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
      const isMiddle = r.top >= 70 && r.bottom <= winHeight - 45 && r.left >= minChatX && r.height > 10;
      return isMiddle &&
             !el.closest('div[role="complementary"]') &&
             !el.closest('div[aria-label*="Thông tin"]') &&
             !el.closest('div[aria-label*="Details"]') &&
             !el.closest('form');
    });

    messageNodes.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

    const blacklist = [
      'đang hoạt động', 'active now', 'thông tin về đoạn chat', 'tùy chỉnh đoạn chat',
      'file phương tiện và file', 'file phương tiện', 'quyền riêng tư và hỗ trợ',
      'quyền riêng tư', 'bạn', 'gửi', 'messenger', 'tìm kiếm trên messenger',
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
    inputEl.innerHTML = '';
    document.execCommand('insertText', false, text);
    inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
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
let lastScannedMessageText = '';
let scanDebounceTimer: any = null;

// Core Scanner
function scanActiveConversation(force = false) {
  const contactName = getActiveContactName();
  if (!contactName) return;

  const recentMessages = getRecentMessages(12);
  const lastMsg = recentMessages.length > 0 ? recentMessages[recentMessages.length - 1] : null;
  const lastText = lastMsg ? lastMsg.text : '';

  const contactChanged = contactName !== lastActiveContact;
  const messageChanged = lastText !== lastScannedMessageText;

  if (force || contactChanged || (messageChanged && lastText.length > 0)) {
    lastActiveContact = contactName;
    lastScannedMessageText = lastText;

    console.log(`[Webview Scanned] Active Chat: "${contactName}" | Messages: ${recentMessages.length} | Last: "${lastText}"`);

    if (lastMsg && lastMsg.sender === 'contact' && messageChanged) {
      ipcRenderer.sendToHost('webview:incoming-message', {
        platform: currentPlatform,
        contactName,
        messageText: lastText,
        recentMessages,
        timestamp: Date.now()
      });
    } else {
      ipcRenderer.sendToHost('webview:active-chat-scanned', {
        platform: currentPlatform,
        contactName,
        lastMessage: lastText,
        recentMessages,
        timestamp: Date.now()
      });
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
  if (target.closest('input, textarea, [contenteditable="true"], button, header, form, div[role="complementary"], [aria-label*="Thông tin"], [aria-label*="Details"]')) {
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

  return cleaned;
}

function setupUserInteractionListeners() {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target) {
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

    requestScan(150);
    requestScan(500);
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
