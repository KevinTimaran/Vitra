import test from 'node:test';
import assert from 'node:assert/strict';
import { languageFromLocale, placeholdersOf, translate } from '../translate.ts';
import { formatDate, formatNumber } from '../format.ts';

const dicts = {
  es: { hola: 'Hola', saludo: 'Hola, {nombre}', 'items_one': '{count} prenda', 'items_other': '{count} prendas', solo_es: 'Solo ES' },
  en: { hola: 'Hello', saludo: 'Hello, {nombre}', 'items_one': '{count} item', 'items_other': '{count} items', solo_en: 'Only EN' },
};

test('traduce según el idioma y cae a inglés y luego a la clave', () => {
  assert.equal(translate(dicts, 'es', 'hola'), 'Hola');
  assert.equal(translate(dicts, 'en', 'hola'), 'Hello');
  assert.equal(translate(dicts, 'es', 'solo_en'), 'Only EN');  // respaldo inglés
  assert.equal(translate(dicts, 'es', 'no.existe'), 'no.existe'); // última opción: la clave
});

test('avisa UNA vez por clave ausente mediante el callback', () => {
  const missing = [];
  translate(dicts, 'es', 'no.existe', undefined, (k, l) => missing.push(`${l}:${k}`));
  translate(dicts, 'es', 'solo_en', undefined, (k, l) => missing.push(`${l}:${k}`));
  translate(dicts, 'es', 'hola', undefined, (k, l) => missing.push(`${l}:${k}`)); // existe: no avisa
  assert.deepEqual(missing, ['es:no.existe', 'es:solo_en']);
});

test('interpolación y marcadores desconocidos se conservan', () => {
  assert.equal(translate(dicts, 'en', 'saludo', { nombre: 'Ana' }), 'Hello, Ana');
  assert.equal(translate(dicts, 'es', 'saludo'), 'Hola, {nombre}');
  assert.equal(translate(dicts, 'es', 'saludo', { otro: 1 }), 'Hola, {nombre}');
});

test('plurales con count: uno / otros', () => {
  assert.equal(translate(dicts, 'es', 'items', { count: 1 }), '1 prenda');
  assert.equal(translate(dicts, 'es', 'items', { count: 3 }), '3 prendas');
  assert.equal(translate(dicts, 'en', 'items', { count: 1 }), '1 item');
  assert.equal(translate(dicts, 'en', 'items', { count: 0 }), '0 items');
});

test('idioma del teléfono: es/en y desconocido => español', () => {
  assert.equal(languageFromLocale('es-CO'), 'es');
  assert.equal(languageFromLocale('en_US'), 'en');
  assert.equal(languageFromLocale('EN'), 'en');
  assert.equal(languageFromLocale('fr-FR'), 'es');
  assert.equal(languageFromLocale(undefined), 'es');
});

test('placeholdersOf devuelve los marcadores ordenados', () => {
  assert.deepEqual(placeholdersOf('{b} y {a} y {b}'), ['a', 'b', 'b']);
  assert.deepEqual(placeholdersOf('sin marcadores'), []);
});

test('formato de fecha y número por idioma', () => {
  const date = new Date(2026, 10, 9);
  assert.match(formatDate(date, 'es', { day: '2-digit', month: 'long', year: 'numeric' }), /noviembre/i);
  assert.match(formatDate(date, 'en', { day: '2-digit', month: 'long', year: 'numeric' }), /November/);
  assert.match(formatNumber(1234567, 'en'), /1,234,567/);
});
