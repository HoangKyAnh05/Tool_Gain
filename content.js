/**
 * AI Copilot & Auto-Reply Extension for Facebook & Messenger Web
 * Embedded In-Chat UI & Floating Control Panel
 * Cross-Chat Unread Thread Scanner & Shorthand Commands (. and ...)
 * Connects directly to local AI Omnichannel Assistant at http://127.0.0.1:45678
 */

const LOCAL_API = 'http://127.0.0.1:45678';
let isConnected = false;
let globalAutoReply = true;
let autoSendOnClick = localStorage.getItem('__ai_auto_send_on_click') === 'true'; // Default FALSE (view suggestions only)
let tickedContactsCache = [];
let lastTickedFetchTime = 0;
let activeSelectedContact = '';
let activeSelectedMessage = '';
let activeReplies = [];
let isPanelOpen = false;
let defaultAutoReplyOption = parseInt(localStorage.getItem('__ai_default_auto_reply_opt') || '1', 10);
let lastSidebarRepliedSnippets = {};
let isSwitchingChat = false;
let isSending = false;
let lastKnownContact = '';

// Track existing last message for each contact to NEVER auto-reply to old chat history!
const lastSeenIncomingPerContact = {};

console.log('[AI Copilot Extension] Initializing UI overlay on:', window.location.hostname);

