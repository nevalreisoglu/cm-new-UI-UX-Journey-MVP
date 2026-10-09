import type { Contact, ContactState, Journey, LogEntry, Step, Version } from '../model/types'
import { stepMap, entryStep, isRemainingOutlet } from '../model/graph'
import { eventById } from './events'
import { hash01, makeRng } from './rng'
import { ENROLMENT, NOW } from './journeys'

// Roadmap item 2 / 6 — a deterministic walk of contacts through a version. Every number the
// Monitor shows is derived from these logs, so counts add up across splits by construction.

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

function samplePayload(eventId: string, rng: ReturnType<typeof makeRng>): Record<string, string> {
  const ev = eventById(eventId)
  const out: Record<string, string> = {}
  for (const f of ev?.payload ?? []) {
    let v = f.sample
    if (f.name === 'device_name') v = rng.pick(['Pixel 9a 128 GB', 'Galaxy S25 256 GB', 'iPhone 16 128 GB', 'Moto G 2026', 'Galaxy A36'])
    if (f.name === 'price') v = rng.pick(['349.00', '649.00', '899.00', '1 099.00'])
    if (f.name === 'amount') v = rng.pick(['29.95', '42.50', '55.00', '78.20'])
    if (f.name === 'plan_name' || f.name === 'new_plan') v = rng.pick(['Mobile 10 GB', 'Mobile 20 GB', 'Mobile 40 GB', 'Mobile + Home bundle'])
    if (f.name === 'old_plan') v = rng.pick(['Mobile 5 GB', 'Mobile 10 GB', 'Mobile 20 GB'])
    out[f.name] = v
  }
  return out
}

