// @ts-ignore
const { ipcRenderer } = require('electron');

let currentPlatform: 'zalo' | 'messenger' | 'telegram' = 'messenger';
if (window.location.hostname.includes('facebook') || window.location.hostname.includes('messenger')) {
  currentPlatform = 'messenger';
} else if (window.location.hostname.includes('zalo')) {
  currentPlatform = 'zalo';
} else if (window.location.hostname.includes('telegram')) {
  currentPlatform = 'telegram';
}

console.log('[Webview Preload Clean v3] Running for:', currentPlatform, window.location.hostname);

function isNoiseOrTimestamp(text: string): boolean {
  if (!text) return true;
  const s = text.trim().toLowerCase();
  if (s.length === 0) return true;
  if (/^(\d{1,2}:\d{2}(\s*(am|pm|ch|sa))?)$/i.test(s)) return true;
  if (/^(đã gửi|đã nhận|đã xem|seen|delivered|sent|vừa xong|just now|active now|đang hoạt động|hoạt động\s+\d+.*)$/i.test(s)) return true;
  if (/^\d+\s*(phút|giờ|ngày|giây|m|h|d|s|min|mins|hour|hours)\s*(trước|ago)?$/i.test(s)) return true;
  if (/^(thứ\s+(hai|ba|tư|năm|sáu|bảy)|chủ nhật|hôm qua|hôm nay)(\s+\d{1,2}:\d{2})?$/i.test(s)) return true;
  if (/^đã bày tỏ cảm xúc/i.test(s)) return true;
  if (/^(đã chỉnh sửa|edited)$/i.test(s)) return true;
  return false;
}

function cleanText(raw: string): string {
  if (!raw) return '';
  let t = raw.trim();
  if (isNoiseOrTimestamp(t)) return '';

  t = t.replace(/^(nhập,\s*)?(tin nhắn\s+(do|của)|message from)\s+[^:]*gửi lúc[^:]*:/i, '');
  t = t.replace(/^(nhập,\s*)?(tin nhắn\s+(do|của)|message from)\s+[^:]*:/i, '');
  t = t.replace(/^(bạn đã gửi|you sent)(\s+lúc[^:]*)?:/i, '');
  t = t.replace(/\b(thứ\s+(hai|ba|tư|năm|sáu|bảy)|chủ nhật)\s+\d{1,2}:\d{2}(ch|sa|am|pm)?/gi, '');
  t = t.replace(/\b\d{1,2}:\d{2}\s*(am|pm|ch|sa)?\b/gi, '');
  t = t.replace(/\b(đã nhận|đã gửi|đã xem|seen|delivered|sent)\b/gi, '');
  t = t.replace(/\b\d+\s*(phút|giờ|ngày|giây)\s*trước\b/gi, '');
  t = t.replace(/^\s*[:\d\w]+\s*:\s*/i, '');
  t = t.trim();

  if (isNoiseOrTimestamp(t)) return '';
  return t;
}

