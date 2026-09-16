import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bot,
  Sparkles,
  Zap,
  ShieldCheck,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Database,
  Users,
  RotateCcw,
  HelpCircle,
  Trash2
} from 'lucide-react';

export const TopHeader: React.FC = () => {
  const { settings, updateSettings, personas, knowledgeItems, contacts, activeTimers, setActiveTab } = useApp();
  const [isRestarting, setIsRestarting] = useState<boolean>(false);
  const [isClearingCache, setIsClearingCache] = useState<boolean>(false);

  const isGlobalAuto = settings?.globalAutoReply ?? true;
  const timerCount = Object.keys(activeTimers).length;
  const hasApiKey = Boolean(settings?.geminiApiKey);

  const handleRestart = async () => {
    if (confirm('Bạn có muốn khởi động lại ứng dụng ngay lập tức?')) {
      setIsRestarting(true);
      if (window.electronAPI?.restartApp) {
        await window.electronAPI.restartApp();
      } else {
        window.location.reload();
      }
    }
  };

  const handleClearCache = async () => {
    if (confirm('Bạn có muốn xóa bỏ toàn bộ bộ nhớ đệm (Cache) và các file lưu trữ tạm để làm nhẹ ứng dụng không?\n\n(Lưu ý: Tài khoản đang đăng nhập Messenger / Zalo / Telegram vẫn được giữ nguyên không bị đăng xuất).')) {
      setIsClearingCache(true);
      try {
        if (window.electronAPI?.clearAppCache) {
          const res = await window.electronAPI.clearAppCache();
          alert(`✅ Đã dọn dẹp sạch sẽ ${res.mbFreed} MB tệp rác & cache!\nỨng dụng đã nhẹ hơn và giải phóng dung lượng thành công.`);
        } else {
          alert('Chức năng dọn cache chỉ khả dụng trên ứng dụng máy tính.');
        }
      } catch (e: any) {
        alert('Có lỗi khi dọn dẹp cache: ' + (e?.message || e));
      } finally {
        setIsClearingCache(false);
      }
    }
  };

  return (
    <header className="h-14 bg-surface-900/90 backdrop-blur-md border-b border-surface-800 px-4 flex items-center justify-between z-30 select-none">
      {/* Brand & Status */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 shadow-md shadow-brand-500/20">
          <Bot className="w-5 h-5 text-white" />
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-surface-900" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-white tracking-wide">AI OMNICHANNEL ASSISTANT</h1>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-brand-500/20 text-brand-300 border border-brand-500/30">
              v1.0 Pro
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Zalo • Messenger • Telegram • Google Gemini
          </p>
        </div>
      </div>

      {/* Middle Stats & Active Timer Alerts */}
      <div className="hidden md:flex items-center gap-4 text-xs">
        {timerCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Đang đếm ngược gửi tự động ({timerCount})</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-slate-400">
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span>{contacts.length} Danh bạ</span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>{knowledgeItems.length} FAQ Tri thức</span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          <span>{personas.length} Persona</span>
        </div>
      </div>

      {/* Right Controls: Setup, Restart, Auto-reply Master Switch & AI Key Status */}
      <div className="flex items-center gap-2.5">
        {/* Setup Hub Quick Button */}
        <button
          onClick={() => setActiveTab('setup')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-surface-800 hover:bg-surface-750 text-slate-300 hover:text-white border border-surface-700 transition-all"
          title="Mở Trung tâm Hướng dẫn & Link Setup"
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Setup</span>
        </button>

        {/* Restart App Button */}
        <button
          onClick={handleRestart}
          disabled={isRestarting}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-surface-800 hover:bg-surface-750 text-slate-300 hover:text-white border border-surface-700 hover:border-brand-500/40 transition-all cursor-pointer"
          title="Khởi động lại ứng dụng (Restart App)"
        >
          <RotateCcw className={`w-3.5 h-3.5 text-brand-400 ${isRestarting ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Restart</span>
        </button>

        {/* Clear Cache Button */}
        <button
          onClick={handleClearCache}
          disabled={isClearingCache}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 border border-rose-500/30 hover:border-rose-500/50 transition-all cursor-pointer"
          title="Xóa bỏ bộ nhớ đệm (Cache) và tệp rác để làm nhẹ ứng dụng (Tài khoản Messenger / Zalo / Telegram vẫn giữ nguyên)"
        >
          <Trash2 className={`w-3.5 h-3.5 text-rose-400 ${isClearingCache ? 'animate-spin' : ''}`} />
          <span>{isClearingCache ? 'Đang dọn...' : 'Xóa Cache'}</span>
        </button>

        {/* AI Engine Badge */}
        <div
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border cursor-pointer hover:border-brand-500/50 transition-all ${
            settings?.aiProvider === 'groq'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : settings?.aiProvider === 'gemini_web2api'
              ? 'bg-brand-500/10 border-brand-500/30 text-brand-300'
              : hasApiKey
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
          }`}
          title={
            settings?.aiProvider === 'groq'
              ? `Groq Cloud: ${settings?.groqModel || 'openai/gpt-oss-120b'} (Siêu tốc & Miễn phí)`
              : settings?.aiProvider === 'gemini_web2api'
              ? `Gemini-Web2API: ${settings?.geminiModel || 'gemini-3.7-flash'} (Miễn phí)`
              : hasApiKey
              ? `Google Official API: ${settings?.geminiModel}`
              : 'Chưa cấu hình API Key (đang dùng Smart Fallback)'
          }
        >
          {settings?.aiProvider === 'groq' ? (
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          ) : settings?.aiProvider === 'gemini_web2api' ? (
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          ) : hasApiKey ? (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span className="font-mono text-[11px]">
            {settings?.aiProvider === 'groq'
              ? settings?.groqModel || 'openai/gpt-oss-120b'
              : settings?.geminiModel || 'gemini-3.7-flash'}
          </span>
        </div>


        {/* Global Auto-Reply Switch */}
        <button
          onClick={async () => {
            const next = !isGlobalAuto;
            await updateSettings({ globalAutoReply: next });
            if (window.electronAPI?.handleUserMessage) {
              await window.electronAPI.handleUserMessage('messenger', '', next ? '...' : '.');
            }
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border cursor-pointer ${
            isGlobalAuto
              ? 'bg-brand-600/20 border-brand-500/40 text-brand-200 hover:bg-brand-600/30'
              : 'bg-surface-800 border-surface-700 text-slate-400 hover:text-slate-200'
          }`}
          title="Bật/Tắt chế độ tự động trả lời toàn cục"
        >
          <Zap className={`w-3.5 h-3.5 ${isGlobalAuto ? 'text-brand-400' : 'text-slate-500'}`} />
          <span>Auto-Reply:</span>
          <span className={`font-bold ${isGlobalAuto ? 'text-emerald-400' : 'text-slate-500'}`}>
            {isGlobalAuto ? 'BẬT' : 'TẮT'}
          </span>
          {isGlobalAuto ? (
            <ToggleRight className="w-4 h-4 text-emerald-400" />
          ) : (
            <ToggleLeft className="w-4 h-4 text-slate-500" />
          )}
        </button>
      </div>
    </header>
  );
};

