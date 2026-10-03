import * as fs from 'node:fs';
import * as path from 'node:path';
import { CacheEntry, RateWindow } from '../types';
import { logger } from './logger';

// La caché guarda los últimos límites recibidos de cualquier sesión de Claude Code, para
// mostrarlos en sesiones que todavía no han recibido su primera respuesta.

const CACHE_FILE = 'cache.json';

export interface CachedLimits {
  fiveHour?: RateWindow;
  sevenDay?: RateWindow;
  lastUpdated: Date;
}

const serialize = (w?: RateWindow) => w && { usedPercentage: w.usedPercentage, resetsAt: w.resetsAt.toISOString() };
const deserialize = (w?: { usedPercentage: number; resetsAt: string }): RateWindow | undefined =>
  w && { usedPercentage: w.usedPercentage, resetsAt: new Date(w.resetsAt) };

export function saveCache(cacheDir: string, limits: CachedLimits): void {
  const entry: CacheEntry = {
    fiveHour: serialize(limits.fiveHour),
    sevenDay: serialize(limits.sevenDay),
    lastUpdated: limits.lastUpdated.toISOString(),
  };
  const file = path.join(cacheDir, CACHE_FILE);
  // Escritura atómica: varias status lines pueden ejecutarse a la vez.
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(entry, null, 2));
    fs.renameSync(tmp, file);
  } catch (err) {
    logger.warn('No se pudo guardar la caché', err);
    fs.rmSync(tmp, { force: true });
  }
}

export function loadCache(cacheDir: string): CachedLimits | null {
  try {
    const entry = JSON.parse(fs.readFileSync(path.join(cacheDir, CACHE_FILE), 'utf8')) as CacheEntry;
    const lastUpdated = new Date(entry.lastUpdated);
    if (Number.isNaN(lastUpdated.getTime())) return null;
    return { fiveHour: deserialize(entry.fiveHour), sevenDay: deserialize(entry.sevenDay), lastUpdated };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') logger.warn('Caché ilegible, se ignora', err);
    return null;
  }
}

/** Una ventana guardada solo sirve hasta su reset; después su porcentaje ya no es real. */
export function isCacheValid(window: RateWindow | undefined, now: Date = new Date()): window is RateWindow {
  return !!window && !Number.isNaN(window.resetsAt.getTime()) && window.resetsAt > now;
}
