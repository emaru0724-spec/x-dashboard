import { Hono } from 'hono';
import type { Env } from '../index.js';

const ai = new Hono<Env>();

const DEFAULT_SYSTEM_PROMPT = `あなたはXアカウントのゴーストライターです。

## 投稿ルール
- 1投稿 = 140文字以内（日本語ベース）
- 具体的な数字を必ず入れる（「月5万」「3ヶ月で」「2分で」など）
- 改行は2回まで
- ハッシュタグは使わない
- URLは入れない

## フック（冒頭）タイプ
- 逆張り: 常識の逆を突く（「〜は実はやめた方がいい」）
- 数字: 具体的数値で始める（「月5万稼ぐのに必要な時間は…」）
- 問いかけ: 読者に質問（「〜って知ってた？」）
- 衝撃: インパクトある事実（「実は〜の9割が…」）
- 共感: あるある系（「〜で悩んでる人、マジで多いよね」）

## クローズ（締め）タイプ
- CTA: 行動を促す（「今すぐ〜してみて」）
- 余韻: 考えさせる（「…って話。」）
- 煽り: 危機感（「これ知らないと損するよ」）
- 宣言: 断定（「これが最適解。」）

## NGワード（絶対使用禁止）
- 努力
- 頑張
- 感謝
- 気づき
- 感動
- 「いかがでしたか」
- 「〜ではないでしょうか」
- 「素晴らしい」`;

function buildSystemPrompt(charDef: any): string {
  if (!charDef) return DEFAULT_SYSTEM_PROMPT;

  let prompt = `あなたはXアカウントのゴーストライターです。\n\n`;

  // Voice / tone
  if (charDef.voice) {
    prompt += `## キャラクターボイス\n${charDef.voice}\n\n`;
  }
  if (charDef.tone && Array.isArray(charDef.tone)) {
    prompt += `## トーン\n${charDef.tone.join('、')}\n\n`;
  }

  // Story / persona
  if (charDef.story) {
    prompt += `## ストーリー\n${charDef.story}\n\n`;
  }
  if (charDef.persona) {
    prompt += `## ペルソナ\n`;
    if (charDef.persona.origin) prompt += `- Origin: ${charDef.persona.origin}\n`;
    if (charDef.persona.enemy) prompt += `- Enemy: ${charDef.persona.enemy}\n`;
    if (charDef.persona.mission) prompt += `- Mission: ${charDef.persona.mission}\n`;
    if (charDef.persona.belief) prompt += `- Belief: ${charDef.persona.belief}\n`;
    prompt += `\n`;
  }

  // NG words
  prompt += `## NGワード（絶対使用禁止）\n`;
  if (charDef.ng_words && Array.isArray(charDef.ng_words)) {
    for (const w of charDef.ng_words) {
      prompt += `- ${w}\n`;
    }
  } else {
    prompt += `- 努力\n- 頑張\n- 感謝\n- 気づき\n- 感動\n- 「いかがでしたか」\n- 「〜ではないでしょうか」\n- 「素晴らしい」\n`;
  }

  prompt += `\n## 投稿ルール
- 1投稿 = 140文字以内（日本語ベース）
- 具体的な数字を必ず入れる（「月5万」「3ヶ月で」「2分で」など）
- 改行は2回まで
- ハッシュタグは使わない
- URLは入れない

## フック（冒頭）タイプ
- 逆張り: 常識の逆を突く
- 数字: 具体的数値で始める
- 問いかけ: 読者に質問
- 衝撃: インパクトある事実
- 共感: あるある系

## クローズ（締め）タイプ
- CTA: 行動を促す
- 余韻: 考えさせる
- 煽り: 危機感
- 宣言: 断定`;

  return prompt;
}

