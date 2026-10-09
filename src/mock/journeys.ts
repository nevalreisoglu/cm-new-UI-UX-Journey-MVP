import type { Journey, Step, Version } from '../model/types'
import { makeStep } from '../model/graph'

export const NOW = new Date('2026-10-09T09:00:00Z')
const d = (daysAgo: number, hour = 10) => {
  const t = new Date(NOW)
  t.setUTCDate(t.getUTCDate() - daysAgo)
  t.setUTCHours(hour, 0, 0, 0)
  return t.toISOString()
}

const M = 'u-marketer'
const A = 'u-approver'
type Lang = 'fr' | 'en'

// ---- small builders ---------------------------------------------------------

type Ch = 'email' | 'sms' | 'push'
function delivery(id: string, name: string, channel: Ch, contentId: string | null, next: string | null, extra: Partial<Extract<Step, { type: 'delivery' }>['delivery']> = {}): Step {
  const s = makeStep('delivery', { id, name, channel, contentId }) as Extract<Step, { type: 'delivery' }>
  return { ...s, outlets: [{ ...s.outlets[0], next }], delivery: { ...s.delivery, ...extra } }
}
function event(id: string, eventId: string, entryMode: 'single' | 'batch', next: string, createContactIfMissing = true): Step {
  const s = makeStep('event', { id, eventId }) as Extract<Step, { type: 'event' }>
  return { ...s, outlets: [{ ...s.outlets[0], next }], event: { eventId, entryMode, createContactIfMissing } }
}
function wait(id: string, amount: number, unit: 'hours' | 'days', next: string | null): Step {
  const s = makeStep('wait', { id, name: `Wait ${amount} ${unit}` }) as Extract<Step, { type: 'wait' }>
  return { ...s, outlets: [{ ...s.outlets[0], next }], wait: { amount, unit } }
}
function exit(id: string): Step {
  return makeStep('exit', { id })
}
function control(id: string, name: string): Step {
  const s = makeStep('controlGroup', { id, name }) as Extract<Step, { type: 'controlGroup' }>
  return { ...s, controlGroup: { name } }
}
function segSplit(id: string, name: string, paths: { segmentId: string | null; next: string | null }[], remaining: string | null): Step {
  const s = makeStep('segmentSplit', { id, name }) as Extract<Step, { type: 'segmentSplit' }>
  const outlets = paths.map((p, i) => ({ id: `${id}-p${i + 1}`, label: `Segment ${i + 1}`, next: p.next }))
  const segments: Record<string, string> = {}
  paths.forEach((p, i) => {
    if (p.segmentId) segments[`${id}-p${i + 1}`] = p.segmentId
  })
  return { ...s, outlets: [...outlets, { id: `${id}-remaining`, label: 'Remaining', next: remaining }], segmentSplit: { segments } }
}
/** Language is split with a segment split: Langue Français / Langue English + Remaining. */
const langSplit = (id: string, fr: string, en: string, remaining: string) =>
  segSplit(id, 'Language', [{ segmentId: 'seg-lang-fr', next: fr }, { segmentId: 'seg-lang-en', next: en }], remaining)
function engSplit(id: string, name: string, messageStepId: string | null, opened: string | null, clicked: string | null, remaining: string | null): Step {
  const s = makeStep('engagementSplit', { id, name }) as Extract<Step, { type: 'engagementSplit' }>
  return {
    ...s,
    outlets: [
      { id: `${id}-opened`, label: 'Opened', next: opened },
      { id: `${id}-clicked`, label: 'Clicked', next: clicked },
      { id: `${id}-remaining`, label: 'Remaining', next: remaining },
    ],
    engagementSplit: { messageStepId },
  }
}
function shuffle(id: string, name: string, paths: { label: string; percent: number; next: string | null }[]): Step {
  const s = makeStep('shuffleSplit', { id, name }) as Extract<Step, { type: 'shuffleSplit' }>
  const percents: Record<string, number> = {}
  const outlets = paths.map((p, i) => {
    const oid = `${id}-${String.fromCharCode(97 + i)}`
    percents[oid] = p.percent
    return { id: oid, label: p.label, next: p.next }
  })
  return { ...s, outlets, shuffleSplit: { percents } }
}
function version(id: string, number: number, status: Version['status'], note: string, steps: Step[], meta: Partial<Version> = {}): Version {
  return { id, number, status, note, steps, createdAt: d(30), createdBy: M, history: [], ...meta }
}
const L = (lang: Lang) => (lang === 'fr' ? 'FR' : 'EN')