// --- CSS STYLES INJECTION ---
const STYLE_ID = '__ai_copilot_styles';
if (!document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    /* In-Chat AI Toolbar */
    .__ai_chat_bar {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 6px 10px;
      margin: 4px 8px;
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.96));
      border: 1px solid rgba(168, 85, 247, 0.4);
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 12px;
      color: #e2e8f0;
      z-index: 9999;
      backdrop-filter: blur(8px);
      transition: all 0.25s ease;
    }
    .__ai_chat_bar_top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .__ai_chat_bar_left {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .__ai_btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 11px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      outline: none;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;
    }
    .__ai_btn:hover {
      transform: translateY(-1px);
      filter: brightness(1.15);
    }
    .__ai_btn:active {
      transform: translateY(1px);
    }
    .__ai_btn_sparkle {
      background: linear-gradient(135deg, #9333ea, #6366f1);
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(147, 51, 234, 0.4);
    }
    .__ai_btn_auto_on {
      background: linear-gradient(135deg, #10b981, #059669);
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
    }
    .__ai_btn_auto_off {
      background: rgba(51, 65, 85, 0.8);
      color: #94a3b8;
      border: 1px solid rgba(148, 163, 184, 0.2);
    }
    .__ai_suggestions_row {
      display: flex;
      flex-direction: column;
      gap: 5px;
      max-height: 220px;
      overflow-y: auto;
      margin-top: 4px;
    }
    .__ai_suggestion_chip {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      background: rgba(30, 41, 59, 0.9);
      border: 1px solid rgba(147, 51, 234, 0.3);
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 11.5px;
      color: #f1f5f9;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .__ai_suggestion_chip:hover {
      background: rgba(147, 51, 234, 0.25);
      border-color: #a855f7;
    }
    .__ai_chip_text {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-align: left;
    }
    .__ai_chip_actions {
      display: flex;
      gap: 5px;
      flex-shrink: 0;
    }
    .__ai_chip_btn {
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 10.5px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: all 0.15s;
    }
    .__ai_chip_send {
      background: linear-gradient(135deg, #7c3aed, #4f46e5);
      color: #fff;
      box-shadow: 0 2px 6px rgba(124, 58, 237, 0.4);
    }
    .__ai_chip_insert {
      background: rgba(255,255,255,0.12);
      color: #cbd5e1;
    }
    .__ai_chip_send:hover { filter: brightness(1.2); }
    .__ai_chip_insert:hover { background: rgba(255,255,255,0.25); }

    /* Floating Copilot Side Panel */
    #__ai_copilot_panel {
      position: fixed;
      bottom: 60px;
      right: 15px;
      width: 375px;
      max-width: calc(100vw - 30px);
      max-height: 640px;
      background: rgba(15, 23, 42, 0.97);
      border: 1px solid rgba(168, 85, 247, 0.45);
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6), 0 0 20px rgba(147, 51, 234, 0.25);
      border-radius: 16px;
      z-index: 10000000;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #f8fafc;
      overflow: hidden;
      backdrop-filter: blur(12px);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .__ai_panel_header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      background: linear-gradient(135deg, rgba(88, 28, 135, 0.45), rgba(30, 27, 75, 0.45));
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .__ai_panel_body {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      overflow-y: auto;
      max-height: 560px;
    }
    .__ai_context_pill {
      font-size: 10.5px;
      padding: 4px 8px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 12px;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.15s;
    }
    .__ai_context_pill:hover {
      background: rgba(168, 85, 247, 0.25);
      border-color: #a855f7;
      color: #e2e8f0;
    }
    .__ai_card {
      background: rgba(30, 41, 59, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 10px;
      padding: 10px;
    }
    .__ai_opt_choice_btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 6px 4px;
      background: rgba(51, 65, 85, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 8px;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.2s;
    }
    .__ai_opt_choice_btn.active {
      background: linear-gradient(135deg, rgba(147, 51, 234, 0.35), rgba(99, 102, 241, 0.35));
      border-color: #a855f7;
      color: #ffffff;
      box-shadow: 0 0 10px rgba(168, 85, 247, 0.3);
    }

    /* Floating Toast Notification */
    .__ai_toast {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 99999999;
      padding: 10px 18px;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid #a855f7;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 15px rgba(168, 85, 247, 0.4);
      border-radius: 24px;
      font-size: 12.5px;
      font-weight: 600;
      color: #ffffff;
      backdrop-filter: blur(8px);
      pointer-events: none;
      animation: __ai_fade_in 0.3s ease forwards;
    }
    @keyframes __ai_fade_in {
      from { opacity: 0; transform: translate(-50%, -10px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }
  `;
  document.head.appendChild(style);
}

// --- FLOATING TOAST NOTIFICATION ---
function showToast(text, duration = 3000) {
  const old = document.querySelector('.__ai_toast');
  if (old) old.remove();

  const toast = document.createElement('div');
  toast.className = '__ai_toast';
  toast.innerHTML = text;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.4s ease';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

// --- NOISE & CONTEXT MENU FILTER ---
function isNoiseOrTimestamp(text) {
  if (!text) return true;
  const s = text.trim().toLowerCase();
  if (s.length === 0) return true;
  if (/^(\d{1,2}:\d{2}(\s*(am|pm|ch|sa))?)$/i.test(s)) return true;
  if (/^(đã gửi|đã nhận|đã xem|seen|delivered|sent|vừa xong|just now|active now|đang hoạt động|hoạt động\s+\d+.*)$/i.test(s)) return true;
  if (/^\d+\s*(phút|giờ|ngày|giây|m|h|d|s|min|mins|hour|hours)\s*(trước|ago)?$/i.test(s)) return true;
  if (/^(thứ\s+(hai|ba|tư|năm|sáu|bảy)|chủ nhật|hôm qua|hôm nay)(\s+\d{1,2}:\d{2})?$/i.test(s)) return true;
  if (/^đã bày tỏ cảm xúc/i.test(s)) return true;

  // Context menu items on Facebook to avoid false clicks
  if (/^(thu hồi|gỡ|xóa|bạn đã xóa|chỉnh sửa|báo cáo|chuyển tiếp|ghim|trả lời|sao chép|xem bản dịch|tải về|chi tiết|aa|bạn|thích|đoạn chat)$/i.test(s)) return true;
  return false;
}

function cleanText(raw) {
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

function normalize(s) {
  return (s || '').toLowerCase().replace(/[\s\-_.,]+/g, '').trim();
}

function isContactTicked(name) {
  const norm = normalize(name);
  if (!norm) return false;
  return tickedContactsCache.some(t => {
    const nt = normalize(t);
    return norm === nt || (norm.length >= 3 && norm.includes(nt)) || (nt.length >= 3 && nt.includes(norm));
  });
}

function getChatContainerForElement(el) {
  if (!el) return null;
  return el.closest('div[role="dialog"], div[data-pagelet*="ChatTab" i], .fbDockChatTab, div[aria-label*="Đoạn chat" i], div[role="main"]');
}

// Extract contact name from a specific chat container
function getContactNameForContainer(container) {
  if (!container || container === document.body) return getActiveContactName();
  try {
    const headerCandidates = container.querySelectorAll('h2, [role="heading"], a[role="link"] span, span[dir="auto"], strong');
    const containerRect = container.getBoundingClientRect();
    for (const el of headerCandidates) {
      const elRect = el.getBoundingClientRect();
      if (elRect.height > 0 && elRect.top - containerRect.top < 90) {
        const t = (el.textContent || '').trim();
        const lt = t.toLowerCase();
        if (t && t.length >= 2 && t.length <= 50 &&
            !/^(hoạt động|active|messenger|đang hoạt động|cuộc gọi|tìm kiếm|chi tiết|aa|bạn|thông tin|tùy chỉnh|đi đến|useful|bảng feed|tạo tin|thước phim|xác nhận|xóa)/i.test(lt)) {
          return t.replace(/\.\.\.$/, '').trim();
        }
      }
    }
  } catch {}
  return getActiveContactName();
}

// Ultra-accurate active contact detection (URL match -> Sidebar active -> Chat Header -> Status sibling -> Right pane)
function getActiveContactName(container) {
  try {
    // 1. If inside a floating chat popup/tab, get from its local header
    if (container && container !== document.body && container !== document.querySelector('div[role="main"]')) {
      const headerCandidates = container.querySelectorAll('h2, [role="heading"], a[role="link"] span, span[dir="auto"], strong');
      for (const el of headerCandidates) {
        const t = (el.textContent || '').trim();
        const lt = t.toLowerCase();
        if (t && t.length >= 2 && t.length <= 50 &&
            !/^(hoạt động|active|messenger|đang hoạt động|cuộc gọi|tìm kiếm|chi tiết|aa|bạn|thông tin|tùy chỉnh|đi đến|useful|bảng feed|tạo tin)/i.test(lt)) {
          return t.replace(/\.\.\.$/, '').trim();
        }
      }
    }

    // 2. URL Thread ID mapping: match /messages/t/12345 or /t/12345 in sidebar
    const urlMatch = window.location.pathname.match(/\/(?:messages\/)?t\/([a-zA-Z0-9._-]+)/);
    if (urlMatch && urlMatch[1]) {
      const threadId = urlMatch[1];
      const matchingLink = document.querySelector(`a[href*="/t/${threadId}"], a[href*="/messages/t/${threadId}"]`);
      if (matchingLink) {
        const nameEl = matchingLink.querySelector('span[dir="auto"], h2, strong');
        const t = cleanText(nameEl?.textContent || '');
        if (t && t.length >= 2 && !/^\d{1,2}:\d{2}/.test(t)) {
          return t;
        }
      }
    }

    // 3. Left Sidebar Active Item (aria-current="page" or aria-selected="true")
    const activeSidebarItem = document.querySelector('div[role="navigation"] [aria-current="page"], a[href*="/t/"][aria-current="page"], a[href*="/messages/t/"][aria-current="page"], [role="row"][aria-selected="true"], [role="row"][aria-current="page"]');
    if (activeSidebarItem) {
      const nameEl = activeSidebarItem.querySelector('span[dir="auto"], h2, strong');
      const t = cleanText(nameEl?.textContent || '');
      if (t && t.length >= 2 && !/^\d{1,2}:\d{2}/.test(t)) {
        return t;
      }
    }

    // 4. Status sibling inside active chat ("Đang hoạt động" / "Active now" / "Hoạt động ...")
    const statusEls = Array.from(document.querySelectorAll('span, div')).filter(el => {
      const t = (el.textContent || '').trim();
      return /^(đang hoạt động|active now|hoạt động\s+\d+.*|active\s+\d+.*|cuộc gọi\s+.*)$/i.test(t);
    });
    for (const st of statusEls) {
      const mainOrDetails = st.closest('div[role="main"], main, div[aria-label*="Thông tin về đoạn chat" i], div[aria-label*="Conversation Information" i]');
      if (mainOrDetails) {
        const parent = st.parentElement;
        if (parent) {
          const cand = Array.from(parent.querySelectorAll('h1, h2, h3, a span, span[dir="auto"], span')).filter(c => c !== st && !c.contains(st));
          for (const c of cand) {
            const t = (c.textContent || '').trim();
            const lt = t.toLowerCase();
            if (t && t.length >= 2 && t.length <= 50 && !/^(đang hoạt động|active|messenger|cuộc gọi|đi đến bảng feed|bảng feed|useful|thông tin)/i.test(lt)) {
              return t.replace(/\.\.\.$/, '').trim();
            }
          }
        }
      }
    }

    // 5. Header near call buttons (phone/video icons) in top middle
    const main = document.querySelector('div[role="main"], main');
    if (main) {
      const callBtn = main.querySelector('[aria-label*="gọi thoại" i], [aria-label*="gọi video" i], [aria-label*="call" i]');
      if (callBtn) {
        const headerBar = callBtn.closest('div[style*="height"], div.x1n2onr6, div[role="banner"]') || callBtn.parentElement?.parentElement?.parentElement;
        if (headerBar) {
          const names = Array.from(headerBar.querySelectorAll('h1, h2, h3, a span, span[dir="auto"], strong'));
          for (const el of names) {
            const t = (el.textContent || '').trim();
            const lt = t.toLowerCase();
            if (t && t.length >= 2 && t.length <= 50 && !/^(đang hoạt động|active|cuộc gọi|thông tin|aa|bạn)/i.test(lt)) {
              return t.replace(/\.\.\.$/, '').trim();
            }
          }
        }
      }

      // Top elements in main
      const headerNodes = main.querySelectorAll('h1, h2, h3, a[role="link"] span, span[dir="auto"]');
      for (const el of headerNodes) {
        const rect = el.getBoundingClientRect();
        if (rect.top > 0 && rect.top < 150 && rect.height > 0) {
          const t = (el.textContent || '').trim();
          const lt = t.toLowerCase();
          if (t && t.length >= 2 && t.length <= 50 &&
              !/^(hoạt động|active|messenger|đang hoạt động|cuộc gọi|tìm kiếm|chi tiết|aa|bạn|thông tin|tùy chỉnh|đi đến)/i.test(lt)) {
            return t.replace(/\.\.\.$/, '').trim();
          }
        }
      }
    }

    // 6. Right Details Sidebar
    const detailsHeader = document.querySelector('div[aria-label*="Thông tin về đoạn chat" i], div[aria-label*="Conversation Information" i]');
    if (detailsHeader) {
      const names = Array.from(detailsHeader.querySelectorAll('h2, [role="heading"], a[role="link"] span, span[dir="auto"], strong'));
      for (const el of names) {
        const t = (el.textContent || '').trim();
        const lt = t.toLowerCase();
        if (t && t.length >= 2 && t.length <= 50 &&
            !/^(thông tin|đoạn chat|tin nhắn|tìm kiếm|hoạt động|active|cuộc gọi|chi tiết|tùy chỉnh|quyền riêng tư|file phương tiện|ảnh|video|liên kết|thành viên|chủ đề)/i.test(lt)) {
          return t.replace(/\.\.\.$/, '').trim();
        }
      }
    }

    // 7. Document Title
    if (document.title) {
      let title = document.title.replace(/^\(\d+\+?\)\s*/, '').trim();
      title = title.replace(/\s*[|·\-–—]\s*(Messenger|Facebook|Meta).*$/i, '').trim();
      title = title.replace(/\s+(đã gửi.*|sent you.*)$/i, '').trim();
      const lt = title.toLowerCase();
      if (title && title.length >= 2 && !['messenger', 'facebook', 'chats', 'đoạn chat', 'tin nhắn', 'hộp thư', 'đi đến bảng feed', 'bảng feed', 'tạo tin'].includes(lt) && !lt.startsWith('hoạt động') && !lt.startsWith('active')) {
        return title;
      }
    }
  } catch {}

  return activeSelectedContact || 'Đoạn chat hiện tại';
}

function getLatestIncomingMessage(container) {
  if (!container) container = document.querySelector('div[role="main"], main') || document.body;
  const inputEl = findActiveMessageInput(container);
  let inputTop = window.innerHeight;
  let chatCenterX = window.innerWidth * 0.5;

  if (inputEl) {
    const inputRect = inputEl.getBoundingClientRect();
    inputTop = inputRect.top;
    chatCenterX = inputRect.left + inputRect.width * 0.5;
  }

  const textNodes = Array.from(container.querySelectorAll('div[dir="auto"], span[dir="auto"], p, span'));
  const list = [];

  for (const node of textNodes) {
    if (node.closest('.__ai_chat_bar, #__ai_copilot_panel, #__ai_copilot_ext_badge')) continue;
    if (node.closest('div[role="textbox"], input, textarea, header, footer')) continue;
    
    let isLeaf = true;
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.textContent && child.textContent.trim().length > 0 && child.tagName !== 'IMG' && child.tagName !== 'BR') {
        isLeaf = false;
        break;
      }
    }
    if (!isLeaf) continue;

    const raw = node.textContent?.trim() || '';
    const text = cleanText(raw);
    if (!text || text.length < 1 || text.length > 800) continue;

    const rect = node.getBoundingClientRect();
    if (rect.height === 0 || rect.top > inputTop + 5 || rect.top < 50) continue;

    const isRight = rect.left > chatCenterX;
    const isSent = Boolean(node.closest('[aria-label*="Bạn đã gửi" i], [aria-label*="You sent" i]'));
    if (!isRight && !isSent) {
      list.push({ text, top: rect.top });
    }
  }

  if (list.length > 0) {
    list.sort((a, b) => a.top - b.top);
    return list[list.length - 1].text;
  }
  return '';
}

// --- ACCURATE INPUT & SEND DISPATCHER ---
function findActiveMessageInput(container) {
  if (container) {
    const inp = container.querySelector('div[aria-label*="Tin nhắn" i][role="textbox"], div[aria-label*="Message" i][role="textbox"], div[role="textbox"][contenteditable="true"], div[contenteditable="true"]');
    if (inp) return inp;
  }

  if (document.activeElement && document.activeElement.getAttribute('role') === 'textbox' && document.activeElement.isContentEditable) {
    return document.activeElement;
  }

  const main = document.querySelector('div[role="main"], main');
  if (main) {
    const mainInp = main.querySelector('div[aria-label*="Tin nhắn" i][role="textbox"], div[aria-label*="Message" i][role="textbox"], div[role="textbox"][contenteditable="true"], div[contenteditable="true"]');
    if (mainInp) return mainInp;
  }

  const dialogs = document.querySelectorAll('div[role="dialog"], div[data-pagelet*="ChatTab" i], .fbDockChatTab');
  for (let i = dialogs.length - 1; i >= 0; i--) {
    const inp = dialogs[i].querySelector('div[aria-label*="Tin nhắn" i][role="textbox"], div[role="textbox"][contenteditable="true"]');
    if (inp) return inp;
  }

  const all = Array.from(document.querySelectorAll('div[role="textbox"][contenteditable="true"]'));
  for (let i = all.length - 1; i >= 0; i--) {
    const el = all[i];
    const aria = (el.getAttribute('aria-label') || '').toLowerCase();
    if (aria.includes('tìm kiếm') || aria.includes('search')) continue;
    return el;
  }
  return null;
}

function findSendButton(input) {
  if (!input) return null;
  const parent = input.closest('form, div[role="region"], div[aria-label*="Soạn tin" i]') || input.parentElement?.parentElement?.parentElement;
  if (!parent) return null;

  const byLabel = parent.querySelector('div[aria-label*="Nhấn Enter để gửi" i], div[aria-label*="Press Enter to send" i], div[aria-label*="Gửi" i], div[aria-label*="Send" i]');
  if (byLabel) return byLabel;

  const buttons = Array.from(parent.querySelectorAll('div[role="button"], span[role="button"], button'));
  const inputRect = input.getBoundingClientRect();
  for (let i = buttons.length - 1; i >= 0; i--) {
    const btn = buttons[i];
    const rect = btn.getBoundingClientRect();
    if (rect.left >= inputRect.right - 60 && rect.width > 0 && rect.height > 0) {
      const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
      if (aria.includes('biểu tượng') || aria.includes('nhãn dán') || aria.includes('emoji')) continue;
      return btn;
    }
  }
  return null;
}

function simulateClick(el) {
  if (!el) return false;
  el.focus();
  const opts = { bubbles: true, cancelable: true, view: window };
  el.dispatchEvent(new PointerEvent('pointerdown', opts));
  el.dispatchEvent(new MouseEvent('mousedown', opts));
  el.dispatchEvent(new PointerEvent('pointerup', opts));
  el.dispatchEvent(new MouseEvent('mouseup', opts));
  el.dispatchEvent(new MouseEvent('click', opts));
  return true;
}

function simulateEnter(input) {
  if (!input) return;
  input.focus();
  const enterOpts = {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    charCode: 13,
    bubbles: true,
    cancelable: true,
    composed: true,
    view: window
  };
  input.dispatchEvent(new KeyboardEvent('keydown', enterOpts));
  input.dispatchEvent(new KeyboardEvent('keypress', enterOpts));
  input.dispatchEvent(new KeyboardEvent('keyup', enterOpts));
}

// Rock-solid single-execution text insertion & send (No repetition, No duplicate send)
function insertAndSendText(text, container, autoSend = false) {
  if (!text || text.includes('AI chưa gen xong') || isSending) {
    if (text && text.includes('AI chưa gen xong')) {
      console.warn('[AI Extension] CHẶN TUYỆT ĐỐI: Không gửi tin nhắn vì AI chưa gen xong!');
      showToast('⚠️ AI chưa gen xong câu trả lời, vui lòng chờ AI xử lý xong!');
    }
    if (isSending) console.warn('[AI Extension] Already sending message, skipping duplicate call.');
    return false;
  }

  const input = findActiveMessageInput(container);
  if (!input) {
    console.warn('[AI Extension] Could not find message input box!');
    return false;
  }

  isSending = true;

  try {
    input.focus();

    // 1. Select all & delete existing text
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(input);
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('delete', false, null);

    // 2. Insert new text via execCommand (ONLY ONCE)
    document.execCommand('insertText', false, text);

    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

    // 3. Send if autoSend is requested
    if (autoSend) {
      setTimeout(() => {
        const sendBtn = findSendButton(input);
        if (sendBtn) {
          simulateClick(sendBtn);
        } else {
          simulateEnter(input);
        }
        // Unlock after 1.5 seconds cooldown
        setTimeout(() => {
          isSending = false;
        }, 1500);
      }, 120);
    } else {
      isSending = false;
    }
    return true;
  } catch (e) {
    console.warn('[AI Extension] insertAndSendText error:', e);
    isSending = false;
    return false;
  }
}

// --- SHORTHAND SIGNALS (. AND ...) ---
async function sendSignal(signalText, contact) {
  try {
    const res = await fetch(`${LOCAL_API}/api/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: signalText,
        contact: contact || getActiveContactName(),
        platform: 'messenger'
      })
    });
    if (res.ok) {
      const data = await res.json();
      globalAutoReply = data.globalAutoReply;
      updateGlobalUI();
      if (signalText === '.' || signalText === '..') {
        showToast('⏸️ <b>ĐÃ TẠM DỪNG Auto-Reply</b> (Nhận diện lệnh ".")');
      } else {
        showToast('▶️ <b>ĐÃ BẬT LẠI Auto-Reply</b> cho các đoạn chat đã tích (Lệnh "...")');
      }
    }
  } catch (e) {
    console.warn('[AI Extension] Signal error:', e);
  }
}

