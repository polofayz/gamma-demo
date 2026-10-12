import { DEMO_DATE } from './types'

export function formatMoney(value: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(value))} сум`
}

export function formatQty(value: number, unit?: string): string {
  const n = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 }).format(value)
  return unit ? `${n} ${unit}` : n
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'Срок не задан'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

export function formatDateTime(iso: string): string {
  const time = iso.length > 10 ? iso.slice(11, 16) : ''
  return time ? `${formatDate(iso)} ${time}` : formatDate(iso)
}

export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from.slice(0, 10)}T00:00:00Z`)
  const b = Date.parse(`${to.slice(0, 10)}T00:00:00Z`)
  return Math.round((b - a) / 86_400_000)
}

export function daysOverdue(due: string, today = DEMO_DATE): number {
  if (due >= today) return 0
  return daysBetween(due, today)
}

export function daysOnStage(entered: string, today = DEMO_DATE): string {
  const days = Math.max(0, daysBetween(entered, today))
  if (days === 0) return 'менее суток'
  if (days % 10 === 1 && days % 100 !== 11) return `${days} день`
  if ([2, 3, 4].includes(days % 10) && ![12, 13, 14].includes(days % 100)) return `${days} дня`
  return `${days} дней`
}

export function formatDuration(sec: number): string {
  if (!sec) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (!m) return `${s} сек`
  return `${m} мин ${s} сек`
}

export function sameRoute(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}
