import { useState, useEffect } from 'react';
import api from '../lib/api';

const JUDGMENT_BADGES: Record<string, { label: string; color: string }> = {
  buzz: { label: '\u{1F525} Buzz', color: 'bg-red-100 text-red-700' },
  good: { label: '\u2705 Good', color: 'bg-green-100 text-green-700' },
  normal: { label: '\u2796 Normal', color: 'bg-gray-100 text-gray-700' },
  poor: { label: '\u26A0\uFE0F Poor', color: 'bg-yellow-100 text-yellow-700' },
};

const CHECK_TYPES = [
  { value: '24h', label: '24h' },
  { value: '72h', label: '72h' },
];

const JUDGMENT_OPTIONS = ['buzz', 'good', 'normal', 'poor'];

export default function Performance({ accountId }: { accountId?: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    post_id: '',
    check_type: '24h',
    judgment: 'normal',
    impressions: '',
    likes: '',
    retweets: '',
    replies: '',
    diagnosis: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [accountId]);

  async function loadData() {
    setLoading(true);
    try {
      const logsFilters: any = {};
      const postsFilters: any = {};
      if (accountId) {
        logsFilters.accountId = accountId;
        postsFilters.accountId = accountId;
      }
      const [logsData, summaryData, postsData] = await Promise.allSettled([
        api.performance.list(Object.keys(logsFilters).length ? logsFilters : undefined),
        api.performance.summary(accountId),
        api.posts.list(Object.keys(postsFilters).length ? postsFilters : undefined),
      ]);
      if (logsData.status === 'fulfilled') setLogs(logsData.value ?? []);
      if (summaryData.status === 'fulfilled') setSummary(summaryData.value);
      if (postsData.status === 'fulfilled') setPosts(postsData.value ?? []);
    } catch {
      // ignore
    }
    setLoading(false);
  }

  async function handleCreate() {
    if (!form.post_id) {
      alert('投稿を選択してください');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        impressions: form.impressions ? parseInt(form.impressions) : null,
        likes: form.likes ? parseInt(form.likes) : null,
        retweets: form.retweets ? parseInt(form.retweets) : null,
        replies: form.replies ? parseInt(form.replies) : null,
      };
      if (accountId) payload.account_id = accountId;

      await api.performance.create(payload);
      setShowForm(false);
      setForm({
        post_id: '',
        check_type: '24h',
        judgment: 'normal',
        impressions: '',
        likes: '',
        retweets: '',
        replies: '',
        diagnosis: '',
      });
      loadData();
    } catch {
      alert('追加に失敗しました');
    }
    setSaving(false);
  }

  const avgImpressions = summary?.avg_impressions ?? 0;
  const buzzRate = summary?.buzz_rate ?? 0;
  const goodRate = summary?.good_rate ?? 0;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">平均インプレッション</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {loading ? '-' : avgImpressions.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Buzz率</p>
          <p className="mt-1 text-3xl font-bold text-amber-600">
            {loading ? '-' : `${buzzRate}%`}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Good率</p>
          <p className="mt-1 text-3xl font-bold text-green-600">
            {loading ? '-' : `${goodRate}%`}
          </p>
        </div>
      </div>

      {/* Add analysis button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
        >
          + 分析を追加
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">パフォーマンス分析を追加</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">投稿</label>
                <select
                  value={form.post_id}
                  onChange={(e) => setForm((f) => ({ ...f, post_id: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">選択してください</option>
                  {posts.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.post_no} - {(p.body ?? '').slice(0, 40)}...
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">チェック種別</label>
                  <div className="flex gap-2">
                    {CHECK_TYPES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setForm((f) => ({ ...f, check_type: t.value }))}
                        className={`flex-1 rounded-lg border-2 py-2 text-center text-sm font-medium transition-colors ${
                          form.check_type === t.value
                            ? 'border-amber-400 bg-amber-50 text-amber-700'
                            : 'border-gray-200 text-gray-500'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">判定</label>
                  <select
                    value={form.judgment}
                    onChange={(e) => setForm((f) => ({ ...f, judgment: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  >
                    {JUDGMENT_OPTIONS.map((j) => (
                      <option key={j} value={j}>
                        {JUDGMENT_BADGES[j]?.label ?? j}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Imp</label>
                  <input
                    type="number"
                    value={form.impressions}
                    onChange={(e) => setForm((f) => ({ ...f, impressions: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Likes</label>
                  <input
                    type="number"
                    value={form.likes}
                    onChange={(e) => setForm((f) => ({ ...f, likes: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">RTs</label>
                  <input
                    type="number"
                    value={form.retweets}
                    onChange={(e) => setForm((f) => ({ ...f, retweets: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Replies</label>
                  <input
                    type="number"
                    value={form.replies}
                    onChange={(e) => setForm((f) => ({ ...f, replies: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">診断</label>
                <textarea
                  value={form.diagnosis}
                  onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))}
                  rows={3}
                  placeholder="なぜこの結果になったか..."
                  className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
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
                onClick={handleCreate}
                disabled={saving}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {saving ? '追加中...' : '追加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Performance table */}
      {loading ? (
        <p className="py-12 text-center text-sm text-gray-400">読み込み中...</p>
      ) : logs.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-400">パフォーマンスログがありません</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 font-medium text-gray-500">投稿</th>
                <th className="px-4 py-3 font-medium text-gray-500">種別</th>
                <th className="px-4 py-3 font-medium text-gray-500">判定</th>
                <th className="px-4 py-3 font-medium text-gray-500">Imp</th>
                <th className="px-4 py-3 font-medium text-gray-500">Likes</th>
                <th className="px-4 py-3 font-medium text-gray-500">RTs</th>
                <th className="px-4 py-3 font-medium text-gray-500">Replies</th>
                <th className="px-4 py-3 font-medium text-gray-500">診断</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const badge = JUDGMENT_BADGES[log.judgment] ?? JUDGMENT_BADGES.normal;
                const post = posts.find((p) => p.id === log.post_id);
                return (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="max-w-[200px] truncate px-4 py-3 text-gray-700">
                      {post ? `#${post.post_no}` : log.post_id?.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {log.check_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.color}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{log.impressions?.toLocaleString() ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{log.likes?.toLocaleString() ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{log.retweets?.toLocaleString() ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{log.replies?.toLocaleString() ?? '-'}</td>
                    <td className="max-w-[250px] truncate px-4 py-3 text-gray-500">
                      {log.diagnosis ?? '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