// Monitor user keypress for shorthand . and ...
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    const target = e.target;
    if (target && target.getAttribute('role') === 'textbox' && target.isContentEditable) {
      const text = (target.textContent || '').trim();
      if (text === '.' || text === '..') {
        sendSignal('.', getActiveContactName());
      } else if (text === '...' || text === '…' || text === '....') {
        sendSignal('...', getActiveContactName());
      }
    }
  }
}, true);

// --- API CLIENT ---
async function requestReplies(contact, message, context = '') {
  try {
    const res = await fetch(`${LOCAL_API}/api/generate-reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact,
        message,
        context,
        platform: 'messenger'
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.suggestedReplies && data.suggestedReplies.length > 0) {
        return data.suggestedReplies;
      }
    }
  } catch (err) {
    console.warn('[AI Extension] requestReplies error:', err);
  }
  return [
    'AI chưa gen xong (Đang kết nối lại AI...)',
    'AI chưa gen xong (Vui lòng thử lại sau giây lát)',
    'AI chưa gen xong'
  ];
}

async function toggleContactAutoReply(contact, enable) {
  try {
    await fetch(`${LOCAL_API}/api/toggle-contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact,
        enabled: enable,
        platform: 'messenger'
      })
    });
    const norm = normalize(contact);
    if (enable) {
      if (!tickedContactsCache.includes(contact)) tickedContactsCache.push(contact);
    } else {
      tickedContactsCache = tickedContactsCache.filter(c => normalize(c) !== norm);
    }
  } catch (e) {
    console.warn('[AI Extension] toggleContactAutoReply error:', e);
  }
}

