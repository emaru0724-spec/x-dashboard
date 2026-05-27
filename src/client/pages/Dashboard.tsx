import { useState, useEffect } from 'react';
import api from '../lib/api';

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

export default function Dashboard({
  onNavigate,
  accountId,
}: {
  onNavigate: (path: string) => void;
  accountId?: string;
}) {
  const [dailyStats, setDailyStats] = useState<any>(null);
  const [weeklyStats, setWeeklyStats] = useState<any>(null);
  const [pendingFB, setPendingFB] = useState<number>(0);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [accountId]);

  async function loadData() {
    setLoading(true);
    try {
      const [daily, weekly, fbData, postsData] = await Promise.allSettled([
        api.stats.daily(accountId),
        api.stats.weekly(accountId),
        api.stats.pendingFeedback(accountId),
        api.posts.list(accountId ? { accountId } : undefined),
      ]);
      if (daily.status === 'fulfilled') setDailyStats(daily.value);
      if (weekly.status === 'fulfilled') setWeeklyStats(weekly.value);
      if (fbData.status === 'fulfilled') setPendingFB(fbData.value?.pending_count ?? 0);
      if (postsData.status === 'fulfilled') setRecentPosts((postsData.value ?? []).slice(0, 5));
    } catch {
      // silently handle
    }
    setLoading(false);
  }

  const todayCount = dailyStats?.total ?? 0;
  const expiredKnowledge = dailyStats?.expired_knowledge ?? 0;

  // Build weekly targets from stats response
  const weeklyTargets = weeklyStats?.target_comparison ?? [];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">今日の投稿</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {loading ? '-' : todayCount}
                <span className="text-lg font-normal text-gray-400">/5</span>
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-2xl">
              ✏️
            </div>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-gray-100">
            <div
              className="h-2 rounded-full bg-green-500 transition-all"
              style={{ width: `${Math.min((todayCount / 5) * 100, 100)}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">未対応FB数</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{loading ? '-' : pendingFB}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-2xl">
              💬
            </div>
          </div>
          {pendingFB > 0 && (
            <p className="mt-3 text-xs font-medium text-amber-600">要対応</p>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">期限切れナレッジ数</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{loading ? '-' : expiredKnowledge}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-2xl">
              📚
            </div>
          </div>
          {expiredKnowledge > 0 && (
            <p className="mt-3 text-xs font-medium text-red-600">更新が必要</p>
          )}
        </div>
      </div>

      {/* Weekly genre progress */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">週間ジャンル進捗</h2>
        <div className="space-y-4">
          {weeklyTargets.length > 0 ? (
            weeklyTargets.map((g: any) => {
              const pct = Math.min((g.current / g.target_min) * 100, 100);
              return (
                <div key={g.genre}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{g.genre}</span>
                    <span className="text-gray-500">
                      {g.current}/{g.target_min}
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-gray-100">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        g.on_track ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-400">データなし</p>
          )}
        </div>
      </div>

      {/* Recent posts */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">最近の投稿</h2>
          <button
            onClick={() => onNavigate('/posts')}
            className="text-sm font-medium text-green-600 hover:text-green-700"
          >
            すべて見る
          </button>
        </div>
        {loading ? (
          <p className="py-8 text-center text-sm text-gray-400">読み込み中...</p>
        ) : recentPosts.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">投稿がありません</p>
        ) : (
          <div className="space-y-3">
            {recentPosts.map((post) => (
              <button
                key={post.id}
                onClick={() => onNavigate(`/posts/${post.id}`)}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-100 p-3 text-left transition-colors hover:bg-gray-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {post.body ? post.body.slice(0, 60) + (post.body.length > 60 ? '...' : '') : '(本文なし)'}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    {post.post_type && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          TYPE_COLORS[post.post_type] ?? 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {TYPE_LABELS[post.post_type] ?? post.post_type}
                      </span>
                    )}
                    {post.genre && (
                      <span className="text-xs text-gray-400">{post.genre}</span>
                    )}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    STATUS_COLORS[post.status] ?? 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {post.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
