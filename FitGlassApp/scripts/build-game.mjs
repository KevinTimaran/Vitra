// Genera src/components/WaitingGame/ronnieSkateHtml.ts a partir de assets/games/ronnie-skate.src.html.
//
// El juego original carga Tailwind (CDN) y la fuente "Press Start 2P" (Google Fonts) por red. En la app debe
// funcionar sin depender de CDN, así que este script:
//   1. compila el CSS de Tailwind una sola vez (npx tailwindcss@3.4.17, no es dependencia del proyecto);
//   2. incrusta la fuente en base64;
//   3. aplica ajustes para móvil (sonido silenciado al inicio, canvas sin deformarse, puente con React Native).
//
// Uso:
//   node scripts/build-game.mjs           -> versión SIN CDN (requiere internet UNA vez: npm + Google Fonts)
//   node scripts/build-game.mjs --local   -> sin descargar nada: conserva los enlaces CDN del original (el juego
//                                            necesita internet al abrirse; útil mientras no se compila el CSS)
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcPath = join(root, 'assets', 'games', 'ronnie-skate.src.html');
const outPath = join(root, 'src', 'components', 'WaitingGame', 'ronnieSkateHtml.ts');

const LOCAL_ONLY = process.argv.includes('--local');
// El HTML original tiene saltos de línea de Windows (CRLF): se normalizan para que los anclajes coincidan.
let html = readFileSync(srcPath, 'utf8').split('\r\n').join('\n');

// 1) Quitar dependencias de red
if (!LOCAL_ONLY) html = html
  .replace(/<script src="https:\/\/cdn\.tailwindcss\.com[^"]*"><\/script>\s*/, '')
  .replace(/<link rel="preconnect"[^>]*>\s*/g, '')
  .replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>\s*/, '');

let tailwindCss = '';
let fontFace = '';

if (!LOCAL_ONLY) {
  // 2) CSS de Tailwind
  const tmp = mkdtempSync(join(tmpdir(), 'vitra-game-'));
  const tmpHtml = join(tmp, 'game.html');
  const input = join(tmp, 'input.css');
  const config = join(tmp, 'tailwind.config.cjs');
  const outCss = join(tmp, 'out.css');
  writeFileSync(tmpHtml, html);
  writeFileSync(input, '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n');
  writeFileSync(config, `module.exports = { content: [${JSON.stringify(tmpHtml)}], corePlugins: { preflight: true } };\n`);
  execFileSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['--yes', 'tailwindcss@3.4.17', '-c', config, '-i', input, '-o', outCss, '--minify'],
    { stdio: 'inherit', shell: process.platform === 'win32' }
  );
  tailwindCss = readFileSync(outCss, 'utf8');

  // 3) Fuente en base64 (OFL)
  const cssRes = await fetch('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap', {
    headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1' },
  });
  const fontCss = await cssRes.text();
  const fontUrl = fontCss.match(/url\((https:[^)]+)\)/)?.[1];
  if (!fontUrl) throw new Error('No se encontró la URL de la fuente en Google Fonts');
  const fontBuffer = Buffer.from(await (await fetch(fontUrl)).arrayBuffer());
  fontFace = `@font-face{font-family:'Press Start 2P';font-style:normal;font-weight:400;font-display:swap;src:url(data:font/woff2;base64,${fontBuffer.toString('base64')}) format('woff2');}`;

}

