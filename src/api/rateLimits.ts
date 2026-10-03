import { RateWindow, StatusLineInput } from '../types';
import { logger } from '../utils/logger';

// Claude Code incluye en el JSON de la status line los límites reales del plan
// (rate_limits.five_hour y rate_limits.seven_day) para suscriptores Pro y Max, a partir de
// la primera respuesta de la sesión. Cada ventana puede faltar por separado.

export interface RateLimits {
  fiveHour?: RateWindow;
  sevenDay?: RateWindow;
}

function parseWindow(raw: { used_percentage?: number; resets_at?: number } | undefined): RateWindow | undefined {
  if (typeof raw?.used_percentage !== 'number' || typeof raw.resets_at !== 'number') return undefined;
  return { usedPercentage: raw.used_percentage, resetsAt: new Date(raw.resets_at * 1000) };
}

/** Extrae las ventanas del JSON de stdin. Texto vacío o inválido = sin datos. */
export function parseRateLimits(stdin: string): RateLimits {
  if (!stdin.trim()) return {};
  let input: StatusLineInput;
  try {
    input = JSON.parse(stdin);
  } catch (err) {
    logger.warn('JSON de stdin inválido', err);
    return {};
  }
  return {
    fiveHour: parseWindow(input.rate_limits?.five_hour),
    sevenDay: parseWindow(input.rate_limits?.seven_day),
  };
}

/** Lee todo stdin. Si se ejecuta a mano (TTY) o no llega nada en `timeoutMs`, devuelve lo que haya. */
export async function readStdin(timeoutMs = 500): Promise<string> {
  if (process.stdin.isTTY) return '';
  return new Promise((resolve) => {
    let data = '';
    const done = () => resolve(data);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk)).once('end', done).once('error', done);
    setTimeout(done, timeoutMs).unref();
  });
}
