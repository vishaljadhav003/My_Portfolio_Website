// All stored times are UTC strings ("YYYY-MM-DD HH:MM:SS"). Days are bucketed in the dashboard time zone.

const pad = (value) => String(value).padStart(2, "0");

export function toSqlDateTime(date) {
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  );
}

/** "YYYY-MM-DD" for the given instant in a zone that is `offsetMinutes` ahead of UTC. */
export function dayKey(date, offsetMinutes = 0) {
  return new Date(date.getTime() + offsetMinutes * 60_000).toISOString().slice(0, 10);
}

/** Every day key from `days - 1` days ago up to today, oldest first. */
export function lastDays(now, days, offsetMinutes = 0) {
  const keys = [];
  for (let i = days - 1; i >= 0; i--) {
    keys.push(dayKey(new Date(now.getTime() - i * 86_400_000), offsetMinutes));
  }
  return keys;
}
