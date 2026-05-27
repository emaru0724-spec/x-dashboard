import { useState, useEffect } from 'react';
import api from '../lib/api';

const GENRE_TABS = ['すべて', 'MNP', 'スマホ', 'ポイ活', '副業', '速報', 'ポスト術', 'アカウント設計', 'マネタイズ'];

const SOURCE_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  note: 'note',
  web: 'Web',
  official: '公式',
  news: 'ニュース',
  celebrity: 'セレブ',
};

const CONFIDENCE_BADGE: Record<string, { icon: string; bg: string; text: string }> = {
  green: { icon: '\u{1F7E2}', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  yellow: { icon: '\u{1F7E1}', bg: 'bg-amber-100', text: 'text-amber-700' },
  red: { icon: '\u{1F534}', bg: 'bg-red-100', text: 'text-red-700' },
};

function daysUntilExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const now = new Date();
  const exp = new Date(expiresAt);
  return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function Knowledge({
  onNavigate,
  accountId,
}: {
  onNavigate: (path: string) => void;
  accountId?: string;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGenre, setActiveGenre] = useState('すべて');
  const [search, setSearch] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState('');
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeGenre, confidenceFilter, search, accountId]);

  async function loadData() {
    setLoading(true);
    try {
      const filters: any = {};
      if (activeGenre !== 'すべて') filters.genre = activeGenre;
      if (confidenceFilter) filters.confidence = confidenceFilter;
      if (search) filters.search = search;
      if (accountId) filters.accountId = accountId;
      const data = await api.knowledge.list(Object.keys(filters).length ? filters : undefined);
      setItems(data ?? []);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }

  async function handleArchive() {
    setArchiving(true);
    try {
      await api.knowledge.archiveExpired();
      loadData();
    } catch {
      alert('アーカイブに失敗しました');
    }
    setArchiving(false);
  }

  return (
    <div className="space-y-4">
      {/* Genre tabs */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg bg-gray-100 p-1">
        {GENRE_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveGenre(tab)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeGenre === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="検索..."
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
        <div className="flex gap-1">
          {['', 'green', 'yellow', 'red'].map((c) => (
            <button
              key={c}
              onClick={() => setConfidenceFilter(c)}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                confidenceFilter === c
                  ? 'border-blue-400 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {c === '' ? 'すべて' : CONFIDENCE_BADGE[c]?.icon ?? c}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button
          onClick={handleArchive}
          disabled={archiving}
          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {archiving ? '処理中...' : '期限切れをアーカイブ'}
        </button>
        <button
          onClick={() => onNavigate('/knowledge/new')}
          className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
        >
          + 新規追加
        </button>
      </div>

      {/* Cards */}
      {loading ? (
        <p className="py-12 text-center text-sm text-gray-400">読み込み中...</p>
      ) : items.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-400">ナレッジがありません</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const days = daysUntilExpiry(item.expires_at);
            const conf = CONFIDENCE_BADGE[item.confidence] ?? CONFIDENCE_BADGE.green;
            return (
              <div
                key={item.id}
                onClick={() => onNavigate(`/knowledge/${item.id}`)}
                className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
              >
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${conf.bg} ${conf.text}`}>
                    {conf.icon}
                  </span>
                </div>

                <div className="mb-3 flex flex-wrap gap-2">
                  {item.genre && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {item.genre}
                    </span>
                  )}
                  {item.source_type && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {SOURCE_LABELS[item.source_type] ?? item.source_type}
                    </span>
                  )}
                </div>

                {days !== null && (
                  <p
                    className={`text-xs font-medium ${
                      days <= 0
                        ? 'text-red-600'
                        : days <= 3
                          ? 'text-red-500'
                          : 'text-gray-500'
                    }`}
                  >
                    {days <= 0 ? '\u26D4 期限切れ' : days <= 3 ? `\u26A0\uFE0F 残り${days}日` : `残り${days}日`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
