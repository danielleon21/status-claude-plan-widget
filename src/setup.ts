#!/usr/bin/env node
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as readline from 'node:readline/promises';

// Instalador: configura este widget como status line de Claude Code.
//   npm run setup                  -> pregunta el plan y escribe settings.json
//   npm run setup -- --plan max    -> sin preguntas
//   npm run setup -- --force       -> reemplaza una status line que no es de este widget
//   npm run setup:remove           -> quita la status line de este widget

const PROJECT_DIR = path.resolve(__dirname, '..');
const ENTRY = path.join(PROJECT_DIR, 'dist', 'index.js');
const ENV_FILE = path.join(PROJECT_DIR, '.env');
const ENV_EXAMPLE = path.join(PROJECT_DIR, '.env.example');
const MARKER = 'warp-token-monitor';
const PLANS = ['pro', 'max'];

type Settings = Record<string, unknown> & { statusLine?: { type?: string; command?: string; refreshInterval?: number } };

function settingsPath(): string {
  const configDir = process.env.CLAUDE_CONFIG_DIR?.split(',')[0]?.trim() || path.join(os.homedir(), '.claude');
  return path.join(configDir, 'settings.json');
}

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

function readSettings(file: string): Settings {
  if (!fs.existsSync(file)) return {};
  const text = fs.readFileSync(file, 'utf8');
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    fail(`${file} no es JSON válido. Corrígelo a mano y vuelve a ejecutar el instalador.`);
  }
}

function writeAtomic(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
}

/** Es nuestra si apunta a este proyecto o a otra copia de warp-token-monitor. */
const isOurs = (settings: Settings) =>
  !!settings.statusLine?.command && [ENTRY, MARKER].some((m) => settings.statusLine!.command!.includes(m));

/**
 * Ruta absoluta de node, preferentemente la del PATH (p. ej. /opt/homebrew/bin/node) si apunta
 * al mismo binario: process.execPath incluye la versión y se rompería al actualizar node.
 */
function nodePath(): string {
  const real = fs.realpathSync(process.execPath);
  for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
    const candidate = path.join(dir, process.platform === 'win32' ? 'node.exe' : 'node');
    try {
      if (!dir.includes('node_modules') && fs.realpathSync(candidate) === real) return candidate;
    } catch {
      // No existe en este directorio.
    }
  }
  return process.execPath;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function currentPlan(): string | undefined {
  if (!fs.existsSync(ENV_FILE)) return undefined;
  return fs.readFileSync(ENV_FILE, 'utf8').match(/^CLAUDE_PLAN=(.*)$/m)?.[1]?.trim();
}

async function askPlan(fallback: string): Promise<string> {
  if (!process.stdin.isTTY) return fallback;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`¿Qué plan de Claude tienes? (${PLANS.join('/')}) [${fallback}]: `)).trim();
  rl.close();
  return answer || fallback;
}

/** Crea .env desde .env.example si no existe y fija CLAUDE_PLAN. */
function writePlan(plan: string): void {
  let env = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : fs.readFileSync(ENV_EXAMPLE, 'utf8');
  env = /^CLAUDE_PLAN=.*$/m.test(env) ? env.replace(/^CLAUDE_PLAN=.*$/m, `CLAUDE_PLAN=${plan}`) : `CLAUDE_PLAN=${plan}\n${env}`;
  fs.writeFileSync(ENV_FILE, env);
}

async function install(file: string): Promise<void> {
  if (!fs.existsSync(ENTRY)) fail('No existe dist/index.js. Ejecuta primero `npm install`.');

  const settings = readSettings(file);
  if (settings.statusLine && !isOurs(settings) && !process.argv.includes('--force')) {
    console.error('Ya tienes otra status line configurada:');
    console.error(`  ${JSON.stringify(settings.statusLine)}`);
    fail('Para reemplazarla, ejecuta `npm run setup -- --force`.');
  }

  const plan = (arg('plan') ?? (await askPlan(currentPlan() ?? 'pro'))).toLowerCase();
  if (!PLANS.includes(plan)) console.warn(`⚠ Plan "${plan}" no reconocido; se mostrará tal cual.`);
  writePlan(plan);

  // Ruta absoluta de node: Claude Code puede no heredar el PATH de nvm, fnm, etc.
  settings.statusLine = {
    type: 'command',
    command: `"${nodePath()}" "${ENTRY}"`,
    refreshInterval: 60,
  };
  writeAtomic(file, `${JSON.stringify(settings, null, 2)}\n`);

  console.log(`✔ Status line configurada en ${file}`);
  console.log(`✔ Plan: ${plan} (cámbialo en ${ENV_FILE} o vuelve a ejecutar el instalador)`);
  console.log('  Aparecerá en Claude Code tras la primera respuesta de la sesión.');
}

function uninstall(file: string): void {
  const settings = readSettings(file);
  if (!isOurs(settings)) {
    console.log('No hay ninguna status line de este widget configurada; no se cambia nada.');
    return;
  }
  delete settings.statusLine;
  writeAtomic(file, `${JSON.stringify(settings, null, 2)}\n`);
  console.log(`✔ Status line eliminada de ${file}`);
}

const file = settingsPath();
if (process.argv.includes('--uninstall')) {
  uninstall(file);
} else {
  install(file).catch((err) => fail(err instanceof Error ? err.message : String(err)));
}
