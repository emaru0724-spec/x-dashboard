import { useState, useEffect } from 'react';
import api from '../lib/api';

// ── 競合ポストからリライト生成 ─────────────────────────────────────────────

function rewriteFromCompetitor(item: any): { hookType: string; hook: string; body: string; genre: string } {
  const content = item.content_summary || '';
  const technique = (item.hook_technique || '').toLowerCase();

  // タグからジャンル推定
  let tags: string[] = [];
  try { tags = JSON.parse(item.tags || '[]'); } catch { tags = (item.tags || '').split(','); }
  const genreMap: Record<string, string> = { 'MNP': 'MNP', 'ポイ活': 'ポイ活', '副業': '副業', 'スマホ': 'スマホ', 'マネタイズ': 'マネタイズ', '速報': '速報' };
  let genre = '';
  for (const tag of tags) {
    const t = tag.trim();
    if (genreMap[t]) { genre = genreMap[t]; break; }
  }

  // フック型をtechniqueから推定
  let hookType = 'A';
  if (technique.includes('a') || technique.includes('数字')) hookType = 'A';
  if (technique.includes('b') || technique.includes('逆説')) hookType = 'B';
  if (technique.includes('c') || technique.includes('問い')) hookType = 'C';
  if (technique.includes('d') || technique.includes('緊急')) hookType = 'D';
  if (technique.includes('e') || technique.includes('体験')) hookType = 'E';
  if (technique.includes('f') || technique.includes('権威')) hookType = 'F';
  if (technique.includes('g') || technique.includes('共感')) hookType = 'G';
  if (technique.includes('h') || technique.includes('リスト') || technique.includes('まとめ')) hookType = 'H';

  // 内容からキーポイントを抽出
  const sentences = content.split(/[。\n]/).filter((s: string) => s.trim().length > 8);
  const keyPoints = sentences.slice(0, 5).map((s: string, i: number) => `${i + 1}. ${s.trim()}`).join('\n');
  const firstLine = sentences[0]?.trim() || content.slice(0, 60);

  // フック型に応じたリライト
  const hookTemplates: Record<string, string> = {
    A: `これマジで知らないと損。\n${firstLine}\n数字で見ると一目瞭然↓`,
    B: `常識だと思ってたけど、全然違った。\n${firstLine}\nむしろ逆の方がうまくいく理由↓`,
    C: `これ、まだ知らない人いる？\n${firstLine}\n知ってる人だけ得してる。`,
    D: `【これ今だけ】\n${firstLine}\n気づいた人から動いてる。`,
    E: `実際に試してみた結果。\n${firstLine}\n正直ここまで変わるとは思わなかった。`,
    F: `実績ベースで話す。\n${firstLine}\n再現性が高すぎて怖い。`,
    G: `俺も前は同じだった。\n${firstLine}\nでもこれ知ってからマジで変わった。`,
    H: `保存推奨。まとめた↓\n${firstLine}`,
  };

  const hook = hookTemplates[hookType] || hookTemplates.A;
  const body = `${keyPoints}\n\nこれ知ってるだけで全然違う。`;

  return { hookType, hook, body, genre };
}

export default function Competitors({ accountId, onNavigate }: { accountId?: string; onNavigate?: (path: string) => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    account: '',
    post_url: '',
    content_summary: '',
    hook_technique: '',
    estimated_impressions: '',
    tags: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [accountId]);

  async function loadData() {
    setLoading(true);
    try {
      const data = await api.competitors.list(accountId);
      setItems(data ?? []);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }

  async function handleCreate() {
    if (!form.account.trim()) {
      alert('アカウントを入力してください');
      return;
    }
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (accountId) payload.account_id = accountId;
      await api.competitors.create(payload);
      setShowForm(false);
      setForm({
        account: '',
        post_url: '',
        content_summary: '',
        hook_technique: '',
        estimated_impressions: '',
        tags: '',
      });
      loadData();
    } catch {
      alert('追加に失敗しました');
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('削除しますか？')) return;
    try {
      await api.competitors.delete(id);
      loadData();
    } catch {
      alert('削除に失敗しました');
    }
  }

  function parseTags(tags: string): string[] {
    if (!tags) return [];
    try {
      const parsed = JSON.parse(tags);
      return Array.isArray(parsed) ? parsed : tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    } catch {
      return tags.split(',').map((t) => t.trim()).filter(Boolean);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
        >
          + 追加
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">競合バズ記録</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">アカウント</label>
                <input
                  type="text"
                  value={form.account}
                  onChange={(e) => setForm((f) => ({ ...f, account: e.target.value }))}
                  placeholder="@username"
                  className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">投稿URL</label>
                <input
                  type="url"
                  value={form.post_url}
                  onChange={(e) => setForm((f) => ({ ...f, post_url: e.target.value }))}
                  placeholder="https://x.com/..."
                  className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">内容サマリー</label>
                <textarea
                  value={form.content_summary}
                  onChange={(e) => setForm((f) => ({ ...f, content_summary: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">フック手法</label>
                <input
                  type="text"
                  value={form.hook_technique}
                  onChange={(e) => setForm((f) => ({ ...f, hook_technique: e.target.value }))}
                  placeholder="例: 数字インパクト + 逆説"
                  className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">推定インプレッション</label>
                <input
                  type="text"
                  value={form.estimated_impressions}
                  onChange={(e) => setForm((f) => ({ ...f, estimated_impressions: e.target.value }))}
                  placeholder="例: 50K"
                  className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">タグ（カンマ区切り）</label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="例: MNP,乗り換え,キャンペーン"
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
        <p className="py-12 text-center text-sm text-gray-400">競合バズ記録がありません</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const tags = parseTags(item.tags);
            return (
              <div
                key={item.id}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <span className="text-sm font-semibold text-gray-900">{item.account}</span>
                    {item.estimated_impressions && (
                      <span className="ml-2 text-xs text-gray-500">
                        ~{item.estimated_impressions} imp
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{item.created_at?.slice(0, 10) ?? ''}</span>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-xs font-medium text-red-500 hover:text-red-700"
                    >
                      削除
                    </button>
                  </div>
                </div>

                {item.content_summary && (
                  <p className="mb-2 text-sm text-gray-700">{item.content_summary}</p>
                )}

                {item.hook_technique && (
                  <p className="mb-2 text-xs text-purple-600">
                    手法: {item.hook_technique}
                  </p>
                )}

                {tags.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1">
                    {tags.map((tag, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* リライト生成ボタン */}
                <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
                  <button
                    onClick={() => {
                      const rewrite = rewriteFromCompetitor(item);
                      // セッションストレージに下書きデータを保存して投稿エディタに遷移
                      sessionStorage.setItem('draft_from_competitor', JSON.stringify({
                        genre: rewrite.genre,
                        hook_type: rewrite.hookType,
                        hook_text: rewrite.hook,
                        body_text: rewrite.body,
                        source_competitor: item.account,
                      }));
                      if (onNavigate) onNavigate('/posts/new');
                    }}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                  >
                    この投稿をリライトして下書き作成
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(item.content_summary || '');
                      alert('内容をコピーしました');
                    }}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    コピー
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
