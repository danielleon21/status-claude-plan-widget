/** Una ventana de límite de uso del plan (la de 5 horas o la semanal). */
export interface RateWindow {
  /** Porcentaje consumido de la ventana, de 0 a 100. */
  usedPercentage: number;
  resetsAt: Date;
}

/** Estado de los límites del plan, listo para mostrarse. */
export interface UsageSnapshot {
  plan: string;
  fiveHour?: RateWindow;
  sevenDay?: RateWindow;
  /** Cuándo llegó el dato más reciente de Claude Code. */
  lastUpdated: Date;
}

export interface WidgetConfig {
  cacheDir: string;
  plan: string;
}

/** Forma serializada de UsageSnapshot que se guarda en disco. */
export interface CacheEntry {
  fiveHour?: { usedPercentage: number; resetsAt: string };
  sevenDay?: { usedPercentage: number; resetsAt: string };
  lastUpdated: string;
}

/** Parte del JSON que Claude Code pasa por stdin a la status line. */
export interface StatusLineInput {
  rate_limits?: {
    five_hour?: { used_percentage?: number; resets_at?: number };
    seven_day?: { used_percentage?: number; resets_at?: number };
  };
}
