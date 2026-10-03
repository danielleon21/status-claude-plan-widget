import { ContextUsage, RateWindow, StatusLineInput } from '../types';
import { logger } from '../utils/logger';

// Claude Code incluye en el JSON de la status line los límites reales del plan
// (rate_limits.five_hour y rate_limits.seven_day) para suscriptores Pro y Max, a partir de
// la primera respuesta de la sesión. Cada ventana puede faltar por separado.
// También incluye context_window, con lo que ocupa el contexto de la sesión actual.

export interface RateLimits {
  fiveHour?: RateWindow;
  sevenDay?: RateWindow;
  context?: ContextUsage;
}

function parseWindow(raw: { used_percentage?: number; resets_at?: number } | undefined): RateWindow | undefined {
  if (typeof raw?.used_percentage !== 'number' || typeof raw.resets_at !== 'number') return undefined;
  return { usedPercentage: raw.used_percentage, resetsAt: new Date(raw.resets_at * 1000) };
}

function parseContext(raw: StatusLineInput['context_window']): ContextUsage | undefined {
  const size = raw?.context_window_size;
  const pct = raw?.used_percentage;
  // used_percentage llega null hasta la primera llamada a la API de la sesión.
  if (typeof size !== 'number' || size <= 0 || typeof pct !== 'number') return undefined;
  const u = raw?.current_usage;
  const usedTokens = u
    ? (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0)
    : Math.round((pct / 100) * size);
  return { usedPercentage: pct, usedTokens, size };
}

/** Extrae las ventanas y el contexto del JSON de stdin. Texto vacío o inválido = sin datos. */
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
    context: parseContext(input.context_window),
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
