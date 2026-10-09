import { useMemo, useState } from 'react'
import { useActions, useStore } from '../../app/store'
import { contentById, eventById, offerById } from '../../mock'
import { entryStep } from '../../model/graph'
import { contactFields, offerFields, renderContent } from '../../model/render'
import type { Journey, Step, Version } from '../../model/types'
import { Modal } from '../../ui/Modal'

// Test send [7]: pick a Delivery step and a test user, edit the sample payload, Send →
// toast with a rendered preview. Contacts do not move on the canvas.
export function TestSendDialog({ journey, version, onClose }: { journey: Journey; version: Version; onClose: () => void }) {
  const { state } = useStore()
  const { toast } = useActions()
  const deliveries = version.steps.filter((s): s is Extract<Step, { type: 'delivery' }> => s.type === 'delivery')
  const entry = entryStep(version.steps)
  const ev = entry?.type === 'event' ? eventById(entry.event.eventId) : undefined
  const testUsers = state.contacts.filter((c) => journey.testUserIds.includes(c.id))
  const [stepId, setStepId] = useState(deliveries[0]?.id ?? '')
  const [userId, setUserId] = useState(testUsers[0]?.id ?? '')
  const [payload, setPayload] = useState(() => JSON.stringify(Object.fromEntries((ev?.payload ?? []).map((p) => [p.name, p.sample])), null, 2))
  const step = deliveries.find((m) => m.id === stepId)
  const item = contentById(step?.delivery.contentId ?? null)
  const user = testUsers.find((u) => u.id === userId)
  const parsed = useMemo(() => {
    try {
      return JSON.parse(payload) as Record<string, string>
    } catch {
      return null
    }
  }, [payload])

  const send = () => {
    if (!step || !user || !parsed || !item) return
    const values = { ...contactFields(user), ...Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, String(v)])), ...offerFields(offerById(step.delivery.offerId)) }
    const unreachable = (step.delivery.channel === 'sms' && !user.phone) || (step.delivery.channel === 'push' && !user.pushToken)
    if (unreachable) {
      toast('warn', `Test not sent · ${user.firstName} ${user.lastName}`, `This contact has no ${step.delivery.channel === 'sms' ? 'phone number' : 'push token'}. In the journey, the contact would skip this step and continue.`)
      return
    }
    const to = step.delivery.channel === 'email' ? user.email : step.delivery.channel === 'sms' ? user.phone : `push token ${user.pushToken}`
    toast('ok', `Test ${step.delivery.channel.toUpperCase()} sent to ${to} · ${item.name} (${item.language.toUpperCase()})`, renderContent(item, values))
    onClose()
  }

  return (
    <Modal title="Test send" onClose={onClose} size="lg" footer={<><button className="btn outline" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!step || !user || !parsed || !item} onClick={send}>Send test</button></>}>
      {!deliveries.length && <div className="note">This version has no Delivery step yet.</div>}
      {!testUsers.length && <div className="note">No test users — add some in Settings.</div>}
      {step && !item && <div className="note">“{step.name}” has no content chosen.</div>}
      <div className="form2">
        <div className="fld">
          <label>Delivery step</label>
          <select value={stepId} onChange={(e) => setStepId(e.target.value)}>
            {deliveries.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.delivery.channel.toUpperCase()}</option>)}
          </select>
          {item && <span className="hint">Content: {item.name} · {item.language.toUpperCase()}</span>}
        </div>
        <div className="fld">
          <label>Test user</label>
          <select value={userId} onChange={(e) => setUserId(e.target.value)}>
            {testUsers.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} · {u.id} · {u.language.toUpperCase()}</option>)}
          </select>
        </div>
        <div className="fld span2">
          <label>Event payload <small>— {ev?.name ?? 'event'} sample, editable</small></label>
          <textarea className="mono" rows={6} value={payload} onChange={(e) => setPayload(e.target.value)} style={parsed ? undefined : { borderColor: 'var(--bad)' }} />
          {!parsed && <span className="hint" style={{ color: 'var(--bad)' }}>Not valid JSON.</span>}
        </div>
      </div>
      <p className="muted small">The test goes to the test user only. Nothing moves on the canvas and nothing is counted in Monitor.</p>
    </Modal>
  )
}
