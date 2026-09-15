import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  HelpCircle,
  ExternalLink,
  Key,
  MessageSquare,
  Globe,
  Send,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Zap,
  Copy,
  Check
} from 'lucide-react';

export const SetupGuideView: React.FC = () => {
  const { setActiveTab, settings } = useApp();
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const openUrl = (url: string) => {
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleRestart = async () => {
    if (confirm('Khởi động lại ứng dụng ngay bây giờ?')) {
      if (window.electronAPI?.restartApp) {
        await window.electronAPI.restartApp();
      }
    }
  };

  const hasApiKey = Boolean(settings?.geminiApiKey);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-surface-950 p-6 select-none max-w-5xl space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-surface-800">
        <div>
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-brand-400" />
            <h1 className="text-base font-bold text-white uppercase tracking-wider">
              Trung Tâm Thiết Lập & Hướng Dẫn Từng Bước (Setup Hub)
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Tất cả các đường link và hướng dẫn cài đặt cần thiết để ứng dụng hoạt động 100% công suất
          </p>
        </div>

        <button
          onClick={handleRestart}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-surface-800 hover:bg-surface-700 text-slate-200 border border-surface-700 hover:border-brand-500/50 shadow-sm transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5 text-brand-400" />
          <span>Khởi động lại App (Restart)</span>
        </button>
      </div>

      {/* 1. Gemini AI Provider Options: Web2API (Free 3.7 Flash) & Google AI Studio */}
      <div className="grid grid-cols-2 gap-4">
        {/* Web2API Card (Free Gemini 3.7 Flash) */}
        <div className="p-5 rounded-2xl bg-surface-900 border border-brand-500/40 space-y-4 shadow-sm shadow-brand-500/10 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Miễn Phí 100% • Khuyên Dùng
                  </span>
                  <h2 className="text-sm font-bold text-white mt-1">Gemini 3.7 Flash (Web2API)</h2>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Dùng proxy server từ repo GitHub <strong>Sophomoresty/gemini-web2api</strong> để sử dụng mô hình <strong>Gemini 3.7 Flash</strong> siêu thông minh hoàn toàn miễn phí.
            </p>

            <div className="p-3 rounded-xl bg-surface-950/80 border border-surface-800 text-[11px] font-mono text-slate-300 space-y-1">
              <div className="text-amber-400 font-sans font-semibold">Lệnh bật Server Local:</div>
              <div>git clone https://github.com/Sophomoresty/gemini-web2api.git</div>
              <div>cd gemini-web2api &amp;&amp; pip install -r requirements.txt</div>
              <div className="text-brand-300">python gemini_web2api.py</div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-surface-800">
            <button
              onClick={() => openUrl('https://github.com/Sophomoresty/gemini-web2api.git')}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/20 transition-all cursor-pointer"
            >
              <span>Mở Repo Gemini-Web2API</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] text-brand-300 hover:text-white bg-surface-950 border border-surface-800 cursor-pointer"
            >
              <span>Vào Cài Đặt Web2API</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Google AI Studio Official Card */}
        <div className="p-5 rounded-2xl bg-surface-900 border border-surface-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl border ${
                  hasApiKey ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                }`}>
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Chính Thức (Official API)
                  </span>
                  <h2 className="text-sm font-bold text-white mt-1">Google Gemini API Key</h2>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Tạo khóa API trực tiếp từ Google AI Studio. Google cấp quota miễn phí mỗi ngày cho Gemini 2.0 Flash và Gemini 1.5 Pro.
            </p>

            <div className="p-3 rounded-xl bg-surface-950/80 border border-surface-800 text-[11px] text-slate-300 space-y-1">
              <div className="text-indigo-300 font-semibold">Các bước lấy API Key:</div>
              <ol className="list-decimal list-inside text-slate-400 space-y-0.5">
                <li>Đăng nhập tài khoản Gmail tại Google AI Studio</li>
                <li>Bấm <strong>Create API Key</strong></li>
                <li>Dán mã <code>AIzaSy...</code> vào Cài Đặt</li>
              </ol>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-surface-800">
            <button
              onClick={() => openUrl('https://aistudio.google.com/app/apikey')}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer"
            >
              <span>Mở Google AI Studio</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] text-slate-300 hover:text-white bg-surface-950 border border-surface-800 cursor-pointer"
            >
              <span>Vào Cài Đặt API Key</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>


      {/* 2. Thiết lập 3 Kênh Chat: Zalo, Messenger, Telegram */}
      <div className="grid grid-cols-3 gap-4">
        {/* Zalo Card */}
        <div className="p-5 rounded-2xl bg-surface-900 border border-surface-800 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-950 text-blue-300 border border-blue-500/30">
                Zalo Web
              </span>
            </div>

            <h3 className="text-xs font-bold text-white">Thiết Lập Zalo Web</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Nhúng trực tiếp phiên bản web của Zalo. Đăng nhập 1 lần bằng cách quét mã QR trên điện thoại, phiên đăng nhập được lưu vĩnh viễn.
            </p>
          </div>

          <div className="space-y-2 pt-3 border-t border-surface-800">
            <button
              onClick={() => setActiveTab('zalo')}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all"
            >
              <span>Mở Tab Zalo Web</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => openUrl('https://chat.zalo.me')}
              className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] text-slate-400 hover:text-slate-200 bg-surface-950 border border-surface-800"
            >
              <span>Mở trên trình duyệt ngoài</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Facebook Messenger Card */}
        <div className="p-5 rounded-2xl bg-surface-900 border border-surface-800 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400">
                <Globe className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-950 text-purple-300 border border-purple-500/30">
                Messenger Web
              </span>
            </div>

            <h3 className="text-xs font-bold text-white">Thiết Lập Facebook Messenger</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Hỗ trợ cả tin nhắn từ tài khoản Facebook cá nhân và Fanpage bán hàng. Tự động đề xuất câu trả lời chuẩn xác.
            </p>
          </div>

          <div className="space-y-2 pt-3 border-t border-surface-800">
            <button
              onClick={() => setActiveTab('messenger')}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all"
            >
              <span>Mở Tab Messenger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => openUrl('https://www.messenger.com')}
              className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] text-slate-400 hover:text-slate-200 bg-surface-950 border border-surface-800"
            >
              <span>Mở trên trình duyệt ngoài</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Telegram Web Card */}
        <div className="p-5 rounded-2xl bg-surface-900 border border-surface-800 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-cyan-600/20 text-cyan-400">
                <Send className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-950 text-cyan-300 border border-cyan-500/30">
                Telegram Web
              </span>
            </div>

            <h3 className="text-xs font-bold text-white">Thiết Lập Telegram Web</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Trao đổi công việc nội bộ và khách hàng quốc tế. Quét QR code từ ứng dụng Telegram trên điện thoại để đăng nhập siêu tốc.
            </p>
          </div>

          <div className="space-y-2 pt-3 border-t border-surface-800">
            <button
              onClick={() => setActiveTab('telegram')}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-all"
            >
              <span>Mở Tab Telegram</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => openUrl('https://web.telegram.org/a')}
              className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] text-slate-400 hover:text-slate-200 bg-surface-950 border border-surface-800"
            >
              <span>Mở trên trình duyệt ngoài</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Tùy biến Persona & Tri Thức FAQ */}
      <div className="p-5 rounded-2xl bg-surface-900 border border-surface-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Tùy Biến Giọng Văn (Persona) & Dữ Liệu Bán Hàng (FAQ)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('personas')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-800 hover:bg-surface-700 text-slate-200 border border-surface-700"
            >
              Xem Persona Studio
            </button>
            <button
              onClick={() => setActiveTab('knowledge')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-800 hover:bg-surface-700 text-slate-200 border border-surface-700"
            >
              Xem Kho Tri Thức FAQ
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Hãy cập nhật bảng giá sản phẩm, chính sách giao hàng và khuyến mãi của riêng bạn vào mục <strong>Kho Tri Thức</strong> để AI tự động trích xuất tư vấn cho khách hàng chuẩn xác nhất!
        </p>
      </div>
    </div>
  );
};
