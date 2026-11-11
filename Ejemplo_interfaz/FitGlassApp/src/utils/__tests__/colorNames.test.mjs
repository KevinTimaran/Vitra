import test from 'node:test';
import assert from 'node:assert/strict';
import { colorLabel, colorNameFor, descriptionFromProfile, parseHex } from '../colorNames.ts';

test('parseHex acepta #RGB, #RRGGBB, sin # y texto con descripción', () => {
  assert.equal(parseHex('#1e3a8a'), '#1E3A8A');
  assert.equal(parseHex('#fff'), '#FFFFFF');
  assert.equal(parseHex('EDC4B3'), '#EDC4B3');
  assert.equal(parseHex('#EDC4B3 (Beige claro)'), '#EDC4B3');
  assert.equal(parseHex('azul'), null);
  assert.equal(parseHex(null), null);
});

test('colores básicos reciben su nombre en español', () => {
  assert.equal(colorNameFor('#000000'), 'Negro');
  assert.equal(colorNameFor('#FFFFFF'), 'Blanco');
  assert.equal(colorNameFor('#D32F2F'), 'Rojo');
  assert.equal(colorNameFor('#0D1B3E'), 'Azul marino');
  assert.equal(colorNameFor('#388E3C'), 'Verde');
  assert.equal(colorNameFor('#FDD835'), 'Amarillo');
  assert.equal(colorNameFor('#8A8A8A'), 'Gris');
});

test('colores parecidos caen en la familia correcta', () => {
  assert.match(colorNameFor('#1E3A8A'), /Azul|Índigo/);       // azul intenso
  assert.match(colorNameFor('#7F1D1D'), /Granate|Burdeos|Vino|Rojo/);
  assert.match(colorNameFor('#047857'), /Verde/);
  assert.match(colorNameFor('#854D0E'), /Marrón|Café|Canela|Ocre|Camel/);
});

test('piel, cabello y ojos usan sus propias listas', () => {
  assert.equal(colorNameFor('#EDC4B3', 'skin'), 'Beige claro');
  assert.equal(colorNameFor('#3A1F13', 'skin'), 'Ébano');
  assert.equal(colorNameFor('#1A1412', 'hair'), 'Negro');
  assert.equal(colorNameFor('#E8DCC0', 'hair'), 'Rubio platino');
  assert.equal(colorNameFor('#3B261C', 'eye'), 'Marrón oscuro');
});

test('entrada inválida => "Color" (nunca revienta)', () => {
  assert.equal(colorNameFor('no-es-color'), 'Color');
  assert.equal(colorNameFor(undefined), 'Color');
});

test('descripción que da la IA entre paréntesis', () => {
  assert.equal(descriptionFromProfile('#EDC4B3 (beige claro)'), 'Beige claro');
  assert.equal(descriptionFromProfile('#EDC4B3'), null);
});

test('colorLabel: modo código y modo nombre', () => {
  assert.equal(colorLabel('#1e3a8a', 'code'), '#1E3A8A');
  assert.equal(colorLabel('nada', 'code'), 'N/D');
  assert.equal(colorLabel('#D32F2F', 'name'), 'Rojo');
  // piel: prefiere el nombre de la IA si lo hay
  assert.equal(colorLabel('#C68642 (Trigueño cálido)', 'name', 'skin'), 'Trigueño cálido');
  assert.equal(colorLabel('#EDC4B3', 'name', 'skin'), 'Beige claro');
});

test('los nombres de color se traducen al inglés cuando la app está en inglés', () => {
  assert.equal(colorNameFor('#000000', 'general', 'en'), 'Black');
  assert.equal(colorNameFor('#0D1B3E', 'general', 'en'), 'Navy blue');
  assert.equal(colorNameFor('#0D1B3E'), 'Azul marino');
  // En inglés no se usa la descripción en español que da la IA
  assert.equal(colorLabel('#EDC4B3 (Beige claro)', 'name', 'skin', 'en'), colorNameFor('#EDC4B3', 'skin', 'en'));
  assert.equal(colorLabel('#EDC4B3 (Beige claro)', 'name', 'skin'), 'Beige claro');
});
