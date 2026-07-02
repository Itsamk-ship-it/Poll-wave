/** Convert a duration string like "15m", "7d", "30s", "12h" to seconds. */
export function toSeconds(duration: string): number {
  const m = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!m) return parseInt(duration, 10) || 0;
  const value = parseInt(m[1], 10);
  const unit = m[2];
  const mult = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
  return value * mult;
}
