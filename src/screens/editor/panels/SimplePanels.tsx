import type { Step } from '../../../model/types'
import { Icon } from '../../../ui/Icon'
import type { PanelProps } from './StepPanel'

// Duration wait [5]
export function WaitPanel({ step, mode, onChange }: PanelProps & { step: Extract<Step, { type: 'wait' }> }) {
  const full = mode === 'full'
  return (
    <div className="fld">
      <label>Wait after the previous step</label>
      <div className="row">
        <input type="number" min={1} max={999} style={{ width: 90 }} value={step.wait.amount} disabled={!full} onChange={(e) => onChange({ ...step, wait: { ...step.wait, amount: Math.max(1, Number(e.target.value) || 1) } })} />
        <select style={{ width: 120 }} value={step.wait.unit} disabled={!full} onChange={(e) => onChange({ ...step, wait: { ...step.wait, unit: e.target.value as 'hours' | 'days' } })}>
          <option value="hours">hours</option>
          <option value="days">days</option>
        </select>
      </div>
      <span className="hint">Contacts wait here, then continue to the next step.</span>
    </div>
  )
}

// Control group [5]
export function ControlGroupPanel({ step, mode, onChange }: PanelProps & { step: Extract<Step, { type: 'controlGroup' }> }) {
  const full = mode === 'full'
  return (
    <>
      <div className="fld">
        <label>Group name</label>
        <input value={step.controlGroup.name} disabled={!full} onChange={(e) => onChange({ ...step, controlGroup: { name: e.target.value } })} />
      </div>
      <div className="info"><Icon name="info" /> Contacts stop here and are kept for comparison.</div>
    </>
  )
}

export function ExitPanel() {
  return <div className="empty" style={{ padding: 12 }}>Contacts leave the journey here. No settings.</div>
}