function getActiveContactName(): string {
  try {
    if (currentPlatform === 'messenger') {
      // Priority 1: document.title
      if (document.title) {
        let title = document.title.replace(/^\(\d+\+?\)\s*/, '').trim();
        title = title.replace(/\s*[|·\-–—]\s*(Messenger|Facebook|Meta).*$/i, '').trim();
        title = title.replace(/\s+(đã gửi.*|sent you.*)$/i, '').trim();
        const lt = title.toLowerCase();
        if (title && title.length >= 2 && !['messenger', 'facebook', 'chats', 'đoạn chat', 'tin nhắn', 'hộp thư', 'đi đến bảng feed', 'bảng feed'].includes(lt) && !lt.startsWith('hoạt động') && !lt.startsWith('active')) {
          return title;
        }
      }

      // Priority 2: Status sibling ("Đang hoạt động" / "Active now" / "Cuộc gọi đang diễn ra")
      const statusEls = Array.from(document.querySelectorAll('span, div')).filter(el => {
        const t = (el.textContent || '').trim();
        return /^(đang hoạt động|active now|hoạt động\s+\d+.*|active\s+\d+.*|cuộc gọi\s+.*)$/i.test(t);
      });
      for (const st of statusEls) {
        const parent = st.parentElement;
        if (parent) {
          const cand = Array.from(parent.querySelectorAll('h1, h2, h3, a span, span[dir="auto"], span')).filter(c => c !== st && !c.contains(st));
          for (const c of cand) {
            const t = (c.textContent || '').trim();
            const lt = t.toLowerCase();
            if (t && t.length >= 2 && t.length <= 50 && !/^(đang hoạt động|active|messenger|cuộc gọi|đi đến bảng feed|bảng feed|useful)/i.test(lt)) {
              return t.replace(/\.\.\.$/, '').trim();
            }
          }
        }
      }

      // Priority 3: Header elements in div[role="main"]
      const headerNodes = document.querySelectorAll('div[role="main"] h1, div[role="main"] h2, div[role="main"] span[dir="auto"], div[role="main"] a[role="link"] span, header h2');
      for (const el of headerNodes) {
        const t = (el.textContent || '').trim();
        const lt = t.toLowerCase();
        if (t && t.length >= 2 && t.length <= 50 &&
            !/^(hoạt động|active|messenger|đang hoạt động|cuộc gọi|tìm kiếm|chi tiết|aa|bạn|thông tin|tùy chỉnh|đi đến bảng feed|bảng feed|useful)/i.test(lt)) {
          return t.replace(/\.\.\.$/, '').trim();
        }
      }

      // Priority 4: Active sidebar item
      const activeItem = document.querySelector('div[role="navigation"] a[aria-current="page"], a[href*="/t/"][aria-selected="true"], [role="row"][aria-selected="true"]');
      if (activeItem) {
        const span = activeItem.querySelector('span[dir="auto"], h2, a span');
        const t = (span?.textContent || '').trim();
        if (t && t.length >= 2 && t.length <= 50 && !/^\d{1,2}:\d{2}/.test(t)) {
          return t;
        }
      }
    } else if (currentPlatform === 'zalo') {
      const zaloSelectors = [
        '#chatView .header-title .title',
        '.chat-header-title .truncate',
        'div[data-id="header_name"]',
        '.conv-item.active .conv-item-title__name',
        '.header-title'
      ];
      for (const sel of zaloSelectors) {
        const el = document.querySelector(sel);
        const t = (el?.textContent || '').trim();
        if (t && t !== 'Zalo' && t !== 'Chats') return t;
      }
    } else if (currentPlatform === 'telegram') {
      const teleSelectors = [
        '.chat-info .peer-title',
        '.top .person .name',
        '.sidebar-header .user-title',
        '.chat-info .title',
        '.ChatInfo .title'
      ];
      for (const sel of teleSelectors) {
        const el = document.querySelector(sel);
        const t = (el?.textContent || '').trim();
        if (t && t !== 'Telegram') return t;
      }
    }
  } catch (err) {
    console.warn('[Webview] getActiveContactName error:', err);
  }
  return '';
}

function isLeafTextElement(el: HTMLElement): boolean {
  if (!el.textContent?.trim()) return false;
  for (let i = 0; i < el.children.length; i++) {
    const child = el.children[i] as HTMLElement;
    if (child.textContent && child.textContent.trim().length > 0 && child.tagName !== 'IMG' && child.tagName !== 'BR') {
      return false;
    }
  }
  return true;
}

