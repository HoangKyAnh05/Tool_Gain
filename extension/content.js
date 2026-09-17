/**
 * AI Copilot Assistant Extension for Facebook & Messenger Web
 * Embedded In-Chat UI & Floating Control Panel
 * Exclusively Manual Send: AI Generates Suggestions -> User Selects & Sends
 * Connects directly to local AI Omnichannel Assistant at http://127.0.0.1:45678
 */

let LOCAL_API = 'http://127.0.0.1:45678';
const CANDIDATE_PORTS = [45678, 45679, 45680];
let isConnected = false;
let activeSelectedContact = '';
let activeSelectedMessage = '';
let activeReplies = [];
let isPanelOpen = false;
let isSwitchingChat = false;
let isSending = false;
let lastKnownContact = '';
let activeSelectedPersonaId = '';

const STYLE_PRESETS = {
  persona_flirt_crush: {
    id: 'persona_flirt_crush',
    name: 'Gái Xinh / Crush',
    badge: '💋 Gái Xinh',
    pills: [
      { label: '💖 Thả thính & Khen ngợi', ctx: 'Thả thính tinh tế, khen ngợi có gu độc đáo khiến nàng thích thú' },
      { label: '☕ Rủ đi cafe / Đi chơi', ctx: 'Mở lời rủ đi cafe hoặc đi chơi cực kỳ tự nhiên, dùng câu hỏi lựa chọn giả định' },
      { label: '😏 Cà khịa trêu đùa (Push-Pull)', ctx: 'Trêu đùa tinh tế, kéo đẩy cảm xúc, cà khịa duyên dáng khiến nàng rung rinh' },
      { label: '🔥 Đẩy cảm xúc mê mệt', ctx: 'Đẩy cảm xúc ngọt ngào, tạo sự tò mò bí ẩn khiến nàng mê mệt và muốn nhắn tiếp' }
    ]
  },
  persona_boss_work: {
    id: 'persona_boss_work',
    name: 'Với Sếp / Đối tác',
    badge: '👔 Báo Cáo Sếp',
    pills: [
      { label: '📋 Báo cáo tiến độ', ctx: 'Báo cáo tiến độ công việc ngắn gọn 3 ý: đã làm gì, kết quả, bước tiếp theo' },
      { label: '✅ Nhận việc & Cam kết', ctx: 'Xác nhận đã hiểu rõ yêu cầu và cam kết deadline cụ thể gửi Sếp duyệt' },
      { label: '💡 Đề xuất phương án', ctx: 'Báo cáo vướng mắc kèm 2 phương án xử lý tối ưu để Sếp lựa chọn' },
      { label: '🙏 Xin phép khéo léo', ctx: 'Lễ phép xin phép với lý do chính đáng và đề xuất bù đắp công việc' }
    ]
  },
  persona_badminton_client: {
    id: 'persona_badminton_client',
    name: 'Khách Cầu Lông',
    badge: '🏸 Khách Cầu Lông',
    pills: [
      { label: '🏸 Tư vấn khóa học', ctx: 'Tư vấn lộ trình học cầu lông bài bản, cam kết sửa kỹ thuật ve trái tay/bộ chân' },
      { label: '⏰ Xếp lịch sân tập', ctx: 'Xếp lịch khung giờ và sân bãi thuận tiện nhất (sân K+, CTA, Bao Cáp, Gamma)' },
      { label: '💪 Mời test trình độ', ctx: 'Mời qua sân giao lưu test thử cảm giác cầu buổi đầu hoàn toàn thoải mái' },
      { label: '💰 Báo phí & Ưu đãi', ctx: 'Báo học phí ưu đãi, tặng kèm quấn cán/nước và chính sách bảo lưu' }
    ]
  },
  persona_family_dad: {
    id: 'persona_family_dad',
    name: 'Nói với Bố',
    badge: '👨 Nói với Bố',
    pills: [
      { label: '🏠 Báo lịch về quê', ctx: 'Báo lịch cuối tuần hoặc tuần sau con về quê thăm bố mẹ nha bố' },
      { label: '💼 Báo việc học & đi làm', ctx: 'Báo việc học tập và đi làm ở Hà Nội của con ổn định lắm, bố yên tâm ạ' },
      { label: '🍲 Hỏi thăm sức khỏe bố', ctx: 'Hỏi thăm bố ăn cơm chưa và dặn bố giữ gìn sức khỏe' },
      { label: '💸 Báo gửi quà / biếu tiền', ctx: 'Báo con vừa gửi ít đồ / gửi tiền về biếu bố mẹ ạ' }
    ]
  },
  persona_family_mom: {
    id: 'persona_family_mom',
    name: 'Nói với Mẹ',
    badge: '👩 Nói với Mẹ',
    pills: [
      { label: '🍚 Báo con ăn no rồi', ctx: 'Báo con ăn cơm no rồi và hỏi bố mẹ ở nhà đã ăn cơm chưa ạ' },
      { label: '🍲 Khen đồ ăn mẹ gửi', ctx: 'Khen đồ ăn mẹ gửi ngon lắm và dặn mẹ món ngon khi con về quê' },
      { label: '❤️ Dặn mẹ ngủ sớm giữ sức khỏe', ctx: 'Dặn mẹ làm việc vừa thôi và tối nhớ ngủ sớm giữ gìn sức khỏe mẹ nha ❤️' },
      { label: '🏠 Báo lịch về quê với mẹ', ctx: 'Báo cuối tuần này con về thăm mẹ, nhớ mẹ quá ❤️' }
    ]
  },
  persona_shop_customer: {
    id: 'persona_shop_customer',
    name: 'Khách Mua Sắm',
    badge: '🛍️ Khách Mua Sắm',
    pills: [
      { label: '👟 Tư vấn size & form', ctx: 'Hỏi chiều cao/cân nặng/size chân để tư vấn form chuẩn và gửi ảnh thật' },
      { label: '💰 Báo giá & Freeship', ctx: 'Báo giá hữu nghị xưởng order cao cấp và ưu đãi freeship trong ngày' },
      { label: '📦 Cam kết kiểm tra COD', ctx: 'Cam kết nhận hàng kiểm tra trước khi trả tiền (COD), đổi size trong 7 ngày' },
      { label: '🎁 Chốt đơn giữ hàng', ctx: 'Khéo léo xin địa chỉ và SĐT để lên đơn giữ size số lượng có hạn' }
    ]
  }
};