// POST /api/ai/generate-post
ai.post('/generate-post', async (c) => {
  try {
    const apiKey = c.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return c.json({ success: false, error: 'ANTHROPIC_API_KEY is not configured' }, 500);
    }

    const body = await c.req.json();
    const { knowledgeId, postType, genre, hookType, accountId } = body;

    if (!knowledgeId || !postType || !genre) {
      return c.json({
        success: false,
        error: 'knowledgeId, postType, and genre are required',
      }, 400);
    }

    // Fetch knowledge entry
    const knowledgeRow = await c.env.DB.prepare(
      'SELECT * FROM knowledge WHERE id = ?'
    ).bind(knowledgeId).first();

    if (!knowledgeRow) {
      return c.json({ success: false, error: 'Knowledge entry not found' }, 404);
    }

    // Load account's character_definition if accountId is provided
    let systemPrompt = DEFAULT_SYSTEM_PROMPT;
    if (accountId) {
      const accountRow = await c.env.DB.prepare(
        'SELECT character_definition FROM accounts WHERE id = ?'
      ).bind(accountId).first<{ character_definition: string }>();

      if (accountRow?.character_definition) {
        try {
          const charDef = JSON.parse(accountRow.character_definition);
          systemPrompt = buildSystemPrompt(charDef);
        } catch {
          // Use default if parse fails
        }
      }
    }

    const userPrompt = `以下のナレッジを使って、X投稿を生成してください。

## ナレッジ
タイトル: ${knowledgeRow.title}
ジャンル: ${genre}
内容: ${knowledgeRow.content}

## 要件
- 投稿タイプ: ${postType}
- ジャンル: ${genre}
${hookType ? `- フックタイプ: ${hookType}` : '- フックタイプ: 最適なものを選んで'}

## 出力形式（JSON）
{
  "hooks": [
    {"type": "逆張り", "text": "フック文1"},
    {"type": "数字", "text": "フック文2"},
    {"type": "問いかけ", "text": "フック文3"}
  ],
  "body": "本文（フックの後に続く部分）",
  "closeType": "CTA",
  "closeText": "締めの一文"
}

3つの異なるフックパターンを提案し、本文と締めは最も効果的な1パターンで。
必ずJSON形式のみで返してください。`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return c.json({ success: false, error: `Claude API error: ${response.status} ${errText}` }, 502);
    }

    const result = await response.json() as {
      content: Array<{ type: string; text: string }>;
    };

    const text = result.content?.[0]?.text ?? '';

    // Extract JSON from response
    let parsed: any;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
    } catch {
      return c.json({
        success: true,
        data: { raw: text, parse_error: 'Could not parse JSON from response' },
      });
    }

    return c.json({ success: true, data: parsed });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// POST /api/ai/quality-check
ai.post('/quality-check', async (c) => {
  try {
    const reqBody = await c.req.json();
    const postBody = reqBody.body;
    const accountId = reqBody.accountId;

    if (!postBody) {
      return c.json({ success: false, error: 'body is required' }, 400);
    }

    // Load account-specific NG words if available
    let ngWords = ['努力', '頑張', '感謝', '気づき', '感動'];
    if (accountId) {
      const accountRow = await c.env.DB.prepare(
        'SELECT character_definition FROM accounts WHERE id = ?'
      ).bind(accountId).first<{ character_definition: string }>();

      if (accountRow?.character_definition) {
        try {
          const charDef = JSON.parse(accountRow.character_definition);
          if (charDef.ng_words && Array.isArray(charDef.ng_words)) {
            ngWords = charDef.ng_words;
          }
        } catch {
          // Use defaults
        }
      }
    }

    const issues: string[] = [];

    // 1. NG words check
    for (const word of ngWords) {
      if (postBody.includes(word)) {
        issues.push(`NGワード「${word}」が含まれています`);
      }
    }

    // 2. Specific numbers check
    const hasNumbers = /\d+/.test(postBody);
    if (!hasNumbers) {
      issues.push('具体的な数字が含まれていません（月5万、3ヶ月で、等を追加推奨）');
    }

    // 3. Character count check
    const charCount = postBody.length;
    if (charCount > 140) {
      issues.push(`文字数オーバー: ${charCount}文字（140文字以内にしてください）`);
    }

    // 4. Hook strength check (starts with something attention-grabbing)
    const weakStarts = ['こんにちは', 'はじめまして', '今日は', 'お疲れ様'];
    for (const start of weakStarts) {
      if (postBody.startsWith(start)) {
        issues.push(`弱いフック: 「${start}」で始まっています。逆張り・数字・問いかけで始めてください`);
      }
    }

    // 5. AI boilerplate check
    const aiPhrases = ['いかがでしたか', 'ではないでしょうか', '素晴らしい'];
    for (const phrase of aiPhrases) {
      if (postBody.includes(phrase)) {
        issues.push(`AI定型文「${phrase}」が含まれています`);
      }
    }

    // 6. Hashtag check
    if (postBody.includes('#')) {
      issues.push('ハッシュタグが含まれています（使用禁止）');
    }

    // 7. URL check
    if (/https?:\/\//.test(postBody)) {
      issues.push('URLが含まれています（投稿本文にURLは入れない）');
    }

    // 8. Excessive line breaks
    const lineBreaks = (postBody.match(/\n/g) || []).length;
    if (lineBreaks > 2) {
      issues.push(`改行が${lineBreaks}回あります（2回以内にしてください）`);
    }

    return c.json({
      success: true,
      data: {
        passed: issues.length === 0,
        issues,
        char_count: charCount,
      },
    });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

export { ai };
