import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CopilotSidebar } from './CopilotSidebar';
import {
  Send,
  Trash2,
  Sparkles,
  Bot,
  User,
  ShoppingBag,
  Briefcase,
  Smile,
  Zap,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { ContactCategory } from '../types';

interface PresetScenario {
  label: string;
  category: ContactCategory;
  contactName: string;
  text: string;
  icon: React.ElementType;
  badge: string;
}

const PRESET_SCENARIOS: PresetScenario[] = [
  {
    label: 'Khách hỏi giá & chính sách ship',
    category: 'customer',
    contactName: 'Chị Lan (Khách hàng mới)',
    text: 'Shop ơi gói Pro giá bao nhiêu ạ? Đặt mua hôm nay thì có được freeship về Hà Nội không?',
    icon: ShoppingBag,
    badge: 'Khách hàng'
  },
  {
    label: 'Khách hỏi đổi trả & bảo hành',
    category: 'customer',
    contactName: 'Anh Tuấn (Khách mua lẻ)',
    text: 'Sản phẩm bên mình được bảo hành bao lâu vậy shop? Nhận hàng có được bóc ra kiểm tra trước không?',
    icon: ShoppingBag,
    badge: 'Khách hàng'
  },
  {
    label: 'Nhân viên báo cáo tiến độ',
    category: 'employee',
    contactName: 'Huy Hoàng (Dev Team Lead)',
    text: 'Anh ơi, module thanh toán đã fix xong lỗi kết nối, chiều nay bên em deploy staging nhé anh.',
    icon: Briefcase,
    badge: 'Nhân viên'
  },
  {
    label: 'Bạn bè rủ đi cafe / nhậu',
    category: 'friend',
    contactName: 'Hoàng Long (Bạn Đại Học)',
    text: 'Alo bro ê! Tối nay rảnh không qua làm cốc bia vỉa hè chém gió đê?',
    icon: Smile,
    badge: 'Bạn bè'
  },
  {
    label: 'Khách hỏi giờ làm việc hotline',
    category: 'customer',
    contactName: 'Cô Thu Hương (Khách Doanh nghiệp)',
    text: 'Chào bạn, công ty bạn làm việc từ mấy giờ? Tôi muốn gọi hotline tư vấn gói doanh nghiệp.',
    icon: ShoppingBag,
    badge: 'Khách hàng'
  }
];

export const ChatSimulatorView: React.FC = () => {
  const { simulatorMessages, sendSimulatorContactMessage, clearSimulatorHistory, handleUserMessage } = useApp();
  const [activeCategory, setActiveCategory] = useState<ContactCategory>('customer');
  const [senderName, setSenderName] = useState<string>('Nguyễn Văn Khang');
  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  const handleSendSimulation = async () => {
    if (!inputText.trim()) return;
    setIsSending(true);
    const textToSend = inputText.trim();
    setInputText('');
    try {
      if (textToSend === '.' || textToSend === '...') {
        await handleUserMessage('simulator', senderName, textToSend);
      } else {
        await sendSimulatorContactMessage(senderName, textToSend, activeCategory);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleScenarioClick = async (sc: PresetScenario) => {
    setActiveCategory(sc.category);
    setSenderName(sc.contactName);
    setIsSending(true);
    try {
      await sendSimulatorContactMessage(sc.contactName, sc.text, sc.category);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-surface-950">
      {/* Simulator Chat Stream Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-surface-800">
        {/* Simulator Control Header */}
        <div className="p-3 bg-surface-900 border-b border-surface-800 flex items-center justify-between text-xs select-none">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-white text-xs">MÔ PHỎNG HỘI THOẠI ĐA ĐỐI TƯỢNG (SANDBOX)</h2>
              <p className="text-[10px] text-slate-400">Kiểm thử độ nhạy AI, Persona & Bộ đếm tự động gửi</p>
            </div>
          </div>

          <button
            onClick={clearSimulatorHistory}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 transition-colors"
            title="Xóa sạch lịch sử mô phỏng"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa lịch sử</span>
          </button>
        </div>

        {/* Quick Scenario Buttons */}
        <div className="p-3 bg-surface-950/70 border-b border-surface-800 overflow-x-auto select-none">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-brand-400" />
            <span>Kịch bản mẫu kiểm thử nhanh:</span>
          </div>
          <div className="flex items-center gap-2 min-w-max">
            {PRESET_SCENARIOS.map((sc, i) => {
              const Icon = sc.icon;
              return (
                <button
                  key={i}
                  onClick={() => handleScenarioClick(sc)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-850 hover:bg-surface-800 border border-surface-750 hover:border-brand-500/40 text-xs text-slate-200 transition-all hover:scale-[1.01]"
                >
                  <Icon className="w-3.5 h-3.5 text-brand-400" />
                  <span className="font-medium">{sc.label}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface-900 text-slate-400 border border-surface-700 font-mono">
                    {sc.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {simulatorMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
              <Bot className="w-12 h-12 text-slate-600 mb-3 animate-pulse" />
              <p className="text-sm font-semibold text-slate-300">Chưa có tin nhắn trong khung mô phỏng</p>
              <p className="text-xs max-w-sm mt-1">
                Hãy bấm vào các kịch bản mẫu ở trên hoặc tự gõ câu hỏi bên dưới để xem AI phản hồi và tự động trả lời!
              </p>
            </div>
          ) : (
            simulatorMessages.map((msg) => {
              const isAssistant = msg.sender === 'assistant';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isAssistant ? 'justify-end' : 'justify-start'}`}
                >
                  {!isAssistant && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-white shrink-0 shadow-md">
                      <User className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[70%] space-y-1 ${isAssistant ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="font-semibold text-slate-300">{msg.senderName}</span>
                      <span>{msg.timestamp}</span>
                      {msg.status === 'auto_sent' && (
                        <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-mono">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Tự động gửi (Auto)</span>
                        </span>
                      )}
                      {msg.status === 'sent' && (
                        <span className="flex items-center gap-1 text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded font-mono">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Đã duyệt (Copilot)</span>
                        </span>
                      )}
                    </div>

                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed font-sans shadow-md select-text ${
                        isAssistant
                          ? 'bg-gradient-to-tr from-brand-600 to-indigo-600 text-white rounded-tr-xs'
                          : 'bg-surface-850 text-slate-100 border border-surface-750 rounded-tl-xs'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>

                  {isAssistant && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shrink-0 shadow-md">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Input Bar (Simulating incoming message from contact) */}
        <div className="p-3 bg-surface-900 border-t border-surface-800 space-y-2">
          {/* Sender & Role Config */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[11px] text-slate-400">Người gửi giả lập:</span>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="bg-surface-950 border border-surface-750 rounded-md px-2 py-0.5 text-slate-200 text-xs w-44 focus:outline-none focus:border-brand-500"
            />

            <span className="text-[11px] text-slate-400 ml-2">Đối tượng:</span>
            <div className="flex items-center gap-1">
              {(['customer', 'employee', 'friend'] as ContactCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                    activeCategory === cat
                      ? cat === 'customer'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                        : cat === 'employee'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                      : 'bg-surface-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat === 'customer' ? 'Khách hàng' : cat === 'employee' ? 'Nhân viên' : 'Bạn bè'}
                </button>
              ))}
            </div>
          </div>

          {/* Message Text Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendSimulation();
              }}
              placeholder="Nhập tin nhắn giả lập từ người gửi để kiểm thử phản hồi của AI..."
              className="flex-1 bg-surface-950 border border-surface-750 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
            />
            <button
              onClick={handleSendSimulation}
              disabled={isSending || !inputText.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white shadow-md shadow-brand-500/20 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi test</span>
            </button>
          </div>
        </div>
      </div>

      {/* Docked Copilot Sidebar connected to Simulator */}
      <CopilotSidebar platform="simulator" activeContactName={senderName} />
    </div>
  );
};
