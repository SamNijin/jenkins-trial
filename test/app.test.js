const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

let server, base;

before(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const call = (path, method = 'GET', body) =>
  fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

test('health endpoints respond', async () => {
  assert.equal((await call('/healthz')).status, 200);
  assert.equal((await call('/readyz')).status, 200);
});

test('todo lifecycle: create, list, update, delete', async () => {
  const created = await call('/api/todos', 'POST', { title: '  learn jenkins ' });
  assert.equal(created.status, 201);
  const todo = await created.json();
  assert.equal(todo.title, 'learn jenkins');
  assert.equal(todo.done, false);

  const list = await (await call('/api/todos')).json();
  assert.ok(list.some((t) => t.id === todo.id));

  const updated = await (await call(`/api/todos/${todo.id}`, 'PATCH', { done: true })).json();
  assert.equal(updated.done, true);

  assert.equal((await call(`/api/todos/${todo.id}`, 'DELETE')).status, 204);
  assert.equal((await call(`/api/todos/${todo.id}`, 'DELETE')).status, 404);
});

test('rejects empty title', async () => {
  assert.equal((await call('/api/todos', 'POST', { title: '   ' })).status, 400);
});

test('patch on unknown id returns 404', async () => {
  assert.equal((await call('/api/todos/9999', 'PATCH', { done: true })).status, 404);
});
