import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyZoom,
  clampTranslate,
  cropRect,
  displaySize,
  fitFrame,
  frameAspectFor,
  minScale,
  touchDistance,
} from '../cropMath.ts';

const within = (rect, natural) =>
  rect.originX >= 0 && rect.originY >= 0 && rect.originX + rect.width <= natural.width && rect.originY + rect.height <= natural.height;

test('el marco toma la proporción de la foto limitada al rango de retrato 0,5–0,8', () => {
  assert.equal(frameAspectFor({ width: 3000, height: 4000 }), 0.75);          // foto 3:4 tal cual
  assert.equal(frameAspectFor({ width: 4000, height: 3000 }), 0.8);           // horizontal => 0,8
  assert.equal(frameAspectFor({ width: 1000, height: 3000 }), 0.5);           // muy alta => 0,5
  const frame = fitFrame(350, 500, 0.75);
  assert.ok(frame.width <= 350 && frame.height <= 500);
  assert.ok(Math.abs(frame.width / frame.height - 0.75) < 0.01);
});

test('zoom 1 con un marco de la proporción de la foto = foto COMPLETA (cabeza y pies incluidos)', () => {
  const natural = { width: 3000, height: 4000 };
  const frame = fitFrame(360, 520, frameAspectFor(natural));
  const rect = cropRect(natural, frame, { zoom: 1, tx: 0, ty: 0 });
  assert.ok(rect.width >= 2995 && rect.height >= 3995, JSON.stringify(rect));
  assert.deepEqual([rect.originX <= 3, rect.originY <= 3], [true, true]);
});

test('zoom 2 en el centro recorta la mitad central; siempre dentro de la foto', () => {
  const natural = { width: 3000, height: 4000 };
  const frame = fitFrame(360, 480, 0.75);
  const rect = cropRect(natural, frame, { zoom: 2, tx: 0, ty: 0 });
  assert.ok(Math.abs(rect.width - 1500) <= 6 && Math.abs(rect.height - 2000) <= 8, JSON.stringify(rect));
  assert.ok(Math.abs(rect.originX - 750) <= 6 && Math.abs(rect.originY - 1000) <= 8);
  assert.ok(within(rect, natural));
});

test('arrastrar está limitado: nunca quedan huecos y el recorte no sale de la foto', () => {
  const natural = { width: 3000, height: 4000 };
  const frame = { width: 300, height: 400 };
  const t = clampTranslate(natural, frame, 2, 9999, -9999);
  const size = displaySize(natural, frame, 2);
  assert.equal(t.tx, (size.width - frame.width) / 2);
  assert.equal(t.ty, -(size.height - frame.height) / 2);
  const rect = cropRect(natural, frame, { zoom: 2, tx: 9999, ty: -9999 });
  assert.ok(within(rect, natural));
  assert.equal(rect.originX, 0);                    // arrastrado al máximo hacia un borde
  assert.equal(rect.originY + rect.height, 4000);   // y al opuesto vertical
});

test('sin zoom no se puede desplazar (no hay margen)', () => {
  const natural = { width: 3000, height: 4000 };
  const frame = { width: 300, height: 400 };
  assert.deepEqual(clampTranslate(natural, frame, 1, 50, 50), { tx: 0, ty: 0 });
});

test('foto horizontal: el marco la cubre (recorta los lados) y el recorte es válido', () => {
  const natural = { width: 4000, height: 3000 };
  const frame = fitFrame(350, 500, frameAspectFor(natural)); // 0,8
  const rect = cropRect(natural, frame, { zoom: 1, tx: 0, ty: 0 });
  assert.ok(within(rect, natural));
  assert.ok(Math.abs(rect.height - 3000) <= 3);       // alto completo
  assert.ok(rect.width < 4000 && rect.width > 2300);  // se pierden los lados, no la cabeza ni los pies
  assert.ok(Math.abs(rect.width / rect.height - 0.8) < 0.01);
});

test('el recorte conserva la proporción del marco (lo que se ve = lo que se recorta)', () => {
  const natural = { width: 3024, height: 4032 };
  const frame = fitFrame(360, 520, 0.75);
  for (const zoom of [1, 1.3, 2, 3.7]) {
    const rect = cropRect(natural, frame, { zoom, tx: 20, ty: -35 });
    assert.ok(Math.abs(rect.width / rect.height - frame.width / frame.height) < 0.01, `zoom ${zoom}: ${JSON.stringify(rect)}`);
    assert.ok(within(rect, natural));
  }
});

test('applyZoom respeta límites 1–4 y mantiene el desplazamiento válido', () => {
  const natural = { width: 3000, height: 4000 };
  const frame = { width: 300, height: 400 };
  assert.equal(applyZoom(natural, frame, { zoom: 1, tx: 0, ty: 0 }, 99).zoom, 4);
  assert.equal(applyZoom(natural, frame, { zoom: 2, tx: 0, ty: 0 }, 0.2).zoom, 1);
  const zoomedOut = applyZoom(natural, frame, { zoom: 3, tx: 400, ty: 500 }, 1);
  assert.deepEqual([zoomedOut.tx, zoomedOut.ty], [0, 0]);
});

test('minScale y distancia entre toques', () => {
  assert.equal(minScale({ width: 1000, height: 2000 }, { width: 100, height: 100 }), 0.1);
  assert.equal(touchDistance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
});
