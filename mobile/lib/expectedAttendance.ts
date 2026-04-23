const SEASONS = ['spring', 'summer', 'fall'] as const;
type Season = (typeof SEASONS)[number];

function termStart(season: Season, year: number): Date {
  switch (season) {
    case 'fall':
      return new Date(year, 7, 1);
    case 'spring':
      return new Date(year, 0, 1);
    case 'summer':
      return new Date(year, 5, 1);
    default:
      return new Date(0);
  }
}

const OPTIONS_COUNT = 15; // 5 years × 3 semesters

/**
 * Next N upcoming semesters after today (chronological), for expected attendance.
 */
export function getExpectedAttendanceOptions(): { value: string; label: string }[] {
  const now = Date.now();
  const terms: { value: string; label: string; start: number }[] = [];
  const startY = new Date().getFullYear() - 1;
  const endY = new Date().getFullYear() + 8;
  for (let y = startY; y <= endY; y++) {
    for (const s of SEASONS) {
      const d = termStart(s, y);
      const value = `${s}_${y}`;
      const cap = s.charAt(0).toUpperCase() + s.slice(1);
      terms.push({ value, label: `${cap} ${y}`, start: d.getTime() });
    }
  }
  terms.sort((a, b) => a.start - b.start);
  const firstIdx = terms.findIndex((t) => t.start > now);
  const idx = firstIdx === -1 ? 0 : firstIdx;
  return terms.slice(idx, idx + OPTIONS_COUNT).map(({ value, label }) => ({ value, label }));
}

/**
 * User-facing label for a stored DB value (e.g. `fall_2026` -> `Fall 2026`).
 */
export function formatExpectedAttendanceLabel(value: string): string {
  const m = value.trim().toLowerCase().match(/^(fall|spring|summer)_([0-9]{4})$/);
  if (!m) return value;
  const cap = m[1].charAt(0).toUpperCase() + m[1].slice(1);
  return `${cap} ${m[2]}`;
}