async function setGlobalAutoReply(enable) {
  globalAutoReply = enable;
  try {
    await fetch(`${LOCAL_API}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ globalAutoReply: enable })
    });
    updateGlobalUI();
    showToast(enable ? '▶️ Đã BẬT Auto-Reply Tổng!' : '⏸️ Đã TẮT Auto-Reply Tổng!');
  } catch {}
}

async function saveDefaultOption(optNumber) {
  defaultAutoReplyOption = optNumber;
  localStorage.setItem('__ai_default_auto_reply_opt', optNumber.toString());
  try {
    await fetch(`${LOCAL_API}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaultAutoReplyOption: optNumber })
    });
  } catch {}
}

// --- IN-CHAT TOOLBAR INJECTION ---
function attachToolbarsToOpenChats() {
  const chatContainers = document.querySelectorAll('div[role="dialog"], div[data-pagelet*="ChatTab" i], .fbDockChatTab, div[aria-label*="Đoạn chat" i]');
  
  for (const container of chatContainers) {
    const inputBox = container.querySelector('div[role="textbox"][contenteditable="true"], div[contenteditable="true"]');
    if (!inputBox) continue;

    let bar = container.querySelector('.__ai_chat_bar');
    const contactName = getContactNameForContainer(container);
    const isTicked = isContactTicked(contactName);

    if (bar) {
      const autoBtn = bar.querySelector('.__ai_auto_btn');
      if (autoBtn) {
        autoBtn.className = `__ai_btn __ai_auto_btn ${isTicked ? '__ai_btn_auto_on' : '__ai_btn_auto_off'}`;
        autoBtn.innerHTML = isTicked ? '🤖 Auto: BẬT' : '🤖 Auto: TẮT';
      }
      continue;
    }

    bar = document.createElement('div');
    bar.className = '__ai_chat_bar';
    bar.innerHTML = `
      <div class="__ai_chat_bar_top">
        <div class="__ai_chat_bar_left">
          <button class="__ai_btn __ai_btn_sparkle __ai_gen_btn" title="AI Gemini phân tích tin nhắn và gợi ý câu trả lời">
            ✨ Gợi ý AI
          </button>
          <button class="__ai_btn __ai_auto_btn ${isTicked ? '__ai_btn_auto_on' : '__ai_btn_auto_off'}" title="Bật/Tắt tự động trả lời cho người này">
            ${isTicked ? '🤖 Auto: BẬT' : '🤖 Auto: TẮT'}
          </button>
        </div>
        <div style="font-size: 11px; color: #a855f7; font-weight: bold; display: flex; align-items: center; gap: 4px;">
          <span>⚡ AI Copilot</span>
        </div>
      </div>
      <div class="__ai_suggestions_row" style="display: none;"></div>
    `;

    const genBtn = bar.querySelector('.__ai_gen_btn');
    const autoBtn = bar.querySelector('.__ai_auto_btn');
    const row = bar.querySelector('.__ai_suggestions_row');

    genBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const currentContact = getContactNameForContainer(container);
      const incoming = getLatestIncomingMessage(container) || activeSelectedMessage || 'Alo bạn ơi';
      genBtn.innerHTML = '⏳ Đang nghĩ...';
      
      const replies = await requestReplies(currentContact, incoming);
      genBtn.innerHTML = '✨ Gợi ý AI';
      renderSuggestionsInRow(row, container, replies);
    });

    autoBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const currentContact = getContactNameForContainer(container);
      const nowTicked = !isContactTicked(currentContact);
      await toggleContactAutoReply(currentContact, nowTicked);
      autoBtn.className = `__ai_btn __ai_auto_btn ${nowTicked ? '__ai_btn_auto_on' : '__ai_btn_auto_off'}`;
      autoBtn.innerHTML = nowTicked ? '🤖 Auto: BẬT' : '🤖 Auto: TẮT';
      updateFloatingPanelContent();
    });

    const inputParent = inputBox.closest('form, div[role="region"], div[aria-label*="Soạn tin" i]') || inputBox.parentElement?.parentElement;
    if (inputParent && inputParent.parentElement) {
      inputParent.parentElement.insertBefore(bar, inputParent);
    } else {
      inputBox.parentElement.insertBefore(bar, inputBox);
    }
  }
}

function renderSuggestionsInRow(rowEl, container, replies) {
  if (!rowEl) return;
  rowEl.style.display = 'flex';
  rowEl.innerHTML = '';

  replies.forEach((text, idx) => {
    const isDefault = (idx + 1) === defaultAutoReplyOption;
    const chip = document.createElement('div');
    chip.className = '__ai_suggestion_chip';
    chip.innerHTML = `
      <div class="__ai_chip_text" title="${text}">
        ${isDefault ? '⭐ ' : ''}💡 <b>Option ${idx + 1}:</b> ${text}
      </div>
      <div class="__ai_chip_actions">
        <button class="__ai_chip_btn __ai_chip_insert" title="Chèn vào ô chat để sửa">✍️ Chèn</button>
        <button class="__ai_chip_btn __ai_chip_send" title="Gửi ngay">🚀 Gửi ngay</button>
      </div>
    `;

    chip.querySelector('.__ai_chip_insert').addEventListener('click', (e) => {
      e.stopPropagation();
      if (text.includes('AI chưa gen xong')) {
        showToast('⚠️ AI chưa gen xong, vui lòng chờ giây lát!');
        return;
      }
      insertAndSendText(text, container, false);
    });

    chip.querySelector('.__ai_chip_send').addEventListener('click', (e) => {
      e.stopPropagation();
      if (text.includes('AI chưa gen xong')) {
        showToast('⚠️ AI chưa gen xong, vui lòng chờ giây lát!');
        return;
      }
      insertAndSendText(text, container, true);
    });

    chip.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') {
        if (text.includes('AI chưa gen xong')) return;
        insertAndSendText(text, container, false);
      }
    });

    rowEl.appendChild(chip);
  });
}

