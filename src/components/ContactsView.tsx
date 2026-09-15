import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Contact, ContactCategory, TargetPlatform } from '../types';
import {
  Users,
  Search,
  Plus,
  Trash2,
  Edit2,
  Save,
  CheckCircle2,
  Tag,
  ToggleLeft,
  ToggleRight,
  ShoppingBag,
  Briefcase,
  Smile,
  UserCheck
} from 'lucide-react';

export const ContactsView: React.FC = () => {
  const { contacts, personas, updateContact, deleteContact } = useApp();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  const filteredContacts = contacts.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.customNotes && c.customNotes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchCategory = selectedCategoryFilter === 'all' || c.category === selectedCategoryFilter;
    return matchSearch && matchCategory;
  });

  const handleToggleAutoReply = async (contact: Contact) => {
    await updateContact(contact.id, {
      autoReplyEnabled: !contact.autoReplyEnabled
    });
  };

  const handleSaveContact = async () => {
    if (!editingContact) return;
    await updateContact(editingContact.id, {
      name: editingContact.name,
      category: editingContact.category,
      personaId: editingContact.personaId,
      customNotes: editingContact.customNotes,
      autoReplyEnabled: editingContact.autoReplyEnabled
    });
    setEditingContact(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa liên hệ này khỏi danh bạ AI?')) {
      await deleteContact(id);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-surface-950 p-6 select-none">
      {/* Top Header & Search Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-surface-800">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <h1 className="text-base font-bold text-white uppercase tracking-wider">
              Danh Bạ & Phân Nhóm Đối Tượng ({contacts.length})
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Quản lý nhãn (Khách hàng / Nhân viên / Bạn bè), ghi chú riêng và Persona áp dụng cho từng người
          </p>
        </div>

        {/* Filter Badges & Search */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên, ghi chú..."
              className="w-64 text-xs bg-surface-900 border border-surface-750 rounded-xl pl-8 pr-3 py-1.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-surface-900 p-1 rounded-xl border border-surface-800">
            {['all', 'customer', 'employee', 'friend'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedCategoryFilter === cat
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat === 'all' ? 'Tất cả' : cat === 'customer' ? 'Khách hàng' : cat === 'employee' ? 'Nhân viên' : 'Bạn bè'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="flex-1 overflow-y-auto mt-4 rounded-2xl border border-surface-800 bg-surface-900/60">
        {filteredContacts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-8 text-slate-500">
            <UserCheck className="w-10 h-10 text-slate-600 mb-2" />
            <p className="text-xs font-semibold text-slate-300">Chưa có liên hệ nào khớp với bộ lọc</p>
            <p className="text-[11px] max-w-sm mt-1">
              Liên hệ sẽ được tự động ghi nhận khi có tin nhắn đến từ Zalo, Messenger, Telegram hoặc qua Sandbox Simulator.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-surface-800">
              <tr>
                <th className="px-4 py-3">Người liên hệ</th>
                <th className="px-4 py-3">Nền tảng</th>
                <th className="px-4 py-3">Phân loại</th>
                <th className="px-4 py-3">Persona gắn kèm</th>
                <th className="px-4 py-3">Auto-Reply</th>
                <th className="px-4 py-3">Ghi chú riêng</th>
                <th className="px-4 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/60">
              {filteredContacts.map((contact) => {
                const assignedPersona = personas.find((p) => p.id === contact.personaId);
                const isEditingThis = editingContact?.id === contact.id;

                return (
                  <tr key={contact.id} className="hover:bg-surface-850/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-brand-600 flex items-center justify-center text-white font-bold text-[10px]">
                          {contact.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{contact.name}</div>
                          {contact.lastMessageTime && (
                            <div className="text-[10px] text-slate-500">
                              Lần cuối: {new Date(contact.lastMessageTime).toLocaleDateString('vi-VN')}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-surface-950 font-mono uppercase text-slate-300 border border-surface-800">
                        {contact.platform}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {isEditingThis ? (
                        <select
                          value={editingContact?.category}
                          onChange={(e) =>
                            setEditingContact({ ...editingContact!, category: e.target.value as ContactCategory })
                          }
                          className="bg-surface-950 border border-surface-700 rounded p-1 text-xs text-white"
                        >
                          <option value="customer">Khách hàng</option>
                          <option value="employee">Nhân viên</option>
                          <option value="friend">Bạn bè</option>
                          <option value="other">Khác</option>
                        </select>
                      ) : (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                            contact.category === 'customer'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : contact.category === 'employee'
                              ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {contact.category === 'customer'
                            ? 'Khách hàng'
                            : contact.category === 'employee'
                            ? 'Nhân viên'
                            : 'Bạn bè'}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {isEditingThis ? (
                        <select
                          value={editingContact?.personaId}
                          onChange={(e) => setEditingContact({ ...editingContact!, personaId: e.target.value })}
                          className="bg-surface-950 border border-surface-700 rounded p-1 text-xs text-white"
                        >
                          {personas.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-slate-300 font-medium truncate max-w-[140px] block">
                          {assignedPersona?.name || 'Mặc định'}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleAutoReply(contact)}
                        className={`flex items-center gap-1 text-[11px] font-semibold transition-colors ${
                          contact.autoReplyEnabled ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        {contact.autoReplyEnabled ? (
                          <>
                            <ToggleRight className="w-5 h-5 text-emerald-400" />
                            <span>Bật</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-5 h-5 text-slate-500" />
                            <span>Tắt</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="px-4 py-3">
                      {isEditingThis ? (
                        <input
                          type="text"
                          value={editingContact?.customNotes || ''}
                          onChange={(e) =>
                            setEditingContact({ ...editingContact!, customNotes: e.target.value })
                          }
                          placeholder="Nhập ghi chú riêng..."
                          className="bg-surface-950 border border-surface-700 rounded p-1 text-xs text-white w-full"
                        />
                      ) : (
                        <span className="text-slate-400 italic text-[11px] truncate max-w-[180px] block">
                          {contact.customNotes || '(Chưa có ghi chú)'}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isEditingThis ? (
                          <>
                            <button
                              onClick={() => setEditingContact(null)}
                              className="px-2 py-1 rounded bg-surface-800 text-slate-300 hover:bg-surface-700 text-[11px]"
                            >
                              Hủy
                            </button>
                            <button
                              onClick={handleSaveContact}
                              className="px-2.5 py-1 rounded bg-brand-600 text-white hover:bg-brand-500 text-[11px] font-semibold"
                            >
                              Lưu
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingContact({ ...contact })}
                              className="p-1.5 rounded hover:bg-surface-800 text-slate-400 hover:text-slate-200"
                              title="Sửa thông tin"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(contact.id)}
                              className="p-1.5 rounded hover:bg-rose-500/20 text-rose-400"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
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
