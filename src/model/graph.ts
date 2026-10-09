import type {
  Channel,
  Journey,
  Language,
  MessageContent,
  Outlet,
  Step,
  StepType,
  Version,
} from './types'

let counter = 1000
export const uid = (prefix: string) => `${prefix}-${(counter++).toString(36)}`

export const STEP_LABEL: Record<StepType, string> = {
  event: 'Event',
  message: 'Message',
  wait: 'Wait',
  segmentSplit: 'Segment split',
  engagementSplit: 'Engagement split',
  shuffleSplit: 'Shuffle split',
  controlGroup: 'Control group',
  exit: 'Exit',
}

export const CHANNEL_LABEL: Record<Channel, string> = { email: 'Email', sms: 'SMS', push: 'Push' }

export function emptyContent(channel: Channel): MessageContent {
  if (channel === 'email') return { subject: '', preheader: '', body: '' }
  if (channel === 'sms') return { text: '' }
  return { title: '', text: '', link: '' }
}

export function contentIsEmpty(channel: Channel, c: MessageContent): boolean {
  if (channel === 'email') {
    const e = c as { subject: string; body: string }
    return !e.subject.trim() || !e.body.trim()
  }
  if (channel === 'sms') return !(c as { text: string }).text.trim()
  const p = c as { title: string; text: string }
  return !p.title.trim() || !p.text.trim()
}

/** Factory with sensible defaults per step type (items 3, 4, 5). */
export function makeStep(
  type: StepType,
  opts: { id?: string; name?: string; channel?: Channel; eventId?: string } = {},
): Step {
  const id = opts.id ?? uid('s')
  const one = (): Outlet[] => [{ id: `${id}-out`, label: '', next: null }]
  switch (type) {
    case 'event':
      return {
        id,
        type,
        name: opts.name ?? 'Event entry',
        outlets: one(),
        event: { eventId: opts.eventId ?? 'order_abandoned', entryMode: 'single', createContactIfMissing: true },
      }
    case 'message': {
      const channel = opts.channel ?? 'email'
      return {
        id,
        type,
        name: opts.name ?? `${CHANNEL_LABEL[channel]} message`,
        outlets: one(),
        message: {
          channel,
          defaultLanguage: 'fr',
          content: { fr: emptyContent(channel), en: emptyContent(channel) },
          offerId: null,
          controlGroupShare: 0,
          policyId: 'pol-default',
          sendToUnsubscribed: false,
        },
      }
    }
    case 'wait':
      return { id, type, name: opts.name ?? 'Wait', outlets: one(), wait: { amount: 1, unit: 'days' } }
    case 'segmentSplit':
      return {
        id,
        type,
        name: opts.name ?? 'Segment split',
        outlets: [
          { id: `${id}-p1`, label: 'Segment 1', next: null },
          { id: `${id}-remaining`, label: 'Remaining', next: null },
        ],
        segmentSplit: { segments: {} },
      }
    case 'engagementSplit':
      return {
        id,
        type,
        name: opts.name ?? 'Engagement split',
        outlets: [
          { id: `${id}-opened`, label: 'Opened', next: null },
          { id: `${id}-clicked`, label: 'Clicked', next: null },
          { id: `${id}-remaining`, label: 'Remaining', next: null },
        ],
        engagementSplit: { messageStepId: null },
      }
    case 'shuffleSplit':
      return {
        id,
        type,
        name: opts.name ?? 'Shuffle split',
        outlets: [
          { id: `${id}-a`, label: 'Path A', next: null },
          { id: `${id}-b`, label: 'Path B', next: null },
        ],
        shuffleSplit: { percents: { [`${id}-a`]: 50, [`${id}-b`]: 50 } },
      }
    case 'controlGroup':
      return { id, type, name: opts.name ?? 'Control group', outlets: [], controlGroup: { name: 'Control group' } }
    case 'exit':
      return { id, type, name: opts.name ?? 'Exit', outlets: [] }
  }
}

export const isRemainingOutlet = (o: Outlet) => o.id.endsWith('-remaining')

export const stepMap = (steps: Step[]) => new Map(steps.map((s) => [s.id, s]))

export const entryStep = (steps: Step[]) => steps.find((s) => s.type === 'event')

/** The step and outlet that lead to `id` (the graph is a tree, so at most one). */
export function parentOf(steps: Step[], id: string): { step: Step; outlet: Outlet } | undefined {
  for (const s of steps) for (const o of s.outlets) if (o.next === id) return { step: s, outlet: o }
  return undefined
}

export function descendants(steps: Step[], id: string): string[] {
  const map = stepMap(steps)
  const out: string[] = []
  const walk = (sid: string) => {
    const s = map.get(sid)
    if (!s) return
    for (const o of s.outlets) {
      if (o.next && !out.includes(o.next)) {
        out.push(o.next)
        walk(o.next)
      }
    }
  }
  walk(id)
  return out
}

/** Steps reachable from the entry, in breadth-first order. */
export function reachable(steps: Step[]): Step[] {
  const entry = entryStep(steps)
  if (!entry) return []
  const map = stepMap(steps)
  return [entry, ...descendants(steps, entry.id).map((i) => map.get(i)!).filter(Boolean)]
}

/** Insert `step` on the connection leaving `fromId` via `outletId`.
 *  The new step's first outlet takes over the old target. */