// ---- 1. Device order abandonment — Live; v14 Active, v13 Closing --------------
// Shows: batch event, language split, segment split "Account created today" + Remaining, payload placeholders.

function abandonSteps(v: 13 | 14): Step[] {
  const p = `ab${v}`
  const branch = (lang: Lang): Step[] => {
    const b = `${p}-${lang}`
    return [
      segSplit(`${b}-split`, `New account? (${L(lang)})`, [{ segmentId: 'seg-account-today', next: `${b}-new` }], `${b}-wait`),
      delivery(`${b}-new`, `Welcome back – first order ${L(lang)}`, 'email', `c-cart-new-${lang}`, `${b}-exit-a`, { offerId: 'off-10-off' }),
      exit(`${b}-exit-a`),
      wait(`${b}-wait`, 2, 'hours', `${b}-email`),
      delivery(`${b}-email`, `Cart reminder ${L(lang)}`, 'email', v === 14 ? `c-cart-${lang}` : `c-cart-old-${lang}`, `${b}-exit-b`),
      exit(`${b}-exit-b`),
    ]
  }
  return [
    event(`${p}-event`, 'order_abandoned', 'batch', `${p}-lang`),
    langSplit(`${p}-lang`, `${p}-fr-split`, `${p}-en-split`, `${p}-exit`),
    exit(`${p}-exit`),
    ...branch('fr'),
    ...branch('en'),
  ]
}

const abandon: Journey = {
  id: 'j-abandon',
  name: 'Device order abandonment',
  description: 'Bring back customers who started a device order in the web shop and did not complete it.',
  contactList: 'customers',
  overrideUnsubscribe: false,
  testUserIds: ['CUS-0001', 'CUS-0002', 'CUS-0003'],
  orientation: 'LR',
  createdAt: d(240),
  updatedAt: d(3, 14),
  updatedBy: M,
  versions: [
    version('ab12', 12, 'closed', 'V12 – FR copy fix', abandonSteps(13), { createdAt: d(90), activatedAt: d(85), activatedBy: A, closedAt: d(40), history: [
      { at: d(85), by: A, text: 'Approved and activated' },
      { at: d(40), by: M, text: 'Stopped → Closing' },
      { at: d(38), by: M, text: 'Closed' },
    ] }),
    version('ab13', 13, 'closing', 'V13 – 2-hour wait', abandonSteps(13), { createdAt: d(45), submittedAt: d(42), submittedBy: M, activatedAt: d(40), activatedBy: A, history: [
      { at: d(42), by: M, text: 'Submitted for approval' },
      { at: d(40), by: A, text: 'Approved and activated' },
      { at: d(3, 14), by: A, text: 'Superseded by v14 → Closing' },
    ] }),
    version('ab14', 14, 'active', 'V14 – new template', abandonSteps(14), { createdAt: d(8), submittedAt: d(4), submittedBy: M, activatedAt: d(3, 14), activatedBy: A, history: [
      { at: d(8), by: M, text: 'Copied from v13' },
      { at: d(4), by: M, text: 'Submitted for approval' },
      { at: d(3, 14), by: A, text: 'Approved and activated' },
    ] }),
  ],
}

// ---- 2. Device back in stock — Live; Prospects list, override unsubscribe --------

function backStockSteps(v: 1 | 2): Step[] {
  const p = `bs${v}`
  const branch = (lang: Lang): Step[] => {
    const b = `${p}-${lang}`
    if (v === 1) return [delivery(`${b}-email`, `Back in stock ${L(lang)}`, 'email', `c-stock-${lang}`, `${b}-exit-a`, { sendToUnsubscribed: true, policyId: 'pol-transactional' }), exit(`${b}-exit-a`)]
    return [
      delivery(`${b}-email`, `Back in stock ${L(lang)}`, 'email', `c-stock-${lang}`, `${b}-wait`, { sendToUnsubscribed: true, policyId: 'pol-transactional' }),
      wait(`${b}-wait`, 1, 'days', `${b}-eng`),
      engSplit(`${b}-eng`, `Reacted to the email? (${L(lang)})`, `${b}-email`, `${b}-sms`, `${b}-exit-c`, `${b}-push`),
      delivery(`${b}-sms`, `SMS nudge ${L(lang)}`, 'sms', `s-stock-${lang}`, `${b}-exit-a`, { sendToUnsubscribed: true }),
      exit(`${b}-exit-a`),
      delivery(`${b}-push`, `Push reminder ${L(lang)}`, 'push', `p-stock-${lang}`, `${b}-exit-b`, { sendToUnsubscribed: true }),
      exit(`${b}-exit-b`),
      exit(`${b}-exit-c`),
    ]
  }
  return [event(`${p}-event`, 'device_back_in_stock', 'single', `${p}-lang`), langSplit(`${p}-lang`, `${p}-fr-email`, `${p}-en-email`, `${p}-exit`), exit(`${p}-exit`), ...branch('fr'), ...branch('en')]
}