function getRecentMessages(limit = 10): Array<{ sender: string; text: string }> {
  const list: Array<{ sender: string; text: string }> = [];

  try {
    if (currentPlatform === 'messenger') {
      const inputEl = document.querySelector('div[role="textbox"][contenteditable="true"], div[contenteditable="true"], input, textarea') as HTMLElement | null;
      let minChatX = 0;
      let maxChatX = window.innerWidth;
      let chatCenterX = window.innerWidth * 0.5;
      let inputTop = window.innerHeight;

      if (inputEl) {
        const inputRect = inputEl.getBoundingClientRect();
        minChatX = inputRect.left - 120;
        maxChatX = inputRect.right + 120;
        chatCenterX = inputRect.left + inputRect.width * 0.5;
        inputTop = inputRect.top;
      } else {
        const main = document.querySelector('div[role="main"], main') || document.body;
        const mainRect = main.getBoundingClientRect();
        minChatX = mainRect.left;
        maxChatX = mainRect.right;
        chatCenterX = mainRect.left + (mainRect.width > 0 ? mainRect.width * 0.5 : 350);
      }

      // Find all potential text elements inside main chat area
      const main = document.querySelector('div[role="main"], main') || document.body;
      const textNodes = Array.from(main.querySelectorAll('div[dir="auto"], span[dir="auto"], p, span, div'));
      const candidates: Array<{ el: HTMLElement; text: string; top: number; left: number }> = [];

      for (const node of textNodes) {
        const el = node as HTMLElement;
        if (el.closest('div[role="textbox"], input, textarea, div[role="navigation"], header, [data-testid="mwthreadlist"], footer')) {
          continue;
        }

        if (!isLeafTextElement(el)) continue;

        const raw = el.textContent?.trim() || '';
        const c = cleanText(raw);
        if (!c || c.length < 1 || c.length > 800) continue;

        const lower = c.toLowerCase();
        if (['nhấn enter để gửi', 'gửi', 'send', 'press enter to send', 'aa', 'tin nhắn', 'tìm kiếm', 'đang hoạt động', 'active now', 'cuộc gọi', 'thông tin về đoạn chat', 'tùy chỉnh đoạn chat', 'file phương tiện và file', 'quyền riêng tư và hỗ trợ'].includes(lower)) {
          continue;
        }

        const rect = el.getBoundingClientRect();
        if (rect.height === 0 || rect.width === 0) continue;

        // Must be vertically above the chat input box and below the top header
        if (rect.top > inputTop + 10 || rect.top < 60) continue;

        // Must be horizontally within the chat column
        if (rect.left < minChatX || rect.right > maxChatX) continue;

        candidates.push({
          el,
          text: c,
          top: rect.top,
          left: rect.left + rect.width / 2
        });
      }

      // Sort chronologically from top to bottom
      candidates.sort((a, b) => a.top - b.top);

      for (let i = 0; i < candidates.length; i++) {
        const item = candidates[i];
        if (i > 0 && item.text === candidates[i - 1].text && Math.abs(item.top - candidates[i - 1].top) < 18) {
          continue;
        }

        // Determine if outgoing (sent by user)
        const isRightPosition = item.left > chatCenterX;
        const isAriaSent = Boolean(
          item.el.closest('[aria-label*="Bạn đã gửi" i], [aria-label*="You sent" i], [data-testid="outgoing_message"]')
        );

        let isColorBlue = false;
        let p: HTMLElement | null = item.el;
        let depth = 0;
        while (p && p !== main && depth < 6) {
          const bg = window.getComputedStyle(p).backgroundColor;
          if (bg && (bg.includes('rgb(0, 132, 255)') || bg.includes('rgb(0, 120, 255)') || bg.includes('rgb(124, 58, 237)'))) {
            isColorBlue = true;
            break;
          }
          p = p.parentElement;
          depth++;
        }

        const isOutgoing = isAriaSent || isColorBlue || isRightPosition;

        list.push({
          sender: isOutgoing ? 'user' : 'contact',
          text: item.text
        });
      }
    } else if (currentPlatform === 'zalo') {
      const items = Array.from(document.querySelectorAll('.chat-item, .msg-item, [data-id="div_MsgItem"]')).slice(-limit * 2);
      for (const item of items) {
        const textEl = item.querySelector('.bubble-content, .text, .chat-message-text') || item;
        const c = cleanText(textEl.textContent || '');
        if (!c) continue;
        const isMe = item.classList.contains('me') || item.classList.contains('chat-item--right') || item.classList.contains('is-me');
        list.push({ sender: isMe ? 'user' : 'contact', text: c });
      }
    } else if (currentPlatform === 'telegram') {
      const items = Array.from(document.querySelectorAll('.bubble, .message, .Message')).slice(-limit * 2);
      for (const item of items) {
        const textEl = item.querySelector('.message-content, .text-content, .translatable-message') || item;
        const c = cleanText(textEl.textContent || '');
        if (!c) continue;
        const isMe = item.classList.contains('is-out') || item.classList.contains('own');
        list.push({ sender: isMe ? 'user' : 'contact', text: c });
      }
    }
  } catch (err) {
    console.warn('[Webview] getRecentMessages error:', err);
  }

  const deduped: Array<{ sender: string; text: string }> = [];
  for (let i = 0; i < list.length; i++) {
    if (i === 0 || list[i].text !== list[i - 1].text || list[i].sender !== list[i - 1].sender) {
      deduped.push(list[i]);
    }
  }

  return deduped.slice(-limit);
}

