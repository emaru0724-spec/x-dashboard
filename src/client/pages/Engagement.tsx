import { useState, useEffect } from 'react';
import api from '../lib/api';

const TIER_TABS = ['すべて', 'Small', 'Medium', 'Large', 'Mega'];

const TIER_COLORS: Record<string, string> = {
  Small: 'bg-gray-100 text-gray-700',
  Medium: 'bg-blue-100 text-blue-700',
  Large: 'bg-purple-100 text-purple-700',
  Mega: 'bg-amber-100 text-amber-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

type EngagementTarget = {
  id?: string;
  username: string;
  display_name: string;
  follower_tier: string;
  priority: string;
  notes: string;
  last_engaged_at: string;
};

const EMPTY_FORM: EngagementTarget = {
  username: '',
  display_name: '',
  follower_tier: 'Small',
  priority: 'medium',
  notes: '',
  last_engaged_at: '',
};

export default function Engagement({ accountId }: { accountId?: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTier, setActiveTier] = useState('すべて');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<EngagementTarget>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTier, accountId]);

  async function loadData() {
    setLoading(true);
    try {
      const filters: any = {};
      if (activeTier !== 'すべて') filters.tier = activeTier;
      if (accountId) filters.accountId = accountId;
      const data = await api.engagement.list(Object.keys(filters).length ? filters : undefined);
      setItems(data ?? []);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }

  function openAdd() {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  }

  function openEdit(item: any) {
    setEditId(item.id);
    setForm({
      username: item.username ?? '',
      display_name: item.display_name ?? '',
      follower_tier: item.follower_tier ?? 'Small',
      priority: item.priority ?? 'medium',
      notes: item.notes ?? '',
      last_engaged_at: item.last_engaged_at?.slice(0, 10) ?? '',
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.username.trim()) {
      alert('ユーザー名を入力してください');
      return;
    }
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (accountId) payload.account_id = accountId;

      if (editId) {
        await api.engagement.update(editId, payload);
      } else {
        await api.engagement.create(payload);
      }
      setShowForm(false);
      loadData();
    } catch {
      alert('保存に失敗しました');
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('削除しますか？')) return;
    try {
      await api.engagement.delete(id);
      loadData();
    } catch {
      alert('削除に失敗しました');
    }
  }

  return (
    <div className="space-y-4">
      {/* Tier tabs */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg bg-gray-100 p-1">
        {TIER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTier(tab)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTier === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={openAdd}
          className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
        >
          + 追加
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              {editId ? 'ターゲット編集' : 'ターゲット追加'}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">ユーザー名</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                    placeholder="@username"
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">表示名</label>
                  <input
                    type="text"
                    value={form.display_name}
                    onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Tier</label>
                  <select
                    value={form.follower_tier}
                    onChange={(e) => setForm((f) => ({ ...f, follower_tier: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                  >
                    {TIER_TABS.filter((t) => t !== 'すべて').map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">優先度</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                  >
                    <option value="high">高</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">最終エンゲージ日</label>
                <input
                  type="date"
                  value={form.last_engaged_at}
                  onChange={(e) => setForm((f) => ({ ...f, last_engaged_at: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">メモ</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
              >
                {saving ? '保存中...' : editId ? '更新' : '追加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="py-12 text-center text-sm text-gray-400">読み込み中...</p>
      ) : items.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-400">ターゲットが登録されていません</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 font-medium text-gray-500">ユーザー名</th>
                <th className="px-4 py-3 font-medium text-gray-500">表示名</th>
                <th className="px-4 py-3 font-medium text-gray-500">Tier</th>
                <th className="px-4 py-3 font-medium text-gray-500">優先度</th>
                <th className="px-4 py-3 font-medium text-gray-500">最終エンゲージ</th>
                <th className="px-4 py-3 font-medium text-gray-500">メモ</th>
                <th className="px-4 py-3 font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">@{item.username}</td>
                  <td className="px-4 py-3 text-gray-700">{item.display_name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        TIER_COLORS[item.follower_tier] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {item.follower_tier}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        PRIORITY_COLORS[item.priority] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {item.priority === 'high' ? '高' : item.priority === 'medium' ? '中' : '低'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item.last_engaged_at?.slice(0, 10) ?? '-'}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-gray-500">{item.notes ?? '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(item)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
