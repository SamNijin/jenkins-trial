const express = require('express');
const path = require('path');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // Simple in-memory store (resets when the process restarts).
  let todos = [];
  let nextId = 1;

  // Probe endpoints
  app.get('/healthz', (req, res) => res.json({ status: 'ok' }));
  app.get('/readyz', (req, res) => res.json({ status: 'ready' }));

  // Shows which host/container served the request
  app.get('/api/info', (req, res) =>
    res.json({ hostname: process.env.HOSTNAME || 'local', version: process.env.APP_VERSION || 'dev' })
  );

  app.get('/api/todos', (req, res) => res.json(todos));

  app.post('/api/todos', (req, res) => {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    if (!title) return res.status(400).json({ error: 'title is required' });
    const todo = { id: nextId++, title, done: false };
    todos.push(todo);
    res.status(201).json(todo);
  });

  app.patch('/api/todos/:id', (req, res) => {
    const todo = todos.find((t) => t.id === Number(req.params.id));
    if (!todo) return res.status(404).json({ error: 'not found' });
    if (typeof req.body.title === 'string' && req.body.title.trim()) todo.title = req.body.title.trim();
    if (typeof req.body.done === 'boolean') todo.done = req.body.done;
    res.json(todo);
  });

  app.delete('/api/todos/:id', (req, res) => {
    const idx = todos.findIndex((t) => t.id === Number(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'not found' });
    todos.splice(idx, 1);
    res.status(204).end();
  });

  return app;
}

module.exports = { createApp };
