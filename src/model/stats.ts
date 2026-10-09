import type { Channel, ContactState, Step, Version } from './types'

// Roadmap item 6 — everything here is derived from contact logs.

export interface StepStats {
  entered: number
  waiting: number
  exited: number
  sent: number
  skipped: number
  opened: number
  clicked: number
  control: number
  /** outlet id → contacts that took that path */
  paths: Record<string, number>
}

export const emptyStepStats = (): StepStats => ({ entered: 0, waiting: 0, exited: 0, sent: 0, skipped: 0, opened: 0, clicked: 0, control: 0, paths: {} })

export function stepStats(states: ContactState[], steps: Step[]): Record<string, StepStats> {
  const out: Record<string, StepStats> = {}
  for (const s of steps) out[s.id] = emptyStepStats()
  for (const st of states) {
    for (const l of st.log) {
      const s = out[l.stepId]
      if (!s) continue
      if (l.kind === 'entered') s.entered++
      else if (l.kind === 'sent') s.sent++
      else if (l.kind === 'skipped') s.skipped++
      else if (l.kind === 'opened') s.opened++
      else if (l.kind === 'clicked') s.clicked++
      else if (l.kind === 'control') s.control++
      else if (l.kind === 'split' && l.outletId) s.paths[l.outletId] = (s.paths[l.outletId] ?? 0) + 1
    }
    if (st.status === 'waiting' || st.status === 'in_step') {
      const s = out[st.currentStepId]
      if (s) s.waiting++
    }
  }
  for (const s of Object.values(out)) s.exited = s.entered - s.waiting
  return out
}

export interface Totals {
  entered: number
  inside: number
  exited: number
  skipped: number
  control: number
}

export function totals(states: ContactState[]): Totals {
  const t: Totals = { entered: states.length, inside: 0, exited: 0, skipped: 0, control: 0 }
  for (const s of states) {
    if (s.status === 'waiting' || s.status === 'in_step') t.inside++
    else if (s.status === 'exited') t.exited++
    else if (s.status === 'skipped') t.skipped++
    else if (s.status === 'control') t.control++
  }
  return t
}

export interface ChannelStats {
  sent: number
  opened: number
  clicked: number
  skipped: number
}

export function channelStats(states: ContactState[], versions: Version[]): Record<Channel, ChannelStats> {
  const chanOf = new Map<string, Channel>()
  for (const v of versions) for (const s of v.steps) if (s.type === 'delivery') chanOf.set(s.id, s.delivery.channel)
  const out: Record<Channel, ChannelStats> = {
    email: { sent: 0, opened: 0, clicked: 0, skipped: 0 },
    sms: { sent: 0, opened: 0, clicked: 0, skipped: 0 },
    push: { sent: 0, opened: 0, clicked: 0, skipped: 0 },
  }
  for (const st of states)
    for (const l of st.log) {
      const c = chanOf.get(l.stepId)
      if (!c) continue
      if (l.kind === 'sent') out[c].sent++
      else if (l.kind === 'opened') out[c].opened++
      else if (l.kind === 'clicked') out[c].clicked++
      else if (l.kind === 'skipped') out[c].skipped++
    }
  return out
}

/** Sends attributed to an offer (item 4): offer id → sent / opened / clicked. */
export function offerStats(states: ContactState[], versions: Version[]): Record<string, ChannelStats> {
  const offerOf = new Map<string, string>()
  for (const v of versions) for (const s of v.steps) if (s.type === 'delivery' && s.delivery.offerId) offerOf.set(s.id, s.delivery.offerId)
  const out: Record<string, ChannelStats> = {}
  for (const st of states)
    for (const l of st.log) {
      const o = offerOf.get(l.stepId)
      if (!o) continue
      const row = (out[o] ??= { sent: 0, opened: 0, clicked: 0, skipped: 0 })
      if (l.kind === 'sent') row.sent++
      else if (l.kind === 'opened') row.opened++
      else if (l.kind === 'clicked') row.clicked++
      else if (l.kind === 'skipped') row.skipped++
    }
  return out
}

export const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0)
