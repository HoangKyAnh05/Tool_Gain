import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Sparkles,
  Send,
  Copy,
  Edit3,
  RefreshCw,
  Clock,
  Database,
  CheckCircle2,
  XCircle,
  Tag,
  Zap,
  Check,
  ChevronDown,
  MessageSquare,
  CornerDownLeft,
  Lightbulb,
  X
} from 'lucide-react';
import { ContactCategory, TargetPlatform } from '../types';

interface CopilotSidebarProps {
  platform: TargetPlatform;
  activeContactName?: string;
  onManualScan?: () => void;
  isScanning?: boolean;
}

export const CopilotSidebar: React.FC<CopilotSidebarProps> = ({
  platform,
  activeContactName,
  onManualScan,
  isScanning
}) => {
  const {
    currentSuggestion,
    personas,
    contacts,
    settings,
    updateSettings,
    updateContact,
    savePersona,
    activeTimers,
    cancelAutoReply,
    approveAndSendReply,
    fillChatInput,
    regenerateReply,
    setContactCategory,
    autoReplyStatusNotice,
    selectCustomMessage
  } = useApp();

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [filledIndex, setFilledIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isInputtingMessage, setIsInputtingMessage] = useState<boolean>(false);
  const [manualInputText, setManualInputText] = useState<string>('');
  const [contactAutoReplyMap, setContactAutoReplyMap] = useState<Record<string, boolean>>({});
  const [contactCategoryMap, setContactCategoryMap] = useState<Record<string, ContactCategory>>({});
  const [contactPersonaMap, setContactPersonaMap] = useState<Record<string, string>>({});

  const normalizeName = (s?: string) => (s || '').toLowerCase().replace(/[\s\-_]+/g, '').trim();

  const contactName = activeContactName || currentSuggestion?.contactName || '';
  const contactKey = `${platform}_${normalizeName(contactName)}`;

  const matchedContact = contacts.find(c => {
    const cNorm = normalizeName(c.name);
    const targetNorm = normalizeName(contactName);
    if (!cNorm || !targetNorm) return false;
    return c.platform === platform && (
      cNorm === targetNorm ||
      (targetNorm.length >= 3 && cNorm.includes(targetNorm)) ||
      (cNorm.length >= 3 && targetNorm.includes(cNorm))
    );
  });

  const contactCategory: ContactCategory =
    contactCategoryMap[contactKey] ||
    matchedContact?.category ||
    currentSuggestion?.contactCategory ||
    'customer';

  const hasActiveChat = Boolean(contactName && contactName.trim().length > 0 && contactName !== 'Đang chờ chọn tin nhắn');
  const displayName = hasActiveChat ? contactName : 'Chưa chọn cuộc trò chuyện';

  const timerKey = `${platform}_${contactName}`;
  const remainingSeconds = activeTimers[timerKey] ?? 0;
  const isCountingDown = remainingSeconds > 0;

  const currentPersonaId =
    contactPersonaMap[contactKey] ||
    matchedContact?.personaId;

  const currentPersona =
    (currentPersonaId ? personas.find(p => p.id === currentPersonaId) : null) ||
    personas.find(p => p.category === contactCategory && p.isDefault) ||
    personas.find(p => p.category === contactCategory) ||
    personas[0];

  const isAutoReplyChecked = contactAutoReplyMap[contactKey] !== undefined
    ? contactAutoReplyMap[contactKey]
    : (matchedContact ? Boolean(matchedContact.autoReplyEnabled) : true);

  const aiModelDisplayName =
    settings?.aiProvider === 'groq'
      ? `Groq (${settings?.groqModel?.includes('120b') ? 'GPT-120B' : 'Fast'})`
      : settings?.aiProvider === 'gemini_web2api'
      ? `Gemini (${settings?.geminiModel || '3.7 Flash'})`
      : `Google AI (${settings?.geminiModel || '2.0 Flash'})`;


  const hasAISuggestions = Boolean(
    currentSuggestion?.replyResponse?.suggestedReplies &&
    currentSuggestion.replyResponse.suggestedReplies.length > 0
  );

  const suggestions = hasAISuggestions ? currentSuggestion!.replyResponse.suggestedReplies : [];

  const matchedKnowledge = currentSuggestion?.replyResponse?.matchedKnowledge || [];
  const detectedIntent = currentSuggestion?.replyResponse?.detectedIntent || (contactCategory === 'friend' ? 'Bạn bè trò chuyện' : 'Yêu cầu tư vấn');
  const incomingMsgDisplay = currentSuggestion?.incomingMessage || undefined;

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleFillInput = async (text: string, index: number) => {
    await fillChatInput(platform, contactName, text);
    setFilledIndex(index);
    setTimeout(() => setFilledIndex(null), 1500);
  };

  const handleSend = async (text: string) => {
    await approveAndSendReply(platform, contactName, text);
  };

  const handleStartEdit = (text: string, index: number) => {
    setEditingIndex(index);
    setEditText(text);
  };

  const handleSaveAndSendEdit = async () => {
    if (editText.trim()) {
      await approveAndSendReply(platform, contactName, editText.trim());
      setEditingIndex(null);
    }
  };

  const handleCategoryChange = async (newCategory: ContactCategory) => {
    setContactCategoryMap(prev => ({ ...prev, [contactKey]: newCategory }));
    const targetPersona =
      personas.find(p => p.category === newCategory && p.isDefault) ||
      personas.find(p => p.category === newCategory) ||
      personas[0];

    if (targetPersona) {
      setContactPersonaMap(prev => ({ ...prev, [contactKey]: targetPersona.id }));
    }

    // Persist permanently if contactName is present
    if (contactName && contactName.trim()) {
      await setContactCategory(platform, contactName.trim(), newCategory, targetPersona?.id);
    }

    // Trigger regenerate if there is a selected/incoming message
    const msg = incomingMsgDisplay || currentSuggestion?.incomingMessage;
    if (msg && contactName) {
      setIsRegenerating(true);
      try {
        await regenerateReply(platform, contactName, msg, targetPersona?.id);
      } catch (e) {
        console.warn('Regenerate on category change error:', e);
      } finally {
        setIsRegenerating(false);
      }
    }
  };

  const handlePersonaChange = async (targetPersonaId: string) => {
    setContactPersonaMap(prev => ({ ...prev, [contactKey]: targetPersonaId }));
    const selected = personas.find(p => p.id === targetPersonaId);
    if (selected) {
      setContactCategoryMap(prev => ({ ...prev, [contactKey]: selected.category }));
      if (contactName && contactName.trim()) {
        await setContactCategory(platform, contactName.trim(), selected.category, selected.id);
      }
      const msg = incomingMsgDisplay || currentSuggestion?.incomingMessage;
      if (msg && contactName) {
        setIsRegenerating(true);
        try {
          await regenerateReply(platform, contactName, msg, selected.id);
        } catch (e) {
          console.warn('Regenerate on persona change error:', e);
        } finally {
          setIsRegenerating(false);
        }
      }
    }
  };

  const handleToggleAutoReply = async (checked: boolean) => {
    setContactAutoReplyMap(prev => ({ ...prev, [contactKey]: checked }));
    if (matchedContact) {
      await updateContact(matchedContact.id, { autoReplyEnabled: checked });
    } else if (contactName && contactName.trim()) {
      if (window.electronAPI?.getOrCreateContact) {
        const contact = await window.electronAPI.getOrCreateContact(platform, contactName.trim());
        if (contact) {
          await updateContact(contact.id, { autoReplyEnabled: checked });
        }
      }
    }
  };

  const handleInstantAutoReply = async () => {
    const targetName = contactName || 'Đoạn chat đang mở';
    const targetMsg = currentSuggestion?.incomingMessage || 'Tin nhắn mới nhất';
    setIsRegenerating(true);
    try {
      await fetch('http://127.0.0.1:45678/api/trigger-incoming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact: targetName,
          message: targetMsg,
          platform
        })
      });
    } catch (e) {
      console.warn('Instant auto-reply failed:', e);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleRegenerate = async (overridePrompt?: string) => {
    setIsRegenerating(true);
    try {
      const msg = currentSuggestion?.incomingMessage || 'Xin chào bạn nhé';
      const promptContext = (overridePrompt !== undefined ? overridePrompt : customPrompt).trim();
      const promptToUse = promptContext
        ? `${msg}\n[NGỮ CẢNH / HƯỚNG TRẢ LỜI CỦA TÔI: ${promptContext}]`
        : msg;
      await regenerateReply(platform, contactName, promptToUse, currentPersona?.id);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleRegenerateAndSend = async (overridePrompt?: string) => {
    setIsRegenerating(true);
    try {
      const msg = currentSuggestion?.incomingMessage || 'Xin chào bạn nhé';
      const promptContext = (overridePrompt !== undefined ? overridePrompt : customPrompt).trim();
      const promptToUse = promptContext
        ? `${msg}\n[NGỮ CẢNH / HƯỚNG TRẢ LỜI CỦA TÔI: ${promptContext}]`
        : msg;
      const res = await regenerateReply(platform, contactName, promptToUse, currentPersona?.id);
      if (res && res.suggestedReplies && res.suggestedReplies.length > 0) {
        const defaultOptIndex = settings?.defaultAutoReplyOption ? settings.defaultAutoReplyOption - 1 : 0;
        const chosenText = res.suggestedReplies[defaultOptIndex] || res.suggestedReplies[0];
        await approveAndSendReply(platform, contactName, chosenText);
      }
    } catch (err) {
      console.error('Error in handleRegenerateAndSend:', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        await selectCustomMessage(text.trim());
      }
    } catch (err) {
      console.warn('Clipboard read error:', err);
    }
  };

  const handleSubmitManualMessage = async () => {
    if (manualInputText && manualInputText.trim()) {
      await selectCustomMessage(manualInputText.trim());
      setManualInputText('');
      setIsInputtingMessage(false);
    }
  };

  return (
    <div className="w-96 bg-surface-900/95 border-l border-surface-800 flex flex-col h-full shrink-0 select-none overflow-hidden">
      {/* Copilot Header & Contact Card */}
      <div className="p-4 border-b border-surface-800 bg-surface-950/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-600/30 border border-brand-500/40 flex items-center justify-center text-brand-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">AI Copilot Assistant</h2>
              <p className="text-[10px] text-slate-400">Thời gian thực • Tương tác thông minh</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {onManualScan && (
              <button
                onClick={onManualScan}
                disabled={isScanning}
                className="p-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-slate-300 hover:text-white border border-surface-700 text-[10px] transition-all flex items-center gap-1 cursor-pointer"
                title="Quét lại hội thoại đang mở"
              >
                <RefreshCw className={`w-3 h-3 text-brand-400 ${isScanning ? 'animate-spin' : ''}`} />
                <span className="text-[10px]">Quét</span>
              </button>
            )}
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-800 text-slate-300 border border-surface-700">
              {platform.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Master Global Auto-Reply Switch */}
        <div className={`mb-3 p-2 rounded-xl border flex items-center justify-between transition-all ${
          settings?.globalAutoReply
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-surface-900 border-amber-500/30 text-slate-300'
        }`}>
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${settings?.globalAutoReply ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
            <div>
              <div className="text-[11px] font-bold flex items-center gap-1.5">
                <span>Auto-Reply Tổng:</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  settings?.globalAutoReply
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {settings?.globalAutoReply ? 'ĐANG BẬT' : 'ĐÃ TẮT'}
                </span>
              </div>
              <div className="text-[9.5px] text-slate-400">
                Gõ <code className="text-amber-300 font-mono">.</code> để tắt, gõ <code className="text-emerald-300 font-mono">...</code> để bật
              </div>
            </div>
          </div>
          <button
            onClick={async () => {
              const next = !settings?.globalAutoReply;
              await updateSettings({ globalAutoReply: next });
              if (window.electronAPI?.handleUserMessage) {
                await window.electronAPI.handleUserMessage(platform, contactName, next ? '...' : '.');
              }
            }}
            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer shadow-sm ${
              settings?.globalAutoReply
                ? 'bg-surface-800 text-rose-300 hover:bg-rose-500/20 border border-surface-700 hover:border-rose-500/30'
                : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold shadow-emerald-500/20'
            }`}
          >
            {settings?.globalAutoReply ? 'Tắt' : 'Bật ngay'}
          </button>
        </div>

        {/* Contact Info & Classification */}
        <div className="p-2.5 rounded-xl bg-surface-850 border border-surface-750 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-700 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0">
                {hasActiveChat ? contactName.slice(0, 2).toUpperCase() : 'AI'}
              </div>
              <div>
                <div className={`text-xs font-semibold truncate max-w-[150px] ${hasActiveChat ? 'text-white' : 'text-slate-400 italic'}`} title={displayName}>
                  {displayName}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Tag className="w-2.5 h-2.5" />
                  <span>Phân loại:</span>
                </div>
              </div>
            </div>

            {/* Category Dropdown */}
            <div className="relative">
              <select
                value={contactCategory}
                onChange={(e) => handleCategoryChange(e.target.value as ContactCategory)}
                className={`text-[11px] font-semibold px-2 py-1 rounded-lg border appearance-none pr-5 cursor-pointer outline-none transition-all ${
                  contactCategory === 'customer'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : contactCategory === 'employee'
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                    : contactCategory === 'friend'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                }`}
              >
                <option value="friend" className="bg-surface-900 text-slate-200">Bạn bè (Thân mật)</option>
                <option value="customer" className="bg-surface-900 text-slate-200">Khách hàng (Tư vấn)</option>
                <option value="employee" className="bg-surface-900 text-slate-200">Nhân viên (Công việc)</option>
                <option value="other" className="bg-surface-900 text-slate-200">Khác</option>
              </select>
              <ChevronDown className="w-3 h-3 absolute right-1.5 top-2 pointer-events-none text-slate-400" />
            </div>
          </div>

          {/* Active Persona Package Dropdown */}
          <div className="flex items-center justify-between pt-2 border-t border-surface-700/40 text-[10px]">
            <span className="text-slate-400 shrink-0">Gói tính cách (Persona):</span>
            <div className="relative max-w-[190px]">
              <select
                value={currentPersona?.id || 'persona_friend'}
                onChange={(e) => handlePersonaChange(e.target.value)}
                className="w-full text-[10.5px] font-semibold bg-surface-950 text-brand-300 px-2 py-1 rounded-lg border border-surface-700 appearance-none pr-5 cursor-pointer outline-none hover:border-brand-500/50 truncate"
              >
                {personas.map((p) => (
                  <option key={p.id} value={p.id} className="bg-surface-900 text-slate-200">
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-1.5 top-2 pointer-events-none text-slate-400" />
            </div>
          </div>

          {/* Per-Chat Auto-Reply Ticking Checkbox */}
          <div className="pt-2 border-t border-surface-700/40 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAutoReplyChecked}
                onChange={(e) => handleToggleAutoReply(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 bg-surface-950 border-surface-700 focus:ring-brand-500 cursor-pointer accent-brand-500"
              />
              <span className="text-[11px] font-semibold text-slate-200">
                Tích chọn Auto-Reply cho chat này
              </span>
            </label>
            <button
              type="button"
              onClick={() => handleToggleAutoReply(!isAutoReplyChecked)}
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold cursor-pointer transition-all ${
                isAutoReplyChecked
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                  : 'bg-surface-950 text-slate-400 border border-surface-750 hover:border-slate-500'
              }`}
            >
              {isAutoReplyChecked ? '✓ Đã tích' : 'Chưa tích'}
            </button>
          </div>

          {/* Instant Auto-Reply Button */}
          <button
            type="button"
            onClick={handleInstantAutoReply}
            disabled={isRegenerating}
            className="mt-2.5 w-full py-1.5 px-3 rounded-lg text-[11px] font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-brand-600 hover:from-purple-500 hover:to-brand-500 text-white shadow-md hover:shadow-purple-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-purple-400/30"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            <span>{isRegenerating ? 'Đang tạo & gửi tin...' : '⚡ Kích hoạt Auto-Reply cho tin này ngay'}</span>
          </button>
        </div>
      </div>

      {/* Auto-Reply Global Notice Banner (Triggered by '.' or '...') */}
      {autoReplyStatusNotice && (
        <div className="p-2.5 bg-brand-500/20 border-b border-brand-500/40 text-xs font-semibold text-brand-200 flex items-center gap-2 animate-fade-in">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{autoReplyStatusNotice}</span>
        </div>
      )}

      {/* Auto-Reply Countdown Banner */}
      {isCountingDown && (
        <div className="p-3 bg-amber-500/10 border-b border-amber-500/30 animate-fade-in">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>Đang đếm ngược tự động gửi ({remainingSeconds}s)</span>
            </div>
            <button
              onClick={() => cancelAutoReply(timerKey)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition-all cursor-pointer"
            >
              <XCircle className="w-3 h-3" />
              <span>Hủy gửi</span>
            </button>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-surface-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-amber-300 h-full transition-all duration-1000 ease-linear"
              style={{ width: `${Math.min(100, (remainingSeconds / (currentPersona?.autoDelaySeconds || 5)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Critical Decision Notice if detected */}
        {currentSuggestion?.replyResponse?.detectedIntent?.includes('quyết định') && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2.5 shadow-sm">
            <span className="text-base shrink-0 mt-0.5">⚠️</span>
            <div className="leading-relaxed">
              <strong className="block text-rose-200 font-bold mb-0.5">Tin nhắn cần bạn tự ra quyết định!</strong>
              <span className="text-[11px] text-slate-300">Nội dung liên quan đến tiền bạc / lịch học / cam kết quan trọng. AI tự động trả lời hoãn binh để bạn cân nhắc và không tự ý quyết định thay bạn.</span>
            </div>
          </div>
        )}

        {/* API Warning Notice if any */}
        {currentSuggestion?.replyResponse?.error && (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 flex items-start gap-2">
            <span className="text-amber-400 font-bold shrink-0">⚠️</span>
            <div className="leading-tight">
              <span>{currentSuggestion.replyResponse.error}</span>
            </div>
          </div>
        )}

        {/* Selected Message & Knowledge Badge */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
              <MessageSquare className="w-3.5 h-3.5 text-brand-400" />
              <span>Tin nhắn đã chọn:</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-500/15 text-brand-300 hover:bg-brand-500/25 border border-brand-500/30 transition-all flex items-center gap-1 cursor-pointer"
                title="Dán nhanh nội dung từ Clipboard làm tin nhắn cần trả lời"
              >
                <Copy className="w-2.5 h-2.5" />
                <span>Dán Clipboard</span>
              </button>
              <button
                type="button"
                onClick={() => setIsInputtingMessage(!isInputtingMessage)}
                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-800 text-slate-300 hover:bg-surface-750 border border-surface-700 transition-all flex items-center gap-1 cursor-pointer"
                title="Gõ hoặc sửa tin nhắn thủ công"
              >
                <Edit3 className="w-2.5 h-2.5" />
                <span>{isInputtingMessage ? 'Đóng' : 'Nhập tay'}</span>
              </button>
              {onManualScan && (
                <button
                  type="button"
                  onClick={onManualScan}
                  disabled={isScanning}
                  className="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-800 text-slate-400 hover:text-slate-200 border border-surface-700 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Quét lại tin nhắn mới nhất trong khung chat"
                >
                  <RefreshCw className={`w-2.5 h-2.5 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>Quét</span>
                </button>
              )}
            </div>
          </div>

          {/* Manual Input Box (if toggled) */}
          {isInputtingMessage && (
            <div className="p-2.5 bg-surface-950 rounded-xl border border-brand-500/40 space-y-2 animate-fade-in shadow-lg">
              <textarea
                value={manualInputText}
                onChange={(e) => setManualInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitManualMessage();
                  }
                }}
                placeholder="Gõ hoặc dán tin nhắn của khách vào đây rồi nhấn Enter..."
                rows={2}
                className="w-full text-xs bg-surface-900 border border-surface-750 rounded-lg p-2 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-500 font-sans resize-none"
                autoFocus
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsInputtingMessage(false)}
                  className="px-2.5 py-1 text-[10.5px] rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSubmitManualMessage}
                  disabled={!manualInputText.trim()}
                  className="px-3 py-1 text-[10.5px] font-bold rounded-lg bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-50 flex items-center gap-1 cursor-pointer shadow-sm shadow-brand-500/20"
                >
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>Tạo 3 gợi ý ngay</span>
                </button>
              </div>
            </div>
          )}

          {/* Selected Message Card */}
          <div className="flex items-start justify-between gap-2">
            <div
              onClick={incomingMsgDisplay ? () => handleRegenerate() : undefined}
              className={`flex-1 min-w-0 flex items-start gap-2.5 text-xs bg-surface-850 px-3 py-2.5 rounded-xl border border-surface-750 transition-all ${
                incomingMsgDisplay ? 'cursor-pointer hover:border-brand-500/50 hover:bg-surface-800' : ''
              }`}
              title={incomingMsgDisplay ? 'Nhấp để tạo lại gợi ý cho tin nhắn này' : 'Nhấp vào bất kỳ tin nhắn nào trong khung chat để chọn'}
            >
              <MessageSquare className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isRegenerating ? 'text-brand-400 animate-pulse' : 'text-brand-400'}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-slate-400 text-[10.5px] font-semibold block">Nội dung tin nhắn:</span>
                  {incomingMsgDisplay && (
                    <span className="text-[10px] text-brand-400/80 font-medium">Click để tạo lại</span>
                  )}
                </div>
                <p className="text-slate-200 font-medium text-[11.5px] leading-relaxed line-clamp-3 break-words">
                  {incomingMsgDisplay ? (
                    `"${incomingMsgDisplay}"`
                  ) : (
                    <span className="text-slate-500 italic">Click vào tin nhắn bất kỳ trong chat hoặc bấm [Dán Clipboard] / [Nhập tay]...</span>
                  )}
                </p>
              </div>
            </div>

            {matchedKnowledge.length > 0 && (
              <div
                className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-1.5 rounded-lg border border-emerald-500/20 shrink-0 self-start"
                title={`Khớp ${matchedKnowledge.length} mục tri thức FAQ`}
              >
                <Database className="w-3 h-3" />
                <span>{matchedKnowledge.length} FAQ</span>
              </div>
            )}
          </div>
        </div>

        {/* 💡 Dedicated Context / Direction Input Box */}
        <div className="p-3 rounded-xl bg-surface-850 border border-surface-750 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span>Ngữ cảnh / Định hướng trả lời:</span>
            </div>
            {customPrompt && (
              <button
                onClick={() => setCustomPrompt('')}
                className="text-[10px] text-slate-400 hover:text-rose-300 flex items-center gap-0.5 cursor-pointer"
                title="Xóa ngữ cảnh"
              >
                <X className="w-3 h-3" />
                <span>Xóa</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isRegenerating) {
                  e.preventDefault();
                  handleRegenerate();
                }
              }}
              placeholder="Nhập ngữ cảnh (VD: 'Đang bận', 'Hẹn tối nay', 'Từ chối')..."
              className="flex-1 text-xs bg-surface-950 border border-surface-750 rounded-lg px-2.5 py-1.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/80 transition-all font-sans"
            />
            <button
              onClick={() => handleRegenerate()}
              disabled={isRegenerating || !incomingMsgDisplay}
              className="px-2 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-750 text-slate-200 border border-surface-700 text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer shrink-0"
              title="Tạo 3 phương án để xem trước và chọn trước khi gửi"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : 'text-amber-400'}`} />
              <span>Tạo</span>
            </button>
            <button
              onClick={() => handleRegenerateAndSend()}
              disabled={isRegenerating || !incomingMsgDisplay}
              className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer shrink-0 shadow-sm shadow-brand-500/20"
              title="AI tự tạo xong và tự động gửi luôn vào Messenger ngay lập tức"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Tạo & Gửi</span>
            </button>
          </div>

          {/* Quick Context Chips */}
          <div className="flex flex-wrap gap-1 pt-1">
            {[
              'Đồng ý chốt luôn',
              'Từ chối khéo',
              'Đang bận lát rep',
              'Hẹn tối mai',
              'Hỏi thêm thông tin',
              'Hài hước trêu đùa'
            ].map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  setCustomPrompt(tag);
                  handleRegenerate(tag);
                }}
                className="text-[10px] px-2 py-0.5 rounded-md bg-surface-950/80 hover:bg-surface-800 text-slate-400 hover:text-amber-300 border border-surface-750 hover:border-amber-500/40 transition-all cursor-pointer"
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Suggestions Title & Quick Regenerate */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Gợi ý phản hồi từ {aiModelDisplayName}</span>
          </div>

          <button
            onClick={() => handleRegenerate()}
            disabled={isRegenerating || !incomingMsgDisplay}
            className="flex items-center gap-1 text-[11px] text-brand-400 hover:text-brand-300 disabled:opacity-50 transition-colors cursor-pointer font-semibold"
          >
            <RefreshCw className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>{isRegenerating ? 'Đang tạo...' : 'Tạo lại'}</span>
          </button>
        </div>

        {/* Default Auto-Reply Option Selector Toolbar */}
        <div className="flex items-center justify-between bg-surface-950/70 p-2 rounded-xl border border-surface-750/70">
          <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Mặc định Auto-Reply gửi:</span>
          </span>
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((opt) => {
              const isActive = (settings?.defaultAutoReplyOption || 1) === opt;
              return (
                <button
                  key={opt}
                  onClick={async () => {
                    await updateSettings({ defaultAutoReplyOption: opt as 1 | 2 | 3 });
                  }}
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-surface-950 shadow-sm shadow-amber-500/30'
                      : 'bg-surface-800 text-slate-400 hover:text-slate-200 hover:bg-surface-750'
                  }`}
                  title={`Tự động gửi Option ${opt} khi có tin nhắn mới`}
                >
                  Option {opt}
                </button>
              );
            })}
          </div>
        </div>

        {/* Suggestions List or Call-to-Action */}
        {suggestions.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-surface-750 bg-surface-950/40 text-center space-y-3">
            <div className="w-9 h-9 mx-auto rounded-full bg-brand-600/20 text-brand-400 flex items-center justify-center border border-brand-500/30">
              <Sparkles className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">
                {incomingMsgDisplay ? 'Đã chọn tin nhắn' : 'Chưa chọn tin nhắn'}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {incomingMsgDisplay
                  ? 'Bấm nút bên dưới để AI phân tích và đưa ra câu trả lời'
                  : 'Nhấp vào tin nhắn trong khung chat hoặc dán nhanh từ clipboard:'}
              </p>
            </div>
            {!incomingMsgDisplay && (
              <div className="flex justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-brand-500/20"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>📋 Dán từ Clipboard</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsInputtingMessage(true)}
                  className="px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-750 text-slate-300 font-semibold text-xs border border-surface-700 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-brand-400" />
                  <span>✏️ Nhập tay</span>
                </button>
              </div>
            )}
            {incomingMsgDisplay && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleRegenerate()}
                  disabled={isRegenerating}
                  className="flex-1 py-2 px-3 rounded-xl bg-surface-800 hover:bg-surface-750 text-slate-200 font-semibold text-xs border border-surface-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Tạo 3 phương án để bạn xem trước"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : 'text-amber-400'}`} />
                  <span>{isRegenerating ? 'Đang tạo...' : '✨ Tạo xem trước'}</span>
                </button>
                <button
                  onClick={() => handleRegenerateAndSend()}
                  disabled={isRegenerating}
                  className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-brand-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="AI tự tạo và tự gửi luôn vào Messenger"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>⚡ Tạo & Gửi luôn</span>
                </button>
              </div>
            )}
          </div>
        ) : (
        <div className="space-y-3">
          {suggestions.map((text, idx) => {
            const optNum = (idx + 1) as 1 | 2 | 3;
            const isAutoDefault = (settings?.defaultAutoReplyOption || 1) === optNum;
            const isEditing = editingIndex === idx;

            const badgeLabel =
              idx === 0 ? 'Tự nhiên / Chuẩn xác' : idx === 1 ? 'Chi tiết / Thân thiện' : 'Ngắn gọn / Hóm hỉnh';
            const badgeColor =
              idx === 0
                ? 'bg-indigo-500/20 text-indigo-300'
                : idx === 1
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-amber-500/20 text-amber-300';

            return (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border transition-all duration-200 relative group ${
                  isAutoDefault
                    ? 'bg-surface-850 border-amber-500/60 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/30'
                    : 'bg-surface-850/70 border-surface-750 hover:border-surface-600'
                }`}
              >
                {/* Option Badge & Default Status */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
                      Option {optNum}: {badgeLabel}
                    </span>

                    {isAutoDefault ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                        ⭐ Mặc định tự gửi
                      </span>
                    ) : (
                      <button
                        onClick={async () => {
                          await updateSettings({ defaultAutoReplyOption: optNum });
                        }}
                        className="text-[10px] font-medium text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                        title={`Chọn Option ${optNum} làm phương án gửi mặc định`}
                      >
                        ☆ Đặt làm mặc định
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCopy(text, idx)}
                      className="p-1 rounded hover:bg-surface-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                      title="Sao chép câu này"
                    >
                      {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleStartEdit(text, idx)}
                      className="p-1 rounded hover:bg-surface-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                      title="Chỉnh sửa câu trả lời"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Text Content / Edit Box */}
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      className="w-full text-xs bg-surface-950 border border-brand-500/50 rounded-lg p-2 text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500 font-sans"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingIndex(null)}
                        className="px-2 py-1 rounded text-[11px] bg-surface-700 text-slate-300 hover:bg-surface-600 cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleSaveAndSendEdit}
                        className="flex items-center gap-1 px-3 py-1 rounded text-[11px] font-semibold bg-brand-600 text-white hover:bg-brand-500 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>Lưu & Gửi</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-200 leading-relaxed font-sans mb-3 select-text">
                    {text}
                  </p>
                )}

                {/* Action Buttons: Nhập vào ô chat & Gửi ngay */}
                {!isEditing && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-800/60">
                    <button
                      onClick={() => handleFillInput(text, idx)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-800 hover:bg-surface-750 text-slate-300 hover:text-white border border-surface-700 transition-all cursor-pointer"
                      title="Chỉ điền câu này vào ô nhập tin nhắn mà chưa gửi vội"
                    >
                      {filledIndex === idx ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300 font-semibold">Đã nhập</span>
                        </>
                      ) : (
                        <>
                          <CornerDownLeft className="w-3.5 h-3.5 text-brand-400" />
                          <span>Nhập vào ô chat</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleSend(text)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-sm shadow-brand-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                      title="Gửi câu trả lời này ngay lập tức"
                    >
                      <Send className="w-3 h-3" />
                      <span>Gửi ngay</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
};
