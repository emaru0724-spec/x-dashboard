import { Hono } from 'hono';
import type { Env } from '../index.js';

const stats = new Hono<Env>();

// Helper: get today's date in JST (YYYY-MM-DD)
function jstToday(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

// Helper: get Monday of current week in JST (YYYY-MM-DD)
function jstWeekStart(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = jst.getUTCDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0 offset
  jst.setUTCDate(jst.getUTCDate() - diff);
  return jst.toISOString().slice(0, 10);
}

// GET /api/stats/daily — today's post count, by genre, by status
stats.get('/daily', async (c) => {
  try {
    const today = jstToday();
    const db = c.env.DB;
    const accountId = c.req.query('accountId');

    let totalSQL = "SELECT COUNT(*) as count FROM posts WHERE (post_date = ? OR created_at LIKE ?)";
    let genreSQL = `SELECT genre, COUNT(*) as count FROM posts
       WHERE (post_date = ? OR created_at LIKE ?)`;
    let statusSQL = `SELECT status, COUNT(*) as count FROM posts
       WHERE (post_date = ? OR created_at LIKE ?)`;

    const totalParams: any[] = [today, `${today}%`];
    const genreParams: any[] = [today, `${today}%`];
    const statusParams: any[] = [today, `${today}%`];

    if (accountId) {
      totalSQL += ' AND account_id = ?';
      totalParams.push(accountId);
      genreSQL += ' AND account_id = ?';
      genreParams.push(accountId);
      statusSQL += ' AND account_id = ?';
      statusParams.push(accountId);
    }

    genreSQL += ' GROUP BY genre';
    statusSQL += ' GROUP BY status';

    const [totalRow, byGenre, byStatus] = await Promise.all([
      db.prepare(totalSQL).bind(...totalParams).first<{ count: number }>(),
      db.prepare(genreSQL).bind(...genreParams).all(),
      db.prepare(statusSQL).bind(...statusParams).all(),
    ]);

    return c.json({
      success: true,
      data: {
        date: today,
        total: totalRow?.count ?? 0,
        by_genre: byGenre.results,
        by_status: byStatus.results,
      },
    });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// GET /api/stats/weekly — this week's posts by genre + target comparison
stats.get('/weekly', async (c) => {
  try {
    const weekStart = jstWeekStart();
    const db = c.env.DB;
    const accountId = c.req.query('accountId');

    let genreSQL = `SELECT genre, COUNT(*) as count FROM posts
       WHERE (post_date >= ? OR created_at >= ?)`;
    const genreParams: any[] = [weekStart, weekStart];

    if (accountId) {
      genreSQL += ' AND account_id = ?';
      genreParams.push(accountId);
    }

    genreSQL += ' GROUP BY genre';

    const byGenre = await db.prepare(genreSQL).bind(...genreParams).all();

    // Dynamic weekly targets: try to load from the account's genre_config
    let targets: Record<string, { min: number; max: number }> = {
      'MNP': { min: 17, max: 99 },
      'ポイ活': { min: 3, max: 5 },
      '格安SIM': { min: 3, max: 5 },
      '光回線': { min: 2, max: 3 },
      'ウォーターサーバー': { min: 1, max: 2 },
    };

    if (accountId) {
      const acct = await db.prepare('SELECT genre_config FROM accounts WHERE id = ?').bind(accountId).first<{ genre_config: string }>();
      if (acct?.genre_config) {
        try {
          const config = JSON.parse(acct.genre_config);
          if (config.genres && Array.isArray(config.genres)) {
            targets = {};
            for (const g of config.genres) {
              targets[g.name] = { min: g.weekly_target ?? 5, max: (g.weekly_target ?? 5) * 2 };
            }
          }
        } catch {
          // ignore parse error, use defaults
        }
      }
    }

    const genreCounts: Record<string, number> = {};
    for (const row of byGenre.results as Array<{ genre: string; count: number }>) {
      if (row.genre) {
        genreCounts[row.genre] = row.count;
      }
    }

    const comparison = Object.entries(targets).map(([genre, target]) => ({
      genre,
      current: genreCounts[genre] ?? 0,
      target_min: target.min,
      target_max: target.max,
      on_track: (genreCounts[genre] ?? 0) >= target.min,
    }));

    return c.json({
      success: true,
      data: {
        week_start: weekStart,
        by_genre: byGenre.results,
        target_comparison: comparison,
      },
    });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// GET /api/stats/pending-feedback — count of pending feedback
stats.get('/pending-feedback', async (c) => {
  try {
    const accountId = c.req.query('accountId');

    let sql = "SELECT COUNT(*) as count FROM feedback WHERE status = 'pending'";
    const params: string[] = [];

    if (accountId) {
      sql += ' AND account_id = ?';
      params.push(accountId);
    }

    const row = await c.env.DB.prepare(sql).bind(...params).first<{ count: number }>();

    return c.json({
      success: true,
      data: { pending_count: row?.count ?? 0 },
    });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

export { stats };