const backInStock: Journey = {
  id: 'j-backinstock',
  name: 'Device back in stock',
  description: 'Tell prospects who asked to be notified that a device is available again.',
  contactList: 'prospects',
  overrideUnsubscribe: true,
  testUserIds: ['PRO-0321', 'PRO-0322'],
  orientation: 'LR',
  createdAt: d(120),
  updatedAt: d(21),
  updatedBy: M,
  versions: [
    version('bs1', 1, 'closed', 'V1 – email only', backStockSteps(1), { createdAt: d(120), activatedAt: d(115), activatedBy: A, closedAt: d(60), history: [{ at: d(115), by: A, text: 'Approved and activated' }, { at: d(60), by: M, text: 'Closed' }] }),
    version('bs2', 2, 'active', 'V2 – SMS and push follow-up', backStockSteps(2), { createdAt: d(70), submittedAt: d(64), submittedBy: M, activatedAt: d(60), activatedBy: A, history: [
      { at: d(64), by: M, text: 'Submitted for approval' },
      { at: d(60), by: A, text: 'Approved and activated' },
      { at: d(21), by: M, text: 'Content changed (Back in stock EN): Generic message → Back in stock' },
    ] }),
  ],
}

// ---- 3. Welcome – account created — Live; v2 Active "V2 – add control group" ------

function welcomeSteps(v: 1 | 2): Step[] {
  const p = `wl${v}`
  const branch = (lang: Lang): Step[] => {
    const b = `${p}-${lang}`
    return [
      delivery(`${b}-email`, `Welcome email ${L(lang)}`, 'email', `c-welcome-${lang}`, `${b}-wait`, { offerId: 'off-5gb' }),
      wait(`${b}-wait`, 3, 'days', `${b}-eng`),
      engSplit(`${b}-eng`, `Opened the welcome email? (${L(lang)})`, `${b}-email`, `${b}-push`, `${b}-sms`, `${b}-exit-c`),
      delivery(`${b}-push`, `Push – app tips ${L(lang)}`, 'push', `p-tips-${lang}`, `${b}-exit-a`),
      exit(`${b}-exit-a`),
      delivery(`${b}-sms`, `SMS – gift reminder ${L(lang)}`, 'sms', `s-gift-${lang}`, `${b}-exit-b`, { offerId: 'off-5gb' }),
      exit(`${b}-exit-b`),
      exit(`${b}-exit-c`),
    ]
  }
  const core: Step[] = [langSplit(`${p}-lang`, `${p}-fr-email`, `${p}-en-email`, `${p}-exit`), exit(`${p}-exit`), ...branch('fr'), ...branch('en')]
  if (v === 1) return [event(`${p}-event`, 'account_created', 'single', `${p}-lang`), ...core]
  return [
    event(`${p}-event`, 'account_created', 'single', `${p}-shuffle`),
    shuffle(`${p}-shuffle`, 'Hold-out', [
      { label: 'Journey', percent: 90, next: `${p}-lang` },
      { label: 'Control', percent: 10, next: `${p}-control` },
    ]),
    control(`${p}-control`, 'Welcome control group'),
    ...core,
  ]
}

const welcome: Journey = {
  id: 'j-welcome',
  name: 'Welcome – account created',
  description: 'Onboard new customers: welcome email with a gift, then a push or SMS depending on engagement.',
  contactList: 'customers',
  overrideUnsubscribe: false,
  testUserIds: ['CUS-0004', 'CUS-0005'],
  orientation: 'LR',
  createdAt: d(150),
  updatedAt: d(12),
  updatedBy: A,
  versions: [
    version('wl1', 1, 'closed', 'V1 – initial', welcomeSteps(1), { createdAt: d(150), activatedAt: d(140), activatedBy: A, closedAt: d(10), history: [
      { at: d(140), by: A, text: 'Approved and activated' },
      { at: d(12), by: A, text: 'Superseded by v2 → Closing' },
      { at: d(10), by: M, text: 'Closed' },
    ] }),
    version('wl2', 2, 'active', 'V2 – add control group', welcomeSteps(2), { createdAt: d(20), submittedAt: d(14), submittedBy: M, activatedAt: d(12), activatedBy: A, history: [
      { at: d(20), by: M, text: 'Copied from v1' },
      { at: d(14), by: M, text: 'Submitted for approval' },
      { at: d(12), by: A, text: 'Approved and activated' },
    ] }),
  ],
}

