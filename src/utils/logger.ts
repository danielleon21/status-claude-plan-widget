import * as fs from 'node:fs';
import * as path from 'node:path';

// stdout es la status line: todo el logging va a un archivo, nunca a la consola.

type Level = 'debug' | 'info' | 'warn' | 'error';

let logFile: string | null = null;
let debugEnabled = false;

/** Se llama después de cargar el .env, para que WARP_WIDGET_DEBUG ya esté disponible. */
export function initLogger(cacheDir: string): void {
  logFile = path.join(cacheDir, 'widget.log');
  debugEnabled = process.env.WARP_WIDGET_DEBUG === '1';
}

function write(level: Level, message: string, err?: unknown): void {
  if (!logFile || (level === 'debug' && !debugEnabled)) return;
  const detail = err instanceof Error ? ` | ${err.name}: ${err.message}` : err ? ` | ${String(err)}` : '';
  try {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    fs.appendFileSync(logFile, `${new Date().toISOString()} [${level.toUpperCase()}] ${message}${detail}\n`);
  } catch {
    // Si no se puede escribir el log, el widget debe seguir funcionando.
  }
}

export const logger = {
  debug: (msg: string) => write('debug', msg),
  info: (msg: string) => write('info', msg),
  warn: (msg: string, err?: unknown) => write('warn', msg, err),
  error: (msg: string, err?: unknown) => write('error', msg, err),
};