// --- FLOATING COPILOT PANEL (POPUP) ---
let panelEl = null;
function createFloatingPanel() {
  if (panelEl) return;
  panelEl = document.createElement('div');
  panelEl.id = '__ai_copilot_panel';
  panelEl.style.display = 'none';
  panelEl.innerHTML = `
    <div class="__ai_panel_header">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 17px;">🤖</span>
        <div>
          <div style="font-weight: bold; font-size: 13px; color: #c084fc;">AI COPILOT ASSISTANT</div>
          <div style="font-size: 10px; color: #94a3b8;">Google Gemini 3.7 Flash • Siêu tốc</div>
        </div>
      </div>
      <button id="__ai_panel_close" style="background:none; border:none; color:#94a3b8; font-size:16px; cursor:pointer; padding:2px 6px;">✕</button>
    </div>
    <div class="__ai_panel_body">
      <!-- Master Global Auto-Reply Switch -->
      <div class="__ai_card" style="display: flex; align-items: center; justify-content: space-between; background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(30, 41, 59, 0.7)); border-color: rgba(16, 185, 129, 0.3);">
        <div>
          <div style="font-size: 11px; font-weight: bold; color: #4ade80; display: flex; align-items: center; gap: 5px;">
            <span>⚡ AUTO-REPLY TỔNG:</span>
            <span id="__ai_global_status_badge" style="background:#10b981; color:#fff; font-size:9.5px; padding:1px 6px; border-radius:8px;">BẬT</span>
          </div>
          <div style="font-size: 9.5px; color: #94a3b8; margin-top: 2px;">
            Gõ <code style="color:#f59e0b; font-weight:bold;">.</code> để tắt, gõ <code style="color:#10b981; font-weight:bold;">...</code> để bật
          </div>
        </div>
        <button id="__ai_global_toggle_btn" class="__ai_btn __ai_btn_auto_on" style="font-size:10.5px;">
          BẬT
        </button>
      </div>

      <!-- 1-Click Auto-Send Toggle (Default OFF) -->
      <div class="__ai_card" style="display: flex; align-items: center; justify-content: space-between; background: rgba(147, 51, 234, 0.1); border-color: rgba(168, 85, 247, 0.25);">
        <div>
          <div style="font-size: 11px; font-weight: bold; color: #c084fc;">🚀 CLICK TIN NHẮN TỰ GỬI NGAY:</div>
          <div style="font-size: 9.5px; color: #94a3b8;">Bấm vào tin nhắn -> AI tự sinh và tự gửi luôn (Mặc định: TẮT)</div>
        </div>
        <label style="position: relative; display: inline-block; width: 36px; height: 20px; cursor: pointer;">
          <input type="checkbox" id="__ai_auto_send_checkbox" ${autoSendOnClick ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
          <span id="__ai_switch_track" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${autoSendOnClick ? '#9333ea' : '#475569'}; transition: .3s; border-radius: 20px;">
            <span id="__ai_switch_thumb" style="position: absolute; content: ''; height: 14px; width: 14px; left: ${autoSendOnClick ? '19px' : '3px'}; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%;"></span>
          </span>
        </label>
      </div>

      <!-- Active Contact Bar -->
      <div class="__ai_card" style="display: flex; align-items: center; justify-content: space-between;">
        <div>
          <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">Đoạn chat hiện tại</div>
          <div id="__ai_panel_contact" style="font-weight: bold; font-size: 14px; color: #f8fafc;">Đang chọn...</div>
        </div>
        <button id="__ai_panel_auto_btn" class="__ai_btn __ai_btn_auto_off">
          🤖 Auto: TẮT
        </button>
      </div>

      <!-- Default Option Selector for Auto-Reply -->
      <div class="__ai_card">
        <div style="font-size: 11px; color: #c084fc; font-weight: bold; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
          <span>⚙️ MẶC ĐỊNH GỬI AUTO-REPLY:</span>
          <span id="__ai_active_opt_badge" style="background:#7c3aed; color:#fff; font-size:10px; padding:2px 8px; border-radius:8px;">Option ${defaultAutoReplyOption}</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
          <button class="__ai_opt_choice_btn ${defaultAutoReplyOption === 1 ? 'active' : ''}" data-opt="1">
            <div style="font-size: 13px;">1️⃣</div>
            <div style="font-size: 11px; font-weight: bold;">Option 1</div>
            <div style="font-size: 9px; opacity: 0.85;">Tự nhiên</div>
          </button>
          <button class="__ai_opt_choice_btn ${defaultAutoReplyOption === 2 ? 'active' : ''}" data-opt="2">
            <div style="font-size: 13px;">2️⃣</div>
            <div style="font-size: 11px; font-weight: bold;">Option 2</div>
            <div style="font-size: 9px; opacity: 0.85;">Lịch sự</div>
          </button>
          <button class="__ai_opt_choice_btn ${defaultAutoReplyOption === 3 ? 'active' : ''}" data-opt="3">
            <div style="font-size: 13px;">3️⃣</div>
            <div style="font-size: 11px; font-weight: bold;">Option 3</div>
            <div style="font-size: 9px; opacity: 0.85;">Ngắn gọn</div>
          </button>
        </div>
      </div>

      <!-- Selected Message Card -->
      <div class="__ai_card">
        <div style="font-size: 10px; color: #94a3b8; margin-bottom: 4px;">TIN NHẮN ĐÃ CHỌN / MỚI NHẬN:</div>
        <div id="__ai_panel_message" style="font-size: 12px; color: #e2e8f0; font-style: italic; background: rgba(0,0,0,0.25); padding: 8px; border-radius: 6px; border-left: 3px solid #a855f7;">
          (Bấm vào bất kỳ tin nhắn nào trong chat để xem gợi ý)
        </div>
      </div>

      <!-- Context Rewriting Pills -->
      <div>
        <div style="font-size: 11px; color: #94a3b8; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
          <span>GỢI Ý NHANH THEO NGỮ CẢNH:</span>
          <span id="__ai_panel_loading" style="display:none; color:#c084fc; font-size:10px;">⏳ Đang tạo...</span>
        </div>
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          <span class="__ai_context_pill" data-ctx="Đồng ý, chốt luôn lịch">+ Đồng ý chốt lịch</span>
          <span class="__ai_context_pill" data-ctx="Hẹn lại vào tối mai">+ Hẹn tối mai</span>
          <span class="__ai_context_pill" data-ctx="Từ chối khéo léo, lịch sự">+ Từ chối khéo</span>
          <span class="__ai_context_pill" data-ctx="Hỏi thêm chi tiết">+ Hỏi chi tiết</span>
        </div>
      </div>

      <!-- Replies List -->
      <div id="__ai_panel_replies" style="display: flex; flex-direction: column; gap: 8px;">
        <!-- 3 Option Cards generated dynamically -->
      </div>
    </div>
  `;

  document.body.appendChild(panelEl);

  // Close Event
  document.getElementById('__ai_panel_close').addEventListener('click', () => {
    togglePanel(false);
  });

  // 1-Click Auto Send Checkbox Toggle
  const autoSendCb = document.getElementById('__ai_auto_send_checkbox');
  const switchTrack = document.getElementById('__ai_switch_track');
  const switchThumb = document.getElementById('__ai_switch_thumb');
  autoSendCb.addEventListener('change', () => {
    autoSendOnClick = autoSendCb.checked;
    localStorage.setItem('__ai_auto_send_on_click', autoSendOnClick.toString());
    switchTrack.style.backgroundColor = autoSendOnClick ? '#9333ea' : '#475569';
    switchThumb.style.left = autoSendOnClick ? '19px' : '3px';
    showToast(autoSendOnClick ? '🚀 Đã BẬT tính năng Click tin nhắn tự gửi ngay!' : '✍️ Đã TẮT tự gửi (chuyển sang chế độ xem gợi ý)');
  });

  // Global Auto-Reply Toggle Button
  const globalBtn = document.getElementById('__ai_global_toggle_btn');
  globalBtn.addEventListener('click', async () => {
    await setGlobalAutoReply(!globalAutoReply);
  });

  // Auto-Reply Toggle for Active Contact
  const autoBtn = document.getElementById('__ai_panel_auto_btn');
  autoBtn.addEventListener('click', async () => {
    const contact = activeSelectedContact || getActiveContactName();
    const nowTicked = !isContactTicked(contact);
    await toggleContactAutoReply(contact, nowTicked);
    updateFloatingPanelContent();
  });

  // Default Option Selector Buttons
  const optBtns = panelEl.querySelectorAll('.__ai_opt_choice_btn');
  optBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const opt = parseInt(btn.getAttribute('data-opt'), 10);
      optBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const badge = document.getElementById('__ai_active_opt_badge');
      if (badge) badge.textContent = `Option ${opt}`;
      await saveDefaultOption(opt);
      if (activeReplies.length > 0) {
        renderFloatingPanelReplies(activeReplies);
      }
    });
  });

  // Quick Context Rewriting
  const pills = panelEl.querySelectorAll('.__ai_context_pill');
  pills.forEach(pill => {
    pill.addEventListener('click', async () => {
      const ctx = pill.getAttribute('data-ctx');
      const contact = activeSelectedContact || getActiveContactName();
      const msg = activeSelectedMessage || 'Alo bạn';
      document.getElementById('__ai_panel_loading').style.display = 'inline';
      const replies = await requestReplies(contact, msg, ctx);
      document.getElementById('__ai_panel_loading').style.display = 'none';
      activeReplies = replies;
      renderFloatingPanelReplies(replies);
    });
  });
}

