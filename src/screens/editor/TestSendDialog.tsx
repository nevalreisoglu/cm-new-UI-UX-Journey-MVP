import { useMemo, useState } from 'react'
import { useActions, useStore } from '../../app/store'
import { eventById } from '../../mock'
import { entryStep } from '../../model/graph'
import { contactFields, renderMessage } from '../../model/render'
import type { Journey, Language, Step, Version } from '../../model/types'
import { Modal } from '../../ui/Modal'

// Test send [7]: pick a message step, a test user and a language, edit the sample payload, Send →
// toast with a rendered preview. Contacts do not move on the canvas.
export function TestSendDialog({ journey, version, onClose }: { journey: Journey; version: Version; onClose: () => void }) {
  const { state } = useStore()
  const { toast } = useActions()
  const messages = version.steps.filter((s): s is Extract<Step, { type: 'message' }> => s.type === 'message')
  const entry = entryStep(version.steps)
  const ev = entry?.type === 'event' ? eventById(entry.event.eventId) : undefined
  const testUsers = state.contacts.filter((c) => journey.testUserIds.includes(c.id))
  const [stepId, setStepId] = useState(messages[0]?.id ?? '')
  const [userId, setUserId] = useState(testUsers[0]?.id ?? '')
  const [lang, setLang] = useState<Language>(testUsers[0]?.language ?? 'fr')
  const [payload, setPayload] = useState(() => JSON.stringify(Object.fromEntries((ev?.payload ?? []).map((p) => [p.name, p.sample])), null, 2))
  const step = messages.find((m) => m.id === stepId)
  const user = testUsers.find((u) => u.id === userId)
  const parsed = useMemo(() => {
    try {
      return JSON.parse(payload) as Record<string, string>
    } catch {
      return null
    }
  }, [payload])

  const send = () => {
    if (!step || !user || !parsed) return
    const values = { ...contactFields(user), ...Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, String(v)])) }
    const unreachable = (step.message.channel === 'sms' && !user.phone) || (step.message.channel === 'push' && !user.pushToken)
    if (unreachable) {
      toast('warn', `Test not sent · ${user.firstName} ${user.lastName}`, `This contact has no ${step.message.channel === 'sms' ? 'phone number' : 'push token'}. In the journey, the contact would skip this step and continue.`)
      return
    }
    const to = step.message.channel === 'email' ? user.email : step.message.channel === 'sms' ? user.phone : `push token ${user.pushToken}`
    toast('ok', `Test ${step.message.channel.toUpperCase()} sent to ${to} · ${lang.toUpperCase()}`, renderMessage(step, lang, values))
    onClose()
  }

  return (
    <Modal title="Test send" onClose={onClose} size="lg" footer={<><button className="btn outline" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!step || !user || !parsed} onClick={send}>Send test</button></>}>
      {!messages.length && <div className="note">This version has no message step yet.</div>}
      {!testUsers.length && <div className="note">No test users — add some in Settings.</div>}
      <div className="form2">
        <div className="fld">
          <label>Message step</label>
          <select value={stepId} onChange={(e) => setStepId(e.target.value)}>
            {messages.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.message.channel.toUpperCase()}</option>)}
          </select>
        </div>
        <div className="fld">
          <label>Test user</label>
          <select value={userId} onChange={(e) => { setUserId(e.target.value); const u = testUsers.find((x) => x.id === e.target.value); if (u) setLang(u.language) }}>
            {testUsers.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} · {u.id} · {u.language.toUpperCase()}</option>)}
          </select>
        </div>
        <div className="fld">
          <label>Language</label>
          <div className="seg" style={{ alignSelf: 'flex-start' }}>
            <button className={lang === 'fr' ? 'on' : ''} onClick={() => setLang('fr')}>FR</button>
            <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button>
          </div>
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
