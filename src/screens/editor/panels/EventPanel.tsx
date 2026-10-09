import { useActions } from '../../../app/store'
import { EVENTS, eventById } from '../../../mock'
import type { Step } from '../../../model/types'
import { Icon } from '../../../ui/Icon'
import type { PanelProps } from './StepPanel'

// Event entry [3]: event, single / batch, create contact if missing, payload placeholders, API code.
export function EventPanel({ step, mode, onChange, journey }: PanelProps & { step: Extract<Step, { type: 'event' }> }) {
  const { toast } = useActions()
  const full = mode === 'full'
  const ev = eventById(step.event.eventId)
  const set = (patch: Partial<typeof step.event>) => onChange({ ...step, event: { ...step.event, ...patch } })
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => undefined)
    toast('info', 'Copied', `${text} — paste it into any message field.`)
  }
  const samplePayload = Object.fromEntries((ev?.payload ?? []).map((p) => [p.name, p.type === 'number' ? Number(p.sample) : p.sample]))
  const single = JSON.stringify({ event: step.event.eventId, contact: { id: 'CUS-0001', email: 'contact@example.com', language: 'fr' }, payload: samplePayload }, null, 2)
  const batch = JSON.stringify(
    { event: step.event.eventId, items: [{ contact: { id: 'CUS-0001' }, payload: samplePayload }, { contact: { id: 'CUS-0002', email: 'new.contact@example.com', language: 'en' }, payload: samplePayload }] },
    null,
    2,
  )

  return (
    <>
      <div className="fld">
        <label>Event</label>
        <select value={step.event.eventId} disabled={!full} onChange={(e) => set({ eventId: e.target.value })}>
          {EVENTS.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.id}</option>)}
        </select>
        {ev && <span className="hint">{ev.description}</span>}
      </div>
      <div className="fld">
        <label>Entry</label>
        <div className="seg" style={{ alignSelf: 'flex-start' }}>
          <button className={step.event.entryMode === 'single' ? 'on' : ''} disabled={!full} onClick={() => set({ entryMode: 'single' })}>Single</button>
          <button className={step.event.entryMode === 'batch' ? 'on' : ''} disabled={!full} onClick={() => set({ entryMode: 'batch' })}>Batch</button>
        </div>
        <span className="hint">{step.event.entryMode === 'single' ? 'One contact per API call.' : 'Many contacts per API call. Batch entry is API only — no file upload.'}</span>
      </div>
      <label className="ck">
        <input type="checkbox" checked={step.event.createContactIfMissing} disabled={!full} onChange={(e) => set({ createContactIfMissing: e.target.checked })} />
        <span>Create the contact if missing<small>Unknown contacts are added to the {journey.contactList === 'customers' ? 'Customers' : 'Prospects'} list from the request.</small></span>
      </label>
      <div className="info"><Icon name="clock" /> Events are processed within 60 s of the API call.</div>

      <div className="sec">Payload fields</div>
      <span className="hint small muted">Click a field to copy it as a placeholder for message content.</span>
      <div className="row wrap" style={{ gap: 6 }}>
        {(ev?.payload ?? []).map((p) => (
          <button key={p.name} className="chip ph" title={`${p.type} · e.g. ${p.sample}`} onClick={() => copy(`{{${p.name}}}`)}>{`{{${p.name}}}`}</button>
        ))}
      </div>
      <table className="tbl" style={{ fontSize: 12 }}>
        <thead><tr><th>Field</th><th>Type</th><th>Sample</th></tr></thead>
        <tbody>
          {(ev?.payload ?? []).map((p) => (
            <tr key={p.name}><td className="mono">{p.name}</td><td>{p.type}</td><td className="muted-2">{p.sample}</td></tr>
          ))}
        </tbody>
      </table>

      <div className="sec">API code</div>
      <div className="small muted-2">POST /api/journeys/{journey.id}/events · single request</div>
      <pre className="codeblock">{single}</pre>
      <div className="small muted-2">POST /api/journeys/{journey.id}/events/batch · batch request</div>
      <pre className="codeblock">{batch}</pre>
    </>
  )
}