export function insertOnConnection(steps: Step[], fromId: string, outletId: string, step: Step): Step[] {
  const from = steps.find((s) => s.id === fromId)
  if (!from) return steps
  const outlet = from.outlets.find((o) => o.id === outletId)
  if (!outlet) return steps
  const oldNext = outlet.next
  const newStep: Step = {
    ...step,
    outlets: step.outlets.map((o, i) => (i === 0 ? { ...o, next: oldNext } : o)),
  }
  // A terminal step (exit / control group) placed on a connection drops the old continuation.
  const next = steps.map((s) =>
    s.id === fromId
      ? { ...s, outlets: s.outlets.map((o) => (o.id === outletId ? { ...o, next: newStep.id } : o)) }
      : s,
  )
  if (newStep.outlets.length === 0 && oldNext) {
    const drop = new Set([oldNext, ...descendants(steps, oldNext)])
    return [...next.filter((s) => !drop.has(s.id)), newStep]
  }
  return [...next, newStep]
}

/** Remove a step. Single-outlet steps are spliced out; splits and terminals take their subtree with them. */
export function removeStep(steps: Step[], id: string): Step[] {
  const step = steps.find((s) => s.id === id)
  if (!step || step.type === 'event') return steps
  const parent = parentOf(steps, id)
  if (step.outlets.length === 1) {
    const next = step.outlets[0].next
    return steps
      .filter((s) => s.id !== id)
      .map((s) =>
        parent && s.id === parent.step.id
          ? { ...s, outlets: s.outlets.map((o) => (o.id === parent.outlet.id ? { ...o, next } : o)) }
          : s,
      )
  }
  const drop = new Set([id, ...descendants(steps, id)])
  return steps
    .filter((s) => !drop.has(s.id))
    .map((s) =>
      parent && s.id === parent.step.id
        ? { ...s, outlets: s.outlets.map((o) => (o.id === parent.outlet.id ? { ...o, next: null } : o)) }
        : s,
    )
}

/** Message steps that come before `id` on its path (for the engagement split). */
export function messagesBefore(steps: Step[], id: string): Step[] {
  const out: Step[] = []
  let cur = parentOf(steps, id)
  const seen = new Set<string>()
  while (cur && !seen.has(cur.step.id)) {
    seen.add(cur.step.id)
    if (cur.step.type === 'message') out.unshift(cur.step)
    cur = parentOf(steps, cur.step.id)
  }
  return out
}

export function channelsOf(version: Version | undefined): Channel[] {
  if (!version) return []
  const set = new Set<Channel>()
  for (const s of version.steps) if (s.type === 'message') set.add(s.message.channel)
  return (['email', 'sms', 'push'] as Channel[]).filter((c) => set.has(c))
}

/** The version that represents the journey in lists: active, else closing, else pending, else newest. */
export function primaryVersion(j: Journey): Version | undefined {
  const by = (st: Version['status']) => j.versions.find((v) => v.status === st)
  return by('active') ?? by('closing') ?? by('pending') ?? [...j.versions].sort((a, b) => b.number - a.number)[0]
}

export const activeVersion = (j: Journey) => j.versions.find((v) => v.status === 'active')

export type JourneyStatus = 'draft' | 'pending' | 'live' | 'past'

/** Journey list tab membership (item 7). A journey can be live and have a pending version. */
export function journeyStatuses(j: Journey): JourneyStatus[] {
  const has = (st: Version['status']) => j.versions.some((v) => v.status === st)
  const out: JourneyStatus[] = []
  if (has('pending')) out.push('pending')
  if (has('active') || has('closing')) out.push('live')
  if (!out.length && has('draft')) out.push('draft')
  if (!out.length && j.versions.length && j.versions.every((v) => v.status === 'closed')) out.push('past')
  return out
}

export function oneLineSummary(step: Step, ctx: { eventName: (id: string) => string; segmentName: (id: string) => string; stepName: (id: string) => string }): string {
  switch (step.type) {
    case 'event':
      return `${ctx.eventName(step.event.eventId)} · ${step.event.entryMode === 'batch' ? 'batch' : 'single'}`
    case 'message': {
      const m = step.message
      const c = m.content[m.defaultLanguage]
      const first = (c as { subject?: string; title?: string; text?: string }).subject ?? (c as { title?: string }).title ?? (c as { text?: string }).text ?? ''
      return `${CHANNEL_LABEL[m.channel]} · ${first ? first.slice(0, 40) : 'no content'}${m.controlGroupShare ? ` · CG ${m.controlGroupShare}%` : ''}`
    }
    case 'wait':
      return `${step.wait.amount} ${step.wait.unit}`
    case 'segmentSplit': {
      const n = step.outlets.length - 1
      const names = step.outlets.filter((o) => !isRemainingOutlet(o)).map((o) => step.segmentSplit.segments[o.id]).filter(Boolean).map(ctx.segmentName)
      return `${n} segment${n === 1 ? '' : 's'} + Remaining${names.length ? ` · ${names.join(', ')}` : ''}`
    }
    case 'engagementSplit':
      return step.engagementSplit.messageStepId ? `On “${ctx.stepName(step.engagementSplit.messageStepId)}”` : 'No linked message'
    case 'shuffleSplit':
      return step.outlets.map((o) => `${step.shuffleSplit.percents[o.id] ?? 0}%`).join(' / ')
    case 'controlGroup':
      return 'Kept for comparison'
    case 'exit':
      return 'End of journey'
  }
}

export const LANG_LABEL: Record<Language, string> = { fr: 'FR', en: 'EN' }
