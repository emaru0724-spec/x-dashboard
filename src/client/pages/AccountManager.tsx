import { useState, useEffect } from 'react';
import api from '../lib/api';

type Account = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  character_definition: string;
  genre_config: string;
  created_at: string;
  updated_at: string;
};

const EMPTY_FORM = {
  username: '',
  display_name: '',
  bio: '',
  character_definition: '',
  genre_config: '',
};

export default function AccountManager({
  onNavigate,
  onAccountsChange,
}: {
  onNavigate: (path: string) => void;
  onAccountsChange: () => void;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    setLoading(true);
    try {
      const data = await api.accounts.list();
      setAccounts(data ?? []);
    } catch {
      setAccounts([]);
    }
    setLoading(false);
  }

  function openAdd() {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  }

  function openEdit(acct: Account) {
    setEditId(acct.id);
    setForm({
      username: acct.username ?? '',
      display_name: acct.display_name ?? '',
      bio: acct.bio ?? '',
      character_definition: acct.character_definition ?? '',
      genre_config: acct.genre_config ?? '',
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.username.trim() || !form.display_name.trim()) {
      alert('ユーザー名と表示名は必須です');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await api.accounts.update(editId, form);
      } else {
        await api.accounts.create(form);
      }
      setShowForm(false);
      loadAccounts();
      onAccountsChange();
    } catch (e: any) {
      alert(`保存に失敗しました: ${e.message}`);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('このアカウントを削除しますか？関連するデータは残りますが、アカウント自体は削除されます。')) return;
    try {
      await api.accounts.delete(id);
      loadAccounts();
      onAccountsChange();
    } catch {
      alert('削除に失敗しました');
    }
  }

  function parseCharDef(raw: string): any {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function parseGenreConfig(raw: string): any {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">アカウント管理</h2>
          <p className="mt-1 text-sm text-gray-500">X アカウントの追加・編集・削除</p>
        </div>
        <button
          onClick={openAdd}
          className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
        >
          + 新規アカウント
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              {editId ? 'アカウント編集' : '新規アカウント'}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    ユーザー名 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center rounded-lg border border-gray-300">
                    <span className="px-3 text-sm text-gray-400">@</span>
                    <input
                      type="text"
                      value={form.username}
                      onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                      placeholder="username"
                      className="w-full rounded-r-lg border-0 p-2 text-sm focus:ring-0 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    表示名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.display_name}
                    onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                    placeholder="表示名"
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">プロフィール</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  rows={3}
                  placeholder="プロフィール文..."
                  className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  キャラクター定義 (JSON)
                </label>
                <p className="mb-1 text-xs text-gray-400">
                  voice, story, tone[], ng_words[], persona (origin, enemy, mission, belief)
                </p>
                <textarea
                  value={form.character_definition}
                  onChange={(e) => setForm((f) => ({ ...f, character_definition: e.target.value }))}
                  rows={8}
                  placeholder='{"voice": "...", "story": "...", "tone": [...], "ng_words": [...], "persona": {...}}'
                  className="w-full rounded-lg border border-gray-300 p-2 font-mono text-xs focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  ジャンル設定 (JSON)
                </label>
                <p className="mb-1 text-xs text-gray-400">
                  genres: [&#123; name, priority, weekly_target &#125;, ...]
                </p>
                <textarea
                  value={form.genre_config}
                  onChange={(e) => setForm((f) => ({ ...f, genre_config: e.target.value }))}
                  rows={4}
                  placeholder='{"genres": [{"name": "MNP", "priority": "primary", "weekly_target": 17}]}'
                  className="w-full rounded-lg border border-gray-300 p-2 font-mono text-xs focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
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
                {saving ? '保存中...' : editId ? '更新' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account cards */}
      {loading ? (
        <p className="py-12 text-center text-sm text-gray-400">読み込み中...</p>
      ) : accounts.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-400">アカウントが登録されていません</p>
          <button
            onClick={openAdd}
            className="mt-4 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
          >
            最初のアカウントを追加
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map((acct) => {
            const charDef = parseCharDef(acct.character_definition);
            const genreConfig = parseGenreConfig(acct.genre_config);
            return (
              <div
                key={acct.id}
                className="rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-lg font-bold text-green-600">
                      {acct.display_name?.[0] ?? '?'}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{acct.display_name}</h3>
                      <p className="text-sm text-gray-500">@{acct.username}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(acct)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(acct.id)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      削除
                    </button>
                  </div>
                </div>

                {/* Bio */}
                {acct.bio && (
                  <p className="mt-3 text-sm text-gray-600 leading-relaxed">{acct.bio}</p>
                )}

                {/* Genre tags */}
                {genreConfig?.genres && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {genreConfig.genres.map((g: any) => (
                      <span
                        key={g.name}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          g.priority === 'primary'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {g.name} ({g.weekly_target}/w)
                      </span>
                    ))}
                  </div>
                )}

                {/* Character voice summary */}
                {charDef && (
                  <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-xs font-medium text-gray-500">キャラクター</p>
                    {charDef.voice && (
                      <p className="mt-1 text-xs text-gray-600">{charDef.voice}</p>
                    )}
                    {charDef.tone && Array.isArray(charDef.tone) && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {charDef.tone.map((t: string) => (
                          <span key={t} className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Metadata */}
                <p className="mt-3 text-xs text-gray-400">
                  作成: {acct.created_at?.slice(0, 10) ?? '-'} | 更新: {acct.updated_at?.slice(0, 10) ?? '-'}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