// ---- 4. Payment failed – reminder — Pending approval; v3 = v2 + a push reminder per language --------

function paymentSteps(v: 2 | 3): Step[] {
  const p = `pf${v}`
  const branch = (lang: Lang): Step[] => {
    const b = `${p}-${lang}`
    const steps: Step[] = [
      delivery(`${b}-sms`, `SMS – payment failed ${L(lang)}`, 'sms', `s-payment-${lang}`, `${b}-wait`, { policyId: 'pol-transactional' }),
      wait(`${b}-wait`, 2, 'days', `${b}-email`),
      delivery(`${b}-email`, `Email reminder ${L(lang)}`, 'email', `c-payment-${lang}`, v === 3 ? `${b}-push` : `${b}-exit`, { policyId: 'pol-transactional' }),
      exit(`${b}-exit`),
    ]
    if (v === 3) steps.splice(3, 0, delivery(`${b}-push`, `Push – last reminder ${L(lang)}`, 'push', `p-payment-${lang}`, `${b}-exit`, { policyId: 'pol-transactional' }))
    return steps
  }
  return [event(`${p}-event`, 'payment_failed', 'single', `${p}-lang`, false), langSplit(`${p}-lang`, `${p}-fr-sms`, `${p}-en-sms`, `${p}-exit`), exit(`${p}-exit`), ...branch('fr'), ...branch('en')]
}

// v3 is a copy of v2: the unchanged steps keep their ids so the diff can match them.
const pf3Steps = paymentSteps(3).map((s) => {
  const id = s.id.replace('pf3-', 'pf2-')
  const fix = (n: string | null) => (n ? n.replace('pf3-', 'pf2-') : n)
  const base = { ...s, id, outlets: s.outlets.map((o) => ({ ...o, id: o.id.replace('pf3-', 'pf2-'), next: fix(o.next) })) }
  if (base.type === 'engagementSplit') base.engagementSplit = { messageStepId: fix(base.engagementSplit.messageStepId) }
  if (base.type === 'segmentSplit') base.segmentSplit = { segments: Object.fromEntries(Object.entries(base.segmentSplit.segments).map(([k, v]) => [k.replace('pf3-', 'pf2-'), v])) }
  return base
})

const payment: Journey = {
  id: 'j-payment',
  name: 'Payment failed – reminder',
  description: 'Remind customers whose recurring payment was declined, before service is interrupted.',
  contactList: 'customers',
  overrideUnsubscribe: false,
  testUserIds: ['CUS-0006'],
  orientation: 'LR',
  createdAt: d(100),
  updatedAt: d(1, 16),
  updatedBy: M,
  versions: [
    version('pf1', 1, 'closed', 'V1 – SMS only', [
      event('pf1-event', 'payment_failed', 'single', 'pf1-lang', false),
      langSplit('pf1-lang', 'pf1-fr-sms', 'pf1-en-sms', 'pf1-exit'),
      exit('pf1-exit'),
      delivery('pf1-fr-sms', 'SMS – payment failed FR', 'sms', 's-payment-fr', 'pf1-exit-fr', { policyId: 'pol-transactional' }),
      exit('pf1-exit-fr'),
      delivery('pf1-en-sms', 'SMS – payment failed EN', 'sms', 's-payment-en', 'pf1-exit-en', { policyId: 'pol-transactional' }),
      exit('pf1-exit-en'),
    ], { createdAt: d(100), activatedAt: d(95), activatedBy: A, closedAt: d(50), history: [{ at: d(95), by: A, text: 'Approved and activated' }, { at: d(50), by: M, text: 'Closed' }] }),
    version('pf2', 2, 'active', 'V2 – email after 2 days', paymentSteps(2), { createdAt: d(60), submittedAt: d(56), submittedBy: M, activatedAt: d(52), activatedBy: A, history: [
      { at: d(56), by: M, text: 'Submitted for approval' },
      { at: d(52), by: A, text: 'Approved and activated' },
    ] }),
    version('pf3', 3, 'pending', 'V3 – add push reminder', pf3Steps, { createdAt: d(5), submittedAt: d(1, 16), submittedBy: M, history: [
      { at: d(5), by: M, text: 'Copied from v2' },
      { at: d(1, 16), by: M, text: 'Submitted for approval: “Adds a last push reminder after the email, FR and EN.”' },
    ] }),
  ],
}

