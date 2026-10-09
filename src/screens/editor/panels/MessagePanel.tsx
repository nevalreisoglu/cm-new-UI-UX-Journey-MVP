import { useRef, useState } from 'react'
import { useActions } from '../../../app/store'
import { CONTACT_FIELDS, OFFERS, POLICIES, eventById } from '../../../mock'
import { contentIsEmpty, entryStep } from '../../../model/graph'
import type { EmailContent, Language, PushContent, SmsContent, Step } from '../../../model/types'
import { Icon } from '../../../ui/Icon'
import type { PanelProps } from './StepPanel'

// Message — Email / SMS / Push [4]: FR / EN tabs + default language, content per channel,
// placeholder chips, offer, control group share, communication rules, send to unsubscribed.
export function MessagePanel({ step, mode, onChange, journey, version }: PanelProps & { step: Extract<Step, { type: 'message' }> }) {
  const { toast } = useActions()
  const m = step.message
  const full = mode === 'full'
  const content = mode !== 'none'
  const [lang, setLang] = useState<Language>(m.defaultLanguage)
  const lastField = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const dirty = useRef(false)

  const entry = entryStep(version.steps)
  const ev = entry?.type === 'event' ? eventById(entry.event.eventId) : undefined
  const placeholders = [...CONTACT_FIELDS, ...(ev?.payload.map((p) => p.name) ?? [])]

  const setMsg = (patch: Partial<typeof m>) => onChange({ ...step, message: { ...m, ...patch } })
  const setContent = (patch: Record<string, string>) => {
    dirty.current = true
    onChange({ ...step, message: { ...m, content: { ...m.content, [lang]: { ...m.content[lang], ...patch } } } })
  }
  // Content edits in an Active version need no approval but are logged in the version history.
  const commit = () => {
    if (mode === 'content' && dirty.current) {
      dirty.current = false
      onChange(step, `Content updated (${step.name} · ${lang.toUpperCase()})`)
    }
  }
  const insert = (ph: string) => {
    const el = lastField.current
    const token = `{{${ph}}}`
    if (!el || !content) {
      navigator.clipboard?.writeText(token).catch(() => undefined)
      toast('info', 'Copied', `${token} — click into a field first to insert directly.`)
      return
    }
    const name = el.name
    const cur = el.value
    const start = el.selectionStart ?? cur.length
    const end = el.selectionEnd ?? cur.length
    const next = cur.slice(0, start) + token + cur.slice(end)
    setContent({ [name]: next })
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + token.length, start + token.length)
    })
  }

  const c = m.content[lang]
  const field = (name: string, label: string, kind: 'input' | 'textarea', extra?: React.ReactNode) => (
    <div className="fld" key={name}>
      <label>{label}</label>
      {kind === 'input' ? (
        <input name={name} value={(c as unknown as Record<string, string>)[name] ?? ''} disabled={!content} onFocus={(e) => (lastField.current = e.target)} onChange={(e) => setContent({ [name]: e.target.value })} onBlur={commit} />
      ) : (
        <textarea name={name} rows={m.channel === 'email' ? 7 : 3} value={(c as unknown as Record<string, string>)[name] ?? ''} disabled={!content} onFocus={(e) => (lastField.current = e.target)} onChange={(e) => setContent({ [name]: e.target.value })} onBlur={commit} />
      )}
      {extra}
    </div>
  )

  const smsLen = m.channel === 'sms' ? (c as SmsContent).text.length : 0
  const smsParts = Math.max(1, Math.ceil(smsLen / 160))

  return (
    <>
      <div className="langtabs">
        {(['fr', 'en'] as Language[]).map((l) => {
          const empty = contentIsEmpty(m.channel, m.content[l])
          return (
            <button key={l} className={lang === l ? 'on' : ''} onClick={() => setLang(l)}>
              {l.toUpperCase()}
              {m.defaultLanguage === l && <span className="def">default</span>}
              {empty && <span className="warnd" title="No content in this language">●</span>}
            </button>
          )
        })}
        <div className="right row" style={{ gap: 6, fontSize: 12 }}>
          <span className="muted">Default</span>
          <select className="inp" style={{ width: 'auto', minHeight: 26, padding: '2px 6px', fontSize: 12 }} value={m.defaultLanguage} disabled={!full} onChange={(e) => setMsg({ defaultLanguage: e.target.value as Language })}>
            <option value="fr">FR</option>
            <option value="en">EN</option>
          </select>
        </div>
      </div>
      <span className="hint small muted">Contacts receive their own language; those without one get the default.</span>

      {m.channel === 'email' && (
        <>
          {field('subject', 'Subject', 'input')}
          {field('preheader', 'Preheader', 'input')}
          {field('body', 'Body', 'textarea')}
        </>
      )}
      {m.channel === 'sms' && field('text', 'Text', 'textarea', <div className={`counter ${smsLen > 160 ? 'over' : ''}`}>{smsLen} / 160 · {smsParts} part{smsParts > 1 ? 's' : ''}</div>)}
      {m.channel === 'push' && (
        <>
          {field('title', 'Title', 'input')}
          {field('text', 'Text', 'textarea')}
          {field('link', 'Link', 'input')}
        </>
      )}

      <div className="fld">
        <label>Placeholders <small>— click to insert at the cursor</small></label>
        <div className="row wrap" style={{ gap: 4 }}>
          {placeholders.map((p) => <button key={p} className="chip ph" onClick={() => insert(p)}>{`{{${p}}}`}</button>)}
        </div>
      </div>

      <div className={full ? '' : 'ro'}>
        <div className="sec">Settings</div>
        <div className="col" style={{ gap: 10, marginTop: 6 }}>
          <div className="fld">
            <label>Offer <small>(optional)</small></label>
            <select value={m.offerId ?? ''} disabled={!full} onChange={(e) => setMsg({ offerId: e.target.value || null })}>
              <option value="">No offer</option>
              {OFFERS.map((o) => <option key={o.id} value={o.id}>{o.name} · {o.code}</option>)}
            </select>
          </div>
          <div className="fld">
            <label>Control group share <small>— held out from this message, kept for comparison</small></label>
            <div className="row">
              <input type="number" min={0} max={50} style={{ width: 90 }} value={m.controlGroupShare} disabled={!full} onChange={(e) => setMsg({ controlGroupShare: Math.max(0, Math.min(50, Number(e.target.value) || 0)) })} />
              <span className="muted">%</span>
            </div>
          </div>
          <div className="fld">
            <label>Communication rules</label>
            <select value={m.policyId ?? ''} disabled={!full} onChange={(e) => setMsg({ policyId: e.target.value || null })}>
              <option value="">No policy</option>
              {POLICIES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {m.policyId && <span className="hint">{POLICIES.find((p) => p.id === m.policyId)?.summary}</span>}
          </div>
          {journey.overrideUnsubscribe && (
            <label className="ck">
              <input type="checkbox" checked={m.sendToUnsubscribed} disabled={!full} onChange={(e) => setMsg({ sendToUnsubscribed: e.target.checked })} />
              <span>Send even to unsubscribed contacts<small>Available because “Override unsubscribe” is on for this journey.</small></span>
            </label>
          )}
        </div>
      </div>
      <div className="info"><Icon name="info" /> Contacts who can’t be reached on this channel skip this step and continue.</div>
    </>
  )
}

export type { EmailContent, PushContent }
