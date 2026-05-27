import { useState, useEffect } from 'react';
import api from '../lib/api';

const GENRE_OPTIONS = ['MNP', 'スマホ', 'ポイ活', '副業', '速報'];
const SOURCE_TYPES = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'note', label: 'note' },
  { value: 'web', label: 'Web' },
  { value: 'official', label: '公式' },
  { value: 'news', label: 'ニュース' },
  { value: 'celebrity', label: 'セレブ' },
];
const CONFIDENCE_OPTIONS = [
  { value: 'green', label: '高信頼', icon: '\u{1F7E2}', color: 'border-emerald-400 bg-emerald-50 text-emerald-700' },
  { value: 'yellow', label: '要確認', icon: '\u{1F7E1}', color: 'border-amber-400 bg-amber-50 text-amber-700' },
  { value: 'red', label: '低信頼', icon: '\u{1F534}', color: 'border-red-400 bg-red-50 text-red-700' },
];

function defaultExpiry(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

type FormData = {
  title: string;
  genre: string;
  content: string;
  source_url: string;
  source_type: string;
  confidence: string;
  expires_at: string;
};

export default function KnowledgeEditor({
  id,
  onNavigate,
  accountId,
}: {
  id?: string;
  onNavigate: (path: string) => void;
  accountId?: string;
}) {
  const [form, setForm] = useState<FormData>({
    title: '',
    genre: '',
    content: '',
    source_url: '',
    source_type: '',
    confidence: 'green',
    expires_at: defaultExpiry(),
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (id) loadItem();
  }, [id]);

  async function loadItem() {
    setLoading(true);
    try {
      const data = await api.knowledge.get(id!);
      if (data) {
        setForm({
          title: data.title ?? '',
          genre: data.genre ?? '',
          content: data.content ?? '',
          source_url: data.source_url ?? '',
          source_type: data.source_type ?? '',
          confidence: data.confidence ?? 'green',
          expires_at: data.expires_at?.slice(0, 10) ?? defaultExpiry(),
        });
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      alert('タイトルを入力してください');
      return;
    }
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (accountId) payload.account_id = accountId;

      if (id) {
        await api.knowledge.update(id, payload);
      } else {
        await api.knowledge.create(payload);
      }
      onNavigate('/knowledge');
    } catch {
      alert('保存に失敗しました');
    }
    setSaving(false);
  }

  const set = (key: keyof FormData, value: string) => setForm((f) => ({ ...f, [key]: value }));

  if (loading) {
    return <p className="py-12 text-center text-sm text-gray-400">読み込み中...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
        {/* Title */}
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-900">タイトル</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="ナレッジのタイトル"
            className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Genre */}
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-900">ジャンル</label>
          <select
            value={form.genre}
            onChange={(e) => set('genre', e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">選択してください</option>
            {GENRE_OPTIONS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Content */}
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-900">内容</label>
          <textarea
            value={form.content}
            onChange={(e) => set('content', e.target.value)}
            rows={10}
            placeholder="ナレッジの内容を入力..."
            className="w-full rounded-lg border border-gray-300 p-3 text-sm leading-relaxed focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Source URL */}
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-900">ソースURL</label>
          <input
            type="url"
            value={form.source_url}
            onChange={(e) => set('source_url', e.target.value)}
            placeholder="https://..."
            className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Source type */}
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-900">ソースタイプ</label>
          <select
            value={form.source_type}
            onChange={(e) => set('source_type', e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">選択してください</option>
            {SOURCE_TYPES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Confidence */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-900">信頼度</label>
          <div className="flex gap-2">
            {CONFIDENCE_OPTIONS.map((c) => (
              <button
                key={c.value}
                onClick={() => set('confidence', c.value)}
                className={`flex-1 rounded-lg border-2 p-3 text-center text-sm font-medium transition-colors ${
                  form.confidence === c.value ? c.color : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {c.icon} {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Expiry date */}
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-900">有効期限</label>
          <input
            type="date"
            value={form.expires_at}
            onChange={(e) => set('expires_at', e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-400">デフォルト: 今日から30日後</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => onNavigate('/knowledge')}
          className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          キャンセル
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-blue-500 px-6 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {saving ? '保存中...' : id ? '更新' : '保存'}
        </button>
      </div>
    </div>
  );
}
