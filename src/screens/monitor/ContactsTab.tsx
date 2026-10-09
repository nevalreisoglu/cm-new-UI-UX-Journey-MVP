import { useMemo, useState } from 'react'
import { useStore } from '../../app/store'
import { eventById } from '../../mock'
import { entryStep } from '../../model/graph'
import type { ContactState, ContactStatus, Journey, Version } from '../../model/types'
import { Icon } from '../../ui/Icon'
import { CONTACT_STATUS, ContactPill } from '../../ui/Pill'
import { fmtDate } from '../../ui/format'
import { ContactDrawer } from './ContactDrawer'

// Contacts: search by ID / email / phone; filters step, status; click → "Where is this contact now?"
export function ContactsTab({ journey, version, states, initialStep }: { journey: Journey; version: Version; states: ContactState[]; initialStep?: string }) {
  const { state } = useStore()
  const [q, setQ] = useState('')
  const [step, setStep] = useState(initialStep ?? '')
  const [status, setStatus] = useState<'' | ContactStatus>('')
  const [open, setOpen] = useState<string | null>(null)
  const contacts = useMemo(() => new Map(state.contacts.map((c) => [c.id, c])), [state.contacts])
  const stepName = (id: string) => version.steps.find((s) => s.id === id)?.name ?? '?'
  const entry = entryStep(version.steps)
  const eventName = entry?.type === 'event' ? (eventById(entry.event.eventId)?.name ?? entry.event.eventId) : '—'

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return states
      .filter((s) => {
        const c = contacts.get(s.contactId)
        if (!c) return false
        if (step && s.currentStepId !== step) return false
        if (status && s.status !== status) return false
        if (needle && !(c.id.toLowerCase().includes(needle) || c.email.toLowerCase().includes(needle) || (c.phone ?? '').replace(/\s/g, '').includes(needle.replace(/\s/g, '')))) return false
        return true
      })
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
  }, [states, contacts, q, step, status])

  const selected = open ? states.find((s) => s.id === open) : undefined

  return (
    <div className="col" style={{ gap: 10, flex: 1, minHeight: 0 }}>
      <div className="row wrap" style={{ gap: 10 }}>
        <label className="search-in">
          <Icon name="search" />
          <input placeholder="Search by contact ID, email or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select className="inp" style={{ width: 240 }} value={step} onChange={(e) => setStep(e.target.value)}>
          <option value="">All steps</option>
          {version.steps.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="inp" style={{ width: 170 }} value={status} onChange={(e) => setStatus(e.target.value as '' | ContactStatus)}>
          <option value="">All statuses</option>
          {(Object.keys(CONTACT_STATUS) as ContactStatus[]).map((k) => <option key={k} value={k}>{CONTACT_STATUS[k].label}</option>)}
        </select>
        {(step || status || q) && <button className="btn link sm" onClick={() => { setStep(''); setStatus(''); setQ('') }}>Clear</button>}
        <span className="muted small right">{rows.length} contact{rows.length === 1 ? '' : 's'}</span>
      </div>
      <div style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
        <table className="tbl">
          <thead>
            <tr><th>Contact</th><th>Event</th><th>Received at</th><th>Current step</th><th>Status</th><th>Last delivery result</th></tr>
          </thead>
          <tbody>
            {!rows.length && <tr><td colSpan={6} className="empty">No contacts match.</td></tr>}
            {rows.slice(0, 200).map((s) => {
              const c = contacts.get(s.contactId)!
              return (
                <tr key={s.id} className="link" onClick={() => setOpen(s.id)}>
                  <td><div className="t1">{c.firstName} {c.lastName}</div><div className="t2">{c.id} · {c.email}{c.phone ? ` · ${c.phone}` : ''} · {c.language.toUpperCase()}</div></td>
                  <td>{eventName}</td>
                  <td className="nw">{fmtDate(s.receivedAt, true)}</td>
                  <td>{stepName(s.currentStepId)}</td>
                  <td><ContactPill status={s.status} /></td>
                  <td>{s.lastDeliveryResult}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {rows.length > 200 && <div className="empty">Showing the first 200 of {rows.length}. Narrow the search to see others.</div>}
      </div>
      {selected && <ContactDrawer journey={journey} version={version} state={selected} contact={contacts.get(selected.contactId)!} onClose={() => setOpen(null)} />}
    </div>
  )
}
