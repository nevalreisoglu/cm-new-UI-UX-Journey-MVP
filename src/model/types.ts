// Data model for the journey layer. Roadmap item numbers are noted next to the
// objects they belong to (see docs/plan.md and README.md).

export type Language = 'fr' | 'en'
export type Role = 'marketer' | 'approver'
export type Channel = 'email' | 'sms' | 'push'
export type ContactListKind = 'customers' | 'prospects'
export type Orientation = 'LR' | 'TB'

// ---- fixed catalogues (item 3, item 4) ------------------------------------

export interface PayloadField {
  name: string
  type: 'string' | 'number' | 'date' | 'url'
  sample: string
}

export interface EventDef {
  id: string
  name: string
  description: string
  payload: PayloadField[]
}

export interface Segment {
  id: string
  name: string
  description: string
}

export interface Offer {
  id: string
  name: string
  code: string
  link: string
}

export interface Policy {
  id: string
  name: string
  summary: string
}

export interface User {
  id: string
  name: string
  role: Role
}

// ---- contacts (item 2, item 7) ---------------------------------------------

export interface Contact {
  id: string
  kind: ContactListKind
  firstName: string
  lastName: string
  email: string
  phone?: string
  pushToken?: string
  language: Language
  plan: string
  unsubscribed: boolean
}

// ---- steps (items 3, 4, 5) --------------------------------------------------

export type StepType =
  | 'event'
  | 'delivery'
  | 'wait'
  | 'segmentSplit'
  | 'engagementSplit'
  | 'shuffleSplit'
  | 'controlGroup'
  | 'exit'

/** A connection leaving a step. `next === null` is a path that does not reach Exit. */
export interface Outlet {
  id: string
  label: string
  next: string | null
}

export interface EventConfig {
  eventId: string
  entryMode: 'single' | 'batch'
  createContactIfMissing: boolean
}

export interface EmailContent {
  subject: string
  preheader: string
  body: string
}
export interface SmsContent {
  text: string
}
export interface PushContent {
  title: string
  text: string
  link: string
}
export type ContentBody = EmailContent | SmsContent | PushContent

/** A ready-made, single-language content item (managed outside the journey layer). */
export interface ContentItem {
  id: string
  channel: Channel
  name: string
  language: Language
  /** preselected when a Delivery switches to this channel */
  isDefault?: boolean
  body: ContentBody
}

/** Delivery step [4]: one channel, one ready-made content item, offer and rules. */
export interface DeliveryConfig {
  channel: Channel
  contentId: string | null
  offerId: string | null
  policyId: string | null
  sendToUnsubscribed: boolean
}

export interface WaitConfig {
  amount: number
  unit: 'hours' | 'days'
}

export interface SegmentSplitConfig {
  /** outlet id → segment id. The `remaining` outlet is not listed here. */
  segments: Record<string, string>
}

export interface EngagementSplitConfig {
  messageStepId: string | null
}

export interface ShuffleSplitConfig {
  /** outlet id → percent */
  percents: Record<string, number>
}

export interface ControlGroupConfig {
  name: string
}

export type StepConfig =
  | { type: 'event'; event: EventConfig }
  | { type: 'delivery'; delivery: DeliveryConfig }
  | { type: 'wait'; wait: WaitConfig }
  | { type: 'segmentSplit'; segmentSplit: SegmentSplitConfig }
  | { type: 'engagementSplit'; engagementSplit: EngagementSplitConfig }
  | { type: 'shuffleSplit'; shuffleSplit: ShuffleSplitConfig }
  | { type: 'controlGroup'; controlGroup: ControlGroupConfig }
  | { type: 'exit' }

export type Step = {
  id: string
  name: string
  outlets: Outlet[]
  /** split paths collapsed on the canvas (editor only, saved per step) */
  collapsed?: boolean
} & StepConfig

// ---- versions and journeys (item 1) -----------------------------------------

export type VersionStatus = 'draft' | 'pending' | 'active' | 'closing' | 'closed'

export interface HistoryEntry {
  at: string
  by: string
  text: string
}

export interface Version {
  id: string
  number: number
  status: VersionStatus
  note: string
  steps: Step[]
  createdAt: string
  createdBy: string
  submittedAt?: string
  submittedBy?: string
  activatedAt?: string
  activatedBy?: string
  closedAt?: string
  rejectComment?: string
  history: HistoryEntry[]
}

export interface Journey {
  id: string
  name: string
  description: string
  contactList: ContactListKind
  overrideUnsubscribe: boolean
  testUserIds: string[]
  orientation: Orientation
  versions: Version[]
  createdAt: string
  updatedAt: string
  updatedBy: string
}

// ---- per-customer journey state (item 2, item 6) ---------------------------

export type ContactStatus = 'waiting' | 'in_step' | 'exited' | 'skipped' | 'control'

export type LogKind =
  | 'entered'
  | 'waited'
  | 'sent'
  | 'opened'
  | 'clicked'
  | 'skipped'
  | 'split'
  | 'control'
  | 'exited'

export interface LogEntry {
  at: string
  stepId: string
  kind: LogKind
  detail: string
  /** for split steps: the outlet taken */
  outletId?: string
}

export interface ContactState {
  id: string
  journeyId: string
  versionId: string
  contactId: string
  payload: Record<string, string>
  receivedAt: string
  currentStepId: string
  status: ContactStatus
  lastDeliveryResult: string
  log: LogEntry[]
}
