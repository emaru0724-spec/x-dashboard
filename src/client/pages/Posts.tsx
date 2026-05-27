import { useState, useEffect } from 'react';
import api from '../lib/api';

const STATUS_OPTIONS = ['', 'draft', 'queued', 'posted', 'rejected'];
const TYPE_OPTIONS = ['', 'type1', 'type2', 'type3', 'type4', 'type5', 'type6', 'type7', 'type8'];
const GENRE_OPTIONS = ['', 'MNP', 'スマホ', 'ポイ活', '速報', '副業', '感情', 'ポスト術', 'アカウント設計', 'マネタイズ'];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  queued: 'bg-yellow-100 text-yellow-700',
  posted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const TYPE_COLORS: Record<string, string> = {
  type1: 'bg-blue-100 text-blue-700',
  type2: 'bg-pink-100 text-pink-700',
  type3: 'bg-purple-100 text-purple-700',
  type4: 'bg-orange-100 text-orange-700',
  type5: 'bg-cyan-100 text-cyan-700',
  type6: 'bg-green-100 text-green-700',
  type7: 'bg-amber-100 text-amber-700',
  type8: 'bg-red-100 text-red-700',
};

const TYPE_LABELS: Record<string, string> = {
  type1: 'Howto',
  type2: '感情',
  type3: '一言マインド',
  type4: 'エンゲージ',
  type5: '引用RT',
  type6: 'ペルソナ問題解決',
  type7: '過去→今',
  type8: 'リプ誘発',
};

const HOOK_COLORS: Record<string, string> = {
  A: 'bg-red-100 text-red-700',
  B: 'bg-purple-100 text-purple-700',
  C: 'bg-blue-100 text-blue-700',
  D: 'bg-yellow-100 text-yellow-700',
  E: 'bg-green-100 text-green-700',
  F: 'bg-orange-100 text-orange-700',
  G: 'bg-pink-100 text-pink-700',
  H: 'bg-cyan-100 text-cyan-700',
};

const STATUS_FLOW: Record<string, string> = {
  draft: 'queued',
  queued: 'posted',
};

export default function Posts({
  onNavigate,
  accountId,
}: {
  onNavigate: (path: string) => void;
  accountId?: string;
}) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', post_type: '', genre: '' });

  useEffect(() => {
    loadPosts();
  }, [filters, accountId]);

  async function loadPosts() {
    setLoading(true);
    try {
      const f: any = {};
      if (filters.status) f.status = filters.status;
      if (filters.post_type) f.post_type = filters.post_type;
      if (filters.genre) f.genre = filters.genre;
      if (accountId) f.accountId = accountId;
      const data = await api.posts.list(Object.keys(f).length ? f : undefined);
      setPosts(data ?? []);
    } catch {
      setPosts([]);
    }
    setLoading(false);
  }

  async function handleStatusChange(e: React.MouseEvent, id: string, newStatus: string) {
    e.stopPropagation();
    try {
      await api.posts.updateStatus(id, newStatus);
      loadPosts();
    } catch {}
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm('この投稿を削除しますか？')) return;
    try {
      await api.posts.delete(id);
      loadPosts();
    } catch {
      alert('削除に失敗しました');
    }
  }

  function handleCopy(e: React.MouseEvent, body: string) {
    e.stopPropagation();
    navigator.clipboard.writeText(body || '');
    alert('本文をコピーしました');
  }

  return (
    <div className="space-y-4">
      {/* Filter bar + new button */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
        >
          <option value="">全ステータス</option>
          {STATUS_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filters.post_type}
          onChange={(e) => setFilters((f) => ({ ...f, post_type: e.target.value }))}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
        >
          <option value="">全タイプ</option>
          {TYPE_OPTIONS.filter(Boolean).map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>
          ))}
        </select>
        <select
          value={filters.genre}
          onChange={(e) => setFilters((f) => ({ ...f, genre: e.target.value }))}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
        >
          <option value="">全ジャンル</option>
          {GENRE_OPTIONS.filter(Boolean).map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <div className="flex-1" />
        <button
          onClick={() => onNavigate('/posts/new')}
          className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
        >
          + 新規投稿
        </button>
      </div>

      {/* Posts grid */}
      {loading ? (
        <p className="py-12 text-center text-sm text-gray-400">読み込み中...</p>
      ) : posts.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-400">投稿がありません</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => (
            <div
              key={post.id}
              onClick={() => onNavigate(`/posts/${post.id}`)}
              className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
            >
              {/* Badges row */}
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {post.post_type && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      TYPE_COLORS[post.post_type] ?? 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {TYPE_LABELS[post.post_type] ?? post.post_type}
                  </span>
                )}
                {post.hook_type && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      HOOK_COLORS[post.hook_type] ?? 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Hook {post.hook_type}
                  </span>
                )}
                {post.genre && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {post.genre}
                  </span>
                )}
              </div>

              {/* Body preview */}
              <p className="mb-3 text-sm leading-relaxed text-gray-700">
                {post.body
                  ? post.body.slice(0, 100) + (post.body.length > 100 ? '...' : '')
                  : '(本文なし)'}
              </p>

              {/* Status + date */}
              <div className="mb-3 flex items-center justify-between">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    STATUS_COLORS[post.status] ?? 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {post.status}
                </span>
                <span className="text-xs text-gray-400">
                  {post.post_date ?? post.created_at?.slice(0, 10) ?? ''}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 border-t border-gray-100 pt-3">
                {post.status === 'draft' && (
                  <button
                    onClick={(e) => handleStatusChange(e, post.id, 'queued')}
                    className="rounded-lg bg-yellow-50 border border-yellow-200 px-2.5 py-1 text-xs font-medium text-yellow-700 hover:bg-yellow-100"
                  >
                    キューに追加
                  </button>
                )}
                {post.status === 'queued' && (
                  <button
                    onClick={(e) => handleStatusChange(e, post.id, 'posted')}
                    className="rounded-lg bg-green-50 border border-green-200 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                  >
                    投稿済みにする
                  </button>
                )}
                {(post.status === 'draft' || post.status === 'queued') && (
                  <button
                    onClick={(e) => handleStatusChange(e, post.id, 'rejected')}
                    className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50"
                  >
                    却下
                  </button>
                )}
                <button
                  onClick={(e) => handleCopy(e, post.body)}
                  className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50"
                >
                  コピー
                </button>
                <div className="flex-1" />
                <button
                  onClick={(e) => handleDelete(e, post.id)}
                  className="rounded-lg px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-50 hover:text-red-600"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
