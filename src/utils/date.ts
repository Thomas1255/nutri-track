export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function parseDate(date: string) {
  return new Date(`${date}T12:00:00`)
}
export function offsetDate(date: string, days: number) {
  const value = parseDate(date)
  value.setDate(value.getDate() + days)
  return localDate(value)
}
export function dateTitle(date: string) {
  return parseDate(date).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
