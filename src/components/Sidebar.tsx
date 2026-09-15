import React from 'react';
import { useApp, NavTab } from '../context/AppContext';
import {
  MessageSquare,
  Sparkles,
  Database,
  Users,
  History,
  Settings,
  Flame,
  Send,
  Globe,
  HelpCircle
} from 'lucide-react';

interface TabItem {
  id: NavTab;
  label: string;
  icon: React.ElementType;
  badge?: string;
  category: 'channel' | 'ai_tools' | 'system';
}

const TAB_ITEMS: TabItem[] = [
  // Channels
  { id: 'zalo', label: 'Zalo Web', icon: MessageSquare, category: 'channel', badge: 'Active' },
  { id: 'messenger', label: 'Messenger', icon: Globe, category: 'channel', badge: 'Active' },
  { id: 'telegram', label: 'Telegram', icon: Send, category: 'channel', badge: 'Active' },

  // AI & Sandbox
  { id: 'simulator', label: 'Simulator Sandbox', icon: Flame, category: 'ai_tools', badge: 'Play' },
  { id: 'personas', label: 'Persona Studio', icon: Sparkles, category: 'ai_tools' },
  { id: 'knowledge', label: 'Kho Tri Thức (FAQ)', icon: Database, category: 'ai_tools' },
  { id: 'contacts', label: 'Danh Bạ & Gán Nhãn', icon: Users, category: 'ai_tools' },

  // System
  { id: 'setup', label: 'Hướng Dẫn & Link Setup', icon: HelpCircle, category: 'system', badge: 'Guide' },
  { id: 'logs', label: 'Nhật Ký & Thống Kê', icon: History, category: 'system' },
  { id: 'settings', label: 'Cài Đặt & API Key', icon: Settings, category: 'system' }
];

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();

  return (
    <aside className="w-64 bg-surface-900 border-r border-surface-800 flex flex-col justify-between shrink-0 select-none">
      {/* Navigation List */}
      <div className="p-3 space-y-6 overflow-y-auto">
        {/* Nền tảng Chat Trực tiếp */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Nền tảng Chat Trực tiếp
          </div>
          <div className="space-y-1">
            {TAB_ITEMS.filter(t => t.category === 'channel').map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25'
                      : 'text-slate-300 hover:bg-surface-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-surface-800 text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Công cụ AI & Tri thức */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Công cụ AI & Tri thức
          </div>
          <div className="space-y-1">
            {TAB_ITEMS.filter(t => t.category === 'ai_tools').map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25'
                      : 'text-slate-300 hover:bg-surface-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Hệ thống */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Hệ thống & Cấu hình
          </div>
          <div className="space-y-1">
            {TAB_ITEMS.filter(t => t.category === 'system').map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25'
                      : 'text-slate-300 hover:bg-surface-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* User Status / Mode Info Footer */}
      <div className="p-3 bg-surface-950/60 border-t border-surface-800/80">
        <div className="flex items-center justify-between p-2 rounded-lg bg-surface-800/40 border border-surface-700/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-slate-300 font-medium">Session Safe & Local</span>
          </div>
          <span className="text-[10px] text-indigo-300 font-mono">SQLite DB</span>
        </div>
      </div>
    </aside>
  );
};
