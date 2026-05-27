import { Hono } from 'hono';
import type { Env } from '../index.js';
import { jstNow } from '../index.js';

const accounts = new Hono<Env>();

// GET /api/accounts — list all
accounts.get('/', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT * FROM accounts ORDER BY created_at ASC'
    ).all();
    return c.json({ success: true, data: result.results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// POST /api/accounts — create
accounts.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const now = jstNow();

    if (!body.username || !body.display_name) {
      return c.json({ success: false, error: 'username and display_name are required' }, 400);
    }

    await c.env.DB.prepare(
      `INSERT INTO accounts (id, username, display_name, bio, character_definition, genre_config, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      body.username,
      body.display_name,
      body.bio ?? null,
      body.character_definition ?? null,
      body.genre_config ?? null,
      now,
      now
    ).run();

    return c.json({ success: true, data: { id } }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// GET /api/accounts/:id — single
accounts.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const row = await c.env.DB.prepare('SELECT * FROM accounts WHERE id = ?').bind(id).first();
    if (!row) {
      return c.json({ success: false, error: 'Not found' }, 404);
    }
    return c.json({ success: true, data: row });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// PUT /api/accounts/:id — update
accounts.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = jstNow();

    const existing = await c.env.DB.prepare('SELECT id FROM accounts WHERE id = ?').bind(id).first();
    if (!existing) {
      return c.json({ success: false, error: 'Not found' }, 404);
    }

    const fields = ['username', 'display_name', 'bio', 'character_definition', 'genre_config'];
    const setClauses: string[] = [];
    const params: any[] = [];

    for (const field of fields) {
      if (field in body) {
        setClauses.push(`${field} = ?`);
        params.push(body[field]);
      }
    }

    if (setClauses.length === 0) {
      return c.json({ success: false, error: 'No fields to update' }, 400);
    }

    setClauses.push('updated_at = ?');
    params.push(now);
    params.push(id);

    await c.env.DB.prepare(
      `UPDATE accounts SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    return c.json({ success: true, data: { id } });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// DELETE /api/accounts/:id
accounts.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const existing = await c.env.DB.prepare('SELECT id FROM accounts WHERE id = ?').bind(id).first();
    if (!existing) {
      return c.json({ success: false, error: 'Not found' }, 404);
    }

    await c.env.DB.prepare('DELETE FROM accounts WHERE id = ?').bind(id).run();
    return c.json({ success: true, data: { id } });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// POST /api/accounts/seed — seed the two default accounts
accounts.post('/seed', async (c) => {
  try {
    const now = jstNow();
    const db = c.env.DB;

    // Check if accounts already exist
    const existing = await db.prepare('SELECT COUNT(*) as count FROM accounts').first<{ count: number }>();
    if ((existing?.count ?? 0) > 0) {
      return c.json({ success: true, data: { message: 'Accounts already seeded', count: existing?.count } });
    }

    const account1Id = crypto.randomUUID();
    const account2Id = crypto.randomUUID();

    const account1CharDef = JSON.stringify({
      voice: 'masculine casual, bold claims, results-focused',
      story: 'family man who quit to do MNP + high-ticket affiliate, showing rapid growth',
      tone: ['男らしいカジュアル', '大胆な主張', '結果重視', '数字で語る'],
      ng_words: ['努力', '頑張', '感謝', '気づき', '感動', 'いかがでしたか', 'ではないでしょうか', '素晴らしい'],
      persona: {
        origin: '妻子持ちサラリーマン → MNPで副業開始 → 高単価アフィリエイトで爆発',
        enemy: '搾取される側、情報弱者のまま損し続ける状態',
        mission: 'MNPと高単価アフィで「行動すれば誰でも稼げる」を証明',
        belief: '行動量 = 結果。言い訳してる暇があるならやれ。',
      },
    });

    const account1GenreConfig = JSON.stringify({
      genres: [
        { name: 'MNP', priority: 'primary', weekly_target: 17 },
        { name: '高単価アフィ', priority: 'primary', weekly_target: 10 },
        { name: 'ポイ活', priority: 'secondary', weekly_target: 5 },
        { name: '副業', priority: 'secondary', weekly_target: 3 },
      ],
    });

    const account2CharDef = JSON.stringify({
      voice: 'experienced entrepreneur, mentor tone, success story with relatable origins',
      story: 'from underpaid corporate slave with depression to 2億 vintage clothing empire, Korea sourcing tours',
      tone: ['経験者の余裕', 'メンター的', '共感できるストーリー', '具体的な実績'],
      ng_words: ['努力', '頑張', '感謝', '気づき', '感動', 'いかがでしたか', 'ではないでしょうか', '素晴らしい'],
      persona: {
        origin: '会社員時代に低収入&パワハラで鬱 → 副業全敗 → 古着せどりで月収30万 → 脱サラ → 法人化 → 売上累計2億',
        enemy: '低収入・パワハラ・副業で失敗し続ける状態',
        mission: '韓国古着×メルカリで「好きなことで稼ぐ」を実現する方法を教える',
        belief: '正しい方法 × 継続 = 必ず結果が出る。古着は利益率50%以上が当たり前。',
      },
    });

    const account2GenreConfig = JSON.stringify({
      genres: [
        { name: '古着', priority: 'primary', weekly_target: 15 },
        { name: 'メルカリ物販', priority: 'primary', weekly_target: 10 },
        { name: '韓国仕入れ', priority: 'primary', weekly_target: 8 },
        { name: '副業', priority: 'secondary', weekly_target: 3 },
      ],
    });

    await db.batch([
      db.prepare(
        `INSERT INTO accounts (id, username, display_name, bio, character_definition, genre_config, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        account1Id,
        'aosan_mnp',
        'アオさん.@X高単価アフィ×MNP',
        '妻子持ちだけど仕事したくねぇからMNPガチって高単価アフィしとんだわ。開始2日でMNP利益6万円。18日目で高単価アフィ利益45万円。22日目で月利180万円突破。30日で月利220万円←今ここ。バグりすぎてて頭痛い。',
        account1CharDef,
        account1GenreConfig,
        now,
        now
      ),
      db.prepare(
        `INSERT INTO accounts (id, username, display_name, bio, character_definition, genre_config, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        account2Id,
        'yutaka_furugi',
        '長谷川豊@韓国古着×高単価×自動化',
        '【韓国旅行を楽しみながらメルカリ古着物販で稼ぐ】会社員時代に低収入&パワハラで鬱▶︎副業にチャレンジしたが全敗▶︎利益率50%以上が当たり前の古着せどり開始3ヶ月で月収30万▶︎脱サラ▶︎法人化▶古着の売上累計2億円▶古着屋オープン▶︎韓国仕入れツアー開催でアカデミー生が月利100万達成▶︎韓国ノースフェイス爆売れ中！',
        account2CharDef,
        account2GenreConfig,
        now,
        now
      ),
    ]);

    return c.json({
      success: true,
      data: {
        message: 'Seeded 2 accounts',
        accounts: [
          { id: account1Id, username: 'aosan_mnp' },
          { id: account2Id, username: 'yutaka_furugi' },
        ],
      },
    }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

export { accounts };