const DEFAULT_PILLS = [
  { label: '+ Đồng ý chốt lịch', ctx: 'Đồng ý, chốt luôn lịch' },
  { label: '+ Hẹn tối mai', ctx: 'Hẹn lại vào tối mai' },
  { label: '+ Từ chối khéo', ctx: 'Từ chối khéo léo, lịch sự' },
  { label: '+ Hỏi chi tiết', ctx: 'Hỏi thêm chi tiết' }
];

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
    .__ai_card {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 10px;
      transition: all 0.2s ease;
    }
    .__ai_card:hover {
      border-color: rgba(168, 85, 247, 0.3);
    }
    .__ai_style_btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 10px;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 8px;
      color: #cbd5e1;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
    }
    .__ai_style_btn:hover {
      background: rgba(147, 51, 234, 0.15);
      border-color: #c084fc;
      color: #ffffff;
      transform: translateY(-1px);
    }
    .__ai_style_btn.active {
      background: linear-gradient(135deg, rgba(147, 51, 234, 0.35), rgba(79, 70, 229, 0.35));
      border-color: #ec4899;
      color: #ffffff;
      box-shadow: 0 0 10px rgba(236, 72, 153, 0.25);
    }
    .__ai_context_pill {
      font-size: 10px;
      padding: 4px 8px;
      border-radius: 6px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(148, 163, 184, 0.2);
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .__ai_context_pill:hover {
      border-color: #a855f7;
      color: #f1f5f9;
      background: rgba(147, 51, 234, 0.2);
    }
    .__ai_toast {
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(15, 23, 42, 0.95);
      color: #f8fafc;
      padding: 10px 16px;
      border-radius: 10px;
      font-size: 12px;
      border-left: 4px solid #a855f7;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      z-index: 100000000;
      pointer-events: none;
      transition: all 0.3s ease;
      backdrop-filter: blur(8px);
    }
  `;
  document.head.appendChild(style);
}

// --- TOAST NOTIFICATIONS ---
function showToast(message, duration = 3000) {
  const existing = document.querySelector('.__ai_toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = '__ai_toast';
  toast.innerHTML = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// --- HELPER UTILITIES ---
function cleanText(str) {
  if (!str) return '';
  return str
    .replace(/\s+/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

function normalize(s) {
  return (s || '').toLowerCase().replace(/[\s\-_]+/g, '').trim();
}

function isInvalidName(t) {
  if (!t || t.length < 2) return true;
  const lower = t.toLowerCase();
  const blacklist = [
    'messenger', 'tất cả', 'chưa đọc', 'nhóm', 'đoạn chat', 'hộp thư đến',
    'đang hoạt động', 'phút', 'giờ', 'hoạt động', 'tìm kiếm', 'search',
    'bạn đã gửi', 'bạn:', 'thông tin về đoạn chat', 'tùy chỉnh đoạn chat',
    'file phương tiện', 'quyền riêng tư', 'bắt nhạc', 'ai copilot'
  ];
  return blacklist.some(b => lower === b || (lower.startsWith(b) && lower.length < b.length + 3));
}

function getActiveContactName() {
  // 1. Messenger desktop central chat header
  const header = document.querySelector('div[role="main"] header, [data-pagelet*="ChatTab" i] h2, div[role="dialog"] h2, div[role="banner"] h1, div[role="banner"] h2');
  if (header) {
    const textEls = Array.from(header.querySelectorAll('h1, h2, span[dir="auto"], strong, a'));
    for (const el of textEls) {
      const text = cleanText(el.textContent || '');
      if (text && !isInvalidName(text) && !/^\d{1,2}:\d{2}/.test(text) && text.length <= 50) {
        return text.split('\n')[0].trim();
      }
    }
  }

  // 2. Messenger right-side info panel title
  const infoPanels = document.querySelectorAll('div[aria-label*="Thông tin" i], div[aria-label*="Conversation Information" i], div[role="complementary"]');
  for (const panel of infoPanels) {
    const titleEls = Array.from(panel.querySelectorAll('h1, h2, h3, span[dir="auto"], strong'));
    for (const el of titleEls) {
      const text = cleanText(el.textContent || '');
      if (text && !isInvalidName(text) && text.length <= 50) {
        return text.split('\n')[0].trim();
      }
    }
  }

  // 3. Active highlighted thread in left sidebar (excluding tabs)
  const activeThread = document.querySelector('div[role="navigation"] [role="row"][aria-selected="true"], div[role="navigation"] a[aria-current="page"], div[role="grid"] [role="row"][aria-selected="true"], div[data-testid="mwthreadlist"] [aria-selected="true"]');
  if (activeThread && !activeThread.getAttribute('role')?.includes('tab')) {
    const nameEl = activeThread.querySelector('span[dir="auto"], h2, strong');
    if (nameEl) {
      const name = cleanText(nameEl.textContent || '');
      if (name && !isInvalidName(name)) return name;
    }
  }

  // 4. Fallback to activeSelectedContact
  return (activeSelectedContact && !isInvalidName(activeSelectedContact)) ? activeSelectedContact : 'Đoạn chat hiện tại';
}

function getContactNameForContainer(container) {
  if (!container) return getActiveContactName();
  const titleEls = Array.from(container.querySelectorAll('h1, h2, span[dir="auto"], strong, .title'));
  for (const el of titleEls) {
    const text = cleanText(el.textContent || '');
    if (text && !isInvalidName(text) && text.length <= 50) {
      return text.split('\n')[0].trim();
    }
  }
  return getActiveContactName();
}

function getChatContainerForElement(el) {
  return el.closest('div[role="dialog"], div[data-pagelet*="ChatTab" i], .fbDockChatTab, div[aria-label*="Đoạn chat" i], div[role="main"]');
}

function getLatestIncomingMessage(container) {
  const root = container || document.querySelector('div[role="main"], div[role="dialog"], [data-pagelet*="ChatTab" i]') || document.body;
  if (!root) return '';

  const leaves = Array.from(root.querySelectorAll('div[dir="auto"], span[dir="auto"], .bubble-content, .text, .chat-message-text, .message-content, .text-content'));
  const list = [];

  for (const leaf of leaves) {
    // Exclude outgoing messages
    if (leaf.closest('[aria-label*="Bạn đã gửi" i], [aria-label*="You sent" i], [aria-label*="Đã gửi" i]')) continue;
    // Exclude UI controls
    if (leaf.closest('.__ai_chat_bar, #__ai_copilot_panel, header, [role="banner"], [role="navigation"], form, [role="textbox"], input, textarea')) continue;

    const t = cleanText(leaf.textContent || '');
    if (t && t.length >= 1 && t.length <= 800) {
      if (/^\d{1,2}:\d{2}/.test(t)) continue;
      if (t === 'Đang hoạt động' || t.includes('hoạt động') || t.startsWith('Xem thêm')) continue;
      const rect = leaf.getBoundingClientRect();
      if (rect.height > 0 && rect.width > 0) {
        list.push({ text: t, top: rect.top });
      }
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
function insertAndSendText(text, container, sendNow = false) {
  if (!text || text.includes('AI chưa gen xong') || isSending) {
    if (text && text.includes('AI chưa gen xong')) {
      console.warn('[AI Extension] Không thể gửi tin nhắn vì AI chưa gen xong!');
      showToast('⚠️ AI chưa gen xong câu trả lời, vui lòng chờ AI xử lý xong!');
    }
    if (isSending) console.warn('[AI Extension] Already executing action, please wait.');
    return false;
  }

  const input = findActiveMessageInput(container);
  if (!input) {
    console.warn('[AI Extension] Could not find message input box!');
    showToast('⚠️ Không tìm thấy ô nhập tin nhắn!');
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

    // 3. Send if user clicked "Gửi ngay"
    if (sendNow) {
      showToast(`🚀 Đang gửi: "${text.length > 30 ? text.slice(0, 30) + '...' : text}"`);
      setTimeout(() => {
        const sendBtn = findSendButton(input);
        if (sendBtn) {
          simulateClick(sendBtn);
        } else {
          simulateEnter(input);
        }
        setTimeout(() => {
          isSending = false;
        }, 1200);
      }, 120);
    } else {
      showToast(`✍️ Đã chèn vào ô chat! Bạn có thể chỉnh sửa trước khi gửi.`);
      isSending = false;
    }
    return true;
  } catch (e) {
    console.warn('[AI Extension] insertAndSendText error:', e);
    isSending = false;
    return false;
  }
}

// --- API CLIENT ---
async function requestReplies(contact, message, context = '', personaId = '') {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const targetPersonaId = personaId || activeSelectedPersonaId || undefined;
    const res = await fetch(`${LOCAL_API}/api/generate-reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact,
        message,
        context,
        personaId: targetPersonaId,
        platform: 'messenger'
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
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
    'AI chưa gen xong (Hãy chắc chắn App AI Desktop đang mở)',
    'AI chưa gen xong (Vui lòng thử lại sau giây lát)',
    'AI chưa gen xong'
  ];
}

