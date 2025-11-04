require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@db:5432/tododb';
let pool;

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

async function ensureDatabaseAndTables() {
	// try connecting to the configured DB; if it doesn't exist create it by connecting to the 'postgres' maintenance DB
	pool = new Pool({ connectionString });

	try {
		await pool.query('SELECT 1');
	} catch (err) {
		if (err && err.code === '3D000') {
			console.log('Database does not exist, attempting to create it...');
			// parse connection string and switch to the 'postgres' DB
			const url = new URL(connectionString);
			const targetDb = (url.pathname || '/tododb').slice(1);
			url.pathname = '/postgres';
			const adminConnectionString = url.toString();

			// retry loop: Postgres container might be starting; wait for it to accept connections
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
						// ignore "already exists"
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
				} catch (e) {
					// likely admin DB not ready; wait and retry
					console.log(`Waiting for Postgres to be ready (attempt ${attempt}/${maxAttempts})...`);
					await sleep(2000);
				}
			}
			if (!created) throw new Error('Could not create database after several attempts');

			// reconnect to the newly created DB
			await pool.end();
			pool = new Pool({ connectionString });

			// ensure we can run queries against it (with a few retries)
			attempt = 0;
			while (attempt < maxAttempts) {
				try {
					await pool.query('SELECT 1');
					break;
				} catch {
					attempt++;
					await sleep(1000);
				}
			}
		} else {
			throw err;
		}
	}

	// ensure tasks table exists
	await pool.query(`
		CREATE TABLE IF NOT EXISTS tasks (
			id serial PRIMARY KEY,
			title text NOT NULL,
			done boolean NOT NULL DEFAULT false
		)
	`);
}

// CRUD for tasks
app.get('/tasks', async (req, res) => {
	const r = await pool.query('SELECT id, title, done FROM tasks ORDER BY id');
	res.json(r.rows);
});

app.post('/tasks', async (req, res) => {
	const { title } = req.body;
	if (!title) return res.status(400).json({ error: 'title required' });
	const r = await pool.query('INSERT INTO tasks(title, done) VALUES($1,false) RETURNING id, title, done', [title]);
	res.status(201).json(r.rows[0]);
});

app.put('/tasks/:id', async (req, res) => {
	const id = parseInt(req.params.id, 10);
	const { title, done } = req.body;
	const r = await pool.query('UPDATE tasks SET title = COALESCE($1,title), done = COALESCE($2,done) WHERE id=$3 RETURNING id, title, done', [title, done, id]);
	if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
	res.json(r.rows[0]);
});

app.delete('/tasks/:id', async (req, res) => {
	const id = parseInt(req.params.id, 10);
	const r = await pool.query('DELETE FROM tasks WHERE id=$1 RETURNING id', [id]);
	if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
	res.status(204).send();
});

// Health check
app.get('/health', (req, res) => res.send({ status: 'ok' }));

(async () => {
	try {
		await ensureDatabaseAndTables();
		const port = process.env.PORT || 3000;
		app.listen(port, () => console.log('Backend listening on', port));
	} catch (err) {
		console.error('Failed to initialize database:', err);
		process.exit(1);
	}
})();
