import { Hono } from 'hono';
import type { Env } from '../index.js';
import { jstNow } from '../index.js';

const engagement = new Hono<Env>();

// GET /api/engagement — list with optional filters
engagement.get('/', async (c) => {
  try {
    const followerTier = c.req.query('follower_tier');
    const priority = c.req.query('priority');
    const accountId = c.req.query('accountId');

    let sql = 'SELECT * FROM engagement_targets WHERE 1=1';
    const params: string[] = [];

    if (accountId) {
      sql += ' AND account_id = ?';
      params.push(accountId);
    }
    if (followerTier) {
      sql += ' AND follower_tier = ?';
      params.push(followerTier);
    }
    if (priority) {
      sql += ' AND priority = ?';
      params.push(priority);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await c.env.DB.prepare(sql).bind(...params).all();
    return c.json({ success: true, data: result.results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// POST /api/engagement — create
engagement.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const now = jstNow();

    await c.env.DB.prepare(
      `INSERT INTO engagement_targets (id, account_id, username, display_name, follower_tier, priority, notes, last_engaged_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      body.account_id ?? null,
      body.username ?? null,
      body.display_name ?? null,
      body.follower_tier ?? null,
      body.priority ?? null,
      body.notes ?? null,
      body.last_engaged_at ?? null,
      now,
      now
    ).run();

    return c.json({ success: true, data: { id } }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// PUT /api/engagement/:id — update
engagement.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = jstNow();

    const existing = await c.env.DB.prepare(
      'SELECT id FROM engagement_targets WHERE id = ?'
    ).bind(id).first();
    if (!existing) {
      return c.json({ success: false, error: 'Not found' }, 404);
    }

    const fields = [
      'account_id', 'username', 'display_name', 'follower_tier', 'priority', 'notes', 'last_engaged_at',
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

    setClauses.push('updated_at = ?');
    params.push(now);
    params.push(id);

    await c.env.DB.prepare(
      `UPDATE engagement_targets SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    return c.json({ success: true, data: { id } });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// DELETE /api/engagement/:id
engagement.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const existing = await c.env.DB.prepare(
      'SELECT id FROM engagement_targets WHERE id = ?'
    ).bind(id).first();
    if (!existing) {
      return c.json({ success: false, error: 'Not found' }, 404);
    }

    await c.env.DB.prepare('DELETE FROM engagement_targets WHERE id = ?').bind(id).run();
    return c.json({ success: true, data: { id } });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

export { engagement };
