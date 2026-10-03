import { RateWindow, UsageSnapshot } from '../types';

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';

const pad = (n: number) => String(n).padStart(2, '0');

export function formatPercentage(percentage: number): string {
  return `${Math.round(percentage)}%`;
}

/** Fecha local en formato YYYY-MM-DD. */
export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Hoy -> "15:40"; otro día -> "10-08 15:40". */
export function formatReset(date: Date, now: Date = new Date()): string {
  const sameDay = formatDate(date) === formatDate(now);
  return sameDay ? formatTime(date) : `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${formatTime(date)}`;
}

/** Verde 0-50%, amarillo 50-80%, rojo > 80%. */
export function getColorCode(percentage: number): string {
  if (percentage > 80) return RED;
  if (percentage >= 50) return YELLOW;
  return GREEN;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function renderWindow(label: string, window: RateWindow | undefined, now: Date): string {
  if (!window) return `${label}: ${DIM}—${RESET}`;
  const pct = `${getColorCode(window.usedPercentage)}${formatPercentage(window.usedPercentage)}${RESET}`;
  return `${label}: ${pct} ${DIM}(reset ${formatReset(window.resetsAt, now)})${RESET}`;
}

/**
 * [Claude] Pro | 5h: 23% (reset 15:40) | Semana: 41% (reset 10-08 14:00) | 13:45
 * Con `stale`, la hora se marca con ⚠: el dato viene de caché, no de esta sesión.
 */
export function renderStatusLine(usage: UsageSnapshot, stale = false, now: Date = new Date()): string {
  const updated = `${stale ? '⚠ ' : ''}${formatTime(usage.lastUpdated)}`;
  return [
    `[Claude] ${capitalize(usage.plan)}`,
    renderWindow('5h', usage.fiveHour, now),
    renderWindow('Semana', usage.sevenDay, now),
    `${DIM}${updated}${RESET}`,
  ].join(' | ');
}

export function renderWarning(message: string): string {
  return `[Claude] ${YELLOW}⚠ ${message}${RESET}`;
}