function insertAndSendText(text: string, insertOnly: boolean = false): boolean {
  if (!text || text.includes('AI chưa gen xong')) {
    if (text && text.includes('AI chưa gen xong')) {
      console.warn('[Webview] BLOCKED sending text containing "AI chưa gen xong"');
    }
    return false;
  }

  try {
    const input =
      (document.querySelector('div[role="textbox"][contenteditable="true"]') as HTMLElement) ||
      (document.querySelector('div[role="textbox"]') as HTMLElement) ||
      (document.querySelector('#input_chat') as HTMLElement) ||
      (document.querySelector('#editable-message-text') as HTMLElement) ||
      (document.querySelector('div[aria-label="Tin nhắn"][contenteditable="true"]') as HTMLElement) ||
      (document.querySelector('div[contenteditable="true"]') as HTMLElement) ||
      (document.querySelector('input[type="text"], textarea') as HTMLInputElement);

    if (!input) {
      console.warn('[Webview] Chat input not found');
      return false;
    }

    input.focus();

    if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
      const el = input as HTMLInputElement;
      el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      const sel = window.getSelection();
      if (sel) {
        const range = document.createRange();
        range.selectNodeContents(input);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      document.execCommand('selectAll', false, undefined);
      document.execCommand('delete', false, undefined);
      document.execCommand('insertText', false, text);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    if (!insertOnly) {
      setTimeout(() => {
        // 1. Try DOM send button click
        const sendBtn = (
          document.querySelector('div[aria-label*="Nhấn Enter để gửi" i]') ||
          document.querySelector('div[aria-label*="Press Enter to send" i]') ||
          document.querySelector('div[aria-label*="Gửi" i]') ||
          document.querySelector('div[aria-label*="Send" i]') ||
          document.querySelector('.btn-send, .chat-input-send-btn, [data-id="btn_send"], .tgico-send')
        ) as HTMLElement | null;

        if (sendBtn) {
          sendBtn.click();
          console.log('[Webview] Clicked send button successfully');
        } else {
          const enterOpts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
          input.dispatchEvent(new KeyboardEvent('keydown', enterOpts));
          input.dispatchEvent(new KeyboardEvent('keyup', enterOpts));
        }

        // 2. Fail-safe: notify host/main to dispatch hardware Return key event
        try {
          ipcRenderer.send('webview:request-hardware-enter');
        } catch {}
      }, 150);
    }
    return true;
  } catch (err) {
    console.warn('[Webview] insertAndSendText error:', err);
    return false;
  }
}

let lastContactName = '';
let lastAutoRepliedSig = '';
let lastUserCommandSig = '';

function runScan(force = false) {
  const contact = getActiveContactName();
  if (!contact) return;

  const messages = getRecentMessages(10);
  const contactChanged = contact !== lastContactName;

  if (contactChanged) {
    lastContactName = contact;
    console.log(`[Webview] Active chat switched to: "${contact}" (${messages.length} msgs)`);
  }

  // Detect user signals '.' or '...'
  const userOnly = messages.filter(m => m.sender === 'user');
  if (userOnly.length > 0) {
    const lastUserText = (userOnly[userOnly.length - 1].text || '').trim();
    const isSignal = lastUserText === '.' || lastUserText === '..' || lastUserText === '...' || lastUserText === '…';
    const userSig = `${contact}:::${lastUserText}:::${userOnly.length}`;

    if (lastUserCommandSig !== '' && isSignal && lastUserCommandSig !== userSig) {
      lastUserCommandSig = userSig;
      console.log(`[Webview] User signal detected: "${lastUserText}"`);
      ipcRenderer.sendToHost('webview:user-signal-command', {
        platform: currentPlatform,
        contactName: contact,
        text: lastUserText
      });
    } else if (lastUserCommandSig === '') {
      lastUserCommandSig = userSig;
    }
  }

  // Find the latest message in the chat
  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
  const isIncomingLast = Boolean(lastMsg && lastMsg.sender === 'contact');
  const incomingText = isIncomingLast ? (lastMsg!.text || '').trim() : '';

  const updatePayload = {
    platform: currentPlatform,
    contactName: contact,
    recentMessages: messages,
    lastIncomingMessage: incomingText
  };
  try { ipcRenderer.send('webview:chat-update', updatePayload); } catch {}
  try { ipcRenderer.sendToHost('webview:chat-update', updatePayload); } catch {}

  // Auto-Reply Trigger:
  // If the last message in this active chat is from the contact,
  // and we haven't answered this exact message yet:
  if (isIncomingLast && incomingText) {
    const replySig = `${contact}:::${incomingText}`;
    if (replySig !== lastAutoRepliedSig) {
      lastAutoRepliedSig = replySig;
      console.log(`[Webview Auto-Reply Engine] >>> Triggering Auto-Reply for "${contact}": "${incomingText}"`);

      const incomingPayload = {
        platform: currentPlatform,
        contactName: contact,
        messageText: incomingText,
        recentMessages: messages
      };

      try {
        ipcRenderer.send('webview:incoming-message', incomingPayload);
      } catch (err) {
        console.warn('Failed to send webview:incoming-message to main:', err);
      }

      try {
        ipcRenderer.sendToHost('webview:chat-update', {
          ...updatePayload,
          isNewIncoming: true
        });
      } catch {}
    }
  }
}

let tickedContactsCache: string[] = [];
let lastTickedFetchTime = 0;
let lastSidebarRepliedSnippets: Record<string, string> = {};
let isSwitchingChat = false;

async function scanSidebarThreadsAndAutoReply() {
  if (isSwitchingChat) return;

  const now = Date.now();
  if (now - lastTickedFetchTime > 2500) {
    lastTickedFetchTime = now;
    try {
      tickedContactsCache = await ipcRenderer.invoke('app:get-ticked-contacts') || [];
    } catch {}
  }

  if (!tickedContactsCache || tickedContactsCache.length === 0) return;

  // Ultra-comprehensive thread selectors matching Messenger, Zalo, Telegram
  const threadElements = Array.from(document.querySelectorAll(
    'a[href*="/messages/"], a[href*="/t/"], div[role="grid"] [role="row"], div[role="navigation"] [role="row"], div[aria-label*="Đoạn chat" i] a, div[aria-label*="Chats" i] a, [data-testid="mwthreadlist"] a, .chat-item, .conv-item, .chatlist-chat'
  ));

  const currentContact = getActiveContactName() || '';
  const normalize = (s: string) => (s || '').toLowerCase().replace(/[\s\-_]+/g, '').trim();
  const currentNorm = normalize(currentContact);

  for (const thread of threadElements) {
    const textElements = Array.from(thread.querySelectorAll('span[dir="auto"], h2, h3, a span, span, div[dir="auto"]'))
      .map(el => cleanText(el.textContent || ''))
      .filter(t => t && t.length >= 2 && !/^\d{1,2}:\d{2}/.test(t));

    if (textElements.length === 0) continue;
    const name = textElements[0];
    const normName = normalize(name);

    // Check if this contact has Auto-Reply ticked in DB
    const isTicked = tickedContactsCache.some(ticked => {
      const normTicked = normalize(ticked);
      return normName === normTicked || (normName.length >= 3 && normName.includes(normTicked)) || (normTicked.length >= 3 && normTicked.includes(normName));
    });

    if (!isTicked) continue;

    const snippet = textElements.length > 1 ? textElements[1] : '';

    // If starts with "Bạn: " or "You: ", it's outgoing (user already replied)
    if (snippet && (snippet.startsWith('Bạn:') || snippet.startsWith('You:') || snippet.startsWith('bạn:') || snippet.startsWith('you:'))) {
      continue;
    }

    const hasUnreadBadge = Boolean(
      thread.querySelector('[aria-label*="chưa đọc" i], [aria-label*="unread" i], .badge, [data-testid="unread_badge"]') ||
      thread.querySelector('div[style*="border-radius: 50%"][style*="rgb(0, 132, 255)"]') ||
      thread.querySelector('div[style*="border-radius: 50%"]') ||
      thread.querySelector('span[style*="font-weight: bold"], span[style*="font-weight: 600"], span[style*="font-weight: 700"]')
    );

    const lastReplied = lastSidebarRepliedSnippets[normName] || '';

    // If incoming message exists, haven't replied yet, and not currently on this chat:
    if ((hasUnreadBadge || (snippet && snippet !== lastReplied)) && normName !== currentNorm) {
      console.log(`[Cross-Chat Auto-Reply] Ticked contact "${name}" has unreplied incoming message: "${snippet}". Auto-switching to reply!`);
      lastSidebarRepliedSnippets[normName] = snippet;
      isSwitchingChat = true;

      const clickable = (thread.tagName === 'A' ? thread : thread.querySelector('a') || thread) as HTMLElement;
      clickable.click();

      setTimeout(() => {
        isSwitchingChat = false;
        runScan(true);
      }, 700);
      break;
    }
  }
}

document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (!target) return;

  // 1. If clicking left sidebar thread list, trigger rescan
  if (target.closest('a[href*="/t/"], div[role="navigation"], nav, [aria-label*="Đoạn chat" i], [aria-label*="Chats" i], [data-testid="mwthreadlist"], #conversationList, .chat-list, .chatlist')) {
    setTimeout(() => runScan(true), 300);
    return;
  }

  // 2. Ignore chat text inputs and send buttons
  if (target.closest('input, textarea, [contenteditable="true"], div[role="textbox"], div[aria-label*="Nhấn Enter" i], div[aria-label*="Press Enter" i], div[aria-label*="Gửi" i], div[aria-label*="Send" i]')) {
    return;
  }

  // 3. Find clicked message text
  let rawText = '';
  let highlightTarget: HTMLElement | null = null;

  // Case A: Closest leaf text element
  const textLeaf = target.closest('div[dir="auto"], span[dir="auto"], .bubble-content, .text, .chat-message-text, .message-content, .text-content, .translatable-message') as HTMLElement | null;
  if (textLeaf) {
    rawText = textLeaf.textContent?.trim() || '';
    highlightTarget = textLeaf;
  }

  // Case B: Clicked message container/row
  if (!rawText) {
    const row = target.closest('div[role="row"], .chat-item, .bubble, .msg-item, .Message') as HTMLElement | null;
    if (row) {
      const inner = row.querySelector('div[dir="auto"], span[dir="auto"], .bubble-content, .text, .chat-message-text, .message-content') as HTMLElement | null;
      rawText = inner?.textContent?.trim() || row.textContent?.trim() || '';
      highlightTarget = inner || row;
    }
  }

  // Case C: Fallback to target itself
  if (!rawText) {
    rawText = target.textContent?.trim() || '';
    highlightTarget = target;
  }

  const text = cleanText(rawText);
  const lower = text.toLowerCase();
  const blacklist = ['gửi', 'send', 'nhấn enter để gửi', 'press enter to send', 'aa', 'tin nhắn', 'tìm kiếm'];

  if (text && text.length > 0 && !blacklist.includes(lower)) {
    const contact = getActiveContactName() || lastContactName || 'Hội thoại đang mở';
    console.log(`[Webview Message Clicked] Contact: "${contact}", Text: "${text}"`);

    // Visual feedback highlight on the clicked element
    if (highlightTarget && highlightTarget.style) {
      const prevOutline = highlightTarget.style.outline;
      const prevRadius = highlightTarget.style.borderRadius;
      highlightTarget.style.outline = '2px solid #a855f7';
      highlightTarget.style.borderRadius = '8px';
      setTimeout(() => {
        if (highlightTarget) {
          highlightTarget.style.outline = prevOutline;
          highlightTarget.style.borderRadius = prevRadius;
        }
      }, 1200);
    }

    // Dispatch via IPC (both directly to host webview and to main process bridge)
    const payload = {
      platform: currentPlatform,
      contactName: contact,
      messageText: text,
      recentMessages: getRecentMessages(10)
    };
    try {
      ipcRenderer.send('webview:message-clicked', payload);
    } catch {}
    try {
      ipcRenderer.sendToHost('webview:message-clicked', payload);
    } catch {}

    // Also dispatch via console-message as guaranteed fallback
    console.log('__AI_MSG_CLICKED__:' + JSON.stringify({
      platform: currentPlatform,
      contactName: contact,
      messageText: text
    }));
  }

  setTimeout(() => runScan(false), 200);
}, true);

