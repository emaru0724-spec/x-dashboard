import { useState, useEffect } from 'react';
import api from '../lib/api';

const GENRES = [
  { value: 'MNP', label: 'MNP' },
  { value: 'スマホ', label: 'スマホ' },
  { value: 'ポイ活', label: 'ポイ活' },
  { value: '速報', label: '速報' },
  { value: '副業', label: '副業' },
  { value: '感情', label: '感情' },
  { value: 'ポスト術', label: 'ポスト術' },
  { value: 'アカウント設計', label: 'アカウント設計' },
  { value: 'マネタイズ', label: 'マネタイズ' },
];

const POST_TYPES = [
  { value: 'type1', label: 'Type1: Howto', desc: 'ノウハウ・手順の解説' },
  { value: 'type2', label: 'Type2: 感情', desc: '感情に訴える共感系' },
  { value: 'type3', label: 'Type3: 一言マインド', desc: '短文の気づき・名言系' },
  { value: 'type4', label: 'Type4: エンゲージ', desc: 'いいね・保存を狙う' },
  { value: 'type5', label: 'Type5: 引用RT', desc: '引用リツイートで拡散' },
  { value: 'type6', label: 'Type6: ペルソナ問題解決', desc: 'ターゲットの悩みを解決' },
  { value: 'type7', label: 'Type7: 過去→今', desc: 'ビフォーアフター' },
  { value: 'type8', label: 'Type8: リプ誘発', desc: 'リプライを促す' },
];

const TYPE_COLORS: Record<string, string> = {
  type1: 'border-blue-400 bg-blue-50 text-blue-700',
  type2: 'border-pink-400 bg-pink-50 text-pink-700',
  type3: 'border-purple-400 bg-purple-50 text-purple-700',
  type4: 'border-orange-400 bg-orange-50 text-orange-700',
  type5: 'border-cyan-400 bg-cyan-50 text-cyan-700',
  type6: 'border-green-400 bg-green-50 text-green-700',
  type7: 'border-amber-400 bg-amber-50 text-amber-700',
  type8: 'border-red-400 bg-red-50 text-red-700',
};

const HOOK_TYPES = [
  { value: 'A', label: 'A: 数字インパクト', example: '「月5万円を3ヶ月で達成した方法」', color: 'border-red-400 bg-red-50 text-red-700' },
  { value: 'B', label: 'B: 逆説・常識破壊', example: '「努力するほど稼げない理由」', color: 'border-purple-400 bg-purple-50 text-purple-700' },
  { value: 'C', label: 'C: 問いかけ', example: '「まだ〇〇してないの？」', color: 'border-blue-400 bg-blue-50 text-blue-700' },
  { value: 'D', label: 'D: 緊急性・限定', example: '「今日までの情報です」', color: 'border-yellow-400 bg-yellow-50 text-yellow-700' },
  { value: 'E', label: 'E: 体験ストーリー', example: '「実際にやってみた結果…」', color: 'border-green-400 bg-green-50 text-green-700' },
  { value: 'F', label: 'F: 権威・実績', example: '「1000人が実践した〜」', color: 'border-orange-400 bg-orange-50 text-orange-700' },
  { value: 'G', label: 'G: 共感・あるある', example: '「〇〇で悩んでませんか？」', color: 'border-pink-400 bg-pink-50 text-pink-700' },
  { value: 'H', label: 'H: リスト・まとめ', example: '「〇〇の5つのポイント」', color: 'border-cyan-400 bg-cyan-50 text-cyan-700' },
];

const CLOSE_TYPES = [
  { value: 'a', label: 'a: CTA直球', desc: 'フォロー・いいね・保存を直接お願い' },
  { value: 'b', label: 'b: 質問投げ', desc: '「あなたはどう？」で対話を誘発' },
  { value: 'c', label: 'c: 余韻', desc: '印象に残る一言で終わる' },
  { value: 'd', label: 'd: 次回予告', desc: '「続きは明日」で期待を作る' },
  { value: 'e', label: 'e: まとめ', desc: '要点を簡潔に振り返る' },
];

const QUALITY_ITEMS = [
  'フックで手が止まるか',
  'ターゲットが明確',
  '内容の深さが主張に見合う',
  '数字が具体的',
  'NGワードなし',
  '本文がフックの主張を裏付ける',
  '締めが投稿意図に合う',
  '文法・改行が正しい',
  '前回とフック型が被っていない',
  '前回と締め型が被っていない',
  'デイリーミックスに合致',
  'ペルソナ一貫性',
  'ヘッジ表現なし',
  '主張ベースのポジショニング',
  'ソースが1つだけ',
];

const STEPS = ['ジャンル・タイプ', 'フック', '本文', '締め', '品質チェック'];

// ── テンプレート生成（API不要） ──────────────────────────────────────────────

