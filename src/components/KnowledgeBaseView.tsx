import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { KnowledgeItem } from '../types';
import {
  Database,
  Plus,
  Trash2,
  Edit2,
  Save,
  Search,
  CheckCircle2,
  Zap,
  Tag,
  BookOpen
} from 'lucide-react';

export const KnowledgeBaseView: React.FC = () => {
  const { knowledgeItems, saveKnowledgeItem, deleteKnowledgeItem } = useApp();
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(knowledgeItems[0] || null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState<Partial<KnowledgeItem>>({});
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Test Search Box
  const [testQuery, setTestQuery] = useState<string>('');
  const [testResults, setTestResults] = useState<KnowledgeItem[]>([]);

  const filteredItems = knowledgeItems.filter(
    k =>
      k.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      k.category.toLowerCase().includes(searchFilter.toLowerCase()) ||
      k.keywords.some(kw => kw.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const handleSelectItem = (item: KnowledgeItem) => {
    setSelectedItem(item);
    setIsEditing(false);
    setSaveSuccess(false);
  };

  const handleStartEdit = (item: KnowledgeItem) => {
    setSelectedItem(item);
    setFormData({ ...item });
    setIsEditing(true);
    setSaveSuccess(false);
  };

  const handleCreateNew = () => {
    const newItem: Partial<KnowledgeItem> = {
      id: `kb_${Date.now()}`,
      category: 'Sản phẩm & Báo giá',
      title: 'Tài liệu / Câu hỏi mới',
      keywords: ['từ khóa 1', 'từ khóa 2'],
      content: 'Nội dung chi tiết tài liệu...',
      isActive: true
    };
    setSelectedItem(newItem as KnowledgeItem);
    setFormData(newItem);
    setIsEditing(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!formData.title?.trim() || !formData.content?.trim()) return;

    let keywordsArray = formData.keywords || [];
    if (typeof keywordsArray === 'string') {
      keywordsArray = (keywordsArray as string).split(',').map(s => s.trim()).filter(Boolean);
    }

    const toSave: KnowledgeItem = {
      ...(selectedItem || {}),
      ...formData,
      id: formData.id || `kb_${Date.now()}`,
      title: formData.title.trim(),
      category: formData.category || 'Chung',
      keywords: keywordsArray,
      content: formData.content.trim(),
      isActive: formData.isActive ?? true,
      createdAt: formData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveKnowledgeItem(toSave);
    setSelectedItem(toSave);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa mục tri thức này?')) {
      await deleteKnowledgeItem(id);
      const remaining = knowledgeItems.filter(k => k.id !== id);
      if (remaining.length > 0) {
        setSelectedItem(remaining[0]);
      }
    }
  };

  const handleRunTestQuery = () => {
    if (!testQuery.trim()) {
      setTestResults([]);
      return;
    }
    const q = testQuery.toLowerCase();
    const matched = knowledgeItems.filter(item => {
      if (!item.isActive) return false;
      const kwMatch = item.keywords.some(kw => q.includes(kw.toLowerCase()));
      const titleMatch = q.includes(item.title.toLowerCase()) || item.title.toLowerCase().includes(q);
      const contentMatch = item.content.toLowerCase().split(/\s+/).some(w => w.length > 3 && q.includes(w));
      return kwMatch || titleMatch || contentMatch;
    });
    setTestResults(matched);
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-surface-950 select-none">
      {/* Knowledge Items Sidebar List */}
      <div className="w-80 bg-surface-900 border-r border-surface-800 flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-surface-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Kho Tri Thức ({knowledgeItems.length})</h2>
              <p className="text-[10px] text-slate-400">Dữ liệu FAQ, Báo giá & Chính sách</p>
            </div>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-sm shadow-brand-500/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm mới</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Tìm theo tiêu đề, danh mục, từ khóa..."
              className="w-full text-xs bg-surface-950 border border-surface-750 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredItems.map((item) => {
            const isSelected = selectedItem?.id === item.id;
            return (
              <div
                key={item.id}
                onClick={() => handleSelectItem(item)}
                className={`p-3 rounded-xl border cursor-pointer transition-all duration-150 relative ${
                  isSelected
                    ? 'bg-surface-850 border-brand-500/50 shadow-md shadow-brand-500/10'
                    : 'bg-surface-850/50 border-surface-750 hover:bg-surface-850 hover:border-surface-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-surface-800 text-indigo-300 border border-surface-700">
                    {item.category}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${item.isActive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                </div>

                <h3 className="text-xs font-bold text-slate-100 truncate mb-1">{item.title}</h3>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{item.content}</p>

                <div className="mt-2 flex flex-wrap gap-1">
                  {item.keywords.slice(0, 3).map((kw, i) => (
                    <span key={i} className="text-[9px] px-1.5 py-0.2 rounded bg-surface-950 text-slate-400 border border-surface-800 font-mono">
                      #{kw}
                    </span>
                  ))}
                  {item.keywords.length > 3 && (
                    <span className="text-[9px] text-slate-500 font-mono">+{item.keywords.length - 3}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Editor & RAG Test Query Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-surface-950">
        <div className="flex-1 overflow-y-auto p-6 max-w-4xl space-y-6">
          {/* Top Detail / Action Header */}
          {selectedItem && (
            <div className="flex items-center justify-between pb-4 border-b border-surface-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-white">
                    {isEditing ? 'Chỉnh sửa Tri thức FAQ' : selectedItem.title}
                  </h1>
                  <p className="text-xs text-slate-400">
                    Danh mục: {selectedItem.category} • Trạng thái: {selectedItem.isActive ? 'Đang kích hoạt' : 'Tạm tắt'}
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
                      <span>Lưu tài liệu</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleDelete(selectedItem.id)}
                      className="p-2 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-all"
                      title="Xóa mục này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStartEdit(selectedItem)}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/20 transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Chỉnh sửa</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Form or View */}
          {selectedItem && (
            isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tiêu đề tài liệu:</label>
                    <input
                      type="text"
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Ví dụ: Chính sách giao hàng hỏa tốc..."
                      className="w-full text-xs bg-surface-900 border border-surface-750 rounded-xl p-2.5 text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Danh mục:</label>
                    <input
                      type="text"
                      value={formData.category || ''}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="Sản phẩm & Báo giá, Chính sách, Bảo hành..."
                      className="w-full text-xs bg-surface-900 border border-surface-750 rounded-xl p-2.5 text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Từ khóa nhận diện (phân cách bằng dấu phẩy):
                  </label>
                  <input
                    type="text"
                    value={Array.isArray(formData.keywords) ? formData.keywords.join(', ') : formData.keywords || ''}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value.split(',').map(s => s.trim()) })}
                    placeholder="ship, giao hàng, mấy ngày, freeship, cod, đổi trả..."
                    className="w-full text-xs bg-surface-900 border border-surface-750 rounded-xl p-2.5 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nội dung kiến thức chuẩn xác (AI sẽ dựa vào đây để trả lời khách):
                  </label>
                  <textarea
                    rows={8}
                    value={formData.content || ''}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full text-xs font-sans bg-surface-900 border border-surface-750 rounded-xl p-3 text-slate-100 leading-relaxed focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-surface-900 border border-surface-800 space-y-2">
                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                    <Tag className="w-3 h-3 text-brand-400" />
                    <span>Từ khóa kích hoạt ({selectedItem.keywords.length}):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedItem.keywords.map((kw, idx) => (
                      <span key={idx} className="text-xs px-2 py-1 rounded-md bg-surface-950 text-indigo-300 border border-surface-750 font-mono">
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-surface-900 border border-surface-800 space-y-2">
                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3 text-emerald-400" />
                    <span>Nội dung tài liệu:</span>
                  </div>
                  <pre className="text-xs font-sans text-slate-200 bg-surface-950 p-4 rounded-xl border border-surface-800 whitespace-pre-wrap leading-relaxed select-text">
                    {selectedItem.content}
                  </pre>
                </div>
              </div>
            )
          )}

          {/* Interactive RAG Tester Box */}
          <div className="p-5 rounded-2xl bg-surface-900/80 border border-surface-800 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Thử nghiệm Khớp Tri thức (RAG Search Tester)
              </h3>
            </div>
            <p className="text-[11px] text-slate-400">
              Nhập câu hỏi thử của khách hàng để kiểm tra xem hệ thống sẽ trích xuất những tài liệu nào:
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRunTestQuery();
                }}
                placeholder="Ví dụ: 'Giao hàng mất bao lâu shop ơi?' hoặc 'Có bảo hành không?'"
                className="flex-1 text-xs bg-surface-950 border border-surface-750 rounded-xl px-3.5 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
              />
              <button
                onClick={handleRunTestQuery}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/20"
              >
                Kiểm tra
              </button>
            </div>

            {testResults.length > 0 && (
              <div className="mt-3 space-y-2 pt-3 border-t border-surface-800">
                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  Đã tìm thấy {testResults.length} tài liệu phù hợp:
                </div>
                {testResults.map((res, i) => (
                  <div key={i} className="p-3 rounded-lg bg-surface-950 border border-emerald-500/30 text-xs text-slate-200">
                    <div className="font-bold text-emerald-300 mb-1">[{res.category}] {res.title}</div>
                    <div className="text-slate-400 line-clamp-2">{res.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
