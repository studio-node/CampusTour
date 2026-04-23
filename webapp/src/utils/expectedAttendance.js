const SEASONS = ['spring', 'summer', 'fall']
const OPTIONS_COUNT = 15

function termStart(season, year) {
  switch (season) {
    case 'fall':
      return new Date(year, 7, 1)
    case 'spring':
      return new Date(year, 0, 1)
    case 'summer':
      return new Date(year, 5, 1)
    default:
      return new Date(0)
  }
}

/**
 * @returns {{ value: string, label: string }[]}
 */
export function getExpectedAttendanceOptions() {
  const now = Date.now()
  const terms = []
  const startY = new Date().getFullYear() - 1
  const endY = new Date().getFullYear() + 8
  for (let y = startY; y <= endY; y++) {
    for (const s of SEASONS) {
      const d = termStart(s, y)
      const value = `${s}_${y}`
      const cap = s.charAt(0).toUpperCase() + s.slice(1)
      terms.push({ value, label: `${cap} ${y}`, start: d.getTime() })
    }
  }
  terms.sort((a, b) => a.start - b.start)
  const firstIdx = terms.findIndex((t) => t.start > now)
  const idx = firstIdx === -1 ? 0 : firstIdx
  return terms.slice(idx, idx + OPTIONS_COUNT).map(({ value, label }) => ({ value, label }))
}

export function formatExpectedAttendanceLabel(value) {
  const m = String(value)
    .trim()
    .toLowerCase()
    .match(/^(fall|spring|summer)_([0-9]{4})$/)
  if (!m) return value
  const cap = m[1].charAt(0).toUpperCase() + m[1].slice(1)
  return `${cap} ${m[2]}`
}