const HOOK_TEMPLATES: Record<string, (title: string, genre: string) => string> = {
  A: (t, _g) => `知らないと損する事実。\n${t}\nこれ知ってるだけで数万円変わる。`,
  B: (t, _g) => `常識だと思ってたこと、全部間違いだった。\n${t}\nむしろ逆のことした方がうまくいく理由↓`,
  C: (t, _g) => `まだ知らないの？\n${t}\nこれ知らない人、マジで損してる。`,
  D: (t, _g) => `【速報】これ今だけの情報。\n${t}\n気づいた人から得してる。`,
  E: (t, _g) => `実際にやってみた。\n${t}\n正直、ここまで変わると思わなかった。`,
  F: (t, _g) => `これ、実績ある方法。\n${t}\n再現性が高すぎて怖い。`,
  G: (t, _g) => `これ、俺も同じだった。\n${t}\nでも知ってからマジで人生変わった。`,
  H: (t, _g) => `保存推奨。\n${t}\nまとめたから見てほしい↓`,
};

const BODY_TEMPLATES: Record<string, (content: string, title: string) => string> = {
  type1: (c, _t) => `やり方はシンプル↓\n\n${extractKeyPoints(c)}\n\nこれだけ。5分でできる。`,
  type2: (c, _t) => `正直に言う。\n\n${extractFirstSentences(c, 2)}\n\n同じ気持ちの人、いるよな。\nでも動いた奴だけ変われる。`,
  type3: (_c, t) => `${t}\n\nこれだけ覚えておけば大丈夫。`,
  type4: (c, _t) => `これ、意外と知らない人多い。\n\n${extractFirstSentences(c, 3)}\n\n知ってた？→いいね\n知らなかった→保存`,
  type5: (c, _t) => `これ補足すると↓\n\n${extractFirstSentences(c, 3)}`,
  type6: (c, _t) => `俺も最初は全然ダメだった。\n\nでもこれ知ってから変わった↓\n\n${extractKeyPoints(c)}`,
  type7: (c, _t) => `【過去】何も知らなかった\n【今】${extractFirstSentences(c, 1)}\n\n変わったきっかけ↓\n\n${extractKeyPoints(c)}`,
  type8: (c, _t) => `これ聞きたいんだけど。\n\n${extractFirstSentences(c, 2)}\n\nみんなどうしてる？リプで教えて。`,
};

const CLOSE_TEMPLATES: Record<string, string> = {
  a: '\n\n参考になったらフォロー・いいねしてくれると嬉しい。',
  b: '\n\nあなたはどう思う？リプで教えて。',
  c: '\n\n知るか知らないかで、人生変わる。',
  d: '\n\n明日はもっとヤバい情報出すから、フォローして待ってて。',
  e: '\n\nまとめると、行動した人だけが得する。それだけ。',
};

function extractKeyPoints(content: string): string {
  const lines = content.split(/[。\n]/).filter((l) => l.trim().length > 10);
  const points = lines.slice(0, 5).map((l, i) => `${i + 1}. ${l.trim().replace(/^[-・]/, '').trim()}`);
  return points.join('\n') || content.slice(0, 200);
}

function extractFirstSentences(content: string, count: number): string {
  const sentences = content.split(/[。\n]/).filter((s) => s.trim().length > 5);
  return sentences.slice(0, count).map((s) => s.trim()).join('。\n') + '。';
}

type PostData = {
  genre: string;
  post_type: string;
  hook_type: string;
  close_type: string;
  body: string;
  source: string;
  theme: string;
  quality_checked: number;
  status: string;
};

