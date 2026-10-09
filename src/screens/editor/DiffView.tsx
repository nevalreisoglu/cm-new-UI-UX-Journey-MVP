import { useMemo } from 'react'
import { useActions } from '../../app/store'
import { userName } from '../../mock'
import { diffVersions } from '../../model/diff'
import type { Journey, Version } from '../../model/types'
import { Icon } from '../../ui/Icon'
import { Modal } from '../../ui/Modal'
import { Canvas } from './Canvas'
import { summaryFor } from './summary'

// Approver "View changes" [1]: canvas diff vs. the current Active version — added green, removed red,
// changed amber — plus a side list of changes and the marketer's note.
export function DiffView({ journey, version, onClose, onApprove, onReject }: { journey: Journey; version: Version; onClose: () => void; onApprove: () => void; onReject: () => void }) {
  const active = journey.versions.find((v) => v.status === 'active')
  const diff = useMemo(() => diffVersions(version, active), [version, active])
  const { toast } = useActions()
  const submitted = [...version.history].reverse().find((h) => h.text.startsWith('Submitted'))
  return (
    <Modal
      title={<>Changes in v{version.number}{active ? <span className="muted"> vs. v{active.number} (Active)</span> : <span className="muted"> — first activation</span>}</>}
      onClose={onClose}
      size="xl"
      footer={<><button className="btn outline" onClick={onClose}>Close</button><button className="btn outline" onClick={onReject}>Reject…</button><button className="btn primary" onClick={() => { onApprove(); toast('ok', `v${version.number} approved and activated`) }}><Icon name="check" /> Approve and activate</button></>}
    >
      <div className="legend">
        <span className="added"><i />Added</span>
        <span className="removed"><i />Removed</span>
        <span className="changed"><i />Changed</span>
        <span className="muted">· {diff.structureChanged ? 'Structure changed — approval required.' : 'Only message content changed.'}</span>
      </div>
      <div className="diff">
        <div style={{ display: 'flex', minHeight: 0 }}>
          <Canvas graph={diff.graph} orientation={journey.orientation} summary={(s) => summaryFor(s, version)} fitKey={version.id} />
        </div>
        <div className="side">
          <div>
            <div className="small muted" style={{ textTransform: 'uppercase', letterSpacing: '.05em', fontSize: 10.5 }}>Marketer’s note</div>
            <div style={{ fontWeight: 500 }}>{version.note || <span className="muted">No note</span>}</div>
            {submitted && <div className="small muted">{submitted.text.replace(/^Submitted for approval:?\s*/, '')} — {userName(submitted.by)}</div>}
          </div>
          <div className="small muted" style={{ textTransform: 'uppercase', letterSpacing: '.05em', fontSize: 10.5 }}>{diff.entries.length} change{diff.entries.length === 1 ? '' : 's'}</div>
          {diff.entries.map((e) => (
            <div key={`${e.status}-${e.stepId}`} className={`de ${e.status}`}>
              <div><b>{e.name}</b><span className="muted">{e.detail}</span></div>
            </div>
          ))}
          {!diff.entries.length && <div className="muted small">No differences found.</div>}
        </div>
      </div>
    </Modal>
  )
}