// --- IN-CHAT TOOLBAR INJECTION ---
function attachToolbarsToOpenChats() {
  const chatContainers = document.querySelectorAll('div[role="dialog"], div[data-pagelet*="ChatTab" i], .fbDockChatTab, div[aria-label*="Đoạn chat" i]');
  
  for (const container of chatContainers) {
    const inputBox = container.querySelector('div[role="textbox"][contenteditable="true"], div[contenteditable="true"]');
    if (!inputBox) continue;

    let bar = container.querySelector('.__ai_chat_bar');
    if (bar) continue;

    bar = document.createElement('div');
    bar.className = '__ai_chat_bar';
    bar.innerHTML = `
      <div class="__ai_chat_bar_top">
        <div class="__ai_chat_bar_left">
          <button class="__ai_btn __ai_btn_sparkle __ai_gen_btn" title="AI Gemini phân tích tin nhắn và gợi ý câu trả lời">
            ✨ Gợi ý AI
          </button>
        </div>
        <div style="font-size: 11px; color: #a855f7; font-weight: bold; display: flex; align-items: center; gap: 4px;">
          <span>⚡ AI Copilot</span>
        </div>
      </div>
      <div class="__ai_suggestions_row" style="display: none;"></div>
    `;

    const genBtn = bar.querySelector('.__ai_gen_btn');
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
    const chip = document.createElement('div');
    chip.className = '__ai_suggestion_chip';
    chip.innerHTML = `
      <div class="__ai_chip_text" title="${text}">
        💡 <b>Lựa chọn ${idx + 1}:</b> ${text}
      </div>
      <div class="__ai_chip_actions">
        <button class="__ai_chip_btn __ai_chip_insert" title="Chèn vào ô chat để bạn chỉnh sửa">✍️ Chèn</button>
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
          <div style="font-size: 10px; color: #94a3b8;">Google Gemini 3.7 Flash • Gợi ý thông minh (Gửi thủ công)</div>
        </div>
      </div>
      <button id="__ai_panel_close" style="background:none; border:none; color:#94a3b8; font-size:16px; cursor:pointer; padding:2px 6px;">✕</button>
    </div>
    <div class="__ai_panel_body">
      <!-- Active Contact Bar -->
      <div class="__ai_card" style="display: flex; align-items: center; justify-content: space-between;">
        <div>
          <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">Đoạn chat hiện tại</div>
          <div id="__ai_panel_contact" style="font-weight: bold; font-size: 14px; color: #f8fafc;">Đang chọn...</div>
        </div>
        <div style="font-size: 11px; color: #4ade80; background: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.3); padding: 3px 8px; border-radius: 8px; font-weight: 600;">
          ✨ Sẵn sàng
        </div>
      </div>

      <!-- Selected Message Card -->
      <div class="__ai_card">
        <div style="font-size: 10px; color: #94a3b8; margin-bottom: 4px;">TIN NHẮN ĐÃ CHỌN / MỚI NHẬN:</div>
        <div id="__ai_panel_message" style="font-size: 12px; color: #e2e8f0; font-style: italic; background: rgba(0,0,0,0.25); padding: 8px; border-radius: 6px; border-left: 3px solid #a855f7;">
          (Bấm vào bất kỳ tin nhắn nào trong chat để xem 3 gợi ý)
        </div>
      </div>

      <!-- Style & Target Persona Selector -->
      <div class="__ai_card">
        <div style="font-size: 11px; color: #f472b6; font-weight: bold; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
          <span>🎯 CHỌN PHONG CÁCH / ĐỐI TƯỢNG:</span>
          <span id="__ai_active_style_badge" style="background:#7c3aed; color:#fff; font-size:9.5px; padding:1px 6px; border-radius:8px;">Tự động</span>
        </div>
        <div id="__ai_style_btns_container" style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
          <button class="__ai_style_btn" data-persona="persona_flirt_crush" title="Tán gái xinh / crush: push-pull, trêu đùa, rủ đi chơi">
            <span>💋</span> <span>Gái Xinh / Crush</span>
          </button>
          <button class="__ai_style_btn" data-persona="persona_boss_work" title="Làm việc với Sếp / Đối tác: chuyên nghiệp, tiến độ">
            <span>👔</span> <span>Với Sếp / Đối tác</span>
          </button>
          <button class="__ai_style_btn" data-persona="persona_family_dad" title="Nói chuyện với Bố: hiếu thảo, lễ phép, báo cáo việc học & việc làm, hỏi thăm sức khỏe">
            <span>👨</span> <span>Nói với Bố</span>
          </button>
          <button class="__ai_style_btn" data-persona="persona_family_mom" title="Nói chuyện với Mẹ: tình cảm, ấm áp, khen đồ ăn mẹ gửi, dặn mẹ ngủ sớm">
            <span>👩</span> <span>Nói với Mẹ</span>
          </button>
          <button class="__ai_style_btn" data-persona="persona_badminton_client" title="Khách học cầu lông: tư vấn kỹ thuật, xếp lịch sân">
            <span>🏸</span> <span>Khách Cầu Lông</span>
          </button>
          <button class="__ai_style_btn" data-persona="persona_shop_customer" title="Khách mua sắm: tư vấn size, chốt đơn freeship">
            <span>🛍️</span> <span>Khách Mua Sắm</span>
          </button>
        </div>
      </div>

      <!-- Custom Note / Specific Intent Input -->
      <div class="__ai_card" style="display: flex; flex-direction: column; gap: 6px; border-color: rgba(56, 189, 248, 0.35); background: rgba(15, 23, 42, 0.85);">
        <div style="font-size: 11px; color: #38bdf8; font-weight: bold; display: flex; align-items: center; justify-content: space-between;">
          <span>✍️ GHI CHÚ / Ý MUỐN CỤ THỂ (GEN CHUẨN Ý):</span>
          <span id="__ai_clear_custom_note" style="color: #94a3b8; font-size: 10px; cursor: pointer; text-decoration: underline;" title="Xóa ghi chú">Xóa</span>
        </div>
        <div style="display: flex; gap: 6px;">
          <input id="__ai_custom_note_input" type="text" placeholder="Gõ ý muốn (vd: rủ ăn lẩu, báo bận ở quê, khen áo đẹp...)" style="flex: 1; min-width: 0; background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; padding: 6px 10px; color: #f8fafc; font-size: 11.5px; outline: none; transition: border-color 0.2s;">
          <button id="__ai_apply_custom_note_btn" class="__ai_btn __ai_btn_sparkle" style="padding: 6px 12px; font-size: 11px; white-space: nowrap;" title="Tạo 3 câu gợi ý mới theo đúng ghi chú này">
            ⚡ Gen
          </button>
        </div>
      </div>

      <!-- Context Rewriting Pills -->
      <div>
        <div style="font-size: 11px; color: #94a3b8; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
          <span>GỢI Ý NHANH THEO NGỮ CẢNH:</span>
          <span id="__ai_panel_loading" style="display:none; color:#c084fc; font-size:10px;">⏳ Đang tạo...</span>
        </div>
        <div id="__ai_context_pills_container" style="display: flex; gap: 6px; flex-wrap: wrap;">
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

  // Helper to generate with custom note or context
  async function generateWithCurrentNote(overrideCtx) {
    const input = document.getElementById('__ai_custom_note_input');
    const note = overrideCtx !== undefined ? overrideCtx : (input ? input.value.trim() : '');
    if (overrideCtx !== undefined && input) {
      input.value = overrideCtx;
    }
    const contact = activeSelectedContact || getActiveContactName();
    const msg = activeSelectedMessage || 'Alo bạn';
    document.getElementById('__ai_panel_loading').style.display = 'inline';
    const replies = await requestReplies(contact, msg, note, activeSelectedPersonaId);
    document.getElementById('__ai_panel_loading').style.display = 'none';
    activeReplies = replies;
    renderFloatingPanelReplies(replies);
    if (note) {
      showToast(`🎯 Đã tạo gợi ý theo ghi chú: <b>"${note.length > 30 ? note.slice(0, 30) + '...' : note}"</b>`);
    }
  }

  // Custom Note Box Listeners
  const customNoteInput = document.getElementById('__ai_custom_note_input');
  const applyCustomNoteBtn = document.getElementById('__ai_apply_custom_note_btn');
  const clearCustomNoteBtn = document.getElementById('__ai_clear_custom_note');

  if (applyCustomNoteBtn) {
    applyCustomNoteBtn.addEventListener('click', () => generateWithCurrentNote());
  }
  if (customNoteInput) {
    customNoteInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        generateWithCurrentNote();
      }
    });
  }
  if (clearCustomNoteBtn) {
    clearCustomNoteBtn.addEventListener('click', () => {
      if (customNoteInput) customNoteInput.value = '';
      generateWithCurrentNote('');
    });
  }

  // Helper function to update context pills dynamically
  function updateContextPills(personaId) {
    const container = document.getElementById('__ai_context_pills_container');
    if (!container) return;
    const preset = STYLE_PRESETS[personaId];
    const pillsToRender = preset ? preset.pills : DEFAULT_PILLS;
    container.innerHTML = pillsToRender.map(p => `<span class="__ai_context_pill" data-ctx="${p.ctx}">${p.label}</span>`).join('');
    
    // Bind click events on newly rendered pills -> autofill input & generate!
    container.querySelectorAll('.__ai_context_pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const ctx = pill.getAttribute('data-ctx');
        generateWithCurrentNote(ctx);
      });
    });
  }

  // Style Buttons Listener
  const styleBtns = panelEl.querySelectorAll('.__ai_style_btn');
  styleBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const personaId = btn.getAttribute('data-persona');
      const badge = document.getElementById('__ai_active_style_badge');
      
      if (activeSelectedPersonaId === personaId) {
        // Toggle OFF
        activeSelectedPersonaId = '';
        styleBtns.forEach(b => b.classList.remove('active'));
        if (badge) {
          badge.style.background = '#7c3aed';
          const currentContact = activeSelectedContact || getActiveContactName();
          const cleanName = (currentContact && currentContact !== 'Đoạn chat hiện tại' && currentContact !== 'Đang chọn...') ? currentContact : '';
          badge.textContent = cleanName ? `🎯 Tự động: ${cleanName}` : '🎯 Tự động';
        }
        updateContextPills('');
        const currentContact = activeSelectedContact || getActiveContactName();
        showToast(`🎯 Đã chuyển về phong cách riêng của <b>${currentContact || 'người này'}</b> (Tự động)`);
      } else {
        // Toggle ON
        activeSelectedPersonaId = personaId;
        styleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const preset = STYLE_PRESETS[personaId];
        if (badge && preset) {
          badge.style.background = '#ec4899';
          badge.textContent = preset.badge;
        }
        updateContextPills(personaId);
        showToast(`✨ Đã kích hoạt phong cách: <b>${preset ? preset.name : personaId}</b>`);
      }

      // Automatically re-generate suggestions with new style
      const contact = activeSelectedContact || getActiveContactName();
      const msg = activeSelectedMessage || 'Alo bạn';
      document.getElementById('__ai_panel_loading').style.display = 'inline';
      const replies = await requestReplies(contact, msg, '', activeSelectedPersonaId);
      document.getElementById('__ai_panel_loading').style.display = 'none';
      activeReplies = replies;
      renderFloatingPanelReplies(replies);
    });
  });

  // Initial bind of default context pills
  updateContextPills('');
}

function togglePanel(show) {
  createFloatingPanel();
  isPanelOpen = typeof show === 'boolean' ? show : !isPanelOpen;
  panelEl.style.display = isPanelOpen ? 'flex' : 'none';
  if (isPanelOpen) {
    updateFloatingPanelContent();
  }
}

function updateFloatingPanelContent() {
  if (!panelEl) return;
  const contactName = activeSelectedContact || getActiveContactName();
  const contactEl = document.getElementById('__ai_panel_contact');
  if (contactEl) contactEl.textContent = contactName;

  if (activeSelectedMessage) {
    const msgEl = document.getElementById('__ai_panel_message');
    if (msgEl) msgEl.textContent = `"${activeSelectedMessage}"`;
  }

  const badge = document.getElementById('__ai_active_style_badge');
  if (badge) {
    if (activeSelectedPersonaId && STYLE_PRESETS[activeSelectedPersonaId]) {
      badge.style.background = '#ec4899';
      badge.textContent = STYLE_PRESETS[activeSelectedPersonaId].badge;
    } else {
      badge.style.background = '#7c3aed';
      const cleanName = (contactName && contactName !== 'Đoạn chat hiện tại' && contactName !== 'Đang chọn...') ? contactName : '';
      badge.textContent = cleanName ? `🎯 Tự động: ${cleanName}` : '🎯 Tự động';
    }
  }
}

function renderFloatingPanelReplies(replies) {
  createFloatingPanel();
  const container = document.getElementById('__ai_panel_replies');
  container.innerHTML = '';
  activeReplies = replies;

  replies.forEach((text, i) => {
    const optNum = i + 1;
    const card = document.createElement('div');
    card.className = '__ai_card';
    card.style.borderColor = 'rgba(255,255,255,0.08)';

    card.innerHTML = `
      <div style="font-size: 11px; font-weight: bold; color: #c084fc; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
        <span>LỰA CHỌN ${optNum} (${i === 0 ? 'Tự nhiên' : i === 1 ? 'Lịch sự' : 'Ngắn gọn'}):</span>
      </div>
      <div style="font-size: 12px; color: #f1f5f9; line-height: 1.4; margin-bottom: 8px;">${text}</div>
      <div style="display: flex; justify-content: flex-end; gap: 6px;">
        <button class="__ai_btn __ai_btn_copy" style="background:rgba(255,255,255,0.08); color:#cbd5e1;">📋 Copy</button>
        <button class="__ai_btn __ai_btn_insert" style="background:rgba(255,255,255,0.15); color:#ffffff;">✍️ Chèn ô</button>
        <button class="__ai_btn __ai_btn_sparkle __ai_btn_send">🚀 Gửi ngay</button>
      </div>
    `;

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
    badgeEl.style.background = 'linear-gradient(135deg, #7c3aed, #4f46e5)';
    badgeEl.style.color = '#ffffff';
    badgeEl.innerHTML = `<span style="color:#4ade80;">●</span> <span>AI Copilot (Gợi ý)</span> <span style="font-size:9px; opacity:0.85; background:rgba(0,0,0,0.3); padding:1px 5px; border-radius:10px;">Mở</span>`;
  } else {
    badgeEl.style.background = '#334155';
    badgeEl.style.color = '#94a3b8';
    badgeEl.innerHTML = '<span>○</span> <span>AI Copilot: Đang kết nối...</span> <span style="font-size:9px; opacity:0.85; background:rgba(239,68,68,0.3); color:#fca5a5; padding:1px 5px; border-radius:8px;">Bật App</span>';
  }
}

// --- SYNC WITH LOCAL APP API ---
async function checkConnection() {
  let currentPort = 45678;
  try {
    const urlObj = new URL(LOCAL_API);
    currentPort = parseInt(urlObj.port, 10) || 45678;
  } catch {}

  const portsToTry = [
    currentPort,
    ...CANDIDATE_PORTS.filter(p => p !== currentPort)
  ];

  for (const port of portsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`http://127.0.0.1:${port}/api/status`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'ok') {
          LOCAL_API = `http://127.0.0.1:${port}`;
          isConnected = true;
          updateBadge(true);
          return true;
        }
      }
    } catch {}
  }

  isConnected = false;
  updateBadge(false);
  return false;
}

// Track active contact change automatically
function syncActiveContact() {
  const current = getActiveContactName();
  if (current && current !== 'Đoạn chat hiện tại' && current !== lastKnownContact) {
    console.log(`[AI Extension] Active contact changed from "${lastKnownContact}" to "${current}"`);
    lastKnownContact = current;
    activeSelectedContact = current;
    activeSelectedMessage = '';
    activeReplies = [];
    isSwitchingChat = true;
    updateFloatingPanelContent();
    setTimeout(() => {
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
      isSwitchingChat = true;
      updateFloatingPanelContent();

      // Clear previous in-chat suggestions row
      document.querySelectorAll('.__ai_suggestions_row').forEach(r => {
        r.style.display = 'none';
        r.innerHTML = '';
      });

      setTimeout(() => {
        isSwitchingChat = false;
      }, 700);
    }
    return;
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
  }
}, true);

// --- INITIALIZATION & RECURRING LOOPS ---
checkConnection();
createFloatingPanel();

setInterval(checkConnection, 5000);
setInterval(syncActiveContact, 1000);
setInterval(attachToolbarsToOpenChats, 1200);
