#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backendDir = join(repoRoot, 'FitGlassAI');
const frontendDir = join(repoRoot, 'FitGlassApp');
const backendEnv = join(backendDir, '.env');
const backendEnvExample = join(backendDir, '.env.example');
const venvDir = join(backendDir, '.venv');
const windows = process.platform === 'win32';

const args = new Set(process.argv.slice(2));
const skipBackend = args.has('--skip-backend');
const skipFrontend = args.has('--skip-frontend');
const unknownArgs = [...args].filter((arg) => !['--skip-backend', '--skip-frontend'].includes(arg));

if (unknownArgs.length) {
  console.error(`Argumentos desconocidos: ${unknownArgs.join(', ')}`);
  console.error('Uso: node scripts/setup.mjs [--skip-backend] [--skip-frontend]');
  process.exit(2);
}

function run(command, commandArgs, cwd) {
  console.log(`\n> ${command} ${commandArgs.join(' ')}`);
  const result = spawnSync(command, commandArgs, { cwd, stdio: 'inherit', shell: windows });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`El comando terminó con código ${result.status ?? 'desconocido'}.`);
  }
}

function findPython() {
  const candidates = windows
    ? [['py', ['-3.12']], ['py', ['-3.11']], ['py', ['-3.10']], ['py', ['-3']], ['python', []]]
    : [['python3', []], ['python', []]];

  for (const [command, prefixArgs] of candidates) {
    const result = spawnSync(command, [...prefixArgs, '--version'], { stdio: 'ignore', shell: windows });
    if (result.status === 0) return { command, prefixArgs };
  }

  throw new Error('No encontré Python. Instala Python 3.10 o superior y vuelve a ejecutar el script.');
}

try {
  if (!skipBackend) {
    if (!existsSync(join(backendDir, 'pyproject.toml'))) throw new Error(`No encuentro ${backendDir}/pyproject.toml`);
    if (!existsSync(backendEnv) && existsSync(backendEnvExample)) {
      copyFileSync(backendEnvExample, backendEnv);
      console.log('Creé FitGlassAI/.env desde .env.example. Añade ahí tus propias claves de API.');
    } else if (!existsSync(backendEnv)) {
      console.log('No existe FitGlassAI/.env.example; el backend usará valores predeterminados hasta configurarlo.');
    }

    const python = findPython();
    if (!existsSync(venvDir)) run(python.command, [...python.prefixArgs, '-m', 'venv', venvDir], backendDir);
    const venvPython = join(venvDir, windows ? 'Scripts/python.exe' : 'bin/python');
    run(venvPython, ['-m', 'pip', 'install', '--upgrade', 'pip'], backendDir);
    run(venvPython, ['-m', 'pip', 'install', '-e', '.'], backendDir);
  }

  if (!skipFrontend) {
    if (!existsSync(join(frontendDir, 'package-lock.json'))) throw new Error('No encuentro package-lock.json de FitGlassApp.');
    run('npm', ['ci'], frontendDir);
  }

  console.log('\nPreparación terminada.');
  console.log('Backend: cd FitGlassAI && .venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000');
  console.log('Frontend: cd FitGlassApp && npm start');
  if (windows) console.log('En Windows, el Python del entorno está en FitGlassAI\\.venv\\Scripts\\python.exe.');
  console.log('Para usar el móvil, configura EXPO_PUBLIC_API_BASE_URL con la IP o URL alcanzable del backend.');
} catch (error) {
  console.error(`\nError de preparación: ${error.message}`);
  process.exit(1);
}
