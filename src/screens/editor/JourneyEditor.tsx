import { useMemo, useState } from 'react'
import { useActions, useJourney, useStore } from '../../app/store'
import { navigate } from '../../app/router'
import { makeStep, primaryVersion } from '../../model/graph'
import { buildGraph, type GraphEdge } from '../../model/layout'
import { invalidStepIds, validate } from '../../model/validation'
import type { Step } from '../../model/types'
import { Icon } from '../../ui/Icon'
import { Canvas } from './Canvas'
import { DiffView } from './DiffView'
import { Palette } from './Palette'
import { SettingsDialog } from './SettingsDialog'
import { TestSendDialog } from './TestSendDialog'
import { ValidationBar } from './ValidationBar'
import { VersionBar } from './VersionBar'
import { StepPanel, type EditMode } from './panels/StepPanel'
import { summaryFor } from './summary'
import type { PaletteItem } from './stepTypes'
import { Modal } from '../../ui/Modal'

// Screen 2 — Journey editor
export function JourneyEditor({ journeyId, versionId, stepId }: { journeyId: string; versionId?: string; stepId?: string }) {
  const journey = useJourney(journeyId)
  const { state } = useStore()
  const act = useActions()
  const [selVersionId, setSelVersionId] = useState<string | undefined>(versionId)
  const [selected, setSelected] = useState<string | null>(stepId ?? null)
  const [dragging, setDragging] = useState(false)
  const [dlg, setDlg] = useState<'settings' | 'test' | 'diff' | 'reject' | null>(null)
  const [rejectText, setRejectText] = useState('')

  // the selected version, falling back to the journey's primary one (active › closing › pending › newest)
  const version = journey ? (journey.versions.find((v) => v.id === selVersionId) ?? primaryVersion(journey)) : undefined

  const issues = useMemo(() => (version ? validate(version) : []), [version])
  const invalid = useMemo(() => invalidStepIds(issues), [issues])
  const graph = useMemo(() => (version ? buildGraph(version.steps, { collapse: true }) : { nodes: [], edges: [] }), [version])

  if (!journey || !version) {
    return (
      <div className="view">
        <div className="card"><div className="empty">Journey not found. <a href="#/journeys">Back to the list</a></div></div>
      </div>
    )
  }

  // Edit mode by version state: Draft → full; Active / Closing → message content only (structure
  // locked); Pending / Closed → read-only.
  const mode: EditMode = version.status === 'draft' ? 'full' : version.status === 'active' || version.status === 'closing' ? 'content' : 'none'
  const locked = mode !== 'full'
  const selectedStep = version.steps.find((s) => s.id === selected) ?? null

  const addOnEdge = (edge: GraphEdge, item: PaletteItem) => {
    const step = makeStep(item.type, { channel: item.channel })
    act.addStepOnConnection(journey.id, version, edge.from, edge.outletId, step)
    setSelected(step.id)
  }
  const addNext = (outletId: string, item: PaletteItem) => {
    if (!selectedStep) return
    const step = makeStep(item.type, { channel: item.channel })
    act.addStepOnConnection(journey.id, version, selectedStep.id, outletId, step)
    setSelected(step.id)
  }
  const paletteClick = (item: PaletteItem) => {
    if (selectedStep && selectedStep.outlets.length === 1) {
      addNext(selectedStep.outlets[0].id, item)
      return
    }
    act.toast('info', 'Where should it go?', 'Drag the step onto a connection, click “+” on a connection, or select a step and use “Add next step”.')
  }
  const onChange = (step: Step, log?: string) => act.updateStep(journey.id, version, step, log)
  const toggleCollapse = (id: string) => {
    const s = version.steps.find((x) => x.id === id)
    if (s) act.updateStep(journey.id, version, { ...s, collapsed: !s.collapsed })
  }
  const canvasSummary = (s: Step) => summaryFor(s, version)

  return (
    <div className="view" style={{ gap: 8 }}>
      <div className="crumb">
        <button onClick={() => navigate({ name: 'journeys' })}>Journeys</button>
        <span className="sep">›</span>
        <b>{journey.name}</b>
        <span className="right row" style={{ gap: 6, textTransform: 'none', letterSpacing: 0 }}>
          {journey.overrideUnsubscribe && <span className="badge-ou"><Icon name="warn" size={11} /> Override unsubscribe</span>}
          <span className="pill">{journey.contactList === 'customers' ? 'Customers' : 'Prospects'}</span>
          <button className="btn outline sm" onClick={() => navigate({ name: 'monitor', journeyId: journey.id })}><Icon name="monitor" /> Monitor</button>
        </span>
      </div>
      <div className="card editor">
        <VersionBar
          journey={journey}
          version={version}
          issues={issues}
          onSelectVersion={(id) => { setSelVersionId(id); setSelected(null) }}
          onSettings={() => setDlg('settings')}
          onTestSend={() => setDlg('test')}
          onViewChanges={() => setDlg('diff')}
        />
        {(version.status === 'active' || version.status === 'closing') && (
          <div className="lockbar"><Icon name="lock" /> Structure locked — only message content can be edited. Content edits need no approval and are logged in the version history.</div>
        )}
        {version.status === 'pending' && (
          <div className="lockbar"><Icon name="lock" /> Pending approval — read-only until the approver decides{state.role === 'marketer' ? ', or withdraw it to edit' : ''}.</div>
        )}
        {version.status === 'closed' && <div className="lockbar"><Icon name="lock" /> Closed version — read-only. Copy it to a new version to continue.</div>}
        {version.status === 'draft' && version.rejectComment && (
          <div className="rejectbar"><Icon name="warn" /> Rejected by the approver: “{version.rejectComment}”</div>
        )}

        <div className={`jb ${locked ? 'locked' : ''}`}>
          {!locked && <Palette onDragState={setDragging} onClickItem={paletteClick} />}
          <div className="cmid">
            <Canvas
              graph={graph}
              orientation={journey.orientation}
              selectedId={selected}
              onSelect={setSelected}
              editable={!locked}
              onAddStep={addOnEdge}
              onToggleCollapse={toggleCollapse}
              invalidIds={invalid}
              summary={canvasSummary}
              dragging={dragging}
              fitKey={version.id}
            />
          </div>
          {selectedStep ? (
            <StepPanel
              key={selectedStep.id}
              journey={journey}
              version={version}
              step={selectedStep}
              mode={mode}
              onChange={onChange}
              onDelete={() => { act.deleteStep(journey.id, version, selectedStep.id); setSelected(null) }}
              onAddNext={addNext}
            />
          ) : (
            <div className="spanel">
              <div className="ph"><h3>Step details</h3></div>
              <div className="pb">
                <div className="empty">Select a step on the canvas.</div>
                <div className="sec">Journey</div>
                <dl className="kv">
                  <dt>Contact list</dt><dd>{journey.contactList === 'customers' ? 'Customers' : 'Prospects'}</dd>
                  <dt>Override unsub.</dt><dd>{journey.overrideUnsubscribe ? 'On' : 'Off'}</dd>
                  <dt>Test users</dt><dd>{journey.testUserIds.length || 'None'}</dd>
                  <dt>Steps</dt><dd>{version.steps.length}</dd>
                  <dt>Description</dt><dd>{journey.description || <span className="muted">—</span>}</dd>
                </dl>
                <button className="btn outline sm" style={{ alignSelf: 'flex-start' }} onClick={() => setDlg('settings')}><Icon name="settings" /> Journey settings</button>
              </div>
            </div>
          )}
        </div>
        <ValidationBar issues={issues} locked={locked} onSelect={(id) => setSelected(id)} />
      </div>

      {dlg === 'settings' && <SettingsDialog journey={journey} locked={journey.versions.some((v) => v.status === 'active' || v.status === 'closing')} onClose={() => setDlg(null)} />}
      {dlg === 'test' && <TestSendDialog journey={journey} version={version} onClose={() => setDlg(null)} />}
      {dlg === 'diff' && (
        <DiffView
          journey={journey}
          version={version}
          onClose={() => setDlg(null)}
          onApprove={() => { act.approve(journey, version.id); setDlg(null) }}
          onReject={() => setDlg('reject')}
        />
      )}
      {dlg === 'reject' && (
        <Modal title={`Reject v${version.number}`} onClose={() => setDlg(null)} footer={<><button className="btn outline" onClick={() => setDlg(null)}>Cancel</button><button className="btn danger" disabled={!rejectText.trim()} onClick={() => { act.reject(journey.id, version.id, rejectText.trim()); act.toast('warn', `v${version.number} rejected`); setDlg(null); setRejectText('') }}>Reject</button></>}>
          <div className="fld">
            <label>Comment <small>— required</small></label>
            <textarea autoFocus value={rejectText} onChange={(e) => setRejectText(e.target.value)} />
          </div>
        </Modal>
      )}
    </div>
  )
}