function togglePanel(show) {
  createFloatingPanel();
  isPanelOpen = typeof show === 'boolean' ? show : !isPanelOpen;
  panelEl.style.display = isPanelOpen ? 'flex' : 'none';
  if (isPanelOpen) {
    updateFloatingPanelContent();
    updateGlobalUI();
  }
}

function updateGlobalUI() {
  if (!panelEl) return;
  const badge = document.getElementById('__ai_global_status_badge');
  const btn = document.getElementById('__ai_global_toggle_btn');
  if (badge && btn) {
    badge.style.background = globalAutoReply ? '#10b981' : '#f59e0b';
    badge.textContent = globalAutoReply ? 'BẬT' : 'TẮT';
    btn.className = `__ai_btn ${globalAutoReply ? '__ai_btn_auto_on' : '__ai_btn_auto_off'}`;
    btn.textContent = globalAutoReply ? 'BẬT' : 'TẮT';
  }
}

function updateFloatingPanelContent() {
  if (!panelEl) return;
  const contactName = activeSelectedContact || getActiveContactName();
  const isTicked = isContactTicked(contactName);

  document.getElementById('__ai_panel_contact').textContent = contactName;
  const autoBtn = document.getElementById('__ai_panel_auto_btn');
  autoBtn.className = `__ai_btn __ai_auto_btn ${isTicked ? '__ai_btn_auto_on' : '__ai_btn_auto_off'}`;
  autoBtn.innerHTML = isTicked ? '🤖 Auto: BẬT' : '🤖 Auto: TẮT';

  if (activeSelectedMessage) {
    document.getElementById('__ai_panel_message').textContent = `"${activeSelectedMessage}"`;
  }
}

function renderFloatingPanelReplies(replies) {
  createFloatingPanel();
  const container = document.getElementById('__ai_panel_replies');
  container.innerHTML = '';
  activeReplies = replies;

  replies.forEach((text, i) => {
    const optNum = i + 1;
    const isDefault = optNum === defaultAutoReplyOption;
    const card = document.createElement('div');
    card.className = '__ai_card';
    card.style.borderColor = isDefault ? 'rgba(168, 85, 247, 0.6)' : 'rgba(255,255,255,0.08)';
    if (isDefault) {
      card.style.background = 'linear-gradient(135deg, rgba(88, 28, 135, 0.25), rgba(30, 41, 59, 0.7))';
    }

    card.innerHTML = `
      <div style="font-size: 11px; font-weight: bold; color: ${isDefault ? '#c084fc' : '#94a3b8'}; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
        <span>LỰA CHỌN ${optNum} (${i === 0 ? 'Tự nhiên' : i === 1 ? 'Lịch sự' : 'Ngắn gọn'}):</span>
        ${isDefault ? '<span style="color:#4ade80; font-size:10px; font-weight:normal;">⭐ Mặc định Auto</span>' : `<button class="__ai_set_default_btn" data-set-opt="${optNum}" style="background:none; border:none; color:#a855f7; font-size:10px; cursor:pointer;">[Đặt làm mặc định]</button>`}
      </div>
      <div style="font-size: 12px; color: #f1f5f9; line-height: 1.4; margin-bottom: 8px;">${text}</div>
      <div style="display: flex; justify-content: flex-end; gap: 6px;">
        <button class="__ai_btn __ai_btn_copy" style="background:rgba(255,255,255,0.08); color:#cbd5e1;">📋 Copy</button>
        <button class="__ai_btn __ai_btn_insert" style="background:rgba(255,255,255,0.15); color:#ffffff;">✍️ Chèn ô</button>
        <button class="__ai_btn __ai_btn_sparkle __ai_btn_send">🚀 Gửi ngay</button>
      </div>
    `;

    const setDefBtn = card.querySelector('.__ai_set_default_btn');
    if (setDefBtn) {
      setDefBtn.addEventListener('click', async () => {
        await saveDefaultOption(optNum);
        const optBtns = panelEl.querySelectorAll('.__ai_opt_choice_btn');
        optBtns.forEach(b => {
          b.classList.toggle('active', parseInt(b.getAttribute('data-opt'), 10) === optNum);
        });
        const badge = document.getElementById('__ai_active_opt_badge');
        if (badge) badge.textContent = `Option ${optNum}`;
        renderFloatingPanelReplies(activeReplies);
      });
    }

    card.querySelector('.__ai_btn_copy').addEventListener('click', () => {
      navigator.clipboard.writeText(text);
      card.querySelector('.__ai_btn_copy').textContent = '✓ Đã chép';
      setTimeout(() => card.querySelector('.__ai_btn_copy').textContent = '📋 Copy', 1500);
    });

    card.querySelector('.__ai_btn_insert').addEventListener('click', () => {
      if (text.includes('AI chưa gen xong')) {
        showToast('⚠️ AI chưa gen xong, vui lòng chờ giây lát!');
        return;
      }
      insertAndSendText(text, null, false);
    });

    card.querySelector('.__ai_btn_send').addEventListener('click', () => {
      if (text.includes('AI chưa gen xong')) {
        showToast('⚠️ AI chưa gen xong, vui lòng chờ giây lát!');
        return;
      }
      insertAndSendText(text, null, true);
    });

    container.appendChild(card);
  });
}

