import { useMemo, useState } from 'react'
import { useActions, useStore } from '../../app/store'
import { navigate } from '../../app/router'
import { EVENTS, NOW, eventById, userName } from '../../mock'
import { channelsOf, entryStep, journeyStatuses, primaryVersion, type JourneyStatus } from '../../model/graph'
import type { Channel, Journey } from '../../model/types'
import { ChannelIcon, Icon } from '../../ui/Icon'
import { VersionPill } from '../../ui/Pill'
import { fmtDate, fmtNum } from '../../ui/format'
import { NewJourneyDialog } from './NewJourneyDialog'

// Screen 1 — Journey list  [1][7]

const TABS: { id: JourneyStatus; label: string }[] = [
  { id: 'draft', label: 'Draft' },
  { id: 'pending', label: 'Pending approval' },
  { id: 'live', label: 'Live' },
  { id: 'past', label: 'Past' },
]

export function JourneyList() {
  const { state } = useStore()
  const { duplicateJourney, toast } = useActions()
  const [tab, setTab] = useState<JourneyStatus>(state.role === 'approver' ? 'pending' : 'live')
  const [q, setQ] = useState('')
  const [fEvent, setFEvent] = useState('')
  const [fChannel, setFChannel] = useState<'' | Channel>('')
  const [fList, setFList] = useState<'' | Journey['contactList']>('')
  const [showNew, setShowNew] = useState(false)
  const [menuFor, setMenuFor] = useState<string | null>(null)

  const since30 = new Date(NOW.getTime() - 30 * 86400000).toISOString()
  const entered30 = useMemo(() => {
    const m: Record<string, number> = {}
    for (const s of state.states) if (s.receivedAt >= since30) m[s.journeyId] = (m[s.journeyId] ?? 0) + 1
    return m
  }, [state.states, since30])

  const rows = state.journeys.map((j) => {
    const v = primaryVersion(j)
    const entry = v ? entryStep(v.steps) : undefined
    const eventId = entry?.type === 'event' ? entry.event.eventId : ''
    return { j, v, eventId, channels: channelsOf(v), statuses: journeyStatuses(j) }
  })
  const counts = Object.fromEntries(TABS.map((t) => [t.id, rows.filter((r) => r.statuses.includes(t.id)).length]))
  const filtered = rows.filter(
    (r) =>
      r.statuses.includes(tab) &&
      (!q || r.j.name.toLowerCase().includes(q.toLowerCase())) &&
      (!fEvent || r.eventId === fEvent) &&
      (!fChannel || r.channels.includes(fChannel)) &&
      (!fList || r.j.contactList === fList),
  )

  return (
    <div className="view" onClick={() => menuFor && setMenuFor(null)}>
      <div className="crumb"><span>Journeys</span></div>
      <div className="card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="card-h">
          <h2>Journeys</h2>
          <button className="btn primary" onClick={() => setShowNew(true)}>+ New journey</button>
          <p>A journey starts from an event and moves each contact through its steps. Segment-based, scheduled sends are campaigns.</p>
        </div>
        <div className="card-b col" style={{ gap: 12, flex: 1, minHeight: 0 }}>
          <div className="tabs">
            {TABS.map((t) => (
              <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
                {t.label} <span className="cnt">{counts[t.id]}</span>
              </button>
            ))}
            {state.role === 'approver' && tab === 'pending' && <span className="muted small" style={{ alignSelf: 'center', marginLeft: 8 }}>Your approval queue</span>}
          </div>
          <div className="row wrap" style={{ gap: 10 }}>
            <label className="search-in">
              <Icon name="search" />
              <input placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
            <select className="inp" style={{ width: 200 }} value={fEvent} onChange={(e) => setFEvent(e.target.value)}>
              <option value="">All events</option>
              {EVENTS.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select className="inp" style={{ width: 150 }} value={fChannel} onChange={(e) => setFChannel(e.target.value as '' | Channel)}>
              <option value="">All channels</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="push">Push</option>
            </select>
            <select className="inp" style={{ width: 160 }} value={fList} onChange={(e) => setFList(e.target.value as '' | Journey['contactList'])}>
              <option value="">All contact lists</option>
              <option value="customers">Customers</option>
              <option value="prospects">Prospects</option>
            </select>
            <span className="muted small right">{filtered.length} journey{filtered.length === 1 ? '' : 's'}</span>
          </div>
          <div style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Journey</th>
                  <th>Event</th>
                  <th>Channels</th>
                  <th>Version</th>
                  <th className="r">Entered · 30 d</th>
                  <th>Last modified</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="empty">No journeys in this tab.</td></tr>
                )}
                {filtered.map(({ j, v, eventId, channels }) => {
                  const closing = j.versions.find((x) => x.status === 'closing')
                  const shown = v
                  return (
                    <tr key={j.id} className="link" onClick={() => navigate({ name: 'editor', journeyId: j.id })}>
                      <td>
                        <div className="t1 row" style={{ gap: 8 }}>
                          {j.name}
                          {j.overrideUnsubscribe && <span className="badge-ou" title="Messages in this journey can be sent to unsubscribed contacts"><Icon name="warn" size={11} /> Override unsubscribe</span>}
                        </div>
                        <div className="t2 clamp" title={j.description}>{j.contactList === 'customers' ? 'Customers' : 'Prospects'} · {j.description}</div>
                      </td>
                      <td>
                        <div>{eventById(eventId)?.name ?? '—'}</div>
                        <div className="t2 mono">{eventId}</div>
                      </td>
                      <td>
                        <span className="chan-icons">{channels.map((c) => <ChannelIcon key={c} channel={c} />)}</span>
                      </td>
                      <td>
                        {shown ? (
                          <div className="col" style={{ gap: 4 }}>
                            <div className="row" style={{ gap: 6 }}>
                              <span className="nowrap">v{shown.number}</span>
                              <VersionPill status={shown.status} />
                              {shown.note && <span className="t2 nowrap">{shown.note}</span>}
                            </div>
                            {closing && closing.id !== shown.id && (
                              <div className="row small" style={{ gap: 6 }}>
                                <span>v{closing.number}</span>
                                <VersionPill status="closing" />
                                {closing.note && <span className="t2 nowrap">{closing.note}</span>}
                              </div>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="r num">{fmtNum(entered30[j.id] ?? 0)}</td>
                      <td className="nw">
                        <div>{fmtDate(j.updatedAt)}</div>
                        <div className="t2">{userName(j.updatedBy)}</div>
                      </td>
                      <td style={{ position: 'relative', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                        <button className="btn outline sm" onClick={() => navigate({ name: 'editor', journeyId: j.id })}>Open</button>{' '}
                        <button className="btn outline sm" onClick={() => setMenuFor(menuFor === j.id ? null : j.id)}>More ▾</button>
                        {menuFor === j.id && (
                          <div className="menu" style={{ right: 12, top: 44 }}>
                            <button onClick={() => { setMenuFor(null); navigate({ name: 'editor', journeyId: j.id }) }}><Icon name="journeys" /> Open editor</button>
                            <button onClick={() => { setMenuFor(null); navigate({ name: 'monitor', journeyId: j.id }) }}><Icon name="monitor" /> Open Monitor</button>
                            <button onClick={() => { setMenuFor(null); const c = duplicateJourney(j); toast('ok', 'Journey duplicated', `“${c.name}” created as a draft.`); setTab('draft') }}><Icon name="copy" /> Duplicate</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {showNew && <NewJourneyDialog onClose={() => setShowNew(false)} />}
    </div>
  )
}
