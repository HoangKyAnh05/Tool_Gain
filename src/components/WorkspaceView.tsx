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
  telegram: 'Telegram Web'
};

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({ platform }) => {
  const { handleActiveChatScanned, handleMessageSelected } = useApp();
  const webviewRef = useRef<any>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [canGoBack, setCanGoBack] = useState<boolean>(false);
  const [canGoForward, setCanGoForward] = useState<boolean>(false);
  const [activeContact, setActiveContact] = useState<string>('');
  const [webviewPreloadUrl, setWebviewPreloadUrl] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);

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

  // Webview events handler
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
      setTimeout(() => {
        try {
          webview.send('host:request-scan');
        } catch {}
      }, 500);
    };

    const handleIpcMessage = (event: any) => {
      const channel = event.channel;
      const data = event.args?.[0];
      if (!data) return;

      if (channel === 'webview:chat-update') {
        if (data.contactName) {
          setActiveContact(data.contactName);
          handleActiveChatScanned(
            platform,
            data.contactName,
            data.recentMessages || [],
            data.lastIncomingMessage
          );

          if (data.isNewIncoming && data.lastIncomingMessage && window.electronAPI?.handleIncomingMessage) {
            window.electronAPI.handleIncomingMessage(
              platform,
              data.contactName,
              data.lastIncomingMessage,
              data.recentMessages || []
            );
          }
        }
      } else if (channel === 'webview:message-clicked') {
        if (data.messageText) {
          const contact = data.contactName || activeContact || 'Hội thoại đang mở';
          setActiveContact(contact);
          handleMessageSelected(
            platform,
            contact,
            data.messageText,
            data.recentMessages || []
          );
        }
      } else if (channel === 'webview:user-signal-command') {
        if (data.text && window.electronAPI?.handleUserMessage) {
          window.electronAPI.handleUserMessage(platform, data.contactName, data.text);
        }
      }
    };

    const handleConsoleMessage = (e: any) => {
      const msg = e.message || '';
      if (msg.startsWith('__AI_MSG_CLICKED__:')) {
        try {
          const raw = msg.slice('__AI_MSG_CLICKED__:'.length);
          const data = JSON.parse(raw);
          if (data && data.messageText) {
            const contact = data.contactName || activeContact || 'Hội thoại đang mở';
            setActiveContact(contact);
            handleMessageSelected(
              platform,
              contact,
              data.messageText,
              []
            );
          }
        } catch {}
      }
    };

    webview.addEventListener('did-start-loading', handleStartLoading);
    webview.addEventListener('did-stop-loading', handleStopLoading);
    webview.addEventListener('ipc-message', handleIpcMessage);
    webview.addEventListener('console-message', handleConsoleMessage);

    return () => {
      try {
        webview.removeEventListener('did-start-loading', handleStartLoading);
        webview.removeEventListener('did-stop-loading', handleStopLoading);
        webview.removeEventListener('ipc-message', handleIpcMessage);
        webview.removeEventListener('console-message', handleConsoleMessage);
      } catch {}
    };
  }, [platform, webviewPreloadUrl, activeContact, handleActiveChatScanned, handleMessageSelected]);

  // Listen for text send dispatch from host
  useEffect(() => {
    if (!window.electronAPI) return;
    const unsub = window.electronAPI.onDispatchSendToWebview(async (data) => {
      if (data.platform === platform && webviewRef.current) {
        const webview = webviewRef.current;
        try {
          webview.focus();
          webview.send('host:send-text', {
            text: data.text,
            insertOnly: Boolean(data.insertOnly)
          });
        } catch (e) {
          console.warn('[WorkspaceView] Error sending text to webview:', e);
        }
      }
    });

    const unsubSwitch = window.electronAPI?.onSwitchChat?.((data) => {
      if (webviewRef.current && data.contactName) {
        webviewRef.current.send('host:switch-chat', { contactName: data.contactName });
      }
    });

    return () => {
      unsub();
      if (unsubSwitch) unsubSwitch();
    };
  }, [platform]);

  const handleManualScan = useCallback(() => {
    if (webviewRef.current) {
      setIsScanning(true);
      try {
        webviewRef.current.send('host:request-scan');
      } catch {}
      setTimeout(() => setIsScanning(false), 800);
    }
  }, []);

  const handleReload = () => {
    if (webviewRef.current) {
      webviewRef.current.reload();
    }
  };

  const handleGoBack = () => {
    if (webviewRef.current && webviewRef.current.canGoBack()) {
      webviewRef.current.goBack();
    }
  };

  const handleGoForward = () => {
    if (webviewRef.current && webviewRef.current.canGoForward()) {
      webviewRef.current.goForward();
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-surface-950">
      {/* Main Webview Column */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-surface-800">
        {/* Navigation Bar */}
        <div className="h-10 bg-surface-900 border-b border-surface-800 px-3 flex items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleGoBack}
              disabled={!canGoBack}
              className="p-1.5 rounded-lg hover:bg-surface-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              title="Quay lại"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleGoForward}
              disabled={!canGoForward}
              className="p-1.5 rounded-lg hover:bg-surface-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              title="Tiến lên"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleReload}
              className="p-1.5 rounded-lg hover:bg-surface-800 text-slate-400 hover:text-white cursor-pointer"
              title="Tải lại trang"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-brand-400' : ''}`} />
            </button>
          </div>

          <div className="flex-1 max-w-xl flex items-center gap-2 px-3 py-1 rounded-lg bg-surface-950 border border-surface-800 text-xs text-slate-400">
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono text-[11px] text-slate-300 truncate">{targetUrl}</span>
            {activeContact && (
              <span className="ml-auto px-2 py-0.5 rounded-md bg-brand-500/20 text-brand-300 font-semibold text-[10px] truncate max-w-[140px]">
                {activeContact}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualScan}
              disabled={isScanning}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-surface-800 hover:bg-surface-750 text-slate-300 hover:text-white border border-surface-700 transition-all cursor-pointer"
              title="Quét lại tin nhắn và người chat đang mở"
            >
              <ScanSearch className={`w-3.5 h-3.5 text-amber-400 ${isScanning ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isScanning ? 'Đang quét...' : 'Quét chat'}</span>
            </button>

            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Đăng nhập lưu vĩnh viễn</span>
            </div>
          </div>
        </div>

        {/* Webview Container */}
        <div className="flex-1 relative w-full h-full bg-surface-950">
          {webviewPreloadUrl ? (
            <webview
              ref={webviewRef}
              src={targetUrl}
              preload={webviewPreloadUrl}
              partition={partitionName}
              className="w-full h-full border-0"
              allowpopups={true}
              webpreferences="contextIsolation=true, spellcheck=false"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-surface-950 text-slate-400 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-brand-400 mr-2" />
              <span>Đang khởi tạo {PLATFORM_NAMES[platform]}...</span>
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