// --- FLOATING BADGE (STATUS & TOGGLE PANEL) ---
let badgeEl = null;
function updateBadge(connected) {
  if (!badgeEl) {
    badgeEl = document.createElement('div');
    badgeEl.id = '__ai_copilot_ext_badge';
    Object.assign(badgeEl.style, {
      position: 'fixed',
      bottom: '15px',
      right: '15px',
      zIndex: '9999999',
      padding: '7px 14px',
      borderRadius: '20px',
      fontSize: '11.5px',
      fontWeight: 'bold',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      cursor: 'pointer',
      userSelect: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    });

    badgeEl.addEventListener('click', () => {
      togglePanel();
    });

    document.body.appendChild(badgeEl);
  }

  if (connected) {
    badgeEl.style.background = globalAutoReply ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : '#475569';
    badgeEl.style.color = '#ffffff';
    badgeEl.innerHTML = `<span style="color:${globalAutoReply ? '#4ade80' : '#f59e0b'};">●</span> <span>AI Copilot (${globalAutoReply ? 'Auto: BẬT' : 'Auto: TẮT'})</span> <span style="font-size:9px; opacity:0.85; background:rgba(0,0,0,0.3); padding:1px 5px; border-radius:10px;">Mở</span>`;
  } else {
    badgeEl.style.background = '#334155';
    badgeEl.style.color = '#94a3b8';
    badgeEl.innerHTML = '<span>○</span> <span>AI Copilot: Đang kết nối...</span>';
  }
}

// --- SYNC WITH LOCAL APP API ---
async function checkConnection() {
  try {
    const res = await fetch(`${LOCAL_API}/api/status`, { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'ok') {
        isConnected = true;
        updateBadge(true);
        return true;
      }
    }
  } catch {}
  isConnected = false;
  updateBadge(false);
  return false;
}

