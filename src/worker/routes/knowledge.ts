import { Hono } from 'hono';
import type { Env } from '../index.js';
import { jstNow } from '../index.js';

const knowledge = new Hono<Env>();

// GET /api/knowledge — list with optional filters
knowledge.get('/', async (c) => {
  try {
    const genre = c.req.query('genre');
    const confidence = c.req.query('confidence');
    const sourceType = c.req.query('source_type');
    const archived = c.req.query('archived');
    const search = c.req.query('search');
    const accountId = c.req.query('accountId');

    let sql = 'SELECT * FROM knowledge WHERE 1=1';
    const params: any[] = [];

    if (accountId) {
      sql += ' AND account_id = ?';
      params.push(accountId);
    }
    if (genre) {
      sql += ' AND genre = ?';
      params.push(genre);
    }
    if (confidence) {
      sql += ' AND confidence = ?';
      params.push(confidence);
    }
    if (sourceType) {
      sql += ' AND source_type = ?';
      params.push(sourceType);
    }
    if (archived !== undefined) {
      sql += ' AND is_archived = ?';
      params.push(parseInt(archived, 10));
    }
    if (search) {
      sql += ' AND title LIKE ?';
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await c.env.DB.prepare(sql).bind(...params).all();
    return c.json({ success: true, data: result.results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// POST /api/knowledge — create
knowledge.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const now = jstNow();

    // Auto-set expires_at to 30 days from now if not provided
    let expiresAt = body.expires_at ?? null;
    if (!expiresAt) {
      const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const expiryJst = new Date(expiry.getTime() + 9 * 60 * 60 * 1000);
      expiresAt = expiryJst.toISOString().replace('Z', '+09:00');
    }

    await c.env.DB.prepare(
      `INSERT INTO knowledge (id, account_id, genre, title, content, source_url, source_type, confidence, expires_at, is_archived, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      body.account_id ?? null,
      body.genre ?? null,
      body.title ?? null,
      body.content ?? null,
      body.source_url ?? null,
      body.source_type ?? null,
      body.confidence ?? 'green',
      expiresAt,
      body.is_archived ?? 0,
      now,
      now
    ).run();

    return c.json({ success: true, data: { id } }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// GET /api/knowledge/:id
knowledge.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const row = await c.env.DB.prepare('SELECT * FROM knowledge WHERE id = ?').bind(id).first();
    if (!row) {
      return c.json({ success: false, error: 'Not found' }, 404);
    }
    return c.json({ success: true, data: row });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// PUT /api/knowledge/:id
knowledge.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = jstNow();

    const existing = await c.env.DB.prepare('SELECT id FROM knowledge WHERE id = ?').bind(id).first();
    if (!existing) {
      return c.json({ success: false, error: 'Not found' }, 404);
    }

    const fields = [
      'account_id', 'genre', 'title', 'content', 'source_url', 'source_type',
      'confidence', 'expires_at', 'is_archived',
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
      `UPDATE knowledge SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    return c.json({ success: true, data: { id } });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// DELETE /api/knowledge/:id
knowledge.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const existing = await c.env.DB.prepare('SELECT id FROM knowledge WHERE id = ?').bind(id).first();
    if (!existing) {
      return c.json({ success: false, error: 'Not found' }, 404);
    }

    await c.env.DB.prepare('DELETE FROM knowledge WHERE id = ?').bind(id).run();
    return c.json({ success: true, data: { id } });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// POST /api/knowledge/archive-expired — mark all expired entries as archived
knowledge.post('/archive-expired', async (c) => {
  try {
    const now = jstNow();

    const result = await c.env.DB.prepare(
      'UPDATE knowledge SET is_archived = 1, updated_at = ? WHERE expires_at <= ? AND is_archived = 0'
    ).bind(now, now).run();

    return c.json({
      success: true,
      data: { archived_count: result.meta.changes ?? 0 },
    });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

export { knowledge };