// 4) Ajustes móviles
const extraCss = `
html,body{height:100%;margin:0;background:#241e3d;overflow:hidden;overscroll-behavior:none;-webkit-tap-highlight-color:transparent}
body{display:block !important;padding:0 !important}
/* Marco: ocupa toda la pantalla vertical, sin bordes ni esquinas de escritorio */
#game-wrapper{max-width:none !important;max-height:none !important;width:100% !important;height:100% !important;border:0 !important;border-radius:0 !important;box-shadow:none !important}
/* Escenario 16:9 de ancho completo; el resto de la altura es para los botones táctiles */
#canvas-container{flex:none !important;width:100% !important;height:auto !important;aspect-ratio:16/9}
#gameCanvas{object-fit:contain}
#touch-controls{flex:1 !important;min-height:0;padding:14px !important;gap:12px !important;align-items:stretch !important}
#touch-controls button{height:100% !important;max-height:190px;min-height:92px;font-size:15px}
#touch-controls button span:first-child{font-size:24px !important}
#touch-controls button span:last-child{font-size:10px !important;margin-top:6px !important}
/* HUD compacto: estrellas, vidas, puntos y botones */
header{padding:8px 10px !important;gap:6px}
#btn-crt,#speed-box,#hud-title{display:none !important}
#rec-chip{font-size:10px;white-space:nowrap}
header button{min-width:40px;min-height:40px}
/* Menús (inicio, pausa, game over) cubren TODA la pantalla, no solo el escenario */
#start-screen,#game-over-screen,#pause-screen{position:fixed !important;inset:0 !important;overflow-y:auto;justify-content:flex-start !important;padding:24px 18px !important}
#start-screen h1{font-size:20px !important;line-height:1.6 !important}
#start-screen p{font-size:10px !important;line-height:1.8 !important}
#start-screen .text-\[9px\],#start-screen .text-\[10px\],#start-screen .text-xs{font-size:10px !important;line-height:1.7 !important}
#btn-play,#btn-restart,#btn-resume{min-height:56px;font-size:13px !important}
#start-screen *,#game-over-screen *,#pause-screen *{overflow-wrap:anywhere}
`;
html = html.replace('</head>', `<style>${fontFace}${tailwindCss}${extraCss}</style>\n</head>`);

// ---- RÉCORD A SUPERAR -------------------------------------------------------------------------------------
// El récord lo guarda la app (por usuario) y se inyecta como window.__VITRA_RECORD antes de cargar el juego.
// El juego lo muestra (inicio y HUD), avisa en cuanto se supera y envía las puntuaciones a React Native.
const must = (source, from, to, label) => {
  if (!source.includes(from)) throw new Error('No se encontró el punto de anclaje del juego: ' + label);
  return source.replace(from, to);
};

// 1) Récord inicial: el mayor entre el de la app y el guardado en el navegador
html = must(html,
  "highScore = parseInt(localStorage.getItem('ronnie_high_score') || '0', 10);\n    } catch(e) {}",
  "highScore = parseInt(localStorage.getItem('ronnie_high_score') || '0', 10);\n    } catch(e) {}\n    if (window.__VITRA_RECORD && window.__VITRA_RECORD > highScore) highScore = Math.floor(window.__VITRA_RECORD);\n    let recordBroken = false;\n    let recordToBeat = highScore; // el récord con el que empieza la partida\n    function vitraSend(msg) { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }",
  'highScore');

// 2) Chip de récord en el HUD (junto a los puntos)
html = must(html,
  "<!-- Action Buttons -->",
  '<div id="rec-chip" class="bg-[#2d264f] px-2 py-1 rounded border border-[#524982] text-[#1dd1a1]"><span class="text-[9px] text-[#b0a8d6] mr-1">REC:</span><span id="rec-display">0</span></div>\n        <!-- Action Buttons -->',
  'HUD');

// 3) Aviso "¡NUEVO RÉCORD!" durante la partida (sobre el escenario)
html = must(html,
  '<div id="trick-banner"',
  '<div id="record-banner" class="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none z-30 opacity-0 transition-opacity duration-300 text-center"><div class="px-3 py-2 rounded-xl border-2 border-[#feca57] bg-[#1e1933]/95 text-[#feca57] text-xs font-bold">🏆 ¡NUEVO RÉCORD!</div></div>\n      <div id="trick-banner"',
  'banner');

// 4) Pantalla de inicio: récord a superar
html = must(html,
  '<button id="btn-play"',
  '<div id="start-record" class="w-full mb-3 py-2.5 rounded-xl border-2 border-[#feca57]/60 bg-[#2d264f] text-center text-[10px] text-[#feca57] font-bold"></div>\n          <button id="btn-play"',
  'inicio');

// 5) Fin de partida: insignia de nuevo récord
html = must(html,
  '<span>MEJOR RÉCORD:</span>',
  '<span id="new-record-badge" class="hidden text-[#feca57] font-bold">🏆 ¡NUEVO RÉCORD!</span><span>MEJOR RÉCORD:</span>',
  'game over');

