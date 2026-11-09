#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));

function findEnvPath() {
  const candidates = [
    resolve(currentDir, '..', 'Ejemplo_interfaz', 'FitGlassAI', '.env'),
    resolve(currentDir, '..', 'FitGlassAI', '.env'),
    resolve(currentDir, 'FitGlassAI', '.env'),
    resolve(process.cwd(), 'FitGlassAI', '.env'),
    resolve(process.cwd(), 'Ejemplo_interfaz', 'FitGlassAI', '.env'),
    resolve(process.cwd(), '.env'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0];
}

const envPath = findEnvPath();

function readEnv() {
  if (!existsSync(envPath)) return {};
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  const data = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      data[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  }
  return data;
}

function setProvider(arg) {
  const target = (arg || '').toLowerCase().trim();
  let provider = '';
  if (['openai', 'gpt', 'gpt-4o-mini', 'chatgpt'].includes(target)) {
    provider = 'openai';
  } else if (['gemini', 'google'].includes(target)) {
    provider = 'gemini';
  } else {
    console.error(`[-] Proveedor no reconocido: '${target}'. Usa 'gemini' o 'openai'.`);
    process.exit(1);
  }

  let lines = existsSync(envPath) ? readFileSync(envPath, 'utf8').split(/\r?\n/) : [];
  let found = false;
  lines = lines.map((l) => {
    if (l.trim().startsWith('AI_PROVIDER=') || l.trim().startsWith('VITE_AI_PROVIDER=')) {
      found = true;
      return `AI_PROVIDER=${provider}`;
    }
    return l;
  });
  if (!found) lines.unshift(`AI_PROVIDER=${provider}`);
  writeFileSync(envPath, lines.join('\n'), 'utf8');

  console.log(`\n[OK] Proveedor de IA cambiado a: [ ${provider.toUpperCase()} ]`);
  const env = readEnv();
  if (provider === 'openai') {
    console.log(`   Modelo: ${env.OPENAI_MODEL || env.VITE_OPENAI_MODEL || 'gpt-4o-mini'}`);
    console.log(`   API Key: ${env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY ? '[OK] Configurada' : '[!] Falta OPENAI_API_KEY en .env'}`);
  } else {
    console.log(`   Modelo: ${env.GEMINI_MODEL || 'gemini-3.1-flash-lite'}`);
    console.log(`   API Key: ${env.GEMINI_API_KEY ? '[OK] Configurada' : '[!] Falta GEMINI_API_KEY en .env'}`);
  }
  console.log('\nReinicia tu backend para aplicar los cambios si esta corriendo.');
}

function showStatus() {
  const env = readEnv();
  const current = (env.AI_PROVIDER || env.VITE_AI_PROVIDER || 'gemini').toUpperCase();
  console.log('\n==========================================');
  console.log('      FITGLASS AI - ESTADO DEL PROVEEDOR   ');
  console.log('==========================================');
  console.log(`  Proveedor activo actual: [ ${current} ]`);
  console.log('------------------------------------------');
  console.log(`  * Google Gemini: ${env.GEMINI_API_KEY ? '[OK] Configurada' : '[-] No configurada'} (Modelo: ${env.GEMINI_MODEL || 'gemini-3.1-flash-lite'})`);
  console.log(`  * OpenAI (GPT):  ${env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY ? '[OK] Configurada' : '[-] No configurada'} (Modelo: ${env.OPENAI_MODEL || env.VITE_OPENAI_MODEL || 'gpt-4o-mini'})`);
  console.log('==========================================\n');
  console.log('Comandos disponibles:');
  console.log('  node scripts/switch_ai.mjs gemini   -> Cambiar a Gemini');
  console.log('  node scripts/switch_ai.mjs openai   -> Cambiar a GPT (OpenAI)\n');
}

const arg = process.argv[2];
if (arg) {
  setProvider(arg);
} else {
  showStatus();
}
