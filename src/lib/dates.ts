// Postgres `date` columns come back as "YYYY-MM-DD" — `new Date(str)` parses
// that as UTC midnight, which renders as the previous day in any timezone
// behind UTC. Force local-midnight parsing instead.
export function parseLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}
