import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Persona, ContactCategory } from '../types';
import {
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Save,
  CheckCircle2,
  Clock,
  Sliders,
  ShieldAlert,
  User,
  ShoppingBag,
  Briefcase,
  Smile
} from 'lucide-react';

export const PersonaManager: React.FC = () => {
  const { personas, savePersona, deletePersona } = useApp();
  const [selectedPersona, setSelectedPersona] = useState<Persona>(personas[0] || null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState<Partial<Persona>>({});
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handleSelectPersona = (p: Persona) => {
    setSelectedPersona(p);
    setIsEditing(false);
    setSaveSuccess(false);
  };

  const handleStartEdit = (p: Persona) => {
    setSelectedPersona(p);
    setFormData({ ...p });
    setIsEditing(true);
    setSaveSuccess(false);
  };

  const handleCreateNew = () => {
    const newP: Partial<Persona> = {
      id: `persona_${Date.now()}`,
      name: 'Persona Mới (Tùy chỉnh)',
      category: 'customer',
      description: 'Mô tả mục đích và ngữ cảnh sử dụng của Persona này',
      tone: 'Lịch sự, nhiệt tình, chuẩn mực',
      systemPrompt: 'Bạn là trợ lý ảo đại diện cho chủ tài khoản...\nHãy trả lời một cách tự nhiên và chính xác.',
      replyMode: 'copilot',
      autoDelaySeconds: 4,
      temperature: 0.6,
      icon: 'Sparkles',
      isDefault: false
    };
    setSelectedPersona(newP as Persona);
    setFormData(newP);
    setIsEditing(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) return;
    const toSave: Persona = {
      ...(selectedPersona || {}),
      ...formData,
      id: formData.id || `persona_${Date.now()}`,
      name: formData.name.trim(),
      category: formData.category || 'customer',
      description: formData.description || '',
      tone: formData.tone || '',
      systemPrompt: formData.systemPrompt || '',
      replyMode: formData.replyMode || 'copilot',
      autoDelaySeconds: Number(formData.autoDelaySeconds) || 4,
      temperature: Number(formData.temperature) || 0.6,
      icon: formData.icon || 'Sparkles',
      isDefault: formData.isDefault ?? false,
      createdAt: formData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await savePersona(toSave);
    setSelectedPersona(toSave);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa Persona này?')) {
      await deletePersona(id);
      const remaining = personas.filter(p => p.id !== id);
      if (remaining.length > 0) {
        setSelectedPersona(remaining[0]);
      }
    }
  };

  const getCategoryBadge = (cat: ContactCategory) => {
    switch (cat) {
      case 'customer':
        return { label: 'Khách hàng', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: ShoppingBag };
      case 'employee':
        return { label: 'Nhân viên', color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30', icon: Briefcase };
      case 'friend':
        return { label: 'Bạn bè', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30', icon: Smile };
      default:
        return { label: 'Khác', color: 'bg-slate-500/15 text-slate-300 border-slate-500/30', icon: User };
    }
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-surface-950 select-none">
      {/* Persona Sidebar List */}
      <div className="w-80 bg-surface-900 border-r border-surface-800 flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-surface-800 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">Hệ Thống Persona ({personas.length})</h2>
            <p className="text-[10px] text-slate-400">Tùy biến phong cách chat theo nhóm đối tượng</p>
          </div>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-sm shadow-brand-500/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm mới</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {personas.map((p) => {
            const isSelected = selectedPersona?.id === p.id;
            const badge = getCategoryBadge(p.category);
            const Icon = badge.icon;
            return (
              <div
                key={p.id}
                onClick={() => handleSelectPersona(p)}
                className={`p-3 rounded-xl border cursor-pointer transition-all duration-150 relative ${
                  isSelected
                    ? 'bg-surface-850 border-brand-500/50 shadow-md shadow-brand-500/10'
                    : 'bg-surface-850/50 border-surface-750 hover:bg-surface-850 hover:border-surface-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${badge.color}`}>
                    <Icon className="w-2.5 h-2.5" />
                    <span>{badge.label}</span>
                  </span>
                  {p.isDefault && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30 font-medium">
                      Mặc định
                    </span>
                  )}
                </div>

                <h3 className="text-xs font-bold text-slate-100 truncate mb-1">{p.name}</h3>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{p.description}</p>

                <div className="mt-2.5 pt-2 border-t border-surface-700/40 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Chế độ: <strong className={p.replyMode === 'auto_reply' ? 'text-emerald-400' : 'text-indigo-300'}>{p.replyMode === 'auto_reply' ? 'Auto-Reply' : 'Copilot'}</strong></span>
                  <span>Độ trễ: {p.autoDelaySeconds}s</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Persona Editor / Detail Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-surface-950">
        {selectedPersona ? (
          <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 max-w-4xl space-y-6">
            {/* Action Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-surface-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-white">
                    {isEditing ? 'Chỉnh sửa Persona' : selectedPersona.name}
                  </h1>
                  <p className="text-xs text-slate-400">
                    Phân nhóm: {getCategoryBadge(selectedPersona.category).label} • Cập nhật: {new Date(selectedPersona.updatedAt || Date.now()).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {saveSuccess && (
                  <span className="flex items-center gap-1 text-xs text-emerald-400 mr-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Đã lưu thành công!</span>
                  </span>
                )}

                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-800 text-slate-300 hover:bg-surface-700 transition-all"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/20 transition-all"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Lưu thay đổi</span>
                    </button>
                  </>
                ) : (
                  <>
                    {!selectedPersona.isDefault && (
                      <button
                        onClick={() => handleDelete(selectedPersona.id)}
                        className="p-2 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-all"
                        title="Xóa Persona này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleStartEdit(selectedPersona)}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/20 transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Chỉnh sửa</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Form Fields */}
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tên Persona:</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full text-xs bg-surface-900 border border-surface-750 rounded-xl p-2.5 text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Phân loại đối tượng:</label>
                    <select
                      value={formData.category || 'customer'}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as ContactCategory })}
                      className="w-full text-xs bg-surface-900 border border-surface-750 rounded-xl p-2.5 text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="customer">Khách hàng (Customer Support / Sales)</option>
                      <option value="employee">Nhân viên / Đồng nghiệp (Task & Management)</option>
                      <option value="friend">Bạn bè (Casual & Friendly)</option>
                      <option value="other">Tùy chỉnh khác</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Mô tả ngắn gọn:</label>
                  <input
                    type="text"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full text-xs bg-surface-900 border border-surface-750 rounded-xl p-2.5 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tông giọng (Tone of Voice):</label>
                  <input
                    type="text"
                    value={formData.tone || ''}
                    onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                    placeholder="Ví dụ: Lịch sự, ân cần, xưng em gọi anh/chị..."
                    className="w-full text-xs bg-surface-900 border border-surface-750 rounded-xl p-2.5 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Automation & Timing Settings */}
                <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-surface-900/60 border border-surface-800">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Chế độ trả lời:</label>
                    <select
                      value={formData.replyMode || 'copilot'}
                      onChange={(e) => setFormData({ ...formData, replyMode: e.target.value as 'copilot' | 'auto_reply' })}
                      className="w-full text-xs bg-surface-950 border border-surface-750 rounded-lg p-2 text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="auto_reply">Auto-Reply (Tự động gửi)</option>
                      <option value="copilot">Copilot (Chờ người duyệt)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Độ trễ gửi tự động (giây):
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={30}
                      value={formData.autoDelaySeconds ?? 4}
                      onChange={(e) => setFormData({ ...formData, autoDelaySeconds: parseInt(e.target.value) || 4 })}
                      className="w-full text-xs bg-surface-950 border border-surface-750 rounded-lg p-2 text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Độ sáng tạo (Temperature: {formData.temperature ?? 0.6}):
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={formData.temperature ?? 0.6}
                      onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                      className="w-full mt-2 accent-brand-500"
                    />
                  </div>
                </div>

                {/* System Prompt Instruction */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>System Prompt (Chỉ thị hệ thống cho Gemini):</span>
                    <span className="text-[10px] text-slate-500 font-normal">Quyết định 100% phong cách trả lời</span>
                  </label>
                  <textarea
                    rows={12}
                    value={formData.systemPrompt || ''}
                    onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                    className="w-full text-xs font-mono bg-surface-900 border border-surface-750 rounded-xl p-3 text-slate-100 leading-relaxed focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            ) : (
              /* View Only Cards */
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-surface-900 border border-surface-800">
                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Chế độ vận hành</div>
                    <div className="text-sm font-semibold text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-brand-400" />
                      <span>{selectedPersona.replyMode === 'auto_reply' ? 'Tự động gửi (Auto-Reply)' : 'Chờ duyệt (Copilot)'}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-surface-900 border border-surface-800">
                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Thời gian đếm ngược</div>
                    <div className="text-sm font-semibold text-amber-400 font-mono">
                      {selectedPersona.autoDelaySeconds} giây
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-surface-900 border border-surface-800">
                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Độ sáng tạo (Temperature)</div>
                    <div className="text-sm font-semibold text-indigo-400 font-mono">
                      {selectedPersona.temperature}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-surface-900 border border-surface-800 space-y-2">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Tông giọng (Tone of Voice):</div>
                  <p className="text-xs text-slate-200 leading-relaxed font-sans">{selectedPersona.tone}</p>
                </div>

                <div className="p-4 rounded-xl bg-surface-900 border border-surface-800 space-y-2">
                  <div className="text-[10px] uppercase font-bold text-slate-400">System Prompt chi tiết:</div>
                  <pre className="text-xs font-mono text-slate-300 bg-surface-950 p-4 rounded-xl border border-surface-800 whitespace-pre-wrap leading-relaxed select-text">
                    {selectedPersona.systemPrompt}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            Chọn một Persona để xem chi tiết
          </div>
        )}
      </div>
    </div>
  );
};
