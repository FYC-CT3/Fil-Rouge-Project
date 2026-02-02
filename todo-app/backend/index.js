// backend/index.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// --- Middlewares ---
app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());

// --- Config ---
const PORT = Number(process.env.PORT || 3000);
const BASE = process.env.API_BASE_PATH || '/api';
const connectionString =
  process.env.DATABASE_URL || 'postgres://postgres:postgres@db:5432/tododb';

let pool;

// Petite pause utilitaire (retries)
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// --- Bootstrapping DB & table ---
async function ensureDatabaseAndTables() {
  pool = new Pool({ connectionString });

  try {
    await pool.query('SELECT 1');
  } catch (err) {
    // Code Postgres "database does not exist"
    if (err && err.code === '3D000') {
      console.log('Database does not exist, attempting to create it...');

      // Bascule sur la DB de maintenance "postgres" pour créer la cible
      const url = new URL(connectionString);
      const targetDb = (url.pathname || '/tododb').slice(1);
      url.pathname = '/postgres';
      const adminConnectionString = url.toString();

      const maxAttempts = 12;
      let attempt = 0;
      let created = false;

      while (attempt < maxAttempts) {
        attempt++;
        try {
          const adminPool = new Pool({ connectionString: adminConnectionString });
          try {
            await adminPool.query(`CREATE DATABASE "${targetDb}"`);
            console.log('Database created:', targetDb);
            created = true;
          } catch (createErr) {
            // "database already exists"
            if (createErr && createErr.code === '42P04') {
              console.log('Database already exists:', targetDb);
              created = true;
            } else {
              throw createErr;
            }
          } finally {
            await adminPool.end();
          }
          if (created) break;
        } catch {
          console.log(`Waiting for Postgres to be ready (attempt ${attempt}/${maxAttempts})...`);
          await sleep(2000);
        }
      }

      if (!created) throw new Error('Could not create database after several attempts');

      // Reconnecte sur la DB cible et vérifie qu'elle répond
      await pool.end();
      pool = new Pool({ connectionString });

      let ok = false;
      for (let i = 0; i < maxAttempts; i++) {
        try {
          await pool.query('SELECT 1');
          ok = true;
          break;
        } catch {
          await sleep(1000);
        }
      }
      if (!ok) throw new Error('Target database not accepting connections yet');
    } else {
      throw err;
    }
  }

  // Table "tasks"
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id    serial PRIMARY KEY,
      title text    NOT NULL,
      done  boolean NOT NULL DEFAULT false
    )
  `);
}

// --- Helpers ---
function parseBool(val) {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const v = val.toLowerCase().trim();
    if (v === 'true') return true;
    if (v === 'false') return false;
  }
  return undefined;
}

// --- API (UN SEUL PRÉFIXE /api) ---
const api = express.Router();

// Health
api.get('/health', (_req, res) => res.json({ ok: true }));

// GET /api/todos  → liste
api.get('/todos', async (_req, res, next) => {
  try {
    const r = await pool.query('SELECT id, title, done FROM tasks ORDER BY id');
    res.json(r.rows);
  } catch (e) { next(e); }
});

// POST /api/todos  → { title }
api.post('/todos', async (req, res, next) => {
  try {
    const title = String(req.body?.title || '').trim();
    if (!title) return res.status(400).json({ error: 'title required' });

    const r = await pool.query(
      'INSERT INTO tasks(title, done) VALUES($1,false) RETURNING id, title, done',
      [title]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { next(e); }
});

// PATCH /api/todos/:id  → { title?, done? }
api.patch('/todos/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });

    const title = (typeof req.body?.title === 'string') ? req.body.title : undefined;
    const done  = parseBool(req.body?.done);

    const r = await pool.query(
      'UPDATE tasks SET title = COALESCE($1,title), done = COALESCE($2,done) WHERE id=$3 RETURNING id, title, done',
      [title, done, id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
    res.json(r.rows[0]);
  } catch (e) { next(e); }
});

// DELETE /api/todos/:id
api.delete('/todos/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });

    const r = await pool.query('DELETE FROM tasks WHERE id=$1 RETURNING id', [id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
    res.status(204).send();
  } catch (e) { next(e); }
});

// Monter l'API sous /api UNIQUEMENT
app.use(BASE, api);

// Page d’accueil (facultatif)
app.get('/', (_req, res) => {
  res.send(`TODO API is running. Use:
- GET  ${BASE}/health
- GET  ${BASE}/todos
- POST ${BASE}/todos
- PATCH ${BASE}/todos/:id
- DELETE ${BASE}/todos/:id`);
});

// Erreur JSON propre
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'internal_error' });
});

// --- Start ---
(async () => {
  try {
    await ensureDatabaseAndTables();
    app.listen(PORT, () =>
      console.log(`Backend listening on ${PORT} (API base: ${BASE})`)
    );
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }
})();

// Arrêt propre
process.on('SIGTERM', async () => { try { await pool?.end(); } finally { process.exit(0); } });
process.on('SIGINT',  async () => { try { await pool?.end(); } finally { process.exit(0); } });
