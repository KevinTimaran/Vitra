import test from 'node:test';
import assert from 'node:assert/strict';
import { createJobStore } from '../jobStore.ts';
import { TaskError } from '../taskPoller.ts';

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

test('el trabajo sigue y ejecuta onSuccess UNA vez aunque nadie lo observe (pantalla cerrada)', async () => {
  const store = createJobStore();
  const gate = deferred();
  let successCalls = 0;
  const started = store.start({
    kind: 'garment', title: 'Prenda',
    run: async ({ report }) => { report({ progress: 0.4, phase: 'vton' }); return gate.promise; },
    onSuccess: async () => { successCalls += 1; },
  });
  assert.ok(started.ok);
  await tick();
  assert.equal(store.getJob(started.job.id).progress, 0.4);
  assert.equal(store.getJob(started.job.id).phase, 'vton');
  assert.equal(successCalls, 0);

  gate.resolve({ model: 'x.glb' });
  await tick();
  const job = store.getJob(started.job.id);
  assert.equal(job.status, 'done');
  assert.equal(job.progress, 1);
  assert.equal(job.seen, false);           // la tarjeta debe avisar
  assert.equal(successCalls, 1);
  assert.deepEqual(job.result, { model: 'x.glb' });
});

test('solo un trabajo en marcha por tipo; otros tipos pueden convivir', async () => {
  const store = createJobStore();
  const gate = deferred();
  const first = store.start({ kind: 'cascade', title: 'A', run: () => gate.promise });
  const second = store.start({ kind: 'cascade', title: 'B', run: async () => 1 });
  assert.equal(second.ok, false);
  assert.equal(second.job.id, first.job.id);
  assert.ok(store.start({ kind: 'avatar', title: 'C', run: async () => 1 }).ok);
  gate.resolve(1);
  await tick();
  assert.ok(store.start({ kind: 'cascade', title: 'D', run: async () => 1 }).ok); // ya terminó el anterior
});

test('errores se traducen a mensajes amigables (sin créditos de Tripo)', async () => {
  const store = createJobStore();
  const { job } = store.start({
    kind: 'garment', title: 'P',
    run: async () => { throw new Error('Fallo en Tripo3D (HTTP 403): {"code":2010,"message":"You don\'t have enough credit"}'); },
  });
  await tick();
  const failed = store.getJob(job.id);
  assert.equal(failed.status, 'failed');
  assert.equal(failed.error.titleKey, 'jobs.err.credits.title');
  assert.equal(failed.error.retryable, false);
});

test('si onSuccess falla el trabajo queda failed (no "done" con efectos a medias)', async () => {
  const store = createJobStore();
  const { job } = store.start({ kind: 'avatar', title: 'A', run: async () => 1, onSuccess: async () => { throw new Error('disco lleno'); } });
  await tick();
  assert.equal(store.getJob(job.id).status, 'failed');
});

test('cancelar aborta la señal, queda cancelled y no ejecuta onSuccess', async () => {
  const store = createJobStore();
  let aborted = false; let success = 0;
  const { job } = store.start({
    kind: 'cascade', title: 'C',
    run: ({ signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => { aborted = true; reject(new TaskError('x', 'aborted')); })),
    onSuccess: () => { success += 1; },
  });
  store.cancel(job.id);
  await tick();
  assert.equal(aborted, true);
  assert.equal(store.getJob(job.id).status, 'cancelled');
  assert.equal(store.getJob(job.id).seen, true);
  assert.equal(success, 0);
});

test('el progreso nunca retrocede y no supera 99% hasta terminar', async () => {
  const store = createJobStore();
  const gate = deferred();
  const { job } = store.start({
    kind: 'garment', title: 'P',
    run: async ({ report }) => { report({ progress: 0.6 }); report({ progress: 0.2 }); report({ progress: 5 }); return gate.promise; },
  });
  await tick();
  assert.equal(store.getJob(job.id).progress, 0.99);
  gate.resolve(1);
  await tick();
  assert.equal(store.getJob(job.id).progress, 1);
});

test('subscribe notifica y se puede cancelar la suscripción; markSeen y dismiss', async () => {
  const store = createJobStore();
  let notifications = 0;
  const unsubscribe = store.subscribe(() => { notifications += 1; });
  const { job } = store.start({ kind: 'garment', title: 'P', run: async () => 1 });
  await tick();
  assert.ok(notifications >= 2);
  const before = notifications;
  store.markSeen(job.id);
  assert.equal(store.getJob(job.id).seen, true);
  store.dismiss(job.id);
  assert.equal(store.getJob(job.id), undefined);
  unsubscribe();
  store.start({ kind: 'garment', title: 'Q', run: async () => 1 });
  await tick();
  assert.equal(notifications, before + 2); // markSeen + dismiss; ya no recibe lo posterior
});

test('announce: la tarjeta de bienvenida se muestra una sola vez por trabajo', async () => {
  const store = createJobStore();
  const gate = deferred();
  const { job } = store.start({
    kind: 'avatar', title: 'Avatar', announce: { title: 'Creando tu avatar', message: 'Puedes jugar mientras esperas' },
    run: () => gate.promise,
  });
  assert.equal(store.getJob(job.id).announceSeen, false);
  assert.equal(store.getJob(job.id).announce.title, 'Creando tu avatar');
  store.markAnnounceSeen(job.id);
  assert.equal(store.getJob(job.id).announceSeen, true);
  gate.resolve(1);
  await tick();

  // sin announce => ya "vista" (nunca se muestra)
  const plain = store.start({ kind: 'garment', title: 'P', run: async () => 1 });
  assert.equal(store.getJob(plain.job.id).announceSeen, true);
});
