import test from 'node:test';
import assert from 'node:assert/strict';
import { applyScore, EMPTY_RECORD, formatRecord, isNewRecord, normalizeRecord } from '../gameRecord.ts';

test('solo es récord si supera ESTRICTAMENTE al anterior', () => {
  assert.equal(isNewRecord(101, 100), true);
  assert.equal(isNewRecord(100, 100), false);
  assert.equal(isNewRecord(99, 100), false);
  assert.equal(isNewRecord(1, 0), true);
  assert.equal(isNewRecord(0, 0), false);
  assert.equal(isNewRecord(NaN, 0), false);
  assert.equal(isNewRecord(10.9, 10), false); // 10.9 -> 10
});

test('applyScore devuelve el mismo objeto si no hay mejora y uno nuevo si la hay', () => {
  const base = { best: 200, updatedAt: 1 };
  assert.strictEqual(applyScore(base, 150), base);
  assert.strictEqual(applyScore(base, 200), base);
  assert.deepEqual(applyScore(base, 350.7, 999), { best: 350, updatedAt: 999 });
  assert.deepEqual(applyScore(EMPTY_RECORD, 5, 7), { best: 5, updatedAt: 7 });
});

test('normalizeRecord descarta basura y valores negativos', () => {
  assert.deepEqual(normalizeRecord([{ best: 120, updatedAt: 5 }]), [{ best: 120, updatedAt: 5 }]);
  assert.deepEqual(normalizeRecord([{ best: -5 }]), [{ best: 0, updatedAt: 0 }]);
  assert.deepEqual(normalizeRecord([{ best: 'x' }]), [{ best: 0, updatedAt: 0 }]);
  assert.deepEqual(normalizeRecord([]), []);
  assert.deepEqual(normalizeRecord([null]), []);
});

test('formatRecord', () => {
  assert.equal(formatRecord(0), 'Sin récord');
  assert.match(formatRecord(12345), /12/);
});
