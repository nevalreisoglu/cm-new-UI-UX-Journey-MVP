export function fmtDate(iso: string | undefined, withTime = false): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
  if (!withTime) return date
  return `${date} ${d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })}`
}

export const fmtNum = (n: number) => n.toLocaleString('en-CA')

export function relTime(iso: string, now: Date): string {
  const ms = now.getTime() - new Date(iso).getTime()
  const m = Math.round(ms / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 48) return `${h} h ago`
  return `${Math.round(h / 24)} d ago`
}
