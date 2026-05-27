import { Hono } from 'hono';
import type { Env } from '../index.js';
import { jstNow } from '../index.js';

const posts = new Hono<Env>();

// GET /api/posts — list with optional filters
posts.get('/', async (c) => {
  try {
    const status = c.req.query('status');
    const postType = c.req.query('post_type');
    const hookType = c.req.query('hook_type');
    const genre = c.req.query('genre');
    const accountId = c.req.query('accountId');

    let sql = 'SELECT * FROM posts WHERE 1=1';
    const params: string[] = [];

    if (accountId) {
      sql += ' AND account_id = ?';
      params.push(accountId);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (postType) {
      sql += ' AND post_type = ?';
      params.push(postType);
    }
    if (hookType) {
      sql += ' AND hook_type = ?';
      params.push(hookType);
    }
    if (genre) {
      sql += ' AND genre = ?';
      params.push(genre);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await c.env.DB.prepare(sql).bind(...params).all();
    return c.json({ success: true, data: result.results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// POST /api/posts — create
posts.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const now = jstNow();

    // Auto-increment post_no (scoped to account if provided)
    let maxSql = 'SELECT COALESCE(MAX(post_no), 0) as max_no FROM posts';
    const maxParams: string[] = [];
    if (body.account_id) {
      maxSql += ' WHERE account_id = ?';
      maxParams.push(body.account_id);
    }
    const maxRow = await c.env.DB.prepare(maxSql).bind(...maxParams).first<{ max_no: number }>();
    const postNo = (maxRow?.max_no ?? 0) + 1;

    await c.env.DB.prepare(
      `INSERT INTO posts (id, account_id, post_no, post_date, post_time, post_type, hook_type, close_type, genre, theme, body, source, quality_checked, status, performance, impressions, engagements, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      body.account_id ?? null,
      postNo,
      body.post_date ?? null,
      body.post_time ?? null,
      body.post_type ?? null,
      body.hook_type ?? null,
      body.close_type ?? null,
      body.genre ?? null,
      body.theme ?? null,
      body.body ?? null,
      body.source ?? null,
      body.quality_checked ?? 0,
      body.status ?? 'draft',
      body.performance ?? null,
      body.impressions ?? null,
      body.engagements ?? null,
      body.notes ?? null,
      now,
      now
    ).run();

    return c.json({ success: true, data: { id, post_no: postNo } }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// GET /api/posts/:id — single
posts.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const row = await c.env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first();
    if (!row) {
      return c.json({ success: false, error: 'Not found' }, 404);
    }
    return c.json({ success: true, data: row });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// PUT /api/posts/:id — update any fields
posts.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = jstNow();

    const existing = await c.env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first();
    if (!existing) {
      return c.json({ success: false, error: 'Not found' }, 404);
    }

    const fields = [
      'account_id', 'post_date', 'post_time', 'post_type', 'hook_type', 'close_type',
      'genre', 'theme', 'body', 'source', 'quality_checked', 'status',
      'performance', 'impressions', 'engagements', 'notes',
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
      `UPDATE posts SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    return c.json({ success: true, data: { id } });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// PATCH /api/posts/:id/status — change status only
posts.patch('/:id/status', async (c) => {
  try {
    const id = c.req.param('id');
    const { status } = await c.req.json();
    const now = jstNow();

    if (!status) {
      return c.json({ success: false, error: 'status is required' }, 400);
    }

    const existing = await c.env.DB.prepare('SELECT id FROM posts WHERE id = ?').bind(id).first();
    if (!existing) {
      return c.json({ success: false, error: 'Not found' }, 404);
    }

    await c.env.DB.prepare(
      'UPDATE posts SET status = ?, updated_at = ? WHERE id = ?'
    ).bind(status, now, id).run();

    return c.json({ success: true, data: { id, status } });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// DELETE /api/posts/:id
posts.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const existing = await c.env.DB.prepare('SELECT id FROM posts WHERE id = ?').bind(id).first();
    if (!existing) {
      return c.json({ success: false, error: 'Not found' }, 404);
    }

    await c.env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
    return c.json({ success: true, data: { id } });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

export { posts };
