import { useState } from 'react'
import type { Journey, Step, Version } from '../../../model/types'
import { Icon } from '../../../ui/Icon'
import { StepTypeMenu } from '../Canvas'
import { paletteFor, type PaletteItem } from '../stepTypes'
import { EventPanel } from './EventPanel'
import { MessagePanel } from './MessagePanel'
import { WaitPanel, ControlGroupPanel, ExitPanel } from './SimplePanels'
import { SegmentSplitPanel, EngagementSplitPanel, ShuffleSplitPanel } from './SplitPanels'

export type EditMode = 'full' | 'content' | 'none'

export interface PanelProps {
  journey: Journey
  version: Version
  step: Step
  mode: EditMode
  onChange: (step: Step, log?: string) => void
}

export function StepPanel(props: PanelProps & { onDelete: () => void; onAddNext: (outletId: string, item: PaletteItem) => void }) {
  const { step, mode, onChange, onDelete, onAddNext } = props
  const item = paletteFor(step.type, step.type === 'message' ? step.message.channel : undefined)
  const [menuOutlet, setMenuOutlet] = useState<string | null>(null)
  const full = mode === 'full'
  const kind = item.group === 'Message' ? `${item.label} message` : item.group === 'Split' ? `${item.label} split` : item.label

  return (
    <div className="spanel">
      <div className="ph">
        <span className={`pal-ic t-${item.tint}`} style={{ width: 26, height: 26 }}><Icon name={item.icon} size={14} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="small muted" style={{ fontSize: 10.5, letterSpacing: '.06em', textTransform: 'uppercase' }}>{kind}</div>
          <input className="name-in" value={step.name} disabled={!full} onChange={(e) => onChange({ ...step, name: e.target.value })} aria-label="Step name" />
        </div>
        {full && step.type !== 'event' && (
          <button className="x" title="Delete step" onClick={onDelete}><Icon name="trash" size={14} /></button>
        )}
      </div>
      <div className="pb">
        {step.type === 'event' && <EventPanel {...props} step={step} />}
        {step.type === 'message' && <MessagePanel {...props} step={step} />}
        {step.type === 'wait' && <WaitPanel {...props} step={step} />}
        {step.type === 'segmentSplit' && <SegmentSplitPanel {...props} step={step} />}
        {step.type === 'engagementSplit' && <EngagementSplitPanel {...props} step={step} />}
        {step.type === 'shuffleSplit' && <ShuffleSplitPanel {...props} step={step} />}
        {step.type === 'controlGroup' && <ControlGroupPanel {...props} step={step} />}
        {step.type === 'exit' && <ExitPanel />}

        {full && step.outlets.length > 0 && (
          <div className="col" style={{ gap: 6, marginTop: 4, position: 'relative' }}>
            <div className="sec">Next step</div>
            {step.outlets.map((o) => (
              <div key={o.id} className="pathrow" style={{ position: 'relative' }}>
                {step.outlets.length > 1 && <span className="pl">{o.label}</span>}
                <span className="small muted" style={{ flex: 1 }}>{o.next ? `→ ${props.version.steps.find((s) => s.id === o.next)?.name ?? '?'}` : <span style={{ color: 'var(--bad)' }}>→ no Exit</span>}</span>
                <button className="btn outline sm" onClick={() => setMenuOutlet(menuOutlet === o.id ? null : o.id)}>Add next step ▾</button>
                {menuOutlet === o.id && (
                  <StepTypeMenu
                    style={{ right: 0, top: 30 }}
                    onPick={(it) => {
                      onAddNext(o.id, it)
                      setMenuOutlet(null)
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
