const UNITS = ["B", "KB", "MB", "GB", "TB"];

/** 1536 → "1,5 KB". Unknown or negative sizes (JDownloader sends -1) show as "–". */
export function bytes(value: number | undefined | null): string {
  if (value === undefined || value === null || value < 0) return "–";
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < UNITS.length - 1) {
    size /= 1024;
    unit++;
  }
  const digits = unit === 0 || size >= 100 ? 0 : 1;
  return `${size.toLocaleString("es", { maximumFractionDigits: digits, minimumFractionDigits: digits })} ${UNITS[unit]}`;
}

export function speed(value: number | undefined | null): string {
  if (!value || value <= 0) return "0 B/s";
  return `${bytes(value)}/s`;
}

/** Seconds left → "1h 05m", "4m 09s", "12s". Unknown (≤ 0) shows as "". */
export function eta(seconds: number | undefined | null): string {
  if (!seconds || seconds <= 0 || !Number.isFinite(seconds)) return "";
  const s = Math.round(seconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, "0")}s`;
  return `${sec}s`;
}

/** Milliseconds of uptime → "3d 4h", "2h 10m", "5m". */
export function duration(ms: number | undefined | null): string {
  if (!ms || ms <= 0) return "–";
  const minutes = Math.floor(ms / 60000);
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Loaded out of total as 0–100, or null when the total is unknown. */
export function percent(loaded: number | undefined, total: number | undefined): number | null {
  if (!total || total <= 0 || loaded === undefined || loaded < 0) return null;
  return Math.min(100, (loaded / total) * 100);
}

/** A timestamp in ms → "21 nov 2026, 14:05". JDownloader sends -1 or 0 for "never". */
export function dateTime(ms: number | undefined | null): string {
  if (!ms || ms <= 0) return "–";
  return new Date(ms).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" });
}

export function date(ms: number | undefined | null): string {
  if (!ms || ms <= 0) return "–";
  return new Date(ms).toLocaleDateString("es", { dateStyle: "medium" });
}

/** "SOME_ENUM_VALUE" → "Some enum value". */
export function enumLabel(value: string): string {
  const text = value.toLowerCase().replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