// Floating Selection Badge for highlighted text
let selectionBadgeEl: HTMLElement | null = null;

function removeSelectionBadge() {
  if (selectionBadgeEl && selectionBadgeEl.parentNode) {
    selectionBadgeEl.parentNode.removeChild(selectionBadgeEl);
  }
  selectionBadgeEl = null;
}

document.addEventListener('mouseup', () => {
  setTimeout(() => {
    const sel = window.getSelection();
    const selectedText = sel ? cleanText(sel.toString()) : '';
    if (selectedText && selectedText.length >= 2 && selectedText.length <= 800) {
      removeSelectionBadge();
      const range = sel!.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      selectionBadgeEl = document.createElement('div');
      selectionBadgeEl.id = '__ai_copilot_badge';
      selectionBadgeEl.innerText = '✨ Phản hồi với AI';
      Object.assign(selectionBadgeEl.style, {
        position: 'fixed',
        top: `${Math.max(10, rect.top - 36)}px`,
        left: `${Math.max(10, rect.left + rect.width / 2 - 60)}px`,
        zIndex: '999999',
        backgroundColor: '#7c3aed',
        color: '#ffffff',
        padding: '5px 12px',
        borderRadius: '16px',
        fontSize: '11px',
        fontWeight: 'bold',
        cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
        border: '1px solid #a855f7',
        userSelect: 'none',
        fontFamily: 'sans-serif'
      });

      selectionBadgeEl.addEventListener('mousedown', (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        const contact = getActiveContactName() || lastContactName || 'Hội thoại đang mở';
        const payload = {
          platform: currentPlatform,
          contactName: contact,
          messageText: selectedText,
          recentMessages: getRecentMessages(10)
        };
        try { ipcRenderer.send('webview:message-clicked', payload); } catch {}
        try { ipcRenderer.sendToHost('webview:message-clicked', payload); } catch {}
        console.log('__AI_MSG_CLICKED__:' + JSON.stringify(payload));
        removeSelectionBadge();
        sel?.removeAllRanges();
      });

      document.body.appendChild(selectionBadgeEl);
    } else {
      removeSelectionBadge();
    }
  }, 50);
});

