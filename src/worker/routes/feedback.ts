import { Hono } from 'hono';
import type { Env } from '../index.js';
import { jstNow } from '../index.js';

const feedback = new Hono<Env>();

// GET /api/feedback — list with optional filters
feedback.get('/', async (c) => {
  try {
    const status = c.req.query('status');
    const fromAgent = c.req.query('from_agent');
    const toAgent = c.req.query('to_agent');
    const urgency = c.req.query('urgency');
    const accountId = c.req.query('accountId');

    let sql = 'SELECT * FROM feedback WHERE 1=1';
    const params: string[] = [];

    if (accountId) {
      sql += ' AND account_id = ?';
      params.push(accountId);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (fromAgent) {
      sql += ' AND from_agent = ?';
      params.push(fromAgent);
    }
    if (toAgent) {
      sql += ' AND to_agent = ?';
      params.push(toAgent);
    }
    if (urgency) {
      sql += ' AND urgency = ?';
      params.push(urgency);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await c.env.DB.prepare(sql).bind(...params).all();
    return c.json({ success: true, data: result.results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// POST /api/feedback — create
feedback.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const now = jstNow();

    await c.env.DB.prepare(
      `INSERT INTO feedback (id, account_id, from_agent, to_agent, topic, detail, urgency, genre, status, created_at, resolved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      body.account_id ?? null,
      body.from_agent ?? null,
      body.to_agent ?? null,
      body.topic ?? null,
      body.detail ?? null,
      body.urgency ?? null,
      body.genre ?? null,
      body.status ?? 'pending',
      now,
      null
    ).run();

    return c.json({ success: true, data: { id } }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// PUT /api/feedback/:id — update
feedback.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = jstNow();

    const existing = await c.env.DB.prepare('SELECT id FROM feedback WHERE id = ?').bind(id).first();
    if (!existing) {
      return c.json({ success: false, error: 'Not found' }, 404);
    }

    const fields = [
      'account_id', 'from_agent', 'to_agent', 'topic', 'detail', 'urgency', 'genre', 'status',
    ];

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

    params.push(id);

    await c.env.DB.prepare(
      `UPDATE feedback SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    return c.json({ success: true, data: { id } });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// PATCH /api/feedback/:id/resolve — mark as addressed
feedback.patch('/:id/resolve', async (c) => {
  try {
    const id = c.req.param('id');
    const now = jstNow();

    const existing = await c.env.DB.prepare('SELECT id FROM feedback WHERE id = ?').bind(id).first();
    if (!existing) {
      return c.json({ success: false, error: 'Not found' }, 404);
    }

    await c.env.DB.prepare(
      'UPDATE feedback SET status = ?, resolved_at = ? WHERE id = ?'
    ).bind('addressed', now, id).run();

    return c.json({ success: true, data: { id, status: 'addressed' } });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

export { feedback };
