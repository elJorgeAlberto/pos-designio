// Suggested vacation days per the 2023 LFT reform (antigüedad table) —
// a starting point, not a certified legal calculation. Always let the
// admin override it via employees.vacation_days_override.
export function completedYearsOfService(hireDate: Date, asOf: Date = new Date()): number {
  let years = asOf.getFullYear() - hireDate.getFullYear()
  const anniversaryThisYear = new Date(asOf.getFullYear(), hireDate.getMonth(), hireDate.getDate())
  if (anniversaryThisYear > asOf) years -= 1
  return Math.max(years, 0)
}

export function lftVacationDays(completedYears: number): number {
  const n = Math.max(completedYears, 1)
  if (n <= 5) return 10 + 2 * n
  return 20 + 2 * Math.ceil((n - 5) / 5)
}

// Start of the current employment-anniversary cycle (the window vacation
// days taken should be counted against).
export function currentCycleStart(hireDate: Date, asOf: Date = new Date()): Date {
  let anniversary = new Date(asOf.getFullYear(), hireDate.getMonth(), hireDate.getDate())
  if (anniversary > asOf) {
    anniversary = new Date(asOf.getFullYear() - 1, hireDate.getMonth(), hireDate.getDate())
  }
  return anniversary
}