export default function PostEditor({
  id,
  onNavigate,
  accountId,
}: {
  id?: string;
  onNavigate: (path: string) => void;
  accountId?: string;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<PostData>({
    genre: '',
    post_type: '',
    hook_type: '',
    close_type: '',
    body: '',
    source: '',
    theme: '',
    quality_checked: 0,
    status: 'draft',
  });
  const [hookText, setHookText] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [checks, setChecks] = useState<boolean[]>(new Array(QUALITY_ITEMS.length).fill(false));
  const [knowledgeList, setKnowledgeList] = useState<any[]>([]);
  const [knowledgeSearch, setKnowledgeSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    loadKnowledge();
    if (id) loadPost();
    // 競合リライトからの下書きデータを読み込み
    const draft = sessionStorage.getItem('draft_from_competitor');
    if (draft && !id) {
      try {
        const d = JSON.parse(draft);
        if (d.genre) setForm((f) => ({ ...f, genre: d.genre, hook_type: d.hook_type || '' }));
        if (d.hook_text) setHookText(d.hook_text);
        if (d.body_text) setBodyText(d.body_text);
        if (d.genre && d.hook_type) setStep(1); // フックステップに飛ばす
      } catch {}
      sessionStorage.removeItem('draft_from_competitor');
    }
  }, [id, accountId]);

  async function loadPost() {
    setLoading(true);
    try {
      const data = await api.posts.get(id!);
      if (data) {
        setForm({
          genre: data.genre ?? '',
          post_type: data.post_type ?? '',
          hook_type: data.hook_type ?? '',
          close_type: data.close_type ?? '',
          body: data.body ?? '',
          source: data.source ?? '',
          theme: data.theme ?? '',
          quality_checked: data.quality_checked ?? 0,
          status: data.status ?? 'draft',
        });
        // Parse body to extract hook and body sections
        const fullBody = data.body ?? '';
        const lines = fullBody.split('\n');
        if (lines.length > 0) {
          setHookText(lines[0]);
          setBodyText(lines.slice(1).join('\n').trim());
        }
        if (data.quality_checked) {
          setChecks(new Array(QUALITY_ITEMS.length).fill(true));
        }
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }

  async function loadKnowledge() {
    try {
      const filters: any = {};
      if (accountId) filters.accountId = accountId;
      const data = await api.knowledge.list(Object.keys(filters).length ? filters : undefined);
      setKnowledgeList(data ?? []);
    } catch {
      setKnowledgeList([]);
    }
  }

  const allChecked = checks.every(Boolean);

  function composeFull(): string {
    const parts = [hookText, bodyText].filter(Boolean);
    return parts.join('\n\n');
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        body: composeFull(),
        quality_checked: allChecked ? 1 : 0,
      };
      if (accountId) payload.account_id = accountId;

      if (id) {
        await api.posts.update(id, payload);
      } else {
        await api.posts.create(payload);
      }
      onNavigate('/posts');
    } catch {
      alert('保存に失敗しました');
    }
    setSaving(false);
  }

  function handleTemplateGenerate() {
    // ナレッジからコンテンツ取得
    const selectedKnowledge = knowledgeList.find((k) => k.id === form.source);
    const knowledgeContent = selectedKnowledge?.content || '';
    const knowledgeTitle = selectedKnowledge?.title || form.genre;

    // フック生成
    const hookFn = HOOK_TEMPLATES[form.hook_type] || HOOK_TEMPLATES.A;
    setHookText(hookFn(knowledgeTitle, form.genre));

    // 本文生成
    if (knowledgeContent) {
      const bodyFn = BODY_TEMPLATES[form.post_type] || BODY_TEMPLATES.type1;
      setBodyText(bodyFn(knowledgeContent, knowledgeTitle));
    }

    // 締め自動選択（未選択の場合）
    if (!form.close_type) {
      const closes = ['a', 'b', 'c', 'd', 'e'];
      setForm((f) => ({ ...f, close_type: closes[Math.floor(Math.random() * closes.length)] }));
    }
  }

  const filteredKnowledge = knowledgeList.filter(
    (k) =>
      (!knowledgeSearch ||
        k.title?.toLowerCase().includes(knowledgeSearch.toLowerCase()) ||
        k.content?.toLowerCase().includes(knowledgeSearch.toLowerCase())) &&
      (!form.genre || !k.genre || k.genre === form.genre)
  );

  if (loading) {
    return <p className="py-12 text-center text-sm text-gray-400">読み込み中...</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              step === i
                ? 'bg-green-500 text-white'
                : i < step
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">
              {i < step ? '✓' : i + 1}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {/* Step 1: Genre + Type */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-900">ジャンル</h3>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setForm((f) => ({ ...f, genre: g.value }))}
                    className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                      form.genre === g.value
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-900">投稿タイプ</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {POST_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setForm((f) => ({ ...f, post_type: t.value }))}
                    className={`rounded-lg border-2 p-3 text-left transition-colors ${
                      form.post_type === t.value
                        ? TYPE_COLORS[t.value]
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="mt-0.5 text-xs opacity-70">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(1)}
                disabled={!form.genre || !form.post_type}
                className="rounded-lg bg-green-500 px-6 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-40"
              >
                次へ
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Hook + Knowledge selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-gray-900">フック型を選択</h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {HOOK_TYPES.map((h) => (
                      <button
                        key={h.value}
                        onClick={() => setForm((f) => ({ ...f, hook_type: h.value }))}
                        className={`rounded-lg border-2 p-3 text-left transition-colors ${
                          form.hook_type === h.value ? h.color : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="text-sm font-medium">{h.label}</p>
                        <p className="mt-0.5 text-xs opacity-60">{h.example}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-900">フック文</label>
                    <button
                      onClick={handleTemplateGenerate}
                      disabled={!form.hook_type || !form.source}
                      className="rounded-lg bg-green-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-40"
                    >
                      ナレッジから一括生成
                    </button>
                  </div>
                  {!form.source && (
                    <p className="mb-2 text-xs text-amber-600">右のナレッジを選択すると「ナレッジから一括生成」が使えます</p>
                  )}
                  <textarea
                    value={hookText}
                    onChange={(e) => setHookText(e.target.value)}
                    rows={4}
                    placeholder="フックを入力... または右のナレッジを選んで「一括生成」"
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Knowledge sidebar */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">ナレッジを選択</label>
                <input
                  type="text"
                  value={knowledgeSearch}
                  onChange={(e) => setKnowledgeSearch(e.target.value)}
                  placeholder="検索..."
                  className="mb-2 w-full rounded-lg border border-gray-300 p-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
                <div className="max-h-80 space-y-1 overflow-y-auto">
                  {filteredKnowledge.map((k) => (
                    <button
                      key={k.id}
                      onClick={() => setForm((f) => ({ ...f, source: k.id }))}
                      className={`w-full rounded-lg border p-2 text-left text-xs transition-colors ${
                        form.source === k.id
                          ? 'border-green-400 bg-green-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <p className="font-medium text-gray-800 line-clamp-2">{k.title}</p>
                      <p className="mt-0.5 text-gray-400">{k.genre}</p>
                    </button>
                  ))}
                  {filteredKnowledge.length === 0 && (
                    <p className="py-4 text-center text-xs text-gray-400">ナレッジなし</p>
                  )}
                </div>
                {form.source && (() => {
                  const sel = knowledgeList.find((k) => k.id === form.source);
                  if (!sel) return null;
                  return (
                    <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3">
                      <p className="text-xs font-semibold text-green-800 mb-1">選択中: {sel.title}</p>
                      <p className="text-xs text-green-700 line-clamp-6 whitespace-pre-wrap">{sel.content}</p>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(0)}
                className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                戻る
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!form.hook_type}
                className="rounded-lg bg-green-500 px-6 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-40"
              >
                次へ
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Body */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-gray-900">本文</label>
                <textarea
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  rows={12}
                  placeholder="本文を入力..."
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm leading-relaxed focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-900">ナレッジソース</label>
                </div>
                <p className="mb-2 text-xs text-amber-600">1投稿 = 1ソース</p>
                <input
                  type="text"
                  value={knowledgeSearch}
                  onChange={(e) => setKnowledgeSearch(e.target.value)}
                  placeholder="検索..."
                  className="mb-2 w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  {filteredKnowledge.map((k) => (
                    <button
                      key={k.id}
                      onClick={() => setForm((f) => ({ ...f, source: k.id }))}
                      className={`w-full rounded-lg border p-2 text-left text-xs transition-colors ${
                        form.source === k.id
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <p className="font-medium text-gray-800">{k.title}</p>
                      <p className="mt-0.5 text-gray-500">{k.genre}</p>
                    </button>
                  ))}
                  {filteredKnowledge.length === 0 && (
                    <p className="py-4 text-center text-xs text-gray-400">ナレッジが見つかりません</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                戻る
              </button>
              <button
                onClick={() => setStep(3)}
                className="rounded-lg bg-green-500 px-6 py-2 text-sm font-medium text-white hover:bg-green-600"
              >
                次へ
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Close */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-900">締め型</h3>
              <div className="space-y-2">
                {CLOSE_TYPES.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setForm((f) => ({ ...f, close_type: c.value }))}
                    className={`w-full rounded-lg border-2 p-3 text-left transition-colors ${
                      form.close_type === c.value
                        ? 'border-green-400 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-medium">{c.label}</p>
                    <p className="mt-0.5 text-xs opacity-70">{c.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                戻る
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!form.close_type}
                className="rounded-lg bg-green-500 px-6 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-40"
              >
                次へ
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Quality checklist */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-4 text-sm font-semibold text-gray-900">品質チェックリスト</h3>
              <div className="space-y-2">
                {QUALITY_ITEMS.map((item, i) => (
                  <label
                    key={i}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={checks[i]}
                      onChange={() => {
                        const next = [...checks];
                        next[i] = !next[i];
                        setChecks(next);
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-green-500 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">
                      {i + 1}. {item}
                    </span>
                    {checks[i] && <span className="ml-auto text-green-500">✓</span>}
                  </label>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h4 className="mb-2 text-xs font-semibold text-gray-500 uppercase">プレビュー</h4>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                {composeFull() || '(内容なし)'}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(3)}
                className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                戻る
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  {checks.filter(Boolean).length}/{QUALITY_ITEMS.length} チェック済み
                </span>
                <button
                  onClick={handleSave}
                  disabled={!allChecked || saving}
                  className="rounded-lg bg-green-500 px-6 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-40"
                >
                  {saving ? '保存中...' : id ? '更新' : '保存'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cancel */}
      <div className="text-center">
        <button
          onClick={() => onNavigate('/posts')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          キャンセルして戻る
        </button>
      </div>
    </div>
  );
}
