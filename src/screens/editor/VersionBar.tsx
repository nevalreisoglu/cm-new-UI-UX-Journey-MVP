import { useState } from 'react'
import { useActions, useStore } from '../../app/store'
import { navigate } from '../../app/router'
import { userName } from '../../mock'
import type { Journey, Orientation, Version } from '../../model/types'
import type { Issue } from '../../model/validation'
import { Icon } from '../../ui/Icon'
import { Modal } from '../../ui/Modal'
import { VersionPill } from '../../ui/Pill'
import { fmtDate } from '../../ui/format'

// Version bar [1]: selector (number, status, note, activated by / when) and actions by state and role.
export function VersionBar(props: {
  journey: Journey
  version: Version
  issues: Issue[]
  onSelectVersion: (id: string) => void
  onSettings: () => void
  onTestSend: () => void
  onViewChanges: () => void
}) {
  const { journey, version, issues, onSelectVersion, onSettings, onTestSend, onViewChanges } = props
  const { state } = useStore()
  const act = useActions()
  const role = state.role
  const [dlg, setDlg] = useState<'submit' | 'reject' | 'stop' | 'delete' | 'history' | null>(null)
  const [text, setText] = useState('')
  const st = version.status
  const sorted = [...journey.versions].sort((a, b) => b.number - a.number)

  const setOrientation = (o: Orientation) => act.setOrientation(journey.id, o)

  const submit = () => {
    act.submitForApproval(journey.id, version.id, text.trim())
    act.toast('ok', 'Submitted for approval', 'The approver will find it in the Pending approval tab.')
    setDlg(null)
    setText('')
  }
  const approve = () => {
    act.approve(journey, version.id)
    act.toast('ok', `v${version.number} is now Active`, journey.versions.some((v) => v.status === 'active') ? 'The previous Active version is Closing: contacts inside finish their path, no new entries.' : undefined)
  }
  const reject = () => {
    act.reject(journey.id, version.id, text.trim())
    act.toast('warn', `v${version.number} rejected`, 'It is back in Draft with your comment.')
    setDlg(null)
    setText('')
  }
  const stop = (mode: 'closing' | 'closed') => {
    act.stop(journey.id, version.id, mode)
    act.toast('info', mode === 'closing' ? `v${version.number} is Closing` : `v${version.number} is Closed`, mode === 'closing' ? 'No new entries; contacts inside finish their path.' : 'Contacts inside were removed from the journey.')
    setDlg(null)
  }
  const copy = () => {
    const v = act.copyToNewVersion(journey, version)
    act.toast('ok', `v${v.number} created as a draft`, 'Structure copied. Changes need approval before activation.')
    onSelectVersion(v.id)
  }
  const del = () => {
    if (journey.versions.length === 1) {
      act.deleteJourney(journey.id)
      act.toast('info', 'Journey deleted')
      navigate({ name: 'journeys' })
    } else {
      act.deleteVersion(journey.id, version.id)
      act.toast('info', `v${version.number} deleted`)
      onSelectVersion(sorted.find((v) => v.id !== version.id)!.id)
    }
    setDlg(null)
  }

  return (
    <>
      <div className="vbar">
        <div className="vsel">
          <select value={version.id} onChange={(e) => onSelectVersion(e.target.value)} aria-label="Version">
            {sorted.map((v) => (
              <option key={v.id} value={v.id}>
                v{v.number} · {v.status === 'pending' ? 'Pending approval' : v.status[0].toUpperCase() + v.status.slice(1)}{v.note ? ` · ${v.note}` : ''}
              </option>
            ))}
          </select>
          <VersionPill status={st} />
          <div className="vmeta">
            {version.note ? <b>{version.note}</b> : <span className="muted">No version note</span>}
            <span>
              {st === 'active' || st === 'closing' || st === 'closed'
                ? `Activated by ${userName(version.activatedBy ?? '')} · ${fmtDate(version.activatedAt, true)}`
                : st === 'pending'
                  ? `Submitted by ${userName(version.submittedBy ?? '')} · ${fmtDate(version.submittedAt, true)}`
                  : `Created by ${userName(version.createdBy)} · ${fmtDate(version.createdAt, true)}`}
              {st === 'closed' && version.closedAt ? ` · closed ${fmtDate(version.closedAt)}` : ''}
            </span>
          </div>
          <button className="btn link sm" onClick={() => setDlg('history')} title="Version history"><Icon name="clock" /> History</button>
        </div>
        <div className="acts">
          {/* Draft (Marketer): Submit for approval · Delete */}
          {st === 'draft' && role === 'marketer' && (
            <>
              <button className="btn primary sm" disabled={issues.length > 0} title={issues.length ? 'Fix the validation issues first' : 'Submit this version for approval'} onClick={() => setDlg('submit')}>Submit for approval</button>
              <button className="btn outline sm" onClick={() => setDlg('delete')}><Icon name="trash" /> Delete</button>
            </>
          )}
          {st === 'draft' && role === 'approver' && <span className="muted small">Draft — the marketer submits it for approval.</span>}
          {/* Pending (Marketer): Withdraw · Pending (Approver): View changes · Approve · Reject */}
          {st === 'pending' && role === 'marketer' && (
            <button className="btn outline sm" onClick={() => { act.withdraw(journey.id, version.id); act.toast('info', 'Withdrawn', `v${version.number} is back in Draft.`) }}>Withdraw</button>
          )}
          {st === 'pending' && role === 'approver' && (
            <>
              <button className="btn outline sm" onClick={onViewChanges}><Icon name="diff" /> View changes</button>
              <button className="btn primary sm" onClick={approve}><Icon name="check" /> Approve and activate</button>
              <button className="btn outline sm" onClick={() => setDlg('reject')}>Reject</button>
            </>
          )}
          {/* Active: Copy to new version · Stop */}
          {st === 'active' && (
            <>
              <button className="btn outline sm" onClick={copy}><Icon name="copy" /> Copy to new version</button>
              <button className="btn outline sm" onClick={() => setDlg('stop')}>Stop…</button>
            </>
          )}
          {/* Closing: Close */}
          {st === 'closing' && (
            <>
              <button className="btn outline sm" onClick={copy}><Icon name="copy" /> Copy to new version</button>
              <button className="btn outline sm" onClick={() => { act.close(journey.id, version.id); act.toast('info', `v${version.number} closed`) }}>Close</button>
            </>
          )}
          {st === 'closed' && <button className="btn outline sm" onClick={copy}><Icon name="copy" /> Copy to new version</button>}
          <span className="sp" />
          <button className="btn outline sm" onClick={onSettings}><Icon name="settings" /> Settings</button>
          <button className="btn outline sm" onClick={onTestSend}><Icon name="send" /> Test send</button>
          <span className="seg" title="Layout orientation (saved per journey)">
            <button className={journey.orientation === 'LR' ? 'on' : ''} onClick={() => setOrientation('LR')} title="Left → right"><Icon name="lr" size={14} /></button>
            <button className={journey.orientation === 'TB' ? 'on' : ''} onClick={() => setOrientation('TB')} title="Top → bottom"><Icon name="tb" size={14} /></button>
          </span>
        </div>
      </div>

      {dlg === 'submit' && (
        <Modal title={`Submit v${version.number} for approval`} onClose={() => setDlg(null)} footer={<><button className="btn outline" onClick={() => setDlg(null)}>Cancel</button><button className="btn primary" disabled={!text.trim()} onClick={submit}>Submit</button></>}>
          <div className="fld">
            <label>Version note <small>— short, shown on the version and in the journey list</small></label>
            <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={version.note || 'e.g. V3 – add push reminder'} />
          </div>
          <div className="info"><Icon name="info" /> Activation needs approval. The approver sees a diff against the current Active version.</div>
        </Modal>
      )}
      {dlg === 'reject' && (
        <Modal title={`Reject v${version.number}`} onClose={() => setDlg(null)} footer={<><button className="btn outline" onClick={() => setDlg(null)}>Cancel</button><button className="btn danger" disabled={!text.trim()} onClick={reject}>Reject</button></>}>
          <div className="fld">
            <label>Comment <small>— required, shown to the marketer on the version</small></label>
            <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="What should change before this can be activated?" />
          </div>
        </Modal>
      )}
      {dlg === 'stop' && (
        <Modal title={`Stop v${version.number}`} onClose={() => setDlg(null)} footer={<><button className="btn outline" onClick={() => setDlg(null)}>Cancel</button><button className="btn outline" onClick={() => stop('closing')}>Stop new entries (Closing)</button><button className="btn danger" onClick={() => stop('closed')}>Stop everything (Closed)</button></>}>
          <p><b>Closing</b> — no new contacts enter; contacts already inside finish their path. The version then needs to be closed manually.</p>
          <p><b>Closed</b> — no new entries and contacts inside are removed now.</p>
          <p className="muted small">Stopping needs no approval.</p>
        </Modal>
      )}
      {dlg === 'delete' && (
        <Modal title={journey.versions.length === 1 ? 'Delete this journey?' : `Delete v${version.number}?`} onClose={() => setDlg(null)} footer={<><button className="btn outline" onClick={() => setDlg(null)}>Cancel</button><button className="btn danger" onClick={del}>Delete</button></>}>
          <p>{journey.versions.length === 1 ? `“${journey.name}” has only this draft. Deleting it removes the journey.` : 'The draft and its steps are removed. Other versions are not affected.'}</p>
        </Modal>
      )}
      {dlg === 'history' && (
        <Modal title={`v${version.number} · history`} onClose={() => setDlg(null)}>
          {version.rejectComment && <div className="note">Rejected: “{version.rejectComment}”</div>}
          <div className="vhist">
            {[...version.history].reverse().map((h, i) => (
              <div key={i}><span>{fmtDate(h.at, true)}</span><span>{h.text} <span className="muted">· {userName(h.by)}</span></span></div>
            ))}
            {!version.history.length && <span className="muted">No history yet.</span>}
          </div>
        </Modal>
      )}
    </>
  )
}
