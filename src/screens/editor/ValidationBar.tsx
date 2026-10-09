import type { Issue } from '../../model/validation'
import { Icon } from '../../ui/Icon'

// Validation bar (bottom) — blocks Submit for approval; clicking an issue selects the step.
export function ValidationBar({ issues, onSelect, locked }: { issues: Issue[]; onSelect: (stepId: string | null) => void; locked: boolean }) {
  if (locked) return null
  if (!issues.length)
    return (
      <div className="valbar ok">
        <Icon name="check" size={14} /> Ready to submit — no validation issues.
      </div>
    )
  return (
    <div className="valbar bad">
      <span style={{ color: 'var(--bad)', fontWeight: 500, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
        <Icon name="warn" size={14} /> {issues.length} issue{issues.length === 1 ? '' : 's'} block submission
      </span>
      {issues.map((i) => (
        <button key={i.id} className="vi" onClick={() => onSelect(i.stepId)} title="Select the step">
          {i.text}
        </button>
      ))}
    </div>
  )
}
