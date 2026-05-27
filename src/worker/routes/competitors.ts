import { Hono } from 'hono';
import type { Env } from '../index.js';
import { jstNow } from '../index.js';

const competitors = new Hono<Env>();

// GET /api/competitors — list ordered by created_at DESC
competitors.get('/', async (c) => {
  try {
    const accountId = c.req.query('accountId');

    let sql = 'SELECT * FROM competitor_buzz WHERE 1=1';
    const params: string[] = [];

    if (accountId) {
      sql += ' AND account_id = ?';
      params.push(accountId);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await c.env.DB.prepare(sql).bind(...params).all();
    return c.json({ success: true, data: result.results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// POST /api/competitors — create
competitors.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const now = jstNow();

    await c.env.DB.prepare(
      `INSERT INTO competitor_buzz (id, account_id, account, post_url, content_summary, hook_technique, estimated_impressions, tags, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      body.account_id ?? null,
      body.account ?? null,
      body.post_url ?? null,
      body.content_summary ?? null,
      body.hook_technique ?? null,
      body.estimated_impressions ?? null,
      body.tags ?? null,
      now
    ).run();

    return c.json({ success: true, data: { id } }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// DELETE /api/competitors/:id
competitors.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const existing = await c.env.DB.prepare(
      'SELECT id FROM competitor_buzz WHERE id = ?'
    ).bind(id).first();
    if (!existing) {
      return c.json({ success: false, error: 'Not found' }, 404);
    }

    await c.env.DB.prepare('DELETE FROM competitor_buzz WHERE id = ?').bind(id).run();
    return c.json({ success: true, data: { id } });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

export { competitors };
