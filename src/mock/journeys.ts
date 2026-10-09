import type { Journey, Language, MessageContent, Step, Version } from '../model/types'
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

// ---- small builders ---------------------------------------------------------

type Ch = 'email' | 'sms' | 'push'
function msg(
  id: string,
  name: string,
  channel: Ch,
  content: Record<Language, MessageContent>,
  extra: Partial<Extract<Step, { type: 'message' }>['message']> = {},
  next: string | null = null,
): Step {
  const s = makeStep('message', { id, name, channel }) as Extract<Step, { type: 'message' }>
  return { ...s, outlets: [{ ...s.outlets[0], next }], message: { ...s.message, content, ...extra } }
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

const email = (fr: [string, string, string], en: [string, string, string]): Record<Language, MessageContent> => ({
  fr: { subject: fr[0], preheader: fr[1], body: fr[2] },
  en: { subject: en[0], preheader: en[1], body: en[2] },
})
const sms = (fr: string, en: string): Record<Language, MessageContent> => ({ fr: { text: fr }, en: { text: en } })
const push = (fr: [string, string, string], en: [string, string, string]): Record<Language, MessageContent> => ({
  fr: { title: fr[0], text: fr[1], link: fr[2] },
  en: { title: en[0], text: en[1], link: en[2] },
})

function version(
  id: string,
  number: number,
  status: Version['status'],
  note: string,
  steps: Step[],
  meta: Partial<Version> = {},
): Version {
  return { id, number, status, note, steps, createdAt: d(30), createdBy: M, history: [], ...meta }
}

// ---- 1. Device order abandonment — Live; v14 Active, v13 Closing --------------
// Shows: batch event, segment split "Account created today" + Remaining, FR/EN, payload placeholders.

function abandonSteps(v: 13 | 14): Step[] {
  const p = `ab${v}`
  const templateLine = v === 14 ? 'Votre panier vous attend' : 'Vous avez oublié quelque chose'
  const templateLineEn = v === 14 ? 'Your cart is waiting' : 'You left something behind'
  return [
    event(`${p}-event`, 'order_abandoned', 'batch', `${p}-split`),
    segSplit(`${p}-split`, 'New account?', [{ segmentId: 'seg-account-today', next: `${p}-email-new` }], `${p}-wait`),
    msg(
      `${p}-email-new`,
      'Welcome back – first order',
      'email',
      email(
        ['Bienvenue {{first_name}} – terminez votre première commande', '{{device_name}} vous attend', 'Bonjour {{first_name}},\n\nVotre {{device_name}} ({{price}} $) est toujours dans votre panier. Comme nouveau client, la livraison est offerte.\n\n{{cart_url}}'],
        ['Welcome {{first_name}} – finish your first order', '{{device_name}} is waiting', 'Hi {{first_name}},\n\nYour {{device_name}} ({{price}} $) is still in your cart. As a new customer, shipping is on us.\n\n{{cart_url}}'],
      ),
      { offerId: 'off-10-off', controlGroupShare: 5 },
      `${p}-exit-a`,
    ),
    exit(`${p}-exit-a`),
    wait(`${p}-wait`, 2, 'hours', `${p}-email`),
    msg(
      `${p}-email`,
      'Cart reminder',
      'email',
      email(
        [`${templateLine} – {{device_name}}`, 'Encore disponible au même prix', 'Bonjour {{first_name}},\n\nVotre {{device_name}} à {{price}} $ est réservé pendant 24 h.\n\nReprendre ma commande : {{cart_url}}'],
        [`${templateLineEn} – {{device_name}}`, 'Still available at the same price', 'Hi {{first_name}},\n\nYour {{device_name}} at {{price}} $ is reserved for 24 h.\n\nResume my order: {{cart_url}}'],
      ),
      { controlGroupShare: 5 },
      `${p}-exit-b`,
    ),
    exit(`${p}-exit-b`),
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

const backStockSteps: Step[] = [
  event('bs-event', 'device_back_in_stock', 'single', 'bs-email'),
  msg(
    'bs-email',
    'Back in stock',
    'email',
    email(
      ['{{device_name}} est de retour en stock', 'Les quantités sont limitées', 'Bonjour {{first_name}},\n\nBonne nouvelle : {{device_name}} est de nouveau disponible.\n\nCommander : {{product_url}}'],
      ['{{device_name}} is back in stock', 'Quantities are limited', 'Hi {{first_name}},\n\nGood news: {{device_name}} is available again.\n\nOrder now: {{product_url}}'],
    ),
    { sendToUnsubscribed: true, policyId: 'pol-transactional' },
    'bs-wait',
  ),
  wait('bs-wait', 1, 'days', 'bs-eng'),
  engSplit('bs-eng', 'Reacted to the email?', 'bs-email', 'bs-sms', 'bs-exit-c', 'bs-push'),
  msg('bs-sms', 'SMS nudge', 'sms', sms('{{device_name}} est encore disponible – commandez avant la rupture : {{product_url}}', '{{device_name}} is still available – order before it sells out: {{product_url}}'), { sendToUnsubscribed: true }, 'bs-exit-a'),
  exit('bs-exit-a'),
  msg('bs-push', 'Push reminder', 'push', push(['De retour en stock', '{{device_name}} est disponible', '{{product_url}}'], ['Back in stock', '{{device_name}} is available', '{{product_url}}']), { sendToUnsubscribed: true }, 'bs-exit-b'),
  exit('bs-exit-b'),
  exit('bs-exit-c'),
]

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
    version('bs1', 1, 'closed', 'V1 – email only', backStockSteps.slice(0, 2).map((s) => (s.id === 'bs-email' ? { ...s, outlets: [{ ...s.outlets[0], next: 'bs-exit-a' }] } : s)).concat(exit('bs-exit-a')), { createdAt: d(120), activatedAt: d(115), activatedBy: A, closedAt: d(60), history: [{ at: d(115), by: A, text: 'Approved and activated' }, { at: d(60), by: M, text: 'Closed' }] }),
    version('bs2', 2, 'active', 'V2 – SMS and push follow-up', backStockSteps, { createdAt: d(70), submittedAt: d(64), submittedBy: M, activatedAt: d(60), activatedBy: A, history: [
      { at: d(64), by: M, text: 'Submitted for approval' },
      { at: d(60), by: A, text: 'Approved and activated' },
      { at: d(21), by: M, text: 'Content updated (Back in stock · EN)' },
    ] }),
  ],
}

// ---- 3. Welcome – account created — Live; v2 Active "V2 – add control group" ------

function welcomeSteps(v: 1 | 2): Step[] {
  const p = `wl${v}`
  const core: Step[] = [
    msg(
      `${p}-email`,
      'Welcome email',
      'email',
      email(
        ['Bienvenue chez nous, {{first_name}} !', 'Votre forfait {{plan_name}} est actif', 'Bonjour {{first_name}},\n\nVotre forfait {{plan_name}} est actif depuis le {{activation_date}}. Pour bien commencer, voici +5 Go pendant 3 mois.\n\nActiver mon cadeau'],
        ['Welcome aboard, {{first_name}}!', 'Your {{plan_name}} plan is active', 'Hi {{first_name}},\n\nYour {{plan_name}} plan has been active since {{activation_date}}. To get you started, here is +5 GB for 3 months.\n\nClaim my gift'],
      ),
      { offerId: 'off-5gb' },
      `${p}-wait`,
    ),
    wait(`${p}-wait`, 3, 'days', `${p}-eng`),
    engSplit(`${p}-eng`, 'Opened the welcome email?', `${p}-email`, `${p}-push`, `${p}-sms`, `${p}-exit-c`),
    msg(`${p}-push`, 'Push – app tips', 'push', push(['Découvrez l’application', 'Gérez votre forfait {{plan_name}} en un clic', 'https://app.example.com/tips'], ['Discover the app', 'Manage your {{plan_name}} plan in one tap', 'https://app.example.com/tips']), {}, `${p}-exit-a`),
    exit(`${p}-exit-a`),
    msg(`${p}-sms`, 'SMS – gift reminder', 'sms', sms('{{first_name}}, vos 5 Go offerts vous attendent dans l’application.', '{{first_name}}, your free 5 GB is waiting in the app.'), {}, `${p}-exit-b`),
    exit(`${p}-exit-b`),
    exit(`${p}-exit-c`),
  ]
  if (v === 1) return [event(`${p}-event`, 'account_created', 'single', `${p}-email`), ...core]
  return [
    event(`${p}-event`, 'account_created', 'single', `${p}-shuffle`),
    shuffle(`${p}-shuffle`, 'Hold-out', [
      { label: 'Journey', percent: 90, next: `${p}-email` },
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

// ---- 4. Payment failed – reminder — Pending approval; v3 = v2 + one Push step --------

function paymentSteps(v: 2 | 3): Step[] {
  const p = `pf${v}`
  const steps: Step[] = [
    event(`${p}-event`, 'payment_failed', 'single', `${p}-sms`, false),
    msg(`${p}-sms`, 'SMS – payment failed', 'sms', sms('Votre paiement de {{amount}} $ a été refusé. Réglez avant le {{due_date}} : {{pay_url}}', 'Your payment of {{amount}} $ was declined. Pay before {{due_date}}: {{pay_url}}'), { policyId: 'pol-transactional' }, `${p}-wait`),
    wait(`${p}-wait`, 2, 'days', `${p}-email`),
    msg(
      `${p}-email`,
      'Email reminder',
      'email',
      email(
        ['Rappel : paiement de {{amount}} $ en attente', 'Évitez l’interruption de service', 'Bonjour {{first_name}},\n\nNous n’avons pas pu encaisser {{amount}} $. Mettez à jour votre mode de paiement avant le {{due_date}}.\n\n{{pay_url}}'],
        ['Reminder: {{amount}} $ payment pending', 'Avoid a service interruption', 'Hi {{first_name}},\n\nWe could not collect {{amount}} $. Update your payment method before {{due_date}}.\n\n{{pay_url}}'],
      ),
      { policyId: 'pol-transactional' },
      v === 3 ? `${p}-push` : `${p}-exit`,
    ),
    exit(`${p}-exit`),
  ]
  if (v === 3) {
    steps.splice(4, 0, msg(`${p}-push`, 'Push – last reminder', 'push', push(['Dernier rappel', 'Paiement de {{amount}} $ attendu avant le {{due_date}}', '{{pay_url}}'], ['Last reminder', '{{amount}} $ payment due before {{due_date}}', '{{pay_url}}']), { policyId: 'pol-transactional' }, `${p}-exit`))
  }
  return steps
}

// v3 is a copy of v2: the unchanged steps keep their ids so the diff can match them.
const pf3Steps = paymentSteps(3).map((s) => {
  const id = s.id.replace('pf3-', 'pf2-')
  const fix = (n: string | null) => (n ? n.replace('pf3-', 'pf2-') : n)
  const base = { ...s, id, outlets: s.outlets.map((o) => ({ ...o, id: o.id.replace('pf3-', 'pf2-'), next: fix(o.next) })) }
  if (base.type === 'engagementSplit') base.engagementSplit = { messageStepId: fix(base.engagementSplit.messageStepId) }
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
    version('pf1', 1, 'closed', 'V1 – SMS only', paymentSteps(2).slice(0, 2).map((s) => (s.id === 'pf2-sms' ? { ...s, outlets: [{ ...s.outlets[0], next: 'pf2-exit' }] } : s)).concat(exit('pf2-exit')), { createdAt: d(100), activatedAt: d(95), activatedBy: A, closedAt: d(50), history: [{ at: d(95), by: A, text: 'Approved and activated' }, { at: d(50), by: M, text: 'Closed' }] }),
    version('pf2', 2, 'active', 'V2 – email after 2 days', paymentSteps(2), { createdAt: d(60), submittedAt: d(56), submittedBy: M, activatedAt: d(52), activatedBy: A, history: [
      { at: d(56), by: M, text: 'Submitted for approval' },
      { at: d(52), by: A, text: 'Approved and activated' },
    ] }),
    version('pf3', 3, 'pending', 'V3 – add push reminder', pf3Steps, { createdAt: d(5), submittedAt: d(1, 16), submittedBy: M, history: [
      { at: d(5), by: M, text: 'Copied from v2' },
      { at: d(1, 16), by: M, text: 'Submitted for approval: “Adds a last push reminder after the email, same copy as the SMS.”' },
    ] }),
  ],
}

// ---- 5. Plan change – confirmation — Draft with validation errors -------------------

const planChangeSteps: Step[] = [
  event('pc-event', 'plan_changed', 'single', 'pc-split'),
  segSplit('pc-split', 'Which customers?', [{ segmentId: null, next: 'pc-email' }], 'pc-shuffle'),
  // default language FR but only EN content filled → "message without content in the default language"
  msg('pc-email', 'Plan change confirmation', 'email', email(['', '', ''], ['Your plan is now {{new_plan}}', 'From {{old_plan}} to {{new_plan}}', 'Hi {{first_name}},\n\nYour plan changed from {{old_plan}} to {{new_plan}}.']), {}, null),
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
  const steps: Step[] = [
    event(`${p}-event`, 'plan_changed', 'single', `${p}-email`),
    msg(
      `${p}-email`,
      'Roaming promo email',
      'email',
      email(
        ['Cet été, voyagez avec votre forfait {{new_plan}}', 'Passe itinérance à moitié prix', 'Bonjour {{first_name}},\n\nAvec {{new_plan}}, profitez de la passe itinérance à 50 % jusqu’au 31 août.'],
        ['This summer, travel with your {{new_plan}} plan', 'Roaming pass at half price', 'Hi {{first_name}},\n\nWith {{new_plan}}, enjoy the roaming pass at 50 % off until August 31.'],
      ),
      { offerId: 'off-roaming' },
      v === 2 ? `${p}-wait` : `${p}-exit`,
    ),
    exit(`${p}-exit`),
  ]
  if (v === 2) {
    steps.splice(2, 0,
      wait(`${p}-wait`, 1, 'days', `${p}-sms`),
      msg(`${p}-sms`, 'Roaming SMS', 'sms', sms('Passe itinérance à 50 % avec {{new_plan}} – jusqu’au 31 août.', 'Roaming pass 50 % off with {{new_plan}} – until August 31.'), {}, `${p}-exit`),
    )
  }
  return steps
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
