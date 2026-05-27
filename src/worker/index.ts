import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { accounts } from './routes/accounts.js';
import { posts } from './routes/posts.js';
import { knowledge } from './routes/knowledge.js';
import { feedback } from './routes/feedback.js';
import { engagement } from './routes/engagement.js';
import { performance } from './routes/performance.js';
import { competitors } from './routes/competitors.js';
import { stats } from './routes/stats.js';
import { ai } from './routes/ai.js';

export type Env = {
  Bindings: {
    DB: D1Database;
    ANTHROPIC_API_KEY?: string;
  };
};

export function jstNow(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().replace('Z', '+09:00');
}

let tablesEnsured = false;

async function ensureTables(db: D1Database): Promise<void> {
  if (tablesEnsured) return;

  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      bio TEXT,
      character_definition TEXT,
      genre_config TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      account_id TEXT,
      post_no INTEGER,
      post_date TEXT,
      post_time TEXT,
      post_type TEXT,
      hook_type TEXT,
      close_type TEXT,
      genre TEXT,
      theme TEXT,
      body TEXT,
      source TEXT,
      quality_checked INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft',
      performance TEXT,
      impressions INTEGER,
      engagements INTEGER,
      notes TEXT,
      created_at TEXT,
      updated_at TEXT
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS knowledge (
      id TEXT PRIMARY KEY,
      account_id TEXT,
      genre TEXT,
      title TEXT,
      content TEXT,
      source_url TEXT,
      source_type TEXT,
      confidence TEXT DEFAULT 'green',
      expires_at TEXT,
      is_archived INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      account_id TEXT,
      from_agent TEXT,
      to_agent TEXT,
      topic TEXT,
      detail TEXT,
      urgency TEXT,
      genre TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT,
      resolved_at TEXT
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS engagement_targets (
      id TEXT PRIMARY KEY,
      account_id TEXT,
      username TEXT,
      display_name TEXT,
      follower_tier TEXT,
      priority TEXT,
      notes TEXT,
      last_engaged_at TEXT,
      created_at TEXT,
      updated_at TEXT
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS performance_logs (
      id TEXT PRIMARY KEY,
      account_id TEXT,
      post_id TEXT,
      check_type TEXT,
      judgment TEXT,
      impressions INTEGER,
      likes INTEGER,
      retweets INTEGER,
      replies INTEGER,
      quotes INTEGER,
      diagnosis TEXT,
      improvement TEXT,
      created_at TEXT
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS competitor_buzz (
      id TEXT PRIMARY KEY,
      account_id TEXT,
      account TEXT,
      post_url TEXT,
      content_summary TEXT,
      hook_technique TEXT,
      estimated_impressions TEXT,
      tags TEXT,
      created_at TEXT
    )`),
  ]);

  // Add account_id column to existing tables that may lack it (safe ALTER TABLE)
  const alterStatements = [
    'ALTER TABLE posts ADD COLUMN account_id TEXT',
    'ALTER TABLE knowledge ADD COLUMN account_id TEXT',
    'ALTER TABLE feedback ADD COLUMN account_id TEXT',
    'ALTER TABLE engagement_targets ADD COLUMN account_id TEXT',
    'ALTER TABLE performance_logs ADD COLUMN account_id TEXT',
    'ALTER TABLE competitor_buzz ADD COLUMN account_id TEXT',
  ];

  for (const sql of alterStatements) {
    try {
      await db.prepare(sql).run();
    } catch {
      // Column already exists — ignore
    }
  }

  tablesEnsured = true;
}

const app = new Hono<Env>();

app.use('/api/*', cors());

app.use('/api/*', async (c, next) => {
  await ensureTables(c.env.DB);
  await next();
});

app.route('/api/accounts', accounts);
app.route('/api/posts', posts);
app.route('/api/knowledge', knowledge);
app.route('/api/feedback', feedback);
app.route('/api/engagement', engagement);
app.route('/api/performance', performance);
app.route('/api/competitors', competitors);
app.route('/api/stats', stats);
app.route('/api/ai', ai);


export default app;