export function simulateVersion(journey: Journey, version: Version, contacts: Contact[]): ContactState[] {
  const plan = ENROLMENT[version.id]
  if (!plan) return []
  const rng = makeRng(hash01(version.id) * 1e9)
  const pool = contacts.filter((c) => c.kind === journey.contactList)
  const entry = entryStep(version.steps)
  if (!entry || entry.type !== 'event') return []
  const map = stepMap(version.steps)
  const now = NOW.getTime()
  const states: ContactState[] = []

  for (let i = 0; i < plan.count; i++) {
    const contact = pool[(Math.floor(hash01(version.id + i) * pool.length) + i * 7) % pool.length]
    // a few arrivals in the last minutes so that some contacts are "In step" right now
    const recent = plan.to === 0 && rng.chance(0.04)
    const spanMs = (plan.from - plan.to) * DAY
    const receivedMs = recent ? now - rng.int(1, 4) * MIN : now - plan.to * DAY - rng.next() * spanMs
    const receivedAt = new Date(receivedMs)
    const log: LogEntry[] = []
    let t = receivedMs
    let cur: Step | undefined = entry
    let status: ContactState['status'] = 'exited'
    let lastDelivery = '—'
    let lastMessageSkipped = false
    const iso = (ms: number) => new Date(ms).toISOString()

    walk: while (cur) {
      const step: Step = cur
      log.push({ at: iso(t), stepId: step.id, kind: 'entered', detail: `Entered “${step.name}”` })
      let outletId: string | null = step.outlets[0]?.id ?? null
      switch (step.type) {
        case 'event': {
          t += rng.int(5, 55) * 1000 // processed within 60 s
          break
        }
        case 'message': {
          const m = step.message
          t += rng.int(1, 3) * MIN
          if (t > now) {
            status = 'in_step'
            lastDelivery = 'Sending…'
            break walk
          }
          const unreachable =
            (m.channel === 'sms' && !contact.phone) || (m.channel === 'push' && !contact.pushToken)
          const unsub = contact.unsubscribed && !(journey.overrideUnsubscribe && m.sendToUnsubscribed)
          if (unreachable) {
            log.push({ at: iso(t), stepId: step.id, kind: 'skipped', detail: m.channel === 'sms' ? 'Skipped – no phone number' : 'Skipped – no push token' })
            lastDelivery = `Skipped · ${m.channel === 'sms' ? 'no phone' : 'no push token'}`
            lastMessageSkipped = true
            break
          }
          if (unsub) {
            log.push({ at: iso(t), stepId: step.id, kind: 'skipped', detail: 'Skipped – unsubscribed' })
            lastDelivery = 'Skipped · unsubscribed'
            lastMessageSkipped = true
            break
          }
          if (m.controlGroupShare > 0 && hash01(step.id + contact.id) * 100 < m.controlGroupShare) {
            log.push({ at: iso(t), stepId: step.id, kind: 'control', detail: `Held out – message control group (${m.controlGroupShare} %)` })
            lastDelivery = 'Held out · control group'
            lastMessageSkipped = false
            break
          }
          lastMessageSkipped = false
          log.push({ at: iso(t), stepId: step.id, kind: 'sent', detail: `Sent · ${m.channel.toUpperCase()} · ${contact.language.toUpperCase()}` })
          lastDelivery = `Delivered · ${m.channel === 'email' ? 'Email' : m.channel === 'sms' ? 'SMS' : 'Push'}`
          const openP = m.channel === 'email' ? 0.46 : m.channel === 'push' ? 0.34 : 0
          const clickP = m.channel === 'email' ? 0.38 : m.channel === 'push' ? 0.45 : 0.14
          const openAt = t + rng.int(5, 36 * 60) * MIN
          if (m.channel !== 'sms' && openAt <= now && hash01('o' + step.id + contact.id) < openP) {
            log.push({ at: iso(openAt), stepId: step.id, kind: 'opened', detail: 'Opened' })
            lastDelivery = 'Opened'
            const clickAt = openAt + rng.int(1, 120) * MIN
            if (clickAt <= now && hash01('c' + step.id + contact.id) < clickP) {
              log.push({ at: iso(clickAt), stepId: step.id, kind: 'clicked', detail: 'Clicked' })
              lastDelivery = 'Clicked'
            }
          } else if (m.channel === 'sms') {
            const clickAt = t + rng.int(2, 600) * MIN
            if (clickAt <= now && hash01('c' + step.id + contact.id) < clickP) {
              log.push({ at: iso(clickAt), stepId: step.id, kind: 'clicked', detail: 'Clicked the link' })
              lastDelivery = 'Clicked'
            }
          }
          break
        }
        case 'wait': {
          const ms = step.wait.amount * (step.wait.unit === 'hours' ? HOUR : DAY)
          if (t + ms > now) {
            status = 'waiting'
            break walk
          }
          t += ms
          log.push({ at: iso(t), stepId: step.id, kind: 'waited', detail: `Waited ${step.wait.amount} ${step.wait.unit}` })
          break
        }
        case 'segmentSplit': {
          const paths = step.outlets.filter((o) => !isRemainingOutlet(o))
          const hit = paths.find((o) => {
            const seg = step.segmentSplit.segments[o.id]
            if (!seg) return false
            const share = seg === 'seg-account-today' ? 0.22 : 0.35
            return hash01(seg + contact.id) < share
          })
          const chosen = hit ?? step.outlets.find(isRemainingOutlet)!
          outletId = chosen.id
          log.push({ at: iso(t), stepId: step.id, kind: 'split', outletId, detail: `Path: ${chosen.label}` })
          break
        }
        case 'engagementSplit': {
          const mid = step.engagementSplit.messageStepId
          const kinds = new Set(log.filter((l) => l.stepId === mid).map((l) => l.kind))
          const pick = kinds.has('clicked') ? 'clicked' : kinds.has('opened') ? 'opened' : 'remaining'
          const chosen = step.outlets.find((o) => o.id.endsWith('-' + pick)) ?? step.outlets[step.outlets.length - 1]
          outletId = chosen.id
          log.push({ at: iso(t), stepId: step.id, kind: 'split', outletId, detail: `Path: ${chosen.label}` })
          break
        }
        case 'shuffleSplit': {
          const r = hash01('sh' + step.id + contact.id) * 100
          let acc = 0
          let chosen = step.outlets[step.outlets.length - 1]
          for (const o of step.outlets) {
            acc += step.shuffleSplit.percents[o.id] ?? 0
            if (r < acc) {
              chosen = o
              break
            }
          }
          outletId = chosen.id
          log.push({ at: iso(t), stepId: step.id, kind: 'split', outletId, detail: `Path: ${chosen.label} (${step.shuffleSplit.percents[chosen.id] ?? 0} %)` })
          break
        }
        case 'controlGroup': {
          log.push({ at: iso(t), stepId: step.id, kind: 'control', detail: `Kept for comparison in “${step.controlGroup.name}”` })
          status = 'control'
          break walk
        }
        case 'exit': {
          log.push({ at: iso(t), stepId: step.id, kind: 'exited', detail: 'Exited the journey' })
          status = lastMessageSkipped ? 'skipped' : 'exited'
          break walk
        }
      }
      const outlet = step.outlets.find((o) => o.id === outletId)
      const nextId = outlet?.next ?? null
      if (!nextId) {
        // path without Exit (only possible in drafts) — treat as exited
        log.push({ at: iso(t), stepId: step.id, kind: 'exited', detail: 'Path ended' })
        status = 'exited'
        break
      }
      cur = map.get(nextId)
    }

    const currentStepId = log[log.length - 1]?.stepId ?? entry.id
    states.push({
      id: `${version.id}-${i}`,
      journeyId: journey.id,
      versionId: version.id,
      contactId: contact.id,
      payload: samplePayload(entry.event.eventId, rng),
      receivedAt: receivedAt.toISOString(),
      currentStepId,
      status,
      lastDeliveryResult: lastDelivery,
      log,
    })
  }
  return states
}

export function simulateAll(journeys: Journey[], contacts: Contact[]): ContactState[] {
  const out: ContactState[] = []
  for (const j of journeys) for (const v of j.versions) out.push(...simulateVersion(j, v, contacts))
  return out
}
