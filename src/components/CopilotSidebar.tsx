import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Sparkles,
  Send,
  Copy,
  Edit3,
  RefreshCw,
  Database,
  Tag,
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
    approveAndSendReply,
    fillChatInput,
    regenerateReply,
    setContactCategory,
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

  const currentPersonaId =
    contactPersonaMap[contactKey] ||
    matchedContact?.personaId;

  const customPersonaForContact = useMemo(() => {
    if (!contactName || contactName === 'Chưa chọn cuộc trò chuyện' || contactName === 'Đang chờ chọn tin nhắn') return null;
    const norm = normalizeName(contactName);
    if (!norm || norm.length < 2) return null;
    return personas.find(p => {
      const pNorm = normalizeName(p.id.replace('persona_', ''));
      const pNameNorm = normalizeName(p.name);
      return pNorm === norm || (norm.length >= 4 && (pNorm.includes(norm) || norm.includes(pNorm))) ||
        pNameNorm.includes(norm) || (p.systemPrompt && normalizeName(p.systemPrompt).includes(norm));
    });
  }, [contactName, personas]);

  const currentPersona =
    (currentPersonaId ? personas.find(p => p.id === currentPersonaId) : null) ||
    customPersonaForContact ||
    personas.find(p => p.category === contactCategory && p.isDefault) ||
    personas.find(p => p.category === contactCategory) ||
    personas[0];

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

    if (contactName && contactName.trim()) {
      await setContactCategory(platform, contactName.trim(), newCategory, targetPersona?.id);
    }

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
              <p className="text-[10px] text-slate-400">Gợi ý câu trả lời • Bạn chủ động duyệt gửi</p>
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
        </div>

        {/* Quick Style / Target Persona 1-Click Buttons */}
        <div className="mt-3 p-2.5 rounded-xl bg-surface-850 border border-surface-750 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-pink-400 flex items-center gap-1">
              <span>🎯</span>
              <span>Chọn phong cách / Đối tượng:</span>
            </span>
            <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 font-semibold border border-brand-500/30">
              {currentPersona?.id === 'persona_flirt_crush' ? '💋 Gái Xinh' :
               currentPersona?.id === 'persona_boss_work' ? '👔 Với Sếp' :
               currentPersona?.id === 'persona_family_dad' ? '👨 Nói với Bố' :
               currentPersona?.id === 'persona_family_mom' ? '👩 Nói với Mẹ' :
               currentPersona?.id === 'persona_badminton_client' ? '🏸 Cầu Lông' :
               currentPersona?.id === 'persona_shop_customer' ? '🛍️ Mua Sắm' :
               `🎯 Tự động${customPersonaForContact ? `: ${customPersonaForContact.name.split('(')[0].trim()}` : ''}`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => handlePersonaChange('persona_flirt_crush')}
              className={`py-1.5 px-2 rounded-lg text-[10.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                currentPersona?.id === 'persona_flirt_crush'
                  ? 'bg-gradient-to-r from-pink-500/30 to-purple-500/30 border-pink-500 text-white shadow-sm shadow-pink-500/20'
                  : 'bg-surface-950/60 hover:bg-surface-800 text-slate-300 border-surface-700 hover:border-pink-500/40'
              }`}
            >
              <span>💋</span>
              <span className="truncate">Gái Xinh / Crush</span>
            </button>

            <button
              type="button"
              onClick={() => handlePersonaChange('persona_boss_work')}
              className={`py-1.5 px-2 rounded-lg text-[10.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                currentPersona?.id === 'persona_boss_work'
                  ? 'bg-gradient-to-r from-blue-500/30 to-indigo-500/30 border-blue-500 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-surface-950/60 hover:bg-surface-800 text-slate-300 border-surface-700 hover:border-blue-500/40'
              }`}
            >
              <span>👔</span>
              <span className="truncate">Với Sếp / Đối tác</span>
            </button>

            <button
              type="button"
              onClick={() => handlePersonaChange('persona_family_dad')}
              className={`py-1.5 px-2 rounded-lg text-[10.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                currentPersona?.id === 'persona_family_dad'
                  ? 'bg-gradient-to-r from-sky-500/30 to-blue-600/30 border-sky-400 text-white shadow-sm shadow-sky-500/20'
                  : 'bg-surface-950/60 hover:bg-surface-800 text-slate-300 border-surface-700 hover:border-sky-500/40'
              }`}
            >
              <span>👨</span>
              <span className="truncate">Nói với Bố</span>
            </button>

            <button
              type="button"
              onClick={() => handlePersonaChange('persona_family_mom')}
              className={`py-1.5 px-2 rounded-lg text-[10.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                currentPersona?.id === 'persona_family_mom'
                  ? 'bg-gradient-to-r from-rose-500/30 to-red-500/30 border-rose-400 text-white shadow-sm shadow-rose-500/20'
                  : 'bg-surface-950/60 hover:bg-surface-800 text-slate-300 border-surface-700 hover:border-rose-500/40'
              }`}
            >
              <span>👩</span>
              <span className="truncate">Nói với Mẹ</span>
            </button>

            <button
              type="button"
              onClick={() => handlePersonaChange('persona_badminton_client')}
              className={`py-1.5 px-2 rounded-lg text-[10.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                currentPersona?.id === 'persona_badminton_client'
                  ? 'bg-gradient-to-r from-emerald-500/30 to-teal-500/30 border-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                  : 'bg-surface-950/60 hover:bg-surface-800 text-slate-300 border-surface-700 hover:border-emerald-500/40'
              }`}
            >
              <span>🏸</span>
              <span className="truncate">Khách Cầu Lông</span>
            </button>

            <button
              type="button"
              onClick={() => handlePersonaChange('persona_shop_customer')}
              className={`py-1.5 px-2 rounded-lg text-[10.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                currentPersona?.id === 'persona_shop_customer'
                  ? 'bg-gradient-to-r from-amber-500/30 to-orange-500/30 border-amber-500 text-white shadow-sm shadow-amber-500/20'
                  : 'bg-surface-950/60 hover:bg-surface-800 text-slate-300 border-surface-700 hover:border-amber-500/40'
              }`}
            >
              <span>🛍️</span>
              <span className="truncate">Khách Mua Sắm</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Critical Decision Notice if detected */}
        {currentSuggestion?.replyResponse?.detectedIntent?.includes('quyết định') && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2.5 shadow-sm">
            <span className="text-base shrink-0 mt-0.5">⚠️</span>
            <div className="leading-relaxed">
              <strong className="block text-rose-200 font-bold mb-0.5">Tin nhắn cần bạn tự ra quyết định!</strong>
              <span className="text-[11px] text-slate-300">Nội dung liên quan đến tiền bạc / cam kết quan trọng. AI chỉ gợi ý câu trả lời để bạn cân nhắc và không tự ý quyết định thay bạn.</span>
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
                placeholder="Gõ hoặc dán tin nhắn vào đây rồi nhấn Enter..."
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
              <span>Ghi chú / Ngữ cảnh muốn AI nói theo ý bạn:</span>
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
              placeholder="Nhập ý muốn (VD: 'Đang bận', 'Hẹn tối nay', 'Rủ đi ăn lẩu')..."
              className="flex-1 text-xs bg-surface-950 border border-surface-750 rounded-lg px-2.5 py-1.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/80 transition-all font-sans"
            />
            <button
              onClick={() => handleRegenerate()}
              disabled={isRegenerating || !incomingMsgDisplay}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer shrink-0 shadow-sm shadow-brand-500/20"
              title="Tạo 3 gợi ý theo đúng ngữ cảnh"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : 'text-amber-300'}`} />
              <span>Tạo gợi ý</span>
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
              <div className="pt-1">
                <button
                  onClick={() => handleRegenerate()}
                  disabled={isRegenerating}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-brand-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Tạo 3 phương án để bạn xem trước"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : 'text-amber-300'}`} />
                  <span>{isRegenerating ? 'Đang tạo...' : '✨ Tạo 3 câu gợi ý'}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((text, idx) => {
              const optNum = idx + 1;
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
                  className="p-3.5 rounded-xl border border-surface-750 hover:border-surface-600 bg-surface-850/70 transition-all duration-200 relative group"
                >
                  {/* Option Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
                      Lựa chọn {optNum}: {badgeLabel}
                    </span>

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