// 6) Lógica: refrescar el récord, avisar al superarlo y enviar puntuaciones
html = must(html,
  "function updateHUD() {\n      scoreDisplay.textContent = String(Math.floor(score)).padStart(5, '0');",
  `function refreshRecordUI() {
      const rec = document.getElementById('rec-display');
      if (rec) rec.textContent = recordBroken ? Math.floor(score) : recordToBeat;
      const startRec = document.getElementById('start-record');
      if (startRec) startRec.textContent = recordToBeat > 0 ? '🏆 RÉCORD A SUPERAR: ' + recordToBeat : '🏆 AÚN SIN RÉCORD: ¡ESTABLÉCELO!';
      const chip = document.getElementById('rec-chip');
      if (chip) chip.style.borderColor = recordBroken ? '#feca57' : '';
    }

    function updateHUD() {
      if (Math.floor(score) < 1) { recordBroken = false; recordToBeat = highScore; }
      if (!recordBroken && recordToBeat > 0 && Math.floor(score) > recordToBeat) {
        recordBroken = true;
        const banner = document.getElementById('record-banner');
        if (banner) { banner.style.opacity = '1'; setTimeout(() => { banner.style.opacity = '0'; }, 2600); }
        vitraSend({ type: 'record', score: Math.floor(score) });
      }
      refreshRecordUI();
      scoreDisplay.textContent = String(Math.floor(score)).padStart(5, '0');`,
  'updateHUD');

html = must(html,
  "if (score > highScore) {\n        highScore = Math.floor(score);",
  "const wasNewRecord = Math.floor(score) > highScore;\n      if (score > highScore) {\n        highScore = Math.floor(score);",
  'gameover1');
html = must(html,
  "finalScoreEl.textContent = Math.floor(score);\n      highScoreEl.textContent = highScore;",
  "finalScoreEl.textContent = Math.floor(score);\n      highScoreEl.textContent = highScore;\n      const badge = document.getElementById('new-record-badge');\n      if (badge) badge.classList.toggle('hidden', !wasNewRecord);\n      vitraSend({ type: 'gameover', score: Math.floor(score), best: highScore, newRecord: wasNewRecord });\n      recordToBeat = highScore; recordBroken = false; refreshRecordUI();",
  'gameover2');

// Muestra el récord desde el primer momento (antes de la primera partida)
html = html.replace('</body>', '<script>try { if (typeof refreshRecordUI === "function") refreshRecordUI(); } catch (e) {}</script>\n</body>');

// Marcas (ids) para el CSS móvil
html = html.replace('<span class="text-[#a4aeff] font-bold tracking-wider">RONNIE SKATE</span>', '<span id="hud-title" class="text-[#a4aeff] font-bold tracking-wider">RONNIE SKATE</span>');
html = html.replace('<div class="absolute bottom-3 left-3 bg-[#1e1933]/90', '<div id="speed-box" class="absolute bottom-3 left-3 bg-[#1e1933]/90');
html = html.replace('<div class="w-full bg-[#1e1933] border-t-2 border-[#4c4573] p-2.5 flex items-center justify-around gap-2 select-none z-30">', '<div id="touch-controls" class="w-full bg-[#1e1933] border-t-2 border-[#4c4573] p-2.5 flex items-center justify-around gap-2 select-none z-30">');

// Sonido desactivado al inicio (en móvil el audio inesperado molesta); el botón 🔊 lo activa.
html = html.replace('this.muted = false;', 'this.muted = true;').replace('<span id="sound-icon">🔊</span>', '<span id="sound-icon">🔇</span>');

// Instrucciones: en el móvil se usan los botones de abajo.
html = html.replace('ESPACIO / ARRIBA / W:', 'BOTÓN SALTO (o ESPACIO):').replace('TECLA X / K:', 'BOTÓN TRUCO (o X):').replace('ABAJO / S:', 'BOTÓN DESLIZAR (o S):');

// Puente con React Native: avisa del estado y la puntuación, y permite pausar desde fuera.
const bridge = `
<script>
  (function () {
    function send(msg) { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }
    window.__vitraPause = function () { var b = document.getElementById('btn-pause'); var p = document.getElementById('pause-screen'); if (b && p && p.classList.contains('hidden')) b.click(); };
    var best = 0;
    setInterval(function () {
      var el = document.getElementById('score-display');
      var score = el ? parseInt(el.textContent, 10) || 0 : 0;
      if (score > best) { best = score; send({ type: 'score', score: score }); }
    }, 2000);
    send({ type: 'ready' });
  })();
</script>`;
html = html.replace('</body>', `${bridge}\n</body>`);

writeFileSync(
  outPath,
  `// GENERADO por scripts/build-game.mjs a partir de assets/games/ronnie-skate.src.html. No editar a mano.\n` +
    `export const RONNIE_SKATE_HTML: string = ${JSON.stringify(html)};\n`
);
console.log(`OK -> ${outPath} (${(html.length / 1024).toFixed(0)} KB)`);
