import { useState, useEffect } from 'react';
import api from '../lib/api';

export default function Settings({ accountId }: { accountId?: string }) {
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accountId) {
      loadAccount();
    } else {
      setAccount(null);
      setLoading(false);
    }
  }, [accountId]);

  async function loadAccount() {
    setLoading(true);
    try {
      const data = await api.accounts.get(accountId!);
      setAccount(data);
    } catch {
      setAccount(null);
    }
    setLoading(false);
  }

  if (loading) {
    return <p className="py-12 text-center text-sm text-gray-400">読み込み中...</p>;
  }

  // Parse character definition
  let charDef: any = null;
  if (account?.character_definition) {
    try {
      charDef = JSON.parse(account.character_definition);
    } catch {
      // ignore
    }
  }

  // Parse genre config
  let genreConfig: any = null;
  if (account?.genre_config) {
    try {
      genreConfig = JSON.parse(account.genre_config);
    } catch {
      // ignore
    }
  }

  if (!account) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-lg font-semibold text-gray-900">アカウント未選択</p>
          <p className="mt-2 text-sm text-gray-500">
            サイドバーからアカウントを選択するか、アカウント管理ページで新しいアカウントを追加してください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Character definition */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">キャラクター定義</h2>

        <div className="mb-4 rounded-lg bg-gray-50 p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-500">アカウント:</span>
              <span className="ml-2 text-gray-900">@{account.username}</span>
            </div>
            <div>
              <span className="font-medium text-gray-500">名前:</span>
              <span className="ml-2 text-gray-900">{account.display_name}</span>
            </div>
          </div>
          {account.bio && (
            <p className="mt-3 text-sm text-gray-600 leading-relaxed">{account.bio}</p>
          )}
        </div>

        {charDef ? (
          <>
            {/* Story elements / persona */}
            {charDef.persona && (
              <>
                <h3 className="mb-2 text-sm font-semibold text-gray-700">ストーリー要素</h3>
                <div className="mb-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-3 py-2 font-medium text-gray-500">要素</th>
                        <th className="px-3 py-2 font-medium text-gray-500">内容</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700">
                      {charDef.persona.origin && (
                        <tr className="border-b border-gray-50">
                          <td className="px-3 py-2 font-medium">Origin</td>
                          <td className="px-3 py-2">{charDef.persona.origin}</td>
                        </tr>
                      )}
                      {charDef.persona.enemy && (
                        <tr className="border-b border-gray-50">
                          <td className="px-3 py-2 font-medium">Enemy</td>
                          <td className="px-3 py-2">{charDef.persona.enemy}</td>
                        </tr>
                      )}
                      {charDef.persona.mission && (
                        <tr className="border-b border-gray-50">
                          <td className="px-3 py-2 font-medium">Mission</td>
                          <td className="px-3 py-2">{charDef.persona.mission}</td>
                        </tr>
                      )}
                      {charDef.persona.belief && (
                        <tr className="border-b border-gray-50">
                          <td className="px-3 py-2 font-medium">Belief</td>
                          <td className="px-3 py-2">{charDef.persona.belief}</td>
                        </tr>
                      )}
                      {charDef.voice && (
                        <tr className="border-b border-gray-50">
                          <td className="px-3 py-2 font-medium">Voice</td>
                          <td className="px-3 py-2">{charDef.voice}</td>
                        </tr>
                      )}
                      {charDef.story && (
                        <tr className="border-b border-gray-50">
                          <td className="px-3 py-2 font-medium">Story</td>
                          <td className="px-3 py-2">{charDef.story}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Voice characteristics / tone */}
            {charDef.tone && Array.isArray(charDef.tone) && (
              <>
                <h3 className="mb-2 text-sm font-semibold text-gray-700">声のトーン</h3>
                <div className="mb-4 flex flex-wrap gap-2">
                  {charDef.tone.map((v: string) => (
                    <span key={v} className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                      {v}
                    </span>
                  ))}
                </div>
              </>
            )}

            {/* NG words */}
            {charDef.ng_words && Array.isArray(charDef.ng_words) && (
              <>
                <h3 className="mb-2 text-sm font-semibold text-gray-700">NGワード</h3>
                <div className="flex flex-wrap gap-2">
                  {charDef.ng_words.map((w: string) => (
                    <span key={w} className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                      {w}
                    </span>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
            <p className="text-sm font-medium text-amber-700">未設定</p>
            <p className="mt-1 text-xs text-amber-600">
              アカウント管理ページでキャラクター定義（JSON）を設定してください。
            </p>
          </div>
        )}
      </section>

      {/* Genre config */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">ジャンル設定</h2>
        {genreConfig?.genres && Array.isArray(genreConfig.genres) ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-3 py-2 font-medium text-gray-500">ジャンル</th>
                  <th className="px-3 py-2 font-medium text-gray-500">優先度</th>
                  <th className="px-3 py-2 font-medium text-gray-500">週間目標</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {genreConfig.genres.map((g: any) => (
                  <tr key={g.name} className="border-b border-gray-50">
                    <td className="px-3 py-2 font-medium">{g.name}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          g.priority === 'primary'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {g.priority}
                      </span>
                    </td>
                    <td className="px-3 py-2">{g.weekly_target}/週</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
            <p className="text-sm font-medium text-amber-700">未設定</p>
            <p className="mt-1 text-xs text-amber-600">
              アカウント管理ページでジャンル設定（JSON）を設定してください。
            </p>
          </div>
        )}
      </section>

      {/* Posting rules — static reference */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">投稿ルール</h2>

        {/* Hook types A-H */}
        <h3 className="mb-2 text-sm font-semibold text-gray-700">フック型 A-H</h3>
        <div className="mb-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-3 py-2 font-medium text-gray-500">型</th>
                <th className="px-3 py-2 font-medium text-gray-500">名称</th>
                <th className="px-3 py-2 font-medium text-gray-500">特徴</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {[
                { type: 'A', name: '数字インパクト', desc: '具体的な数字で驚きを与える。実績・期間・金額。', color: 'bg-red-100 text-red-700' },
                { type: 'B', name: '逆説・常識破壊', desc: '「普通はこうだけど実は…」で認知を揺さぶる。', color: 'bg-purple-100 text-purple-700' },
                { type: 'C', name: '問いかけ', desc: '質問形式で「自分のことだ」と思わせる。', color: 'bg-blue-100 text-blue-700' },
                { type: 'D', name: '緊急性・限定', desc: '今読まないと損、期限付き情報。', color: 'bg-yellow-100 text-yellow-700' },
                { type: 'E', name: '体験ストーリー', desc: '実体験で始めて信頼を得る。', color: 'bg-green-100 text-green-700' },
                { type: 'F', name: '権威・実績', desc: '数字や社会的証明で説得力を持たせる。', color: 'bg-orange-100 text-orange-700' },
                { type: 'G', name: '共感・あるある', desc: 'ターゲットの悩み・日常を代弁。', color: 'bg-pink-100 text-pink-700' },
                { type: 'H', name: 'リスト・まとめ', desc: '「〇選」「〇つのポイント」で整理。', color: 'bg-cyan-100 text-cyan-700' },
              ].map((h) => (
                <tr key={h.type} className="border-b border-gray-50">
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${h.color}`}>{h.type}</span>
                  </td>
                  <td className="px-3 py-2 font-medium">{h.name}</td>
                  <td className="px-3 py-2">{h.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Close types a-e */}
        <h3 className="mb-2 text-sm font-semibold text-gray-700">締め型 a-e</h3>
        <div className="mb-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-3 py-2 font-medium text-gray-500">型</th>
                <th className="px-3 py-2 font-medium text-gray-500">名称</th>
                <th className="px-3 py-2 font-medium text-gray-500">用途</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {[
                { type: 'a', name: 'CTA直球', desc: 'フォロー・いいね・保存を直接お願いする' },
                { type: 'b', name: '質問投げ', desc: '「あなたはどう思う？」でリプライを誘発' },
                { type: 'c', name: '余韻', desc: '印象に残る一言で読後感を作る' },
                { type: 'd', name: '次回予告', desc: '「続きは明日」でフォロー維持' },
                { type: 'e', name: 'まとめ', desc: '要点を簡潔に振り返って締める' },
              ].map((c) => (
                <tr key={c.type} className="border-b border-gray-50">
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {c.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-medium">{c.name}</td>
                  <td className="px-3 py-2">{c.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Post types 1-8 */}
        <h3 className="mb-2 text-sm font-semibold text-gray-700">投稿タイプ 1-8</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-3 py-2 font-medium text-gray-500">Type</th>
                <th className="px-3 py-2 font-medium text-gray-500">名称</th>
                <th className="px-3 py-2 font-medium text-gray-500">目的</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {[
                { type: '1', name: 'Howto', desc: 'ノウハウ・手順の解説で信頼構築', color: 'bg-blue-100 text-blue-700' },
                { type: '2', name: '感情', desc: '感情に訴える共感系で親近感', color: 'bg-pink-100 text-pink-700' },
                { type: '3', name: '一言マインド', desc: '短文の気づき・名言で印象に残す', color: 'bg-purple-100 text-purple-700' },
                { type: '4', name: 'エンゲージ', desc: 'いいね・保存を狙ってアルゴリズムを味方に', color: 'bg-orange-100 text-orange-700' },
                { type: '5', name: '引用RT', desc: '引用リツイートで他アカウントとの接点作り', color: 'bg-cyan-100 text-cyan-700' },
                { type: '6', name: 'ペルソナ問題解決', desc: 'ターゲットの具体的な悩みに回答', color: 'bg-green-100 text-green-700' },
                { type: '7', name: '過去→今', desc: 'ビフォーアフターで変化を見せる', color: 'bg-amber-100 text-amber-700' },
                { type: '8', name: 'リプ誘発', desc: 'リプライを促してエンゲージメントUP', color: 'bg-red-100 text-red-700' },
              ].map((t) => (
                <tr key={t.type} className="border-b border-gray-50">
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.color}`}>
                      Type{t.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-medium">{t.name}</td>
                  <td className="px-3 py-2">{t.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