async function fetchTickedContacts() {
  try {
    const res = await fetch(`${LOCAL_API}/api/contacts`, { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      if (data.contacts && Array.isArray(data.contacts)) {
        tickedContactsCache = data.contacts
          .filter(c => c.autoReplyEnabled)
          .map(c => c.name);
        lastTickedFetchTime = Date.now();
      }
      if (data.globalAutoReply !== undefined) {
        globalAutoReply = data.globalAutoReply;
        updateGlobalUI();
        updateBadge(isConnected);
      }
      if (data.defaultAutoReplyOption) {
        defaultAutoReplyOption = data.defaultAutoReplyOption;
      }
    }
  } catch {}
}

// Track active contact change automatically & establish baseline immediately
function syncActiveContact() {
  const current = getActiveContactName();
  if (current && current !== 'Đoạn chat hiện tại' && current !== lastKnownContact) {
    console.log(`[AI Extension] Active contact changed from "${lastKnownContact}" to "${current}"`);
    lastKnownContact = current;
    activeSelectedContact = current;
    activeSelectedMessage = '';
    activeReplies = [];
    isSwitchingChat = true; // Block auto-reply during switch
    updateFloatingPanelContent();

    setTimeout(() => {
      const baseline = getLatestIncomingMessage(null);
      if (baseline) {
        lastSeenIncomingPerContact[current] = baseline;
        console.log(`[AI Extension] Sync recorded baseline for "${current}": "${baseline}"`);
      }
      isSwitchingChat = false;
    }, 700);
  }
}

// --- CLICK DETECTION STRICTLY ON INCOMING CHAT MESSAGES ---
document.addEventListener('click', async (e) => {
  const target = e.target;
  if (!target) return;

  // 1. If clicking left sidebar thread item, handle chat switch immediately & RETURN!
  const threadItem = target.closest('a[href*="/messages/t/"], a[href*="/t/"], div[role="navigation"] [role="row"], div[aria-label*="Đoạn chat" i] a, div[data-testid="mwthreadlist"] a, div[role="grid"] [role="row"]');
  if (threadItem) {
    const textNodes = Array.from(threadItem.querySelectorAll('span[dir="auto"], h2, strong'))
      .map(el => cleanText(el.textContent || ''))
      .filter(t => t && t.length >= 2 && !/^\d{1,2}:\d{2}/.test(t));
    if (textNodes.length > 0) {
      const switchedName = textNodes[0];
      console.log(`[AI Extension] Sidebar clicked. Switching to "${switchedName}"`);
      activeSelectedContact = switchedName;
      lastKnownContact = switchedName;
      activeSelectedMessage = '';
      activeReplies = [];
      isSwitchingChat = true; // Block auto-reply
      updateFloatingPanelContent();

      // Clear previous in-chat suggestions row
      document.querySelectorAll('.__ai_suggestions_row').forEach(r => {
        r.style.display = 'none';
        r.innerHTML = '';
      });

      // After chat renders (700ms), baseline the existing incoming message so AI NEVER replies to old history!
      setTimeout(() => {
        const baseline = getLatestIncomingMessage(null);
        if (baseline) {
          lastSeenIncomingPerContact[switchedName] = baseline;
          console.log(`[AI Extension] Baseline history recorded for "${switchedName}": "${baseline}" (no auto-reply)`);
        }
        isSwitchingChat = false;
      }, 700);
    }
    return; // CRITICAL: Stop here! DO NOT treat switching chat as clicking a message!
  }

  // 2. Ignore non-message elements: UI elements, inputs, menus, headers
  if (target.closest(`
    input, textarea, [contenteditable="true"], div[role="textbox"],
    .__ai_chat_bar, #__ai_copilot_panel, #__ai_copilot_ext_badge,
    header, [role="banner"], [role="navigation"],
    div[aria-label*="Thông tin về đoạn chat" i],
    div[aria-label*="Conversation Information" i],
    div[role="menu"], div[role="menuitem"],
    [aria-label*="Thu hồi" i], [aria-label*="Gỡ" i], [aria-label*="Xóa" i]
  `)) {
    return;
  }

  // 3. Ignore OUTGOING messages sent by the user
  if (target.closest('[aria-label*="Bạn đã gửi" i], [aria-label*="You sent" i]')) {
    return;
  }

  // 4. Must be inside message stream
  const mainChatStream = target.closest('div[role="main"], div[role="dialog"], [data-pagelet*="ChatTab" i]');
  if (!mainChatStream) return;

  let rawText = '';
  let highlightTarget = null;

  const textLeaf = target.closest('div[dir="auto"], span[dir="auto"], .bubble-content, .text, .chat-message-text, .message-content, .text-content');
  if (textLeaf) {
    rawText = textLeaf.textContent?.trim() || '';
    highlightTarget = textLeaf;
  }

  const text = cleanText(rawText);
  if (text && text.length >= 1 && text.length <= 800) {
    const contact = getActiveContactName();
    
    console.log(`[AI Extension Message Clicked] "${contact}": "${text}"`);
    activeSelectedContact = contact;
    activeSelectedMessage = text;

    if (highlightTarget && highlightTarget.style) {
      const prev = highlightTarget.style.outline;
      highlightTarget.style.outline = '2px solid #a855f7';
      highlightTarget.style.borderRadius = '8px';
      setTimeout(() => {
        if (highlightTarget) highlightTarget.style.outline = prev;
      }, 1200);
    }

    // Forward to app UI
    try {
      fetch(`${LOCAL_API}/api/select-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          contact,
          platform: 'messenger'
        })
      });
    } catch {}

    // Request Gemini replies
    showToast(`🤖 AI Gemini đang phân tích tin nhắn của <b>${contact}</b>...`);
    const replies = await requestReplies(contact, text);

    // In-chat bar suggestions
    const container = getChatContainerForElement(target);
    if (container) {
      const bar = container.querySelector('.__ai_chat_bar');
      if (bar) {
        const row = bar.querySelector('.__ai_suggestions_row');
        renderSuggestionsInRow(row, container, replies);
      }
    }

    // Floating panel suggestions
    updateFloatingPanelContent();
    renderFloatingPanelReplies(replies);

    // ONLY auto-send if user deliberately switched ON "autoSendOnClick" in panel!
    if (autoSendOnClick && replies && replies.length > 0) {
      const opt = defaultAutoReplyOption || 1;
      const chosenIndex = Math.max(0, Math.min(opt - 1, replies.length - 1));
      const chosen = replies[chosenIndex] || replies[0];

      if (chosen && !chosen.includes('AI chưa gen xong')) {
        showToast(`🚀 Đang tự động gửi Option ${opt} cho <b>${contact}</b>: "${chosen}"`);
        setTimeout(() => {
          insertAndSendText(chosen, container, true);
        }, 400);
      } else {
        console.warn('[AI Extension] Bỏ qua auto-send: AI chưa hoàn tất tạo câu trả lời.');
      }
    }
  }
}, true);

// --- AUTO-REPLY ONLY WHEN A GENUINELY NEW INCOMING MESSAGE ARRIVES ---
async function runActiveChatAutoReplyScan() {
  if (!isConnected || !globalAutoReply || isSwitchingChat || isSending) return;

  const contact = getActiveContactName();
  if (!contact || contact === 'Đoạn chat hiện tại') return;
  if (!isContactTicked(contact)) return; // Only for TICKED contacts!

  const incomingText = getLatestIncomingMessage(null);
  if (!incomingText) return;

  // Baseline on first sight of this contact: NEVER auto-reply to existing chat history!
  if (lastSeenIncomingPerContact[contact] === undefined) {
    lastSeenIncomingPerContact[contact] = incomingText;
    console.log(`[AI Auto-Reply Scan] Baseline established for "${contact}": "${incomingText}" (no auto-reply to history)`);
    return;
  }

  // ONLY trigger if incomingText is STRICTLY NEW and DIFFERENT from baseline!
  if (incomingText !== lastSeenIncomingPerContact[contact]) {
    lastSeenIncomingPerContact[contact] = incomingText;
    console.log(`[AI Auto-Reply Scan] Genuinely NEW incoming message from "${contact}": "${incomingText}"`);

    try {
      const res = await fetch(`${LOCAL_API}/api/trigger-incoming`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact,
          message: incomingText,
          platform: 'messenger'
        })
      });
      const data = await res.json();
      if (data && data.replyResponse && data.replyResponse.suggestedReplies) {
        const replies = data.replyResponse.suggestedReplies;
        const opt = (data.defaultAutoReplyOption || defaultAutoReplyOption || 1);
        const chosenIndex = Math.max(0, Math.min(opt - 1, replies.length - 1));
        const chosen = replies[chosenIndex] || replies[0];
        
        if (chosen && !chosen.includes('AI chưa gen xong')) {
          console.log(`[AI Auto-Reply] Auto-sending Option ${opt} in 2.5s to "${contact}": "${chosen}"`);
          showToast(`🤖 Auto-Reply: Đang gửi Option ${opt} cho <b>${contact}</b>...`);
          setTimeout(() => {
            // Guard: ensure user is still on the same contact
            if (getActiveContactName() === contact) {
              insertAndSendText(chosen, null, true);
            }
          }, 2500);
        } else {
          console.warn('[AI Auto-Reply] Bỏ qua auto-send: AI chưa gen xong.');
        }
      }
    } catch (e) {
      console.warn('[AI Extension] Auto reply error:', e);
    }
  }
}

// --- CROSS-CHAT SCANNER: AUTO-REPLY KỂ CẢ KHI ĐANG Ở ĐOẠN CHAT KHÁC ---
async function scanSidebarThreadsAndAutoReply() {
  if (!isConnected || !globalAutoReply || isSwitchingChat || isSending) return;
  if (!tickedContactsCache || tickedContactsCache.length === 0) return;

  const threadElements = Array.from(document.querySelectorAll(
    'a[href*="/messages/t/"], a[href*="/t/"], div[role="navigation"] [role="row"], div[aria-label*="Đoạn chat" i] a, div[data-testid="mwthreadlist"] a, div[role="grid"] [role="row"]'
  ));

  const currentContact = getActiveContactName() || '';
  const currentNorm = normalize(currentContact);

  for (const thread of threadElements) {
    const textNodes = Array.from(thread.querySelectorAll('span[dir="auto"], h2, h3, a span, div[dir="auto"]'))
      .map(el => cleanText(el.textContent || ''))
      .filter(t => t && t.length >= 2 && !/^\d{1,2}:\d{2}/.test(t));

    if (textNodes.length === 0) continue;
    const name = textNodes[0];
    const normName = normalize(name);

    if (!isContactTicked(name)) continue;

    const snippet = textNodes.length > 1 ? textNodes[1] : '';
    // Skip outgoing messages
    if (snippet && (snippet.startsWith('Bạn:') || snippet.startsWith('You:') || snippet.startsWith('bạn:') || snippet.startsWith('you:'))) {
      continue;
    }

    // Baseline snippet if first time seen (never auto-reply on first scan!)
    if (lastSidebarRepliedSnippets[normName] === undefined) {
      lastSidebarRepliedSnippets[normName] = snippet || '__initial__';
      continue;
    }

    const hasUnreadBadge = Boolean(
      thread.querySelector('[aria-label*="chưa đọc" i], [aria-label*="unread" i], .badge') ||
      thread.querySelector('div[style*="border-radius: 50%"]') ||
      thread.querySelector('span[style*="font-weight: bold"], span[style*="font-weight: 600"], span[style*="font-weight: 700"]')
    );

    const lastReplied = lastSidebarRepliedSnippets[normName];

    // ONLY trigger when there is an unread badge AND snippet changed from what we already saw!
    if (hasUnreadBadge && snippet && snippet !== lastReplied && normName !== currentNorm) {
      console.log(`[Cross-Chat Auto-Reply] Ticked contact "${name}" has unread incoming: "${snippet}". Auto-switching to reply!`);
      lastSidebarRepliedSnippets[normName] = snippet;
      isSwitchingChat = true;

      showToast(`⚡ Nhận tin nhắn mới từ <b>${name}</b>. Đang tự động chuyển sang để trả lời...`);

      const clickable = (thread.tagName === 'A' ? thread : thread.querySelector('a') || thread);
      clickable.click();

      setTimeout(async () => {
        isSwitchingChat = false;
        const incomingText = snippet || getLatestIncomingMessage(null) || 'Alo bạn';
        lastSeenIncomingPerContact[name] = incomingText;
        
        try {
          const res = await fetch(`${LOCAL_API}/api/trigger-incoming`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contact: name,
              message: incomingText,
              platform: 'messenger'
            })
          });
          const data = await res.json();
          if (data && data.replyResponse && data.replyResponse.suggestedReplies) {
            const replies = data.replyResponse.suggestedReplies;
            const opt = (data.defaultAutoReplyOption || defaultAutoReplyOption || 1);
            const chosenIndex = Math.max(0, Math.min(opt - 1, replies.length - 1));
            const chosen = replies[chosenIndex] || replies[0];

            if (chosen && !chosen.includes('AI chưa gen xong')) {
              showToast(`🤖 Đang tự động gửi Option ${opt} cho <b>${name}</b>: "${chosen}"`);
              setTimeout(() => {
                insertAndSendText(chosen, null, true);
              }, 1500);
            } else {
              console.warn('[Cross-Chat Auto-Reply] Bỏ qua auto-send: AI chưa gen xong.');
            }
          }
        } catch (e) {
          console.warn('[Cross-Chat Auto-Reply] Send error:', e);
        }
      }, 1000);

      break;
    }
  }
}

// --- INITIALIZATION & RECURRING LOOPS ---
checkConnection();
fetchTickedContacts();
createFloatingPanel();

setInterval(checkConnection, 5000);
setInterval(syncActiveContact, 1000);
setInterval(attachToolbarsToOpenChats, 1200);
setInterval(runActiveChatAutoReplyScan, 2000);
setInterval(scanSidebarThreadsAndAutoReply, 3000);
