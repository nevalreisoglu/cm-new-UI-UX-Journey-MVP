import { Fragment, useMemo } from 'react'
import { eventById } from '../../mock'
import { entryStep } from '../../model/graph'
import type { Contact, ContactState, Journey, Version } from '../../model/types'
import { ContactPill } from '../../ui/Pill'
import { fmtDate } from '../../ui/format'
import { FlowTab } from './FlowTab'

// "Where is this contact now?" [2][6]: event payload, step-by-step timeline, path highlighted on the canvas.
export function ContactDrawer({ journey, version, state, contact, onClose }: { journey: Journey; version: Version; state: ContactState; contact: Contact; onClose: () => void }) {
  const stepName = (id: string) => version.steps.find((s) => s.id === id)?.name ?? '?'
  const entry = entryStep(version.steps)
  const ev = entry?.type === 'event' ? eventById(entry.event.eventId) : undefined
  const { steps, edges } = useMemo(() => {
    const steps = new Set<string>()
    const edges = new Set<string>()
    const visited = state.log.filter((l) => l.kind === 'entered').map((l) => l.stepId)
    for (const id of visited) steps.add(id)
    for (let i = 0; i < visited.length - 1; i++) {
      const from = version.steps.find((s) => s.id === visited[i])
      const to = visited[i + 1]
      const outlet = from?.outlets.find((o) => o.next === to)
      if (from && outlet) edges.add(`${from.id}:${outlet.id}`)
    }
    return { steps, edges }
  }, [state, version.steps])

  return (
    <>
      <div className="drawer-bg" onClick={onClose} />
      <div className="drawer" role="dialog" aria-modal="true">
        <div className="dh">
          <div>
            <h3>Where is {contact.firstName} {contact.lastName} now?</h3>
            <div className="small muted">{contact.id} · {contact.email}{contact.phone ? ` · ${contact.phone}` : ' · no phone'}{contact.pushToken ? '' : ' · no push token'} · {contact.language.toUpperCase()} · {contact.plan}</div>
          </div>
          <div className="right row" style={{ gap: 8 }}>
            <span className="small muted">Now at</span>
            <b>{stepName(state.currentStepId)}</b>
            <ContactPill status={state.status} />
            <button className="x" onClick={onClose} aria-label="Close">×</button>
          </div>
        </div>
        <div className="db">
          <div className="dl">
            <div>
              <div className="sec" style={{ paddingTop: 0 }}>Event · {ev?.name ?? '—'}</div>
              <dl className="kv" style={{ marginTop: 6 }}>
                <dt>received at</dt><dd>{fmtDate(state.receivedAt, true)}</dd>
                <dt>version</dt><dd>v{version.number}</dd>
                {Object.entries(state.payload).map(([k, v]) => (
                  <Fragment key={k}>
                    <dt className="mono">{k}</dt>
                    <dd style={{ wordBreak: 'break-all' }}>{v}</dd>
                  </Fragment>
                ))}
              </dl>
            </div>
            <div>
              <div className="sec">Timeline</div>
              <div className="timeline" style={{ marginTop: 8 }}>
                {state.log.map((l, i) => (
                  <div key={i} className={`tl k-${l.kind}`}>
                    <span className="tt">{fmtDate(l.at, true)}</span>
                    <span className="dot" />
                    <span className="tb">
                      {l.detail}
                      <small>{stepName(l.stepId)}</small>
                    </span>
                  </div>
                ))}
                {(state.status === 'waiting' || state.status === 'in_step') && (
                  <div className="tl k-waited">
                    <span className="tt">now</span>
                    <span className="dot" />
                    <span className="tb">{state.status === 'waiting' ? 'Waiting for the next step' : 'In step — being processed'}<small>{stepName(state.currentStepId)}</small></span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="dr">
            <div className="small muted" style={{ padding: '10px 16px 0' }}>The contact’s path is highlighted on v{version.number}.</div>
            <div style={{ display: 'flex', flex: 1, minHeight: 0, padding: 12 }}>
              <FlowTab journey={journey} version={version} states={[state]} highlightSteps={steps} highlightEdges={edges} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
