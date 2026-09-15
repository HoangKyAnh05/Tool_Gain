import React, { useRef, useEffect, useState, useCallback } from 'react';
import { TargetPlatform } from '../types';
import { CopilotSidebar } from './CopilotSidebar';
import { RefreshCw, ArrowLeft, ArrowRight, Shield, Globe, ScanSearch } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface WorkspaceViewProps {
  platform: 'zalo' | 'messenger' | 'telegram';
}

const PLATFORM_URLS = {
  zalo: 'https://chat.zalo.me',
  messenger: 'https://www.messenger.com',
  telegram: 'https://web.telegram.org/a'
};

const PLATFORM_NAMES = {
  zalo: 'Zalo Web Chat',
  messenger: 'Facebook Messenger Web',
  telegram: 'Telegram Web (K/A)'
};

// JavaScript function injected into webview to extract active contact and recent messages
const SCRAPER_JS = `
(() => {
  try {
    if (!window.__ai_contact_cache) window.__ai_contact_cache = {};

    const hostname = window.location.hostname;
    const title = document.title || '';
    const winWidth = window.innerWidth || 1200;
    const winHeight = window.innerHeight || 800;
    let contactName = '';
    let recentMessages = [];
    let platform = 'messenger';
    if (hostname.includes('zalo')) platform = 'zalo';
    else if (hostname.includes('telegram')) platform = 'telegram';

    function isTimestampOrMetadata(text) {
      if (!text) return true;
      const s = text.trim().toLowerCase();
      if (s.length === 0) return true;
      if (/^(\\d{1,2}:\\d{2}(\\s*(am|pm|ch|sa))?)$/i.test(s)) return true;
      if (/^(đã gửi|đã nhận|đã xem|seen|delivered|sent)?\\s*\\d+\\s*(phút|giờ|ngày|giây|m|h|d|s|min|mins|hour|hours)?\\s*(trước|ago)?$/i.test(s)) return true;
      if (/^(đã gửi|đã nhận|đã xem|seen|delivered|sent|vừa xong|just now|active now|đang hoạt động|hoạt động\\s+\\d+.*)$/i.test(s)) return true;
      if (/^(thứ\\s+(hai|ba|tư|năm|sáu|bảy)|chủ nhật|hôm qua|hôm nay)(\\s+\\d{1,2}:\\d{2})?$/i.test(s)) return true;
      if (/^đã bày tỏ cảm xúc/i.test(s)) return true;
      if (/^(đã chỉnh sửa|edited)$/i.test(s)) return true;
      return false;
    }

    function cleanText(raw) {
      if (!raw) return '';
      let t = raw.trim();
      if (isTimestampOrMetadata(t)) return '';

      t = t.replace(/^(nhập,\\s*)?(tin nhắn\\s+(do|của)|message from)\\s+[^:]*gửi lúc[^:]*:/i, '');
      t = t.replace(/^(nhập,\\s*)?(tin nhắn\\s+(do|của)|message from)\\s+[^:]*:/i, '');
      t = t.replace(/^(bạn đã gửi|you sent)(\\s+lúc[^:]*)?:/i, '');
      t = t.replace(/\\b(thứ\\s+(hai|ba|tư|năm|sáu|bảy)|chủ nhật)\\s+\\d{1,2}:\\d{2}(ch|sa|am|pm)?/gi, '');
      t = t.replace(/\\b\\d{1,2}:\\d{2}\\s*(am|pm|ch|sa)?\\b/gi, '');
      t = t.replace(/\\b(đã nhận|đã gửi|đã xem|seen|delivered|sent|đã bày tỏ cảm xúc.*)\\b/gi, '');
      t = t.replace(/\\b\\d+\\s*(phút|giờ|ngày|giây)\\s*trước\\b/gi, '');
      t = t.replace(/^\\s*\\d{1,2}(:\\d{2})?\\s*(ch|sa|am|pm)?\\s*:\\s*/i, '');
      t = t.replace(/^\\s*[:\\d\\w]+\\s*:\\s*/i, '');
      t = t.trim();

      if (isTimestampOrMetadata(t)) return '';
      return t;
    }

    function isInsideSidebar(el) {
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

    // 1. Messenger Web Extraction
    if (platform === 'messenger') {
      const curPath = window.location.pathname;
      const navSidebar = document.querySelector('div[role="navigation"], nav, [aria-label*="Đoạn chat"], [aria-label*="Chats"], [data-testid="mwthreadlist"]');
      let minChatX = 340;
      if (navSidebar) {
        const nr = navSidebar.getBoundingClientRect();
        if (nr.width > 80) minChatX = nr.right;
      } else {
        minChatX = Math.max(320, winWidth * 0.28);
      }

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
              !/^\\d{1,2}:\\d{2}/.test(t) &&
              !/\\d+\\s*(giờ|phút|ngày|tuần|giây|m|h|d|s|min)/.test(t) &&
              !/^đã bày tỏ cảm xúc/i.test(t)) {
            if (!node.querySelector('h1, h2, h3, span[dir="auto"]')) {
              contactName = t.replace(/\\.\\.\\.$/, '').trim();
              break;
            }
          }
        }
      }

      // Priority 2: Middle Chat Header (Status Proximity strictly outside sidebar)
      if (!contactName) {
        const statusNodes = Array.from(document.querySelectorAll('span, div, p')).filter(el => {
          if (isInsideSidebar(el)) return false;
          const t = (el.textContent || '').trim();
          const r = el.getBoundingClientRect();
          return r.top >= 0 && r.top <= 90 && r.left >= minChatX &&
                 /^(hoạt động|đang hoạt động|active|vừa mới|trực tuyến|\\d+\\s*(thành viên|members)|active\\s+\\d+)/i.test(t);
        });

        for (const stNode of statusNodes) {
          let curr = stNode.parentElement;
          for (let depth = 0; depth < 5 && curr; depth++) {
            if (isInsideSidebar(curr)) break;
            const candidates = Array.from(curr.querySelectorAll('span[dir="auto"], h1, h2, h3, a span, span'));
            for (const cand of candidates) {
              const t = cand.textContent?.trim() || '';
              const lt = t.toLowerCase();
              if (t.length >= 2 && t.length <= 45 &&
                  !/^(hoạt động|active|đang hoạt động|messenger|bắt đầu|cuộc gọi|video|thông tin|aa)/i.test(lt)) {
                contactName = t.replace(/\\.\\.\\.$/, '').trim();
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
          if (isInsideSidebar(el)) return false;
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
              contactName = txt.replace(/\\.\\.\\.$/, '').trim();
              break;
            }
          }
        }
      }

      // Priority 4: Right Details Panel Profile
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

      // Priority 4: Left sidebar active thread (strictly matching URL path)
      if (!contactName && curPath && curPath.length > 3 && curPath !== '/') {
        const activeLink = document.querySelector('div[role="navigation"] a[href*="' + curPath + '"]');
        if (activeLink) {
          const spans = Array.from(activeLink.querySelectorAll('span[dir="auto"], span'));
          for (const sp of spans) {
            const t = sp.textContent?.trim() || '';
            const lt = t.toLowerCase();
            if (t && t.length >= 2 && t.length <= 45 &&
                !['bạn', 'gửi', 'bạn:', 'bạn đã gửi', 'đoạn chat', 'tin nhắn', 'tìm kiếm'].includes(lt) &&
                !/^\\d{1,2}:\\d{2}/.test(t) &&
                !/\\d+\\s*(giờ|phút|ngày|tuần|giây|m|h|d|s|min)/.test(t) &&
                !/^đã bày tỏ cảm xúc/i.test(t) &&
                !/^(đã gửi|đã nhận|đã xem|seen|delivered|sent)/i.test(t)) {
              contactName = t;
              break;
            }
          }
        }
      }

      // Priority 5: document.title
      if (!contactName && title) {
        let cleanedTitle = title.replace(/^\\(\\d+\\+?\\)\\s*/, '').trim();
        cleanedTitle = cleanedTitle.replace(/\\s*[|\\-–—]\\s*(Messenger|Facebook|Meta).*$/i, '').trim();
        const lowerT = cleanedTitle.toLowerCase();
        if (cleanedTitle && cleanedTitle.length >= 2 && !['messenger', 'facebook', 'tin nhắn', 'chats', 'inbox', 'đoạn chat'].includes(lowerT) && !lowerT.startsWith('hoạt động') && !lowerT.startsWith('active')) {
          contactName = cleanedTitle;
        }
      }

      // URL-to-Name cache lookup / store
      if (contactName && curPath && curPath !== '/') {
        window.__ai_contact_cache[curPath] = contactName;
      } else if (!contactName && curPath && window.__ai_contact_cache[curPath]) {
        contactName = window.__ai_contact_cache[curPath];
      }

      // Messages extraction (middle of chat container, strictly right of sidebar)
      const allNodes = Array.from(document.querySelectorAll('div[dir="auto"], span[dir="auto"]'));
      const textNodes = allNodes.filter(el => {
        if (isInsideSidebar(el)) return false;
        const r = el.getBoundingClientRect();
        const isMiddle = r.top >= 70 && r.bottom <= winHeight - 45 && r.left >= minChatX && r.height > 10;
        return isMiddle &&
               !el.closest('div[role="complementary"]') &&
               !el.closest('div[aria-label*="Thông tin"]') &&
               !el.closest('div[aria-label*="Details"]') &&
               !el.closest('form');
      });

      // Strictly sort nodes top-to-bottom for 100% deterministic message order
      textNodes.sort((a, b) => {
        const rA = a.getBoundingClientRect();
        const rB = b.getBoundingClientRect();
        return rA.top - rB.top;
      });

      const blacklist = [
        'đang hoạt động', 'active now', 'thông tin về đoạn chat', 'tùy chỉnh đoạn chat',
        'file phương tiện và file', 'file phương tiện', 'quyền riêng tư và hỗ trợ',
        'quyền riêng tư', 'bạn', 'gửi', 'messenger', 'tìm kiếm trên messenger',
        'tìm kiếm', 'search', 'xem trang cá nhân', 'nhập', 'được mã hóa đầu cuối',
        'aa', 'bắt đầu cuộc gọi', 'bắt đầu gọi video'
      ];

      const parsedItems = [];

      for (const el of textNodes) {
        if (el.querySelector('div[dir="auto"], span[dir="auto"]')) continue;

        const rawText = el.textContent || '';
        const cleaned = cleanText(rawText);
        if (!cleaned || cleaned.length < 1 || cleaned.length > 500) continue;
        const lower = cleaned.toLowerCase();
        if (blacklist.some(b => lower === b || lower.startsWith(b))) continue;
        if (contactName && cleaned === contactName) continue;

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

      // Deduplicate identical consecutive items
      for (let i = 0; i < parsedItems.length; i++) {
        if (i === 0 || parsedItems[i].text !== parsedItems[i - 1].text || parsedItems[i].sender !== parsedItems[i - 1].sender) {
          recentMessages.push(parsedItems[i]);
        }
      }
    }

    // 2. Zalo Web Extraction
    else if (platform === 'zalo') {
      const headerTitle = document.querySelector('#chatView .header-title .title, .chat-header-title .truncate, div[data-id="header_name"], .conv-item.active .conv-item-title__name, .header-title');
      if (headerTitle && headerTitle.textContent) {
        contactName = headerTitle.textContent.trim();
      }
      const items = Array.from(document.querySelectorAll('.chat-item, .msg-item, .chat-message-item, [data-id="div_MsgItem"]'));
      items.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

      for (const item of items) {
        const textEl = item.querySelector('.bubble-content, .text, .chat-message-text, .content-text') || item;
        const raw = textEl.textContent?.trim() || '';
        const cleaned = cleanText(raw);
        if (!cleaned) continue;
        const isUser = item.classList.contains('me') || item.classList.contains('chat-item--right') || item.classList.contains('is-me');
        recentMessages.push({
          sender: isUser ? 'user' : 'contact',
          text: cleaned
        });
      }
    }

    // 3. Telegram Web Extraction
    else if (platform === 'telegram') {
      const headerTitle = document.querySelector('.chat-info .peer-title, .top .person .name, .sidebar-header .user-title, .chat-info .title, .ChatInfo .title');
      if (headerTitle && headerTitle.textContent) {
        contactName = headerTitle.textContent.trim();
      }
      const items = Array.from(document.querySelectorAll('.bubble, .message, .history-message, .Message'));
      items.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

      for (const item of items) {
        const textEl = item.querySelector('.message-content .text-content, .translatable-message, .bubble-content .text, .text-content') || item;
        const raw = textEl.textContent?.trim() || '';
        const cleaned = cleanText(raw);
        if (!cleaned) continue;
        const isUser = item.classList.contains('is-out') || item.classList.contains('own') || item.classList.contains('is-outgoing');
        recentMessages.push({
          sender: isUser ? 'user' : 'contact',
          text: cleaned
        });
      }
    }

    if (contactName) {
      window.__ai_last_contact = contactName;
    }

    recentMessages = recentMessages.slice(-12);
    const lastMsg = recentMessages.length > 0 ? recentMessages[recentMessages.length - 1] : null;

    // Attach click listener to chat messages
    if (!window.__ai_msg_click_listener_attached) {
      window.__ai_msg_click_listener_attached = true;
      document.addEventListener('click', (e) => {
        const target = e.target;
        if (!target) return;
        if (target.closest('input, textarea, [contenteditable="true"], button, header, form, [role="navigation"], [aria-label*="Details"]')) {
          return;
        }

        const bubble = target.closest('div[dir="auto"], span[dir="auto"], .bubble-content, .text, .chat-message-text, .content-text, .text-content, .translatable-message, .chat-item, .bubble, .msg-item') || target;
        let t = cleanText(bubble.textContent || '');
        if (!t && target.parentElement) {
          const row = target.closest('div[role="row"], .chat-item, .bubble, .msg-item');
          if (row) {
            t = cleanText(row.querySelector('div[dir="auto"], span[dir="auto"], .bubble-content, .text, .chat-message-text, .content-text')?.textContent || '');
          }
        }

        const currentContact = contactName || window.__ai_last_contact || '';

        if (t && t.length > 0 && currentContact) {
          console.log('__AI_MSG_CLICKED__:' + JSON.stringify({
            platform: platform,
            contactName: currentContact,
            messageText: t
          }));
        }
      }, true);
    }

    return {
      success: true,
      platform,
      contactName: contactName || window.__ai_last_contact || '',
      recentMessages
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
})()
`;

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({ platform }) => {
  const { handleActiveChatScanned, handleMessageSelected } = useApp();
  const webviewRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [canGoBack, setCanGoBack] = useState<boolean>(false);
  const [canGoForward, setCanGoForward] = useState<boolean>(false);
  const [activeContact, setActiveContact] = useState<string>('');
  const [webviewPreloadUrl, setWebviewPreloadUrl] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);

  const lastScannedRef = useRef<{ contactName: string; lastMessage: string }>({ contactName: '', lastMessage: '' });
  // User manual lock ref: preserves user clicked message until contact changes
  const userSelectedMessageRef = useRef<{ contactName: string; messageText: string } | null>(null);

  const targetUrl = PLATFORM_URLS[platform];
  const partitionName = `persist:${platform}`;

  // Fetch webview preload file URL
  useEffect(() => {
    if (window.electronAPI?.getWebviewPreloadUrl) {
      window.electronAPI.getWebviewPreloadUrl().then((url) => {
        setWebviewPreloadUrl(url);
      });
    }
  }, []);

  // Direct Execution Scraper
  const executeDirectScrape = useCallback(async (force = false) => {
    const webview = webviewRef.current;
    if (!webview) return;

    try {
      const result = await webview.executeJavaScript(SCRAPER_JS);
      if (result && result.success && result.contactName) {
        const normalizeName = (s?: string) => (s || '').toLowerCase().replace(/[\s\-_]+/g, '').trim();

        const contactChanged = normalizeName(result.contactName) !== normalizeName(lastScannedRef.current.contactName);
        
        // If contact changed, clear manual message lock
        if (contactChanged) {
          userSelectedMessageRef.current = null;
        }

        if (force || contactChanged) {
          lastScannedRef.current = {
            contactName: result.contactName,
            lastMessage: ''
          };
          setActiveContact(result.contactName);

          // Dispatch to AppContext to update active contact info (without overwriting clicked message)
          await handleActiveChatScanned(
            platform,
            result.contactName,
            result.recentMessages || []
          );
        }
      }
    } catch (e) {
      // Webview might still be loading
    }
  }, [platform, handleActiveChatScanned]);

  // Setup Webview Listeners
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleStartLoading = () => setIsLoading(true);
    const handleStopLoading = () => {
      setIsLoading(false);
      try {
        setCanGoBack(webview.canGoBack());
        setCanGoForward(webview.canGoForward());
      } catch {}
      setTimeout(() => executeDirectScrape(true), 800);
    };

    const handleDomReady = () => {
      setTimeout(() => executeDirectScrape(true), 500);
    };

    const handleIpcMessage = (event: any) => {
      const channel = event.channel;
      const data = event.args?.[0];

      if (channel === 'webview:message-clicked') {
        if (data && data.contactName && data.messageText) {
          // Lock message selected by user click
          userSelectedMessageRef.current = {
            contactName: data.contactName,
            messageText: data.messageText
          };
          lastScannedRef.current = {
            contactName: data.contactName,
            lastMessage: data.messageText
          };
          setActiveContact(data.contactName);
          setIsScanning(false);
          handleMessageSelected(
            platform,
            data.contactName,
            data.messageText,
            data.recentMessages || []
          );
        }
      } else if (channel === 'webview:active-chat-scanned' || channel === 'webview:incoming-message') {
        if (data && data.contactName) {
          const normalizeName = (s?: string) => (s || '').toLowerCase().replace(/[\s\-_]+/g, '').trim();

          const contactChanged = normalizeName(data.contactName) !== normalizeName(lastScannedRef.current.contactName);
          if (contactChanged) {
            userSelectedMessageRef.current = null;
            lastScannedRef.current = {
              contactName: data.contactName,
              lastMessage: ''
            };
            setActiveContact(data.contactName);
            setIsScanning(false);
            handleActiveChatScanned(
              platform,
              data.contactName,
              data.recentMessages || []
            );
          }
        }
      }
    };

    const handleConsoleMessage = (e: any) => {
      const msg = e.message || '';
      if (msg.startsWith('__AI_MSG_CLICKED__:')) {
        try {
          const raw = msg.slice('__AI_MSG_CLICKED__:'.length);
          const data = JSON.parse(raw);
          if (data && data.contactName && data.messageText) {
            userSelectedMessageRef.current = {
              contactName: data.contactName,
              messageText: data.messageText
            };
            lastScannedRef.current = {
              contactName: data.contactName,
              lastMessage: data.messageText
            };
            setActiveContact(data.contactName);
            setIsScanning(false);
            handleMessageSelected(
              platform,
              data.contactName,
              data.messageText,
              []
            );
          }
        } catch (err) {
          console.warn('[Console Message Parse Error]:', err);
        }
      }
    };

    webview.addEventListener('did-start-loading', handleStartLoading);
    webview.addEventListener('did-stop-loading', handleStopLoading);
    webview.addEventListener('dom-ready', handleDomReady);
    webview.addEventListener('ipc-message', handleIpcMessage);
    webview.addEventListener('console-message', handleConsoleMessage);

    // Continuous background sync interval (throttled to 2.5s)
    const scanInterval = setInterval(() => {
      executeDirectScrape(false);
    }, 2500);

    return () => {
      clearInterval(scanInterval);
      try {
        webview.removeEventListener('did-start-loading', handleStartLoading);
        webview.removeEventListener('did-stop-loading', handleStopLoading);
        webview.removeEventListener('dom-ready', handleDomReady);
        webview.removeEventListener('ipc-message', handleIpcMessage);
        webview.removeEventListener('console-message', handleConsoleMessage);
      } catch {}
    };
  }, [platform, executeDirectScrape, handleActiveChatScanned, handleMessageSelected]);

  // Listen for text send dispatch from host
  useEffect(() => {
    if (!window.electronAPI) return;
    const unsub = window.electronAPI.onDispatchSendToWebview(async (data) => {
      if (data.platform === platform && webviewRef.current) {
        const sendCode = `
          (() => {
            const text = ${JSON.stringify(data.text)};
            const insertOnly = ${Boolean(data.insertOnly)};
            const input = document.querySelector('div[role="textbox"][contenteditable="true"]') ||
                          document.querySelector('#input_chat') ||
                          document.querySelector('#editable-message-text') ||
                          document.querySelector('div[contenteditable="true"]') ||
                          document.querySelector('input[type="text"], textarea');
            if (input) {
              input.focus();
              document.execCommand('selectAll', false, null);
              document.execCommand('insertText', false, text);
              input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
              
              if (!insertOnly) {
                setTimeout(() => {
                  const sendBtn = document.querySelector('div[aria-label="Nhấn Enter để gửi"], div[aria-label="Gửi"], div[aria-label="Press Enter to send"], div[aria-label="Send"], .btn-send, .chat-input-send-btn, [data-id="btn_send"]');
                  if (sendBtn) {
                    sendBtn.click();
                  } else {
                    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
                    input.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
                    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
                  }
                }, 150);
              }
            }
          })()
        `;
        try {
          await webviewRef.current.executeJavaScript(sendCode);
        } catch (e) {
          console.warn('Direct send code error:', e);
        }
      }
    });

    return () => {
      unsub();
    };
  }, [platform]);

  const handleReload = () => {
    if (webviewRef.current) webviewRef.current.reload();
  };

  const handleBack = () => {
    if (webviewRef.current && webviewRef.current.canGoBack()) webviewRef.current.goBack();
  };

  const handleForward = () => {
    if (webviewRef.current && webviewRef.current.canGoForward()) webviewRef.current.goForward();
  };

  const handleManualScan = async () => {
    userSelectedMessageRef.current = null;
    setIsScanning(true);
    await executeDirectScrape(true);
    setTimeout(() => setIsScanning(false), 600);
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-surface-950">
      {/* Main Webview Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-surface-800">
        {/* Webview Browser Toolbar */}
        <div className="h-10 bg-surface-900 border-b border-surface-800 px-3 flex items-center justify-between text-xs select-none">
          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              disabled={!canGoBack}
              className="p-1 rounded hover:bg-surface-800 text-slate-400 disabled:opacity-30 cursor-pointer"
              title="Quay lại"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleForward}
              disabled={!canGoForward}
              className="p-1 rounded hover:bg-surface-800 text-slate-400 disabled:opacity-30 cursor-pointer"
              title="Tiến tới"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleReload}
              className="p-1 rounded hover:bg-surface-800 text-slate-400 hover:text-slate-200 cursor-pointer"
              title="Tải lại trang"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-brand-400' : ''}`} />
            </button>

            {/* Address bar pill */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-950 border border-surface-800 text-slate-300 font-mono text-[11px] max-w-sm">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span className="truncate">{targetUrl}</span>
            </div>

            {/* Manual Scan Trigger */}
            <button
              onClick={handleManualScan}
              disabled={isScanning}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-800 hover:bg-surface-750 text-brand-300 border border-surface-700 text-[11px] transition-all cursor-pointer shadow-sm"
              title="Quét lại đoạn chat đang mở"
            >
              <ScanSearch className={`w-3 h-3 text-amber-400 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Đang quét...' : 'Quét chat'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <Globe className="w-3 h-3 text-indigo-400" />
              <span>Đăng nhập lưu vĩnh viễn: <strong className="text-emerald-400 font-mono">{partitionName}</strong></span>
            </span>
          </div>
        </div>

        {/* Embedded Webview Container */}
        <div className="flex-1 relative bg-surface-950">
          {/* @ts-ignore */}
          <webview
            ref={webviewRef}
            src={targetUrl}
            partition={partitionName}
            preload={webviewPreloadUrl || undefined}
            className="w-full h-full border-none"
            allowpopups={true}
            webpreferences="contextIsolation=true, spellcheck=false"
          />

          {isLoading && (
            <div className="absolute inset-0 bg-surface-950/60 backdrop-blur-xs flex items-center justify-center pointer-events-none">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-900 border border-surface-800 text-xs text-slate-300 shadow-xl">
                <RefreshCw className="w-4 h-4 animate-spin text-brand-400" />
                <span>Đang tải {PLATFORM_NAMES[platform]}...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Docked AI Copilot Sidebar */}
      <CopilotSidebar
        platform={platform}
        activeContactName={activeContact}
        onManualScan={handleManualScan}
        isScanning={isScanning}
      />
    </div>
  );
};
