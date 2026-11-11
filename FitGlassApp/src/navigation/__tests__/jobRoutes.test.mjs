import test from 'node:test';
import assert from 'node:assert/strict';
import {
  routeForFreePlay,
  routeForGame,
  routeForJobResult,
  routeForOpenJob,
  routeForRetry,
  routeForTryOnGarment,
} from '../jobRoutes.ts';

test('"Probar en mi Avatar 3D" envía SOLO la prenda (no reemplaza el avatar por el 3D de la prenda)', () => {
  const garment = { id: 'g1', name: 'Silk', model3dUrl: 'http://m.glb', image2dUrl: 'http://i.png' };
  const route = routeForTryOnGarment(garment);
  assert.equal(route.name, 'MainTabs');
  assert.equal(route.params.screen, 'FittingRoom');
  assert.deepEqual(Object.keys(route.params.params), ['selectedGarment']);
  assert.strictEqual(route.params.params.selectedGarment, garment);
  assert.equal('model_3d_url' in route.params.params, false);
  assert.equal('image_2d_url' in route.params.params, false);
});

test('reabrir un trabajo en marcha lleva a su pantalla de espera', () => {
  assert.deepEqual(routeForOpenJob({ id: 'j1', kind: 'garment' }), { name: 'GarmentProcessing', params: { jobId: 'j1' } });
  assert.deepEqual(routeForOpenJob({ id: 'j2', kind: 'cascade' }), { name: 'MainTabs', params: { screen: 'FittingRoom' } });
  assert.deepEqual(routeForOpenJob({ id: 'j3', kind: 'avatar' }), { name: 'BodyProfile' });
});

test('el resultado de cada tipo de trabajo lleva a su pestaña', () => {
  assert.equal(routeForJobResult({ id: '1', kind: 'garment' }).params.screen, 'Wardrobe');
  assert.equal(routeForJobResult({ id: '1', kind: 'cascade' }).params.screen, 'FittingRoom');
  assert.equal(routeForJobResult({ id: '1', kind: 'avatar' }).params.screen, 'FittingRoom');
});

test('reintento y pantalla del juego', () => {
  assert.deepEqual(routeForRetry({ id: '1', kind: 'garment' }), { name: 'AddGarment' });
  assert.deepEqual(routeForRetry({ id: '1', kind: 'avatar' }), { name: 'BodyProfile' });
  assert.deepEqual(routeForGame('job-9'), { name: 'WaitingGame', params: { jobId: 'job-9' } });
});

test('juego libre desde Ajustes: ruta WaitingGame sin jobId', () => {
  assert.deepEqual(routeForFreePlay(), { name: 'WaitingGame', params: {} });
  assert.equal('jobId' in routeForFreePlay().params, false);
});
