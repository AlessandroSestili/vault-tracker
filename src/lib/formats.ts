const LOCALE = 'it-IT'

export function formatCurrency(value: number | null, currency = 'EUR'): string {
  if (value === null) return '—'
  return new Intl.NumberFormat(LOCALE, { style: 'currency', currency }).format(value)
}

export function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date))
}

export function formatChartDate(day: string, compact: boolean): string {
  const d = new Date(day)
  if (compact) return new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: 'short' }).format(d)
  return new Intl.DateTimeFormat(LOCALE, { month: 'short', year: '2-digit' }).format(d)
}
