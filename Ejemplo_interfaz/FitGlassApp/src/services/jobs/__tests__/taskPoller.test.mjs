import test from 'node:test';
import assert from 'node:assert/strict';
import { runTask, TaskError } from '../taskPoller.ts';
import { friendlyError } from '../jobErrors.ts';

const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const noSleep = async () => {};

const base = (extra = {}) => ({
  baseUrl: 'http://srv',
  startPath: '/start',
  body: { a: 1 },
  statusPath: (id) => `/status/${id}`,
  intervalMs: 1,
  maxAttempts: 10,
  sleep: noSleep,
  ...extra,
});

const scripted = (responses) => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, method: init?.method });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return next;
  };
  return { fetchImpl, calls };
};

test('completa y devuelve el estado final; informa progreso y task_id', async () => {
  const { fetchImpl, calls } = scripted([
    json(200, { task_id: 't1' }),
    json(200, { status: 'processing', progress: 0.3, step: 'vton' }),
    json(200, { status: 'completed', model_3d_url: 'http://m.glb' }),
  ]);
  const seen = [];
  let taskId;
  const result = await runTask(base({ fetchImpl, resultKey: 'model_3d_url', onStatus: (s) => seen.push(s.step), onTaskId: (id) => (taskId = id) }));
  assert.equal(result.model_3d_url, 'http://m.glb');
  assert.equal(taskId, 't1');
  assert.deepEqual(seen, ['vton', undefined]);
  assert.deepEqual(calls.map((c) => c.method), ['POST', 'GET', 'GET']);
});

test('una tarea fallida lanza task_failed con el mensaje del servidor', async () => {
  const { fetchImpl } = scripted([json(200, { task_id: 't' }), json(200, { status: 'failed', error: 'Tripo caído' })]);
  await assert.rejects(runTask(base({ fetchImpl })), (e) => e instanceof TaskError && e.kind === 'task_failed' && /Tripo caído/.test(e.message));
});

test('NO relanza el pipeline al agotar el sondeo: solo 1 POST y error timeout', async () => {
  const responses = [json(200, { task_id: 't' })];
  for (let i = 0; i < 3; i += 1) responses.push(json(200, { status: 'processing' }));
  const { fetchImpl, calls } = scripted(responses);
  await assert.rejects(runTask(base({ fetchImpl, maxAttempts: 3 })), (e) => e.kind === 'timeout');
  assert.equal(calls.filter((c) => c.method === 'POST').length, 1);
});

test('404 de estado (servidor reiniciado) => task_not_found sin reintentos', async () => {
  const { fetchImpl, calls } = scripted([json(200, { task_id: 't' }), json(404, { detail: 'x' })]);
  await assert.rejects(runTask(base({ fetchImpl })), (e) => e.kind === 'task_not_found');
  assert.equal(calls.length, 2);
});

test('errores de red puntuales se toleran; demasiados seguidos abortan', async () => {
  const ok = scripted([
    json(200, { task_id: 't' }), new Error('Network request failed'), new Error('Network request failed'),
    json(200, { status: 'completed', avatar_url: 'u' }),
  ]);
  const result = await runTask(base({ fetchImpl: ok.fetchImpl, resultKey: 'avatar_url' }));
  assert.equal(result.avatar_url, 'u');

  const bad = scripted([json(200, { task_id: 't' }), new Error('x'), new Error('x'), new Error('x')]);
  await assert.rejects(runTask(base({ fetchImpl: bad.fetchImpl, maxConsecutiveNetworkErrors: 3 })), (e) => e.kind === 'network');
});

test('un 400 al iniciar conserva el estado y el detalle (foto sin persona)', async () => {
  const { fetchImpl } = scripted([json(400, { detail: 'Esta imagen no parece ser de una persona.' })]);
  await assert.rejects(runTask(base({ fetchImpl })), (e) => e.kind === 'start_failed' && e.status === 400 && /persona/.test(e.message));
});

test('completed sin el resultado esperado se trata como fallo', async () => {
  const { fetchImpl } = scripted([json(200, { task_id: 't' }), json(200, { status: 'completed' })]);
  await assert.rejects(runTask(base({ fetchImpl, resultKey: 'model_3d_url' })), (e) => e.kind === 'task_failed');
});

test('se puede cancelar mientras espera', async () => {
  const controller = new AbortController();
  const { fetchImpl } = scripted([json(200, { task_id: 't' })]);
  const sleep = async (_ms, signal) => {
    controller.abort();
    if (signal?.aborted) throw new TaskError('Operación cancelada.', 'aborted');
  };
  await assert.rejects(runTask(base({ fetchImpl, sleep, signal: controller.signal })), (e) => e.kind === 'aborted');
});

test('mensajes amigables: créditos de Tripo, tarea perdida, red y JSON crudo', () => {
  const credit = friendlyError(new Error('[Waterfall Tripo3D Error] Fallo al crear la tarea en Tripo3D (HTTP 403): {"code":2010,"message":"You don\'t have enough credit to create this task"}'));
  assert.equal(credit.titleKey, 'jobs.err.credits.title');
  assert.equal(credit.retryable, false);
  assert.equal(friendlyError(new TaskError('x', 'task_not_found')).titleKey, 'jobs.err.lost.title');
  assert.equal(friendlyError(new TaskError('x', 'network')).titleKey, 'jobs.err.network.title');
  assert.equal(friendlyError(new Error('Connection to http://x timed out.')).titleKey, 'jobs.err.network.title');
  assert.equal(friendlyError(new TaskError('x', 'aborted')).titleKey, 'jobs.err.cancelled.title');
  const raw = friendlyError(new Error('{"unexpected":"json"}'));
  assert.ok(!raw.rawMessage);
  assert.equal(raw.messageKey, 'jobs.err.generic.message');
  assert.equal(friendlyError(new Error('Esta imagen no parece ser de una persona.')).retryable, false);
  assert.equal(friendlyError(new Error("This image doesn't look like a person.")).invalidImage, true);
});
