import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  History,
  CheckCircle2,
  Zap,
  Send,
  Search,
  MessageSquare,
  Bot,
  Filter,
  BarChart3
} from 'lucide-react';

export const AnalyticsLogsView: React.FC = () => {
  const { chatLogs } = useApp();
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredLogs = chatLogs.filter((log) => {
    const matchAction = filterAction === 'all' || log.actionStatus === filterAction;
    const matchSearch =
      log.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.messageText.toLowerCase().includes(searchQuery.toLowerCase());
    return matchAction && matchSearch;
  });

  // Calculate statistics
  const totalLogs = chatLogs.length;
  const autoSentCount = chatLogs.filter((l) => l.actionStatus === 'auto_sent').length;
  const approvedCount = chatLogs.filter((l) => l.actionStatus === 'approved_sent').length;
  const suggestionsCount = chatLogs.filter((l) => l.actionStatus === 'suggested').length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-surface-950 p-6 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-surface-800">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-brand-400" />
            <h1 className="text-base font-bold text-white uppercase tracking-wider">
              Nhật Ký Tương Tác & Thống Kê Hoạt Động
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Theo dõi chi tiết các lượt tự động phản hồi, duyệt tin qua Copilot và đề xuất từ AI
          </p>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mt-4">
        <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Tổng lượt tương tác</div>
            <div className="text-xl font-extrabold text-white">{totalLogs}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-600/20 text-brand-400 flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Tự động gửi (Auto-Reply)</div>
            <div className="text-xl font-extrabold text-emerald-400">{autoSentCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Duyệt gửi (Copilot)</div>
            <div className="text-xl font-extrabold text-indigo-400">{approvedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Tỉ lệ tự động hóa</div>
            <div className="text-xl font-extrabold text-amber-400">
              {totalLogs > 0 ? `${Math.round(((autoSentCount + approvedCount) / totalLogs) * 100)}%` : '100%'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center justify-between mt-6 mb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-white uppercase">Lịch sử sự kiện:</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên hoặc nội dung..."
              className="w-64 text-xs bg-surface-900 border border-surface-750 rounded-xl pl-8 pr-3 py-1.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-surface-900 p-1 rounded-xl border border-surface-800">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'auto_sent', label: 'Auto-sent' },
              { id: 'approved_sent', label: 'Copilot' },
              { id: 'suggested', label: 'Đề xuất' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterAction(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  filterAction === tab.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-surface-800 bg-surface-900/60">
        {filteredLogs.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500">
            <History className="w-10 h-10 text-slate-600 mb-2" />
            <p className="text-xs font-semibold text-slate-300">Chưa có nhật ký hoạt động nào</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-surface-800">
              <tr>
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3">Nền tảng</th>
                <th className="px-4 py-3">Đối tượng</th>
                <th className="px-4 py-3">Vai trò</th>
                <th className="px-4 py-3">Nội dung tin nhắn</th>
                <th className="px-4 py-3">Trạng thái xử lý</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/60">
              {filteredLogs.map((log) => {
                const isAuto = log.actionStatus === 'auto_sent';
                const isApproved = log.actionStatus === 'approved_sent';

                return (
                  <tr key={log.id} className="hover:bg-surface-850/50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}{' '}
                      <span className="text-[10px] text-slate-500">
                        {new Date(log.timestamp).toLocaleDateString('vi-VN')}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-surface-950 font-mono uppercase text-slate-300 border border-surface-800">
                        {log.platform}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-semibold text-white">{log.contactName}</td>

                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        log.sender === 'assistant' ? 'bg-brand-500/20 text-brand-300' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {log.sender === 'assistant' ? 'AI Trợ lý' : 'Người gửi'}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-200 font-sans max-w-md truncate select-text">
                      {log.messageText}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border flex items-center gap-1 w-max ${
                          isAuto
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : isApproved
                            ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                            : 'bg-slate-700/40 text-slate-400 border-slate-700'
                        }`}
                      >
                        {isAuto ? <Zap className="w-2.5 h-2.5" /> : isApproved ? <CheckCircle2 className="w-2.5 h-2.5" /> : null}
                        <span>{isAuto ? 'Tự động gửi (Auto)' : isApproved ? 'Duyệt Copilot' : 'Đã đề xuất'}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
