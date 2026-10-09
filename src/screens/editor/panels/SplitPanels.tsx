import { SEGMENTS } from '../../../mock'
import { isRemainingOutlet, messagesBefore } from '../../../model/graph'
import type { Outlet, Step } from '../../../model/types'
import { Icon } from '../../../ui/Icon'
import type { PanelProps } from './StepPanel'

let seq = 1
const nextId = () => (seq++).toString(36) + Math.floor(Math.random() * 1e4).toString(36)

// Segment split [5]: ordered segment list (add, remove, reorder); Remaining always present.
export function SegmentSplitPanel({ step, mode, onChange }: PanelProps & { step: Extract<Step, { type: 'segmentSplit' }> }) {
  const full = mode === 'full'
  const paths = step.outlets.filter((o) => !isRemainingOutlet(o))
  const remaining = step.outlets.find(isRemainingOutlet)!
  const relabel = (list: Outlet[]) => list.map((o, i) => ({ ...o, label: `Segment ${i + 1}` }))
  const setPaths = (list: Outlet[]) => onChange({ ...step, outlets: [...relabel(list), remaining] })
  const add = () => setPaths([...paths, { id: `${step.id}-p${nextId()}`, label: '', next: null }])
  const remove = (id: string) => {
    const segments = { ...step.segmentSplit.segments }
    delete segments[id]
    onChange({ ...step, outlets: [...relabel(paths.filter((o) => o.id !== id)), remaining], segmentSplit: { segments } })
  }
  const move = (i: number, dir: -1 | 1) => {
    const list = [...paths]
    const j = i + dir
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    setPaths(list)
  }
  return (
    <>
      <span className="hint small muted">Contacts take the first segment they belong to, in this order. The rest go to Remaining.</span>
      <div className="col" style={{ gap: 6 }}>
        {paths.map((o, i) => (
          <div key={o.id} className="pathrow">
            {full && (
              <span className="ord">
                <button title="Move up" onClick={() => move(i, -1)}>▲</button>
                <button title="Move down" onClick={() => move(i, 1)}>▼</button>
              </span>
            )}
            <span className="pl">{o.label}</span>
            <select className="inp" value={step.segmentSplit.segments[o.id] ?? ''} disabled={!full} onChange={(e) => onChange({ ...step, segmentSplit: { segments: { ...step.segmentSplit.segments, [o.id]: e.target.value } } })} style={{ borderColor: step.segmentSplit.segments[o.id] ? undefined : 'var(--bad)' }}>
              <option value="">Choose a segment…</option>
              {SEGMENTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {full && <button className="x" title="Remove path" onClick={() => remove(o.id)} disabled={paths.length <= 1}>×</button>}
          </div>
        ))}
        <div className="pathrow">
          {full && <span className="ord" style={{ width: 12 }} />}
          <span className="pl">Remaining</span>
          <span className="small muted" style={{ flex: 1 }}>Always present — cannot be removed.</span>
        </div>
      </div>
      {full && <button className="btn outline sm" style={{ alignSelf: 'flex-start' }} onClick={add}><Icon name="plus" /> Add segment</button>}
    </>
  )
}

// Engagement split [5]: linked message (only earlier messages on the path); Opened / Clicked + Remaining.
export function EngagementSplitPanel({ step, mode, onChange, version }: PanelProps & { step: Extract<Step, { type: 'engagementSplit' }> }) {
  const full = mode === 'full'
  const candidates = messagesBefore(version.steps, step.id)
  return (
    <>
      <div className="fld">
        <label>Linked message</label>
        <select value={step.engagementSplit.messageStepId ?? ''} disabled={!full} onChange={(e) => onChange({ ...step, engagementSplit: { messageStepId: e.target.value || null } })} style={{ borderColor: step.engagementSplit.messageStepId ? undefined : 'var(--bad)' }}>
          <option value="">Choose a message…</option>
          {candidates.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.type === 'message' ? s.message.channel.toUpperCase() : ''}</option>)}
        </select>
        <span className="hint">{candidates.length ? 'Only messages earlier on this path can be linked.' : 'No message before this step yet — add one first.'}</span>
      </div>
      <div className="col" style={{ gap: 4 }}>
        <div className="pathrow"><span className="pl">Opened</span><span className="small muted">Opened the message (email / push).</span></div>
        <div className="pathrow"><span className="pl">Clicked</span><span className="small muted">Clicked a link.</span></div>
        <div className="pathrow"><span className="pl">Remaining</span><span className="small muted">Neither, or skipped.</span></div>
      </div>
    </>
  )
}

// Shuffle split [5]: paths with %, "Split evenly", must total 100.
export function ShuffleSplitPanel({ step, mode, onChange }: PanelProps & { step: Extract<Step, { type: 'shuffleSplit' }> }) {
  const full = mode === 'full'
  const total = step.outlets.reduce((a, o) => a + (step.shuffleSplit.percents[o.id] ?? 0), 0)
  const setPct = (id: string, v: number) => onChange({ ...step, shuffleSplit: { percents: { ...step.shuffleSplit.percents, [id]: v } } })
  const setLabel = (id: string, label: string) => onChange({ ...step, outlets: step.outlets.map((o) => (o.id === id ? { ...o, label } : o)) })
  const add = () => {
    const id = `${step.id}-${nextId()}`
    onChange({ ...step, outlets: [...step.outlets, { id, label: `Path ${String.fromCharCode(65 + step.outlets.length)}`, next: null }], shuffleSplit: { percents: { ...step.shuffleSplit.percents, [id]: 0 } } })
  }
  const remove = (id: string) => {
    const percents = { ...step.shuffleSplit.percents }
    delete percents[id]
    onChange({ ...step, outlets: step.outlets.filter((o) => o.id !== id), shuffleSplit: { percents } })
  }
  const evenly = () => {
    const n = step.outlets.length
    const base = Math.floor(100 / n)
    const percents: Record<string, number> = {}
    step.outlets.forEach((o, i) => (percents[o.id] = base + (i < 100 - base * n ? 1 : 0)))
    onChange({ ...step, shuffleSplit: { percents } })
  }
  return (
    <>
      <span className="hint small muted">Contacts are assigned at random by these shares.</span>
      <div className="col" style={{ gap: 6 }}>
        {step.outlets.map((o) => (
          <div key={o.id} className="pathrow">
            <input className="inp" value={o.label} disabled={!full} onChange={(e) => setLabel(o.id, e.target.value)} />
            <input className="inp" type="number" min={0} max={100} style={{ width: 70, flex: 'none' }} value={step.shuffleSplit.percents[o.id] ?? 0} disabled={!full} onChange={(e) => setPct(o.id, Math.max(0, Math.min(100, Number(e.target.value) || 0)))} />
            <span className="muted small">%</span>
            {full && <button className="x" title="Remove path" disabled={step.outlets.length <= 2} onClick={() => remove(o.id)}>×</button>}
          </div>
        ))}
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className={`small ${total === 100 ? 'muted' : ''}`} style={total === 100 ? undefined : { color: 'var(--bad)', fontWeight: 500 }}>Total {total} %{total !== 100 ? ' — must be 100 %' : ''}</span>
        {full && (
          <span className="row" style={{ gap: 6 }}>
            <button className="btn outline sm" onClick={evenly}>Split evenly</button>
            <button className="btn outline sm" onClick={add}><Icon name="plus" /> Path</button>
          </span>
        )}
      </div>
    </>
  )
}
