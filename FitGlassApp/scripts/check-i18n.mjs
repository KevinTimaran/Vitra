// Comprobaciones automáticas del sistema de idiomas. Se ejecuta en `npm test`.
//   node scripts/check-i18n.mjs                  -> comprueba (sale con error si algo falla)
//   node scripts/check-i18n.mjs --update-budget  -> guarda el nº actual de textos fijos como nuevo tope (solo puede bajar)
//
// Falla si:
//  (a) es.ts y en.ts no tienen exactamente las mismas claves o usan marcadores {x} distintos;
//  (b) el código usa t('clave') que no existe;
//  (c) algún archivo tiene MÁS textos fijos en español (sin t()) que su tope en scripts/i18n-budget.json.
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const src = join(root, 'src');
const budgetPath = join(root, 'scripts', 'i18n-budget.json');
const updateBudget = process.argv.includes('--update-budget');

const { es } = await import(pathToFileURL(join(src, 'i18n', 'es.ts')).href);
const { en } = await import(pathToFileURL(join(src, 'i18n', 'en.ts')).href);
const { placeholdersOf } = await import(pathToFileURL(join(src, 'i18n', 'translate.ts')).href);

const errors = [];

// (a) paridad de claves y marcadores
const esKeys = new Set(Object.keys(es));
const enKeys = new Set(Object.keys(en));
for (const k of esKeys) if (!enKeys.has(k)) errors.push(`Falta en en.ts: "${k}"`);
for (const k of enKeys) if (!esKeys.has(k)) errors.push(`Falta en es.ts: "${k}"`);
for (const k of esKeys) {
  if (enKeys.has(k) && placeholdersOf(es[k]).join() !== placeholdersOf(en[k]).join()) {
    errors.push(`Marcadores distintos en "${k}": es={${placeholdersOf(es[k])}} en={${placeholdersOf(en[k])}}`);
  }
}

// archivos fuente
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (name === 'node_modules') continue;
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(tsx?|jsx?)$/.test(name)) files.push(path);
  }
};
walk(src);
const rel = (f) => relative(src, f).split(sep).join('/');

// (b) claves usadas con t('...') que no existen
const tRe = /\bt\(\s*['"`]([A-Za-z0-9_.\-]+)['"`]/g;
const used = new Set();
for (const f of files) {
  if (/__tests__/.test(f)) continue;
  const text = readFileSync(f, 'utf8');
  let m;
  while ((m = tRe.exec(text))) {
    used.add(m[1]);
    const base = m[1];
    const exists = (dict) => base in dict || `${base}_one` in dict || `${base}_other` in dict;
    if (!exists(es) || !exists(en)) errors.push(`Clave usada sin definir: "${base}" (${rel(f)})`);
  }
}

// (c) textos fijos en español (heurística) con tope por archivo
const spanishWords =
  /(Cancelar|Aceptar|Guardar|Eliminar|Volver|Continuar|Cargando|Cerrar|Iniciar|Contraseña|Correo|Prenda|Armario|Probador|Perfil|Paleta|Selecciona|Generando|Crear|Jugar|Tu |Tus |Puedes|Intenta|Por favor|Foto|Imagen|Colores|Recalibrar|Siguiente|Omitir|Error)/;
const EXCLUDE = /(__tests__|^i18n\/|mockData|ronnieSkateHtml|colorNames\.ts|colorHarmony\.ts)/;
const counts = {};
for (const f of files) {
  const r = rel(f);
  if (EXCLUDE.test(r)) continue;
  let count = 0;
  for (const raw of readFileSync(f, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('//') || line.startsWith('*') || line.startsWith('/*') || line.startsWith('console.')) continue;
    if (/\bt\(/.test(line) && !/Alert\.alert\(/.test(line)) continue; // ya traducida
    const jsxText = />\s*[^<>{}=]*[A-Za-zÁÉÍÓÚáéíóúñ¿¡]{3,}[^<>{}]*</.test(line) && spanishWords.test(line);
    const strProp = /(title|label|placeholder|message|subtitle|text|summary|accessibilityLabel)=["'{`]/.test(line) && spanishWords.test(line);
    const alertCall = /Alert\.alert\(/.test(line);
    const literal = /(['"`])[^'"`]*[áéíóúñ¿¡][^'"`]*\1/.test(line) && !/import |require\(|from '/.test(line);
    if (jsxText || strProp || alertCall || literal) count += 1;
  }
  if (count) counts[r] = count;
}

const budget = existsSync(budgetPath) ? JSON.parse(readFileSync(budgetPath, 'utf8')) : {};
if (updateBudget) {
  const next = {};
  for (const [file, n] of Object.entries(counts)) next[file] = Math.min(n, budget[file] ?? n);
  writeFileSync(budgetPath, JSON.stringify(Object.fromEntries(Object.entries(next).sort()), null, 2) + '\n');
  console.log(`Tope actualizado (${Object.keys(next).length} archivos, ${Object.values(next).reduce((a, b) => a + b, 0)} textos fijos).`);
} else {
  for (const [file, n] of Object.entries(counts)) {
    const allowed = budget[file] ?? 0;
    if (n > allowed) errors.push(`Más textos fijos en español de lo permitido en ${file}: ${n} > ${allowed}. Usa t('clave') y añade la clave a es.ts y en.ts.`);
  }
}

const total = Object.values(counts).reduce((a, b) => a + b, 0);
const unused = [...esKeys].filter((k) => !used.has(k) && !used.has(k.replace(/_(one|other)$/, ''))).length;
console.log(`i18n: ${esKeys.size} claves (es=en) · ${used.size} usadas · ${unused} sin usar · textos fijos en español: ${total} en ${Object.keys(counts).length} archivos`);

if (errors.length) {
  console.error('\nProblemas de idiomas:');
  errors.slice(0, 40).forEach((e) => console.error('  - ' + e));
  if (errors.length > 40) console.error(`  … y ${errors.length - 40} más`);
  process.exit(1);
}
