import test from 'node:test';
import assert from 'node:assert/strict';
import { isExpectedError, logHandledError } from '../logging.ts';

test('errores esperados (contraseña, imagen sin ropa/persona, créditos, 400/401)', () => {
  assert.ok(isExpectedError(new Error('Contraseña incorrecta. Verifica tu clave o restablece tu contraseña.')));
  assert.ok(isExpectedError(new Error('No detectamos ropa en esta imagen.')));
  assert.ok(isExpectedError(new Error('Esta imagen no parece ser de una persona.')));
  assert.ok(isExpectedError(new Error('Tripo3D (HTTP 403): You don\'t have enough credit')));
  assert.ok(isExpectedError({ status: 401, message: 'x' }));
  assert.ok(isExpectedError({ status: 400 }));
  assert.ok(isExpectedError({ kind: 'aborted' }));
});

test('errores inesperados no se consideran esperados', () => {
  assert.equal(isExpectedError(new Error('TypeError: undefined is not a function')), false);
  assert.equal(isExpectedError({ status: 500, message: 'boom' }), false);
  assert.equal(isExpectedError(null), false);
});

test('logHandledError usa console.log para esperados y console.error para el resto', () => {
  const calls = { log: 0, error: 0 };
  const originalLog = console.log;
  const originalError = console.error;
  console.log = () => { calls.log += 1; };
  console.error = () => { calls.error += 1; };
  try {
    logHandledError('[t]', new Error('Contraseña incorrecta'));
    logHandledError('[t]', new Error('fallo raro interno'));
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
  assert.deepEqual(calls, { log: 1, error: 1 });
});
