import type { ContactStatus, VersionStatus } from '../model/types'

export const VERSION_STATUS: Record<VersionStatus, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'grey' },
  pending: { label: 'Pending approval', cls: 'warn' },
  active: { label: 'Active', cls: 'ok' },
  closing: { label: 'Closing', cls: 'orange' },
  closed: { label: 'Closed', cls: 'navy' },
}

export const CONTACT_STATUS: Record<ContactStatus, { label: string; cls: string }> = {
  waiting: { label: 'Waiting', cls: 'warn' },
  in_step: { label: 'In step', cls: 'acc' },
  exited: { label: 'Exited', cls: 'ok' },
  skipped: { label: 'Skipped', cls: 'grey' },
  control: { label: 'Control group', cls: 'navy' },
}

export function VersionPill({ status }: { status: VersionStatus }) {
  const s = VERSION_STATUS[status]
  return <span className={`pill ${s.cls}`}>{s.label}</span>
}

export function ContactPill({ status }: { status: ContactStatus }) {
  const s = CONTACT_STATUS[status]
  return <span className={`pill ${s.cls}`}>{s.label}</span>
}
