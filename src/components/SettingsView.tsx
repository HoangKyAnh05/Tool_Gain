import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Settings,
  Key,
  ShieldCheck,
  AlertTriangle,
  Save,
  Zap,
  Clock,
  Sparkles,
  Volume2,
  CheckCircle2,
  ExternalLink,
  Cpu,
  RotateCcw,
  Server,
  Globe,
  Terminal,
  HelpCircle
} from 'lucide-react';
import { AIProvider } from '../types';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings } = useApp();

  const [aiProvider, setAiProvider] = useState<AIProvider>(settings?.aiProvider || 'gemini_web2api');
  const [apiKey, setApiKey] = useState<string>(settings?.geminiApiKey || '');
  const [web2ApiBaseUrl, setWeb2ApiBaseUrl] = useState<string>(settings?.web2ApiBaseUrl || 'http://localhost:8081/v1');
  const [web2ApiKey, setWeb2ApiKey] = useState<string>(settings?.web2ApiKey || 'none');
  const [model, setModel] = useState<string>(settings?.geminiModel || 'gemini-3.7-flash');

  const [minDelay, setMinDelay] = useState<number>(settings?.autoReplyMinDelay || 3);
  const [maxDelay, setMaxDelay] = useState<number>(settings?.autoReplyMaxDelay || 6);
  const [sound, setSound] = useState<boolean>(settings?.soundNotification ?? true);
  const [typingSim, setTypingSim] = useState<boolean>(settings?.showTypingSimulation ?? true);

  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isRestarting, setIsRestarting] = useState<boolean>(false);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);

    try {
      if (!window.electronAPI) {
        setTestResult({ success: false, message: 'Môi trường Electron chưa sẵn sàng.' });
        return;
      }

      if (aiProvider === 'gemini_web2api') {
        const res = await window.electronAPI.testWeb2Api(web2ApiBaseUrl.trim(), web2ApiKey.trim(), model);
        setTestResult(res);
      } else {
        if (!apiKey.trim()) {
          setTestResult({ success: false, message: 'Vui lòng nhập Google Gemini API Key trước khi kiểm tra.' });
          return;
        }
        const res = await window.electronAPI.testApiKey(apiKey.trim(), model);
        setTestResult(res);
      }
    } catch (err: any) {
      setTestResult({ success: false, message: `Lỗi kết nối: ${err?.message || err}` });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveAll = async () => {
    await updateSettings({
      aiProvider,
      geminiApiKey: apiKey.trim(),
      web2ApiBaseUrl: web2ApiBaseUrl.trim(),
      web2ApiKey: web2ApiKey.trim(),
      geminiModel: model,
      autoReplyMinDelay: Number(minDelay),
      autoReplyMaxDelay: Number(maxDelay),
      soundNotification: sound,
      showTypingSimulation: typingSim
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleRestart = async () => {
    if (confirm('Khởi động lại ứng dụng ngay bây giờ?')) {
      setIsRestarting(true);
      if (window.electronAPI?.restartApp) {
        await window.electronAPI.restartApp();
      } else {
        window.location.reload();
      }
    }
  };

  const handleOpenExternal = (url: string) => {
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-surface-950 p-6 select-none max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-surface-800">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-brand-400" />
            <h1 className="text-base font-bold text-white uppercase tracking-wider">
              Cài Đặt Hệ Thống & Gemini AI Provider
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Cấu hình Gemini 3.7 Flash miễn phí qua Web2API hoặc Google Gemini API Official
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedSuccess && (
            <span className="flex items-center gap-1 text-xs text-emerald-400 mr-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Đã lưu thành công!</span>
            </span>
          )}

          {/* Restart App Button */}
          <button
            onClick={handleRestart}
            disabled={isRestarting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-surface-800 hover:bg-surface-700 text-slate-300 hover:text-white border border-surface-700 transition-all cursor-pointer"
            title="Khởi động lại ứng dụng"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-brand-400 ${isRestarting ? 'animate-spin' : ''}`} />
            <span>Restart App</span>
          </button>

          <button
            onClick={handleSaveAll}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/20 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Lưu tất cả thiết lập</span>
          </button>
        </div>
      </div>

      {/* 1. AI Provider Selection */}
      <div className="p-5 rounded-2xl bg-surface-900 border border-surface-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Chọn Nguồn Cung Cấp AI (Provider)</h2>
              <p className="text-[11px] text-slate-400">Lựa chọn chạy miễn phí qua Gemini-Web2API hoặc dùng Google AI Key</p>
            </div>
          </div>
        </div>

        {/* Provider Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div
            onClick={() => {
              setAiProvider('gemini_web2api');
              setModel('gemini-3.7-flash');
            }}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              aiProvider === 'gemini_web2api'
                ? 'bg-brand-600/15 border-brand-500 text-white shadow-sm ring-1 ring-brand-500/50'
                : 'bg-surface-950/60 border-surface-800 text-slate-400 hover:border-surface-700 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 font-bold text-xs text-brand-300 font-mono">
                <Server className="w-3.5 h-3.5 text-brand-400" />
                <span>Gemini-Web2API (Miễn phí)</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Khuyên Dùng
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Dùng proxy python từ repo <strong>Sophomoresty/gemini-web2api</strong>. Sử dụng mô hình <strong>Gemini 3.7 Flash</strong> không tốn phí token.
            </p>
          </div>

          <div
            onClick={() => {
              setAiProvider('gemini_official');
              setModel('gemini-2.0-flash');
            }}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              aiProvider === 'gemini_official'
                ? 'bg-brand-600/15 border-brand-500 text-white shadow-sm ring-1 ring-brand-500/50'
                : 'bg-surface-950/60 border-surface-800 text-slate-400 hover:border-surface-700 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 font-bold text-xs text-indigo-300 font-mono">
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                <span>Google Gemini API (Official)</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Kết nối trực tiếp máy chủ Google AI Studio qua khóa API cá nhân. Ổn định và trực tiếp.
            </p>
          </div>
        </div>

        {/* Dynamic Provider Settings */}
        {aiProvider === 'gemini_web2api' ? (
          <div className="space-y-3 pt-3 border-t border-surface-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Địa chỉ Web2API Server (Base URL):
              </label>
              <button
                onClick={() => handleOpenExternal('https://github.com/Sophomoresty/gemini-web2api.git')}
                className="flex items-center gap-1 text-[11px] text-brand-400 hover:text-brand-300 font-semibold cursor-pointer"
              >
                <span>Xem mã nguồn repo Gemini-Web2API</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={web2ApiBaseUrl}
                onChange={(e) => setWeb2ApiBaseUrl(e.target.value)}
                placeholder="http://localhost:8081/v1"
                className="flex-1 text-xs font-mono bg-surface-950 border border-surface-750 rounded-xl px-3.5 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
              />
              <button
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-surface-800 hover:bg-surface-700 text-slate-200 border border-surface-700 transition-all disabled:opacity-50 cursor-pointer"
              >
                {testingConnection ? 'Đang kiểm tra...' : 'Kiểm tra Web2API'}
              </button>
            </div>

            {/* Step-by-step setup guide for Web2API */}
            <div className="p-3.5 rounded-xl bg-surface-950/80 border border-surface-800 text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-amber-300 text-[11px]">
                <Terminal className="w-3.5 h-3.5" />
                <span>Hướng dẫn bật Web2API Server trên máy tính (Miễn phí 100%):</span>
              </div>
              <ol className="list-decimal list-inside text-[11px] text-slate-400 space-y-1 font-mono">
                <li>git clone https://github.com/Sophomoresty/gemini-web2api.git</li>
                <li>cd gemini-web2api &amp;&amp; pip install -r requirements.txt</li>
                <li>python gemini_web2api.py (Server mặc định chạy tại http://localhost:8081)</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-3 border-t border-surface-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">Google Gemini API Key:</label>
              <button
                onClick={() => handleOpenExternal('https://aistudio.google.com/app/apikey')}
                className="flex items-center gap-1 text-[11px] text-brand-400 hover:text-brand-300 font-semibold cursor-pointer"
              >
                <span>Lấy API Key tại Google AI Studio</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Dán mã khóa AIzaSy... vào đây"
                className="flex-1 text-xs font-mono bg-surface-950 border border-surface-750 rounded-xl px-3.5 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
              />
              <button
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-surface-800 hover:bg-surface-700 text-slate-200 border border-surface-700 transition-all disabled:opacity-50 cursor-pointer"
              >
                {testingConnection ? 'Đang kiểm tra...' : 'Kiểm tra API Key'}
              </button>
            </div>
          </div>
        )}

        {/* Connection Test Result Badge */}
        {testResult && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {testResult.success ? <ShieldCheck className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Model Selector */}
        <div className="space-y-2 pt-2 border-t border-surface-800">
          <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-brand-400" />
            <span>Mô hình ngôn ngữ (Model):</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(aiProvider === 'gemini_web2api'
              ? [
                  {
                    id: 'gemini-3.7-flash',
                    name: 'Gemini 3.7 Flash',
                    desc: 'Mới nhất & Khuyên dùng: Siêu thông minh, phản hồi tiếng Việt tự nhiên nhất'
                  },
                  {
                    id: 'gemini-3.6-flash',
                    name: 'Gemini 3.6 Flash',
                    desc: 'Tốc độ phản xạ cực nhanh, độ chính xác cao'
                  },
                  {
                    id: 'gemini-3.5-flash-thinking',
                    name: 'Gemini 3.5 Flash Thinking',
                    desc: 'Suy luận logic nhiều bước cho câu hỏi phức tạp'
                  }
                ]
              : [
                  {
                    id: 'gemini-2.0-flash',
                    name: 'Gemini 2.0 Flash',
                    desc: 'Khuyên dùng: Siêu nhanh, phản xạ tức thì, thông minh nhất'
                  },
                  {
                    id: 'gemini-1.5-flash',
                    name: 'Gemini 1.5 Flash',
                    desc: 'Phản hồi siêu tốc độ, ổn định cao, tiết kiệm token'
                  },
                  {
                    id: 'gemini-1.5-pro',
                    name: 'Gemini 1.5 Pro',
                    desc: 'Lý luận chuyên sâu, phù hợp tài liệu kỹ thuật phức tạp'
                  }
                ]
            ).map((m) => (
              <div
                key={m.id}
                onClick={() => setModel(m.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  model === m.id
                    ? 'bg-brand-600/15 border-brand-500 text-white shadow-sm ring-1 ring-brand-500/40'
                    : 'bg-surface-950/60 border-surface-800 text-slate-400 hover:border-surface-700 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-bold font-mono text-slate-200 mb-1">{m.name}</div>
                <div className="text-[10px] leading-relaxed text-slate-400">{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Timing & Automation Parameters */}
      <div className="p-5 rounded-2xl bg-surface-900 border border-surface-800 space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-600/20 text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">Thời gian phản hồi & Mô phỏng tự nhiên</h2>
            <p className="text-[11px] text-slate-400">Đảm bảo hành vi chat giống người thật, tránh bị khóa hoặc quét spam</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Độ trễ tối thiểu (Min Delay: {minDelay}s):
            </label>
            <input
              type="range"
              min={2}
              max={15}
              value={minDelay}
              onChange={(e) => setMinDelay(parseInt(e.target.value))}
              className="w-full accent-amber-500"
            />
            <span className="text-[10px] text-slate-500">Khoảng nghỉ tối thiểu trước khi gửi tin</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Độ trễ tối đa (Max Delay: {maxDelay}s):
            </label>
            <input
              type="range"
              min={minDelay + 1}
              max={25}
              value={maxDelay}
              onChange={(e) => setMaxDelay(parseInt(e.target.value))}
              className="w-full accent-amber-500"
            />
            <span className="text-[10px] text-slate-500">Giới hạn thời gian ngẫu nhiên đếm ngược</span>
          </div>
        </div>

        <div className="pt-2 border-t border-surface-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-white">Mô phỏng gõ phím (Typing Simulation)</div>
            <div className="text-[10px] text-slate-400">Kích hoạt trạng thái "đang soạn tin nhắn..." trên Webview</div>
          </div>
          <button
            onClick={() => setTypingSim(!typingSim)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
              typingSim ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-surface-800 text-slate-500'
            }`}
          >
            {typingSim ? 'Đang bật' : 'Đã tắt'}
          </button>
        </div>

        <div className="pt-2 border-t border-surface-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-white">Âm thanh thông báo</div>
            <div className="text-[10px] text-slate-400">Phát âm thanh nhẹ khi có tin nhắn mới hoặc gửi hoàn tất</div>
          </div>
          <button
            onClick={() => setSound(!sound)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
              sound ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-surface-800 text-slate-500'
            }`}
          >
            {sound ? 'Đang bật' : 'Đã tắt'}
          </button>
        </div>
      </div>
    </div>
  );
};
