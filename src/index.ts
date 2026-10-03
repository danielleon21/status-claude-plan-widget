#!/usr/bin/env node
import * as os from 'node:os';
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import { parseRateLimits, readStdin } from './api/rateLimits';
import { WidgetConfig } from './types';
import { renderStatusLine, renderWarning } from './utils/formatter';
import { initLogger, logger } from './utils/logger';
import { isCacheValid, loadCache, saveCache } from './utils/storage';

// Se ejecuta como status line de Claude Code: Claude Code lo lanza en cada actualización
// (y cada `refreshInterval` segundos), le pasa JSON de la sesión por stdin y muestra la
// primera línea de stdout.

// El .env vive junto al proyecto, no en el directorio de la sesión de Claude Code.
dotenv.config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });

function expandHome(p: string): string {
  return p === '~' || p.startsWith('~/') ? path.join(os.homedir(), p.slice(1)) : p;
}

function loadConfig(): WidgetConfig {
  return {
    cacheDir: expandHome(process.env.WARP_WIDGET_CACHE_DIR || '~/.warp-token-monitor'),
    plan: process.env.CLAUDE_PLAN || 'pro',
  };
}

async function main(): Promise<string> {
  const config = loadConfig();
  initLogger(config.cacheDir);

  const stdin = await readStdin();
  logger.debug(`stdin: ${stdin}`);
  const now = new Date();
  const fresh = parseRateLimits(stdin);
  const cached = loadCache(config.cacheDir);

  // Lo que llega en esta ejecución manda; lo que falte se completa con la caché si no ha vencido.
  const fiveHour = fresh.fiveHour ?? (isCacheValid(cached?.fiveHour, now) ? cached?.fiveHour : undefined);
  const sevenDay = fresh.sevenDay ?? (isCacheValid(cached?.sevenDay, now) ? cached?.sevenDay : undefined);
  const hasFresh = !!(fresh.fiveHour || fresh.sevenDay);

  if (!fiveHour && !sevenDay) {
    return renderWarning('Sin datos de límites todavía (llegan tras la primera respuesta)');
  }

  const lastUpdated = hasFresh ? now : cached!.lastUpdated;
  if (hasFresh) saveCache(config.cacheDir, { fiveHour, sevenDay, lastUpdated });

  return renderStatusLine({ plan: config.plan, fiveHour, sevenDay, lastUpdated }, !hasFresh, now);
}

main()
  .catch((err) => {
    logger.error('Fallo inesperado', err);
    return renderWarning('Error inesperado');
  })
  .then((line) => {
    process.stdout.write(`${line}\n`);
    process.exit(0);
  });
