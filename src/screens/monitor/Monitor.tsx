import { useMemo, useState } from 'react'
import { useJourney, useStore } from '../../app/store'
import { navigate } from '../../app/router'
import { NOW } from '../../mock'
import { primaryVersion } from '../../model/graph'
import type { ContactState, Version } from '../../model/types'
import { Icon } from '../../ui/Icon'
import { VersionPill } from '../../ui/Pill'
import { Overview } from './Overview'
import { FlowTab } from './FlowTab'
import { ContactsTab } from './ContactsTab'

// Screen 3 — Monitor [6][2][1]: three tabs; the date-range filter applies to all of them.

const RANGES = [
  { id: '7', label: 'Last 7 days', days: 7 },
  { id: '30', label: 'Last 30 days', days: 30 },
  { id: '90', label: 'Last 90 days', days: 90 },
  { id: 'all', label: 'All time', days: 0 },
]

export type Tab = 'overview' | 'flow' | 'contacts'

export function Monitor({ journeyId, tab: tabParam, stepId }: { journeyId: string; tab?: string; stepId?: string }) {
  const journey = useJourney(journeyId)
  const { state } = useStore()
  const [range, setRange] = useState('30')
  const [versionId, setVersionId] = useState<string | undefined>(undefined)
  const tab: Tab = tabParam === 'flow' || tabParam === 'contacts' ? tabParam : 'overview'

  const since = useMemo(() => {
    const r = RANGES.find((x) => x.id === range)!
    return r.days ? new Date(NOW.getTime() - r.days * 86400000).toISOString() : ''
  }, [range])

  const states: ContactState[] = useMemo(() => state.states.filter((s) => s.journeyId === journeyId && (!since || s.receivedAt >= since)), [state.states, journeyId, since])

  if (!journey) {
    return <div className="view"><div className="card"><div className="empty">Journey not found. <a href="#/journeys">Back to the list</a></div></div></div>
  }
  const version: Version = journey.versions.find((v) => v.id === versionId) ?? primaryVersion(journey)!
  const setTab = (t: Tab, step?: string) => navigate({ name: 'monitor', journeyId, tab: t, stepId: step })

  return (
    <div className="view" style={{ gap: 8 }}>
      <div className="crumb">
        <button onClick={() => navigate({ name: 'journeys' })}>Journeys</button>
        <span className="sep">›</span>
        <button onClick={() => navigate({ name: 'editor', journeyId })}>{journey.name}</button>
        <span className="sep">›</span>
        <b>Monitor</b>
        <span className="right row" style={{ gap: 6, textTransform: 'none', letterSpacing: 0 }}>
          <button className="btn outline sm" onClick={() => navigate({ name: 'editor', journeyId })}><Icon name="journeys" /> Open editor</button>
        </span>
      </div>
      <div className="card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="card-h" style={{ paddingBottom: 6 }}>
          <h2>{journey.name}</h2>
          <span className="pill">{journey.contactList === 'customers' ? 'Customers' : 'Prospects'}</span>
          <div className="right row" style={{ gap: 8 }}>
            {(tab === 'flow' || tab === 'contacts') && (
              <select className="inp" style={{ width: 'auto', minHeight: 32, padding: '4px 8px' }} value={version.id} onChange={(e) => setVersionId(e.target.value)} aria-label="Version">
                {[...journey.versions].sort((a, b) => b.number - a.number).map((v) => (
                  <option key={v.id} value={v.id}>v{v.number} · {v.status === 'pending' ? 'Pending approval' : v.status[0].toUpperCase() + v.status.slice(1)}{v.note ? ` · ${v.note}` : ''}</option>
                ))}
              </select>
            )}
            <select className="inp" style={{ width: 'auto', minHeight: 32, padding: '4px 8px' }} value={range} onChange={(e) => setRange(e.target.value)} aria-label="Date range">
              {RANGES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
        </div>
        <div className="card-b mon" style={{ paddingTop: 0 }}>
          <div className="tabs">
            <button className={tab === 'overview' ? 'on' : ''} onClick={() => setTab('overview')}>Overview</button>
            <button className={tab === 'flow' ? 'on' : ''} onClick={() => setTab('flow')}>Flow <span className="cnt">v{version.number}</span></button>
            <button className={tab === 'contacts' ? 'on' : ''} onClick={() => setTab('contacts')}>Contacts <span className="cnt">{states.filter((s) => s.versionId === version.id).length}</span></button>
            <span className="muted small" style={{ alignSelf: 'center', marginLeft: 'auto' }}>
              Entries {since ? `since ${since.slice(0, 10)}` : 'all time'} · as of {NOW.toISOString().slice(0, 16).replace('T', ' ')} UTC
            </span>
          </div>
          {tab === 'overview' && <Overview journey={journey} states={states} />}
          {tab === 'flow' && <FlowTab journey={journey} version={version} states={states.filter((s) => s.versionId === version.id)} onStep={(id) => setTab('contacts', id)} />}
          {tab === 'contacts' && <ContactsTab journey={journey} version={version} states={states.filter((s) => s.versionId === version.id)} initialStep={stepId} />}
        </div>
      </div>
      {version.status !== 'active' && tab !== 'overview' && (
        <div className="small muted" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><VersionPill status={version.status} /> Showing v{version.number}. Switch versions with the selector above.</div>
      )}
    </div>
  )
}
