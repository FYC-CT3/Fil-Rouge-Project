require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Health checks
app.get('/health', (req, res) => res.send({status:'ok'}));

// CRUD for tasks
app.get('/tasks', async (req, res) => {
  const r = await pool.query('SELECT id, title, done FROM tasks ORDER BY id');
  res.json(r.rows);
});

app.post('/tasks', async (req, res) => {
  const { title } = req.body;
  if(!title) return res.status(400).json({error:'title required'});
  const r = await pool.query('INSERT INTO tasks(title, done) VALUES($1,false) RETURNING id, title, done', [title]);
  res.status(201).json(r.rows[0]);
});

app.put('/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id,10);
  const { title, done } = req.body;
  const r = await pool.query('UPDATE tasks SET title = COALESCE($1,title), done = COALESCE($2,done) WHERE id=$3 RETURNING id, title, done', [title, done, id]);
  if(r.rowCount===0) return res.status(404).json({error:'not found'});
  res.json(r.rows[0]);
});

app.delete('/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id,10);
  const r = await pool.query('DELETE FROM tasks WHERE id=$1 RETURNING id', [id]);
  if(r.rowCount===0) return res.status(404).json({error:'not found'});
  res.status(204).send();
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Backend listening on', port));
