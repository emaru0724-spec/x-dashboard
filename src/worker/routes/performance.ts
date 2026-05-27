import { Hono } from 'hono';
import type { Env } from '../index.js';
import { jstNow } from '../index.js';

const performance = new Hono<Env>();

// GET /api/performance — list with optional filters
performance.get('/', async (c) => {
  try {
    const postId = c.req.query('post_id');
    const checkType = c.req.query('check_type');
    const judgment = c.req.query('judgment');
    const accountId = c.req.query('accountId');

    let sql = 'SELECT * FROM performance_logs WHERE 1=1';
    const params: string[] = [];

    if (accountId) {
      sql += ' AND account_id = ?';
      params.push(accountId);
    }
    if (postId) {
      sql += ' AND post_id = ?';
      params.push(postId);
    }
    if (checkType) {
      sql += ' AND check_type = ?';
      params.push(checkType);
    }
    if (judgment) {
      sql += ' AND judgment = ?';
      params.push(judgment);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await c.env.DB.prepare(sql).bind(...params).all();
    return c.json({ success: true, data: result.results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// POST /api/performance — create
performance.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const now = jstNow();

    await c.env.DB.prepare(
      `INSERT INTO performance_logs (id, account_id, post_id, check_type, judgment, impressions, likes, retweets, replies, quotes, diagnosis, improvement, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      body.account_id ?? null,
      body.post_id ?? null,
      body.check_type ?? null,
      body.judgment ?? null,
      body.impressions ?? null,
      body.likes ?? null,
      body.retweets ?? null,
      body.replies ?? null,
      body.quotes ?? null,
      body.diagnosis ?? null,
      body.improvement ?? null,
      now
    ).run();

    return c.json({ success: true, data: { id } }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// GET /api/performance/summary — aggregate stats
performance.get('/summary', async (c) => {
  try {
    const db = c.env.DB;
    const accountId = c.req.query('accountId');

    let postTypeSQL = `SELECT p.post_type, AVG(pl.impressions) as avg_impressions
       FROM performance_logs pl
       JOIN posts p ON pl.post_id = p.id
       WHERE pl.impressions IS NOT NULL AND p.post_type IS NOT NULL`;
    let hookTypeSQL = `SELECT p.hook_type, AVG(pl.impressions) as avg_impressions
       FROM performance_logs pl
       JOIN posts p ON pl.post_id = p.id
       WHERE pl.impressions IS NOT NULL AND p.hook_type IS NOT NULL`;
    let judgmentSQL = `SELECT judgment, COUNT(*) as count
       FROM performance_logs
       WHERE judgment IS NOT NULL`;

    const postTypeParams: string[] = [];
    const hookTypeParams: string[] = [];
    const judgmentParams: string[] = [];

    if (accountId) {
      postTypeSQL += ' AND pl.account_id = ?';
      postTypeParams.push(accountId);
      hookTypeSQL += ' AND pl.account_id = ?';
      hookTypeParams.push(accountId);
      judgmentSQL += ' AND account_id = ?';
      judgmentParams.push(accountId);
    }

    postTypeSQL += ' GROUP BY p.post_type';
    hookTypeSQL += ' GROUP BY p.hook_type';
    judgmentSQL += ' GROUP BY judgment';

    const [avgByPostType, avgByHookType, judgmentDist] = await Promise.all([
      db.prepare(postTypeSQL).bind(...postTypeParams).all(),
      db.prepare(hookTypeSQL).bind(...hookTypeParams).all(),
      db.prepare(judgmentSQL).bind(...judgmentParams).all(),
    ]);

    return c.json({
      success: true,
      data: {
        avg_impressions_by_post_type: avgByPostType.results,
        avg_impressions_by_hook_type: avgByHookType.results,
        judgment_distribution: judgmentDist.results,
      },
    });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

export { performance };
