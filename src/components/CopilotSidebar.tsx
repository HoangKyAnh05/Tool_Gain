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
  MessageSquare
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
    updateContact,
    savePersona,
    activeTimers,
    cancelAutoReply,
    approveAndSendReply,
    regenerateReply,
    setContactCategory
  } = useApp();

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
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
  const hasActiveChat = Boolean(contactName && contactName.trim().length > 0);
  const displayName = hasActiveChat ? contactName : 'Chưa chọn đoạn chat';
  const matchedContact = hasActiveChat ? contacts.find(c => normalizeName(c.name) === normalizeName(contactName)) : null;

  // Reset local override only when switching to a completely different contact
  useEffect(() => {
    setSelectedCategory(null);
  }, [contactName]);

  // Determine current active category
  const contactCategory: ContactCategory =
    selectedCategory ||
    matchedContact?.category ||
    currentSuggestion?.contactCategory ||
    (contactName.toLowerCase().includes('bạn') || contactName.toLowerCase().includes('kỳ') || contactName.toLowerCase().includes('hoàng') || contactName.toLowerCase().includes('long') || contactName.toLowerCase().includes('tuấn') ? 'friend' : 'customer');

  const timerKey = `${platform}_${contactName}`;
  const remainingSeconds = activeTimers[timerKey] ?? 0;
  const isCountingDown = remainingSeconds > 0;

  const currentPersona =
    personas.find(p => p.id === matchedContact?.personaId) ||
    personas.find(p => p.category === contactCategory && p.isDefault) ||
    personas.find(p => p.category === contactCategory) ||
    personas[0];

  const hasAISuggestions = Boolean(
    isContactMatching &&
    currentSuggestion?.replyResponse?.suggestedReplies &&
    currentSuggestion.replyResponse.suggestedReplies.length > 0
  );

  const suggestions = hasAISuggestions
    ? currentSuggestion!.replyResponse.suggestedReplies
    : [
        contactCategory === 'friend'
          ? 'Alo nghe nè bro ơi, sao thế?'
          : 'Dạ em chào anh/chị, em có thể hỗ trợ gì cho mình hôm nay ạ?',
        contactCategory === 'friend'
          ? 'Chuẩn luôn nha ông ơi, để lát tôi check rồi nhắn lại liền kkk!'
          : 'Dạ thông tin sản phẩm và chính sách bên em luôn sẵn sàng hỗ trợ anh/chị nhé!',
        contactCategory === 'friend'
          ? 'Ok chốt thế nhé bro!'
          : 'Dạ vâng ạ, anh/chị đợi em một chút em kiểm tra và báo ngay nhé ạ!'
      ];

  const matchedKnowledge = (isContactMatching && currentSuggestion?.replyResponse?.matchedKnowledge) || [];
  const detectedIntent = (isContactMatching && currentSuggestion?.replyResponse?.detectedIntent) || (contactCategory === 'friend' ? 'Bạn bè trò chuyện' : 'Yêu cầu tư vấn');
  const incomingMsgDisplay = (isContactMatching && currentSuggestion?.incomingMessage) || undefined;

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
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

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const msg = currentSuggestion?.incomingMessage || 'Xin chào, tư vấn giúp tôi';
      const promptToUse = customPrompt ? `${msg}\n[Ghi chú thêm từ người dùng: ${customPrompt}]` : msg;
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

          {/* Active Persona Badge */}
          {currentPersona && (
            <div className="flex items-center justify-between pt-2 border-t border-surface-700/40 text-[10px]">
              <span className="text-slate-400">Persona áp dụng:</span>
              <span className="font-medium text-brand-300 truncate max-w-[180px]">{currentPersona.name}</span>
            </div>
          )}
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
            onClick={incomingMsgDisplay ? handleRegenerate : undefined}
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

        {/* Suggestions Title & Quick Regenerate */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Gợi ý phản hồi từ AI (3.7 Flash)</span>
          </div>

          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-1 text-[11px] text-brand-400 hover:text-brand-300 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>Tạo lại</span>
          </button>
        </div>

        {/* Suggestions List */}
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

                {/* Send Button */}
                {!isEditing && (
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-surface-800/60">
                    <button
                      onClick={() => handleSend(text)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-sm shadow-brand-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
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

        {/* Custom Prompt Booster Input */}
        <div className="p-3 rounded-xl bg-surface-950/60 border border-surface-800 space-y-2">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Yêu cầu điều chỉnh riêng:
          </div>
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Ví dụ: 'Thêm icon vui', 'Báo tối nay rảnh'..."
            className="w-full text-xs bg-surface-900 border border-surface-750 rounded-lg px-2.5 py-1.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>
    </div>
  );
};
