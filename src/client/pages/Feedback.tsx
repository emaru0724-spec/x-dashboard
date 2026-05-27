import { useState, useEffect } from 'react';
import api from '../lib/api';

const URGENCY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  addressed: 'bg-green-100 text-green-700',
};

const AGENTS = ['品質管理', 'リサーチ', 'コンテンツ', 'パフォーマンス', 'エンゲージ', '戦略'];

export default function Feedback({ accountId }: { accountId?: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    from_agent: '',
    to_agent: '',
    topic: '',
    detail: '',
    urgency: 'medium',
    genre: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [statusFilter, urgencyFilter, accountId]);

  async function loadData() {
    setLoading(true);
    try {
      const filters: any = {};
      if (statusFilter) filters.status = statusFilter;
      if (urgencyFilter) filters.urgency = urgencyFilter;
      if (accountId) filters.accountId = accountId;
      const data = await api.feedback.list(Object.keys(filters).length ? filters : undefined);
      setItems(data ?? []);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }

  async function handleResolve(id: string) {
    try {
      await api.feedback.resolve(id);
      loadData();
    } catch {
      alert('対応済みにできませんでした');
    }
  }

  async function handleCreate() {
    if (!form.topic.trim()) {
      alert('トピックを入力してください');
      return;
    }
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (accountId) payload.account_id = accountId;
      await api.feedback.create(payload);
      setShowForm(false);
      setForm({ from_agent: '', to_agent: '', topic: '', detail: '', urgency: 'medium', genre: '' });
      loadData();
    } catch {
      alert('追加に失敗しました');
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
        >
          <option value="">全ステータス</option>
          <option value="pending">未対応</option>
          <option value="addressed">対応済み</option>
        </select>
        <select
          value={urgencyFilter}
          onChange={(e) => setUrgencyFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
        >
          <option value="">全緊急度</option>
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
        <div className="flex-1" />
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
        >
          + 新規フィードバック
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">新規フィードバック</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">トピック</label>
                <input
                  type="text"
                  value={form.topic}
                  onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">詳細</label>
                <textarea
                  value={form.detail}
                  onChange={(e) => setForm((f) => ({ ...f, detail: e.target.value }))}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">From</label>
                  <select
                    value={form.from_agent}
                    onChange={(e) => setForm((f) => ({ ...f, from_agent: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                  >
                    <option value="">選択</option>
                    {AGENTS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">To</label>
                  <select
                    value={form.to_agent}
                    onChange={(e) => setForm((f) => ({ ...f, to_agent: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                  >
                    <option value="">選択</option>
                    {AGENTS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">緊急度</label>
                <div className="flex gap-2">
                  {(['high', 'medium', 'low'] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => setForm((f) => ({ ...f, urgency: u }))}
                      className={`flex-1 rounded-lg border-2 py-2 text-center text-sm font-medium transition-colors ${
                        form.urgency === u
                          ? u === 'high'
                            ? 'border-red-400 bg-red-50 text-red-700'
                            : u === 'medium'
                              ? 'border-yellow-400 bg-yellow-50 text-yellow-700'
                              : 'border-green-400 bg-green-50 text-green-700'
                          : 'border-gray-200 text-gray-500'
                      }`}
                    >
                      {u === 'high' ? '高' : u === 'medium' ? '中' : '低'}
                    </button>
                  ))}
                </div>
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
                onClick={handleCreate}
                disabled={saving}
                className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
              >
                {saving ? '追加中...' : '追加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="py-12 text-center text-sm text-gray-400">読み込み中...</p>
      ) : items.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-400">フィードバックがありません</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="mb-2 flex items-start justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{item.topic}</h3>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      URGENCY_COLORS[item.urgency] ?? 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {item.urgency === 'high' ? '高' : item.urgency === 'medium' ? '中' : '低'}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_COLORS[item.status] ?? 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {item.status === 'pending' ? '未対応' : '対応済み'}
                  </span>
                </div>
              </div>

              {item.detail && (
                <p className="mb-3 text-sm text-gray-600">{item.detail}</p>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {item.from_agent && (
                    <span className="rounded-full bg-purple-100 px-2 py-0.5 font-medium text-purple-700">
                      {item.from_agent}
                    </span>
                  )}
                  {item.from_agent && item.to_agent && <span>→</span>}
                  {item.to_agent && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700">
                      {item.to_agent}
                    </span>
                  )}
                  <span className="ml-2">{item.created_at?.slice(0, 10) ?? ''}</span>
                </div>
                {item.status === 'pending' && (
                  <button
                    onClick={() => handleResolve(item.id)}
                    className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600"
                  >
                    対応済み
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