document.addEventListener('mousedown', (e) => {
  const target = e.target as HTMLElement;
  if (target && target.id !== '__ai_copilot_badge') {
    removeSelectionBadge();
  }
});

ipcRenderer.on('host:switch-chat', (_e: any, data: { contactName: string }) => {
  if (!data || !data.contactName) return;
  const targetNorm = (data.contactName || '').toLowerCase().replace(/[\s\-_]+/g, '').trim();
  const threadElements = Array.from(document.querySelectorAll(
    'a[href*="/messages/"], a[href*="/t/"], div[role="grid"] [role="row"], div[role="navigation"] [role="row"], div[aria-label*="Đoạn chat" i] a, div[aria-label*="Chats" i] a, [data-testid="mwthreadlist"] a, .chat-item, .conv-item, .chatlist-chat'
  ));
  for (const thread of threadElements) {
    const textElements = Array.from(thread.querySelectorAll('span[dir="auto"], h2, h3, a span, span, div[dir="auto"]'))
      .map(el => cleanText(el.textContent || ''))
      .filter(t => t && t.length >= 2 && !/^\d{1,2}:\d{2}/.test(t));
    if (textElements.length === 0) continue;
    const name = textElements[0].toLowerCase().replace(/[\s\-_]+/g, '').trim();
    if (name && (name === targetNorm || name.includes(targetNorm) || targetNorm.includes(name))) {
      const clickable = (thread.tagName === 'A' ? thread : thread.querySelector('a') || thread) as HTMLElement;
      clickable.click();
      console.log(`[Webview] Switched to chat: "${data.contactName}" via command`);
      setTimeout(() => runScan(true), 500);
      break;
    }
  }
});

ipcRenderer.on('host:send-text', (_e: any, data: { text: string; insertOnly?: boolean }) => {
  insertAndSendText(data.text, Boolean(data.insertOnly));
});

ipcRenderer.on('host:request-scan', () => {
  runScan(true);
});

setInterval(() => {
  runScan(false);
  scanSidebarThreadsAndAutoReply();
}, 1200);

setTimeout(() => runScan(true), 1000);
