// Postgres `date` columns come back as "YYYY-MM-DD" — `new Date(str)` parses
// that as UTC midnight, which renders as the previous day in any timezone
// behind UTC. Force local-midnight parsing instead.
export function parseLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// The inverse — a local Date to the "YYYY-MM-DD" string a `type="date"`
// input expects. Never use toISOString() for this: it converts to UTC
// first, which can shift the day in any timezone behind UTC (Mexico).
export function formatDateInput(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function endOfDay(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(23, 59, 59, 999)
  return copy
}

export function startOfDay(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}