// ---- 5. Plan change – confirmation — Draft with validation errors -------------------

const planChangeSteps: Step[] = [
  event('pc-event', 'plan_changed', 'single', 'pc-split'),
  segSplit('pc-split', 'Which customers?', [{ segmentId: null, next: 'pc-email' }], 'pc-shuffle'),
  delivery('pc-email', 'Plan change confirmation', 'email', null, null), // no content, no Exit
  shuffle('pc-shuffle', 'A/B', [
    { label: 'A', percent: 60, next: 'pc-exit-a' },
    { label: 'B', percent: 30, next: 'pc-eng' },
  ]),
  exit('pc-exit-a'),
  engSplit('pc-eng', 'Engagement', null, 'pc-exit-b', null, 'pc-exit-b'),
  exit('pc-exit-b'),
]

const planChange: Journey = {
  id: 'j-planchange',
  name: 'Plan change – confirmation',
  description: 'Confirm a plan change and test two follow-up variants.',
  contactList: 'customers',
  overrideUnsubscribe: false,
  testUserIds: ['CUS-0007'],
  orientation: 'LR',
  createdAt: d(2),
  updatedAt: d(0, 8),
  updatedBy: M,
  versions: [version('pc1', 1, 'draft', '', planChangeSteps, { createdAt: d(2), history: [{ at: d(2), by: M, text: 'Created' }] })],
}

// ---- 6. Summer roaming promo — Past; closed versions ------------------------------

function roamingSteps(v: 1 | 2): Step[] {
  const p = `rm${v}`
  const branch = (lang: Lang): Step[] => {
    const b = `${p}-${lang}`
    const steps: Step[] = [delivery(`${b}-email`, `Roaming promo email ${L(lang)}`, 'email', `c-roaming-${lang}`, v === 2 ? `${b}-wait` : `${b}-exit`, { offerId: 'off-roaming' }), exit(`${b}-exit`)]
    if (v === 2) steps.splice(1, 0, wait(`${b}-wait`, 1, 'days', `${b}-sms`), delivery(`${b}-sms`, `Roaming SMS ${L(lang)}`, 'sms', `s-roaming-${lang}`, `${b}-exit`, { offerId: 'off-roaming' }))
    return steps
  }
  return [event(`${p}-event`, 'plan_changed', 'single', `${p}-lang`), langSplit(`${p}-lang`, `${p}-fr-email`, `${p}-en-email`, `${p}-exit`), exit(`${p}-exit`), ...branch('fr'), ...branch('en')]
}

const roaming: Journey = {
  id: 'j-roaming',
  name: 'Summer roaming promo',
  description: 'Seasonal roaming offer for customers who changed plan during the summer.',
  contactList: 'customers',
  overrideUnsubscribe: false,
  testUserIds: ['CUS-0008'],
  orientation: 'LR',
  createdAt: d(130),
  updatedAt: d(38),
  updatedBy: M,
  versions: [
    version('rm1', 1, 'closed', 'V1 – email', roamingSteps(1), { createdAt: d(130), activatedAt: d(125), activatedBy: A, closedAt: d(95), history: [{ at: d(125), by: A, text: 'Approved and activated' }, { at: d(95), by: M, text: 'Closed' }] }),
    version('rm2', 2, 'closed', 'V2 – SMS follow-up', roamingSteps(2), { createdAt: d(100), activatedAt: d(95), activatedBy: A, closedAt: d(38), history: [
      { at: d(95), by: A, text: 'Approved and activated' },
      { at: d(40), by: M, text: 'Stopped → Closing' },
      { at: d(38), by: M, text: 'Closed' },
    ] }),
  ],
}

export const JOURNEYS: Journey[] = [abandon, backInStock, welcome, payment, planChange, roaming]

/** How many contacts each version has received, and over which window (days ago). */
export const ENROLMENT: Record<string, { count: number; from: number; to: number }> = {
  ab12: { count: 70, from: 85, to: 40 },
  ab13: { count: 85, from: 40, to: 3 },
  ab14: { count: 110, from: 3, to: 0 },
  bs1: { count: 40, from: 115, to: 60 },
  bs2: { count: 95, from: 60, to: 0 },
  wl1: { count: 90, from: 140, to: 12 },
  wl2: { count: 120, from: 12, to: 0 },
  pf1: { count: 30, from: 95, to: 52 },
  pf2: { count: 75, from: 52, to: 0 },
  rm1: { count: 60, from: 125, to: 95 },
  rm2: { count: 90, from: 95, to: 40 },
}
