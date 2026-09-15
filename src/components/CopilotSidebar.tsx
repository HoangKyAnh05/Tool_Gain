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
    updateContact,
    savePersona,
    activeTimers,
    cancelAutoReply,
    approveAndSendReply,
    fillChatInput,
    regenerateReply,
    setContactCategory
  } = useApp();

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [filledIndex, setFilledIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<ContactCategory | null>(null);

  const normalizeName = (s?: string) => (s || '').toLowerCase().replace(/[\s\-_]+/g, '').trim();

  const isContactMatching =
    !activeContactName ||
    !currentSuggestion?.contactName ||
    normalizeName(activeContactName) === normalizeName(currentSuggestion.contactName) ||
    normalizeName(activeContactName).includes(normalizeName(currentSuggestion.contactName)) ||
    normalizeName(currentSuggestion.contactName).includes(normalizeName(activeContactName));

  const contactName = activeContactName || currentSuggestion?.contactName || '';
  const matchedContact = contacts.find(c => normalizeName(c.name) === normalizeName(contactName));

  const contactCategory =
    selectedCategory ||
    matchedContact?.category ||
    (isContactMatching && currentSuggestion?.contactCategory) ||
    'customer';

  const hasActiveChat = Boolean(contactName && contactName.trim().length > 0 && contactName !== 'Đang chờ chọn tin nhắn');
  const displayName = hasActiveChat ? contactName : 'Chưa chọn cuộc trò chuyện';

  // Reset local override only when switching to a completely different contact
  useEffect(() => {
    setSelectedCategory(null);
  }, [contactName]);

  const timerKey = `${platform}_${contactName}`;
  const remainingSeconds = activeTimers[timerKey] ?? 0;
  const isCountingDown = remainingSeconds > 0;

  const currentPersona =
    personas.find(p => p.id === matchedContact?.personaId) ||
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
    isContactMatching &&
    currentSuggestion?.replyResponse?.suggestedReplies &&
    currentSuggestion.replyResponse.suggestedReplies.length > 0
  );

  const suggestions = hasAISuggestions ? currentSuggestion!.replyResponse.suggestedReplies : [];

  const matchedKnowledge = (isContactMatching && currentSuggestion?.replyResponse?.matchedKnowledge) || [];
  const detectedIntent = (isContactMatching && currentSuggestion?.replyResponse?.detectedIntent) || (contactCategory === 'friend' ? 'Bạn bè trò chuyện' : 'Yêu cầu tư vấn');
  const incomingMsgDisplay = (isContactMatching && currentSuggestion?.incomingMessage) || undefined;

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
    setSelectedCategory(newCategory);
    const targetPersona = personas.find(p => p.category === newCategory && p.isDefault) || personas[0];

    // Persist permanently
    await setContactCategory(platform, contactName, newCategory, targetPersona.id);

    // Trigger regenerate with new category and persona
    const msg = currentSuggestion?.incomingMessage || 'Xin chào bạn nhé';
    setIsRegenerating(true);
    try {
      await regenerateReply(platform, contactName, msg, targetPersona.id);
    } catch (e) {
      console.warn('Regenerate on category change error:', e);
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
                onChange={async (e) => {
                  const targetPersonaId = e.target.value;
                  const selected = personas.find(p => p.id === targetPersonaId);
                  if (selected) {
                    await setContactCategory(platform, contactName, selected.category, selected.id);
                  }
                }}
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
      </div>

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
        {/* Latest Incoming Message & Knowledge Badge */}
        <div className="flex items-start justify-between gap-2">
          <div
            onClick={incomingMsgDisplay ? () => handleRegenerate() : undefined}
            className={`flex-1 min-w-0 flex items-start gap-2.5 text-xs bg-surface-850 px-3 py-2 rounded-lg border border-surface-750 transition-all ${
              incomingMsgDisplay ? 'cursor-pointer hover:border-brand-500/50 hover:bg-surface-800' : ''
            }`}
            title={incomingMsgDisplay ? 'Nhấp để tạo lại gợi ý cho tin nhắn này' : 'Nhấp vào bất kỳ tin nhắn nào trong khung chat để chọn'}
          >
            <MessageSquare className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isRegenerating ? 'text-brand-400 animate-pulse' : 'text-brand-400'}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-slate-400 text-[10.5px] font-semibold block">Tin nhắn gần nhất:</span>
                {incomingMsgDisplay && (
                  <span className="text-[10px] text-brand-400/80 font-medium">Click để tạo lại</span>
                )}
              </div>
              <p className="text-slate-200 font-medium text-[11.5px] leading-relaxed line-clamp-3 break-words">
                {incomingMsgDisplay ? (
                  `"${incomingMsgDisplay}"`
                ) : (
                  <span className="text-slate-500 italic">Nhấp vào ô tin nhắn bất kỳ để chọn...</span>
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
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer shrink-0"
              title="Nhấn Enter hoặc bấm nút này để tạo câu trả lời theo đúng ngữ cảnh"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
              <span>Tạo</span>
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
                  ? 'Bấm nút bên dưới để AI phân tích và đưa ra 3 phương án trả lời'
                  : 'Nhấp vào bất kỳ tin nhắn nào trong khung chat'}
              </p>
            </div>
            {incomingMsgDisplay && (
              <button
                onClick={() => handleRegenerate()}
                disabled={isRegenerating}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                <span>{isRegenerating ? 'Đang phân tích & tạo câu trả lời...' : '✨ Bấm để AI tạo gợi ý ngay'}</span>
              </button>
            )}
          </div>
        ) : (
        <div className="space-y-3">
          {suggestions.map((text, idx) => {
            const isFirst = idx === 0;
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
                  isFirst
                    ? 'bg-surface-850 border-brand-500/40 shadow-sm shadow-brand-500/10'
                    : 'bg-surface-850/70 border-surface-750 hover:border-surface-600'
                }`}
              >
                {/* Option Badge */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
                    {badgeLabel}
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
