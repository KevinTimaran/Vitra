import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeCollection,
  mergeCategories,
  rebaseImageUrl,
  rebaseItemImages,
  sanitizeLookForUpload,
  selectDirty,
  upsertTombstone,
  isLocalUri,
} from '../wardrobeMerge.ts';

const g = (id, updatedAt, extra = {}) => ({ id, name: id, updatedAt, ...extra });

test('el elemento más reciente gana; en empate gana el local', () => {
  const local = [g('a', 200, { name: 'local' }), g('b', 100, { name: 'local-b' })];
  const remote = [g('a', 100, { name: 'viejo' }), g('b', 300, { name: 'remoto-b' }), g('c', 50)];
  const merged = mergeCollection(local, remote);
  assert.equal(merged.find((x) => x.id === 'a').name, 'local');
  assert.equal(merged.find((x) => x.id === 'b').name, 'remoto-b');
  assert.deepEqual(merged.map((x) => x.id), ['a', 'b', 'c']);

  const tie = mergeCollection([g('t', 5, { name: 'local' })], [g('t', 5, { name: 'remoto' })]);
  assert.equal(tie[0].name, 'local');
});

test('devuelve la misma referencia cuando no hay cambios (evita bucles)', () => {
  const local = [g('a', 200), g('b', 100)];
  assert.strictEqual(mergeCollection(local, [g('a', 200), g('b', 50)]), local);
  assert.strictEqual(mergeCollection(local, []), local);
});

test('los ids borrados en el servidor se eliminan del dispositivo', () => {
  const local = [g('a', 100), g('b', 100)];
  const merged = mergeCollection(local, [g('b', 100)], ['a']);
  assert.deepEqual(merged.map((x) => x.id), ['b']);
  assert.deepEqual(mergeCollection([], [g('z', 1)], ['z']), []);
});

test('si gana el remoto sin imagen, se conserva la imagen local', () => {
  const local = [g('a', 100, { imageUrl: 'file:///doc/a.jpg' })];
  const merged = mergeCollection(local, [g('a', 200, { name: 'editada', imageUrl: null })]);
  assert.equal(merged[0].name, 'editada');
  assert.equal(merged[0].imageUrl, 'file:///doc/a.jpg');
});

test('elementos sin updatedAt se tratan como los más antiguos', () => {
  const merged = mergeCollection([{ id: 'x', name: 'sin fecha' }], [g('x', 1, { name: 'con fecha' })]);
  assert.equal(merged[0].name, 'con fecha');
});

test('categorías: gana la marca de tiempo más reciente', () => {
  const local = { items: ['Todos'], updatedAt: 10 };
  assert.deepEqual(mergeCategories(local, { items: ['Todos', 'Fiesta'], updatedAt: 20 }), {
    items: ['Todos', 'Fiesta'], updatedAt: 20, changed: true,
  });
  assert.equal(mergeCategories(local, { items: ['x'], updatedAt: 5 }).changed, false);
  assert.equal(mergeCategories(local, null).changed, false);
  assert.equal(mergeCategories(local, { items: ['Todos'], updatedAt: 99 }).changed, false);
});

test('las URLs de imagen del backend se reubican al host actual', () => {
  assert.equal(
    rebaseImageUrl('https://viejo.ngrok-free.dev/api/wardrobe/image/abc.jpg', 'https://nuevo.ngrok-free.dev/'),
    'https://nuevo.ngrok-free.dev/api/wardrobe/image/abc.jpg'
  );
  assert.equal(rebaseImageUrl('https://images.unsplash.com/x.jpg', 'https://nuevo'), 'https://images.unsplash.com/x.jpg');
  const item = { id: 'a', imageUrl: 'http://old/api/wardrobe/image/z.png', model3dUrl: 'http://old/static/m.glb' };
  assert.equal(rebaseItemImages(item, 'http://new').imageUrl, 'http://new/api/wardrobe/image/z.png');
  const same = { id: 'b', imageUrl: 'https://cdn/x.jpg' };
  assert.strictEqual(rebaseItemImages(same, 'http://new'), same);
});

test('los looks no suben imágenes locales/base64 de sus prendas anidadas', () => {
  const look = {
    id: 'l', garments: [
      { id: '1', imageUrl: 'file:///cache/a.jpg', image2dUrl: 'data:image/png;base64,AAA' },
      { id: '2', imageUrl: 'https://cdn/x.jpg' },
    ],
  };
  const clean = sanitizeLookForUpload(look);
  assert.equal(clean.garments[0].imageUrl, undefined);
  assert.equal(clean.garments[0].image2dUrl, undefined);
  assert.equal(clean.garments[1].imageUrl, 'https://cdn/x.jpg');
  assert.equal(look.garments[0].imageUrl, 'file:///cache/a.jpg'); // no muta el original
});

test('selectDirty excluye demo y lo ya sincronizado', () => {
  const items = [g('g-2', 900), g('new', 900), g('old', 100)];
  assert.deepEqual(selectDirty(items, 500, (id) => id.startsWith('g-')).map((x) => x.id), ['new']);
});

test('upsertTombstone reemplaza el existente y isLocalUri detecta URIs del móvil', () => {
  assert.deepEqual(upsertTombstone([{ id: 'a', updatedAt: 1 }], 'a', 5), [{ id: 'a', updatedAt: 5 }]);
  assert.ok(isLocalUri('file:///x') && isLocalUri('ph://abc') && !isLocalUri('https://x') && !isLocalUri(undefined));
});
