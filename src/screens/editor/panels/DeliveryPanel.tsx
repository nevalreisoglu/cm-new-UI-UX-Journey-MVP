import { useState } from 'react'
import { CONTACT_FIELDS, OFFER_FIELDS, OFFERS, POLICIES, contentById, contentsFor, defaultContentFor, eventById, offerById } from '../../../mock'
import { CHANNEL_LABEL, entryStep } from '../../../model/graph'
import { fill, offerFields } from '../../../model/render'
import type { Channel, Step } from '../../../model/types'
import { ChannelIcon, Icon } from '../../../ui/Icon'
import type { PanelProps } from './StepPanel'

// Delivery [4]: a 3-step stepper — Create (name) → Channel (one channel, a ready-made content item
// with a read-only preview) → Details (offer, communication rules, send even to unsubscribed).
// No campaign link, no language variants (language is split with a Segment split), no hold-out
// share (hold-outs use Shuffle split + Control group).

type Sub = 'create' | 'channel' | 'details'
const SUBS: { id: Sub; label: string }[] = [
  { id: 'create', label: 'Create' },
  { id: 'channel', label: 'Channel' },
  { id: 'details', label: 'Details' },
]

export function DeliveryPanel({ step, mode, onChange, journey, version }: PanelProps & { step: Extract<Step, { type: 'delivery' }> }) {
  const d = step.delivery
  const full = mode === 'full'
  const contentEditable = mode !== 'none'
  const [sub, setSub] = useState<Sub>(mode === 'full' && !d.contentId ? 'channel' : 'channel')
  const item = contentById(d.contentId)
  const offer = offerById(d.offerId)
  const entry = entryStep(version.steps)
  const ev = entry?.type === 'event' ? eventById(entry.event.eventId) : undefined

  const set = (patch: Partial<typeof d>) => onChange({ ...step, delivery: { ...d, ...patch } })
  const setChannel = (channel: Channel) => {
    if (channel === d.channel) return
    set({ channel, contentId: defaultContentFor(channel)?.id ?? null })
  }
  // The content choice is the one change an Active version accepts without approval; it is logged.
  const setContent = (id: string) => {
    const from = contentById(d.contentId)?.name ?? 'none'
    const to = contentById(id)?.name ?? 'none'
    onChange({ ...step, delivery: { ...d, contentId: id || null } }, mode === 'content' ? `Content changed (${step.name}): ${from} → ${to}` : undefined)
  }

  // preview with sample values so the marketer sees what placeholders resolve to
  const sample: Record<string, string> = {
    first_name: 'Camille', last_name: 'Tremblay', email: 'camille.tremblay@example.com', phone: '+1 514 555 0199', plan: 'Mobile 20 GB', language: 'FR',
    ...Object.fromEntries((ev?.payload ?? []).map((p) => [p.name, p.sample])),
    ...offerFields(offer),
  }
  const stepIndex = SUBS.findIndex((x) => x.id === sub)

  return (
    <>
      <div className="stepper">
        {SUBS.map((x, i) => (
          <button key={x.id} className={sub === x.id ? 'on' : i < stepIndex ? 'done' : ''} onClick={() => setSub(x.id)}>
            <i>{i + 1}</i> {x.label}
          </button>
        ))}
      </div>

      {sub === 'create' && (
        <>
          <div className="fld">
            <label>Delivery name</label>
            <input value={step.name} disabled={!full} onChange={(e) => onChange({ ...step, name: e.target.value })} />
            <span className="hint">Shown on the canvas and in Monitor. The content itself is chosen in the Channel step.</span>
          </div>
          <dl className="kv">
            <dt>Channel</dt><dd>{CHANNEL_LABEL[d.channel]}</dd>
            <dt>Content</dt><dd>{item ? `${item.name} (${item.language.toUpperCase()})` : <span style={{ color: 'var(--bad)' }}>Not chosen</span>}</dd>
            <dt>Offer</dt><dd>{offer ? `${offer.name} · ${offer.code}` : '—'}</dd>
            <dt>Rules</dt><dd>{POLICIES.find((p) => p.id === d.policyId)?.name ?? 'No policy'}</dd>
          </dl>
          <button className="btn outline sm" style={{ alignSelf: 'flex-start' }} onClick={() => setSub('channel')}>Next: Channel →</button>
        </>
      )}

      {sub === 'channel' && (
        <>
          <div className="fld">
            <label>Channel <small>— one channel per Delivery</small></label>
            <div className="chan-cards">
              {(['email', 'sms', 'push'] as Channel[]).map((c) => (
                <button key={c} className={`chan-card ${d.channel === c ? 'on' : ''}`} disabled={!full} onClick={() => setChannel(c)}>
                  <ChannelIcon channel={c} />
                  <span>{CHANNEL_LABEL[c]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="fld">
            <label>Content <small>— ready-made, single-language</small></label>
            <select value={d.contentId ?? ''} disabled={!contentEditable} onChange={(e) => setContent(e.target.value)} style={{ borderColor: d.contentId ? undefined : 'var(--bad)' }}>
              <option value="">Choose content…</option>
              {contentsFor(d.channel).map((c) => (
                <option key={c.id} value={c.id}>{c.name} · {c.language.toUpperCase()}{c.isDefault ? ' · default' : ''}</option>
              ))}
            </select>
            <span className="hint">{mode === 'content' ? 'Changing the content needs no approval and is logged in the version history.' : 'Content items are managed in Content; they are not edited here.'}</span>
          </div>
          {item && (
            <div className="preview">
              <div className="pv-h">
                <ChannelIcon channel={item.channel} />
                <b>{item.name}</b>
                <span className="pill">{item.language.toUpperCase()}</span>
                <span className="muted small right">Read-only preview · sample values</span>
              </div>
              {item.channel === 'email' && (
                <div className="pv-b">
                  <div><span className="muted">Subject</span> {fill((item.body as { subject: string }).subject, sample)}</div>
                  <div><span className="muted">Preheader</span> {fill((item.body as { preheader: string }).preheader, sample)}</div>
                  <pre>{fill((item.body as { body: string }).body, sample)}</pre>
                </div>
              )}
              {item.channel === 'sms' && <div className="pv-b"><pre>{fill((item.body as { text: string }).text, sample)}</pre><div className="counter">{(item.body as { text: string }).text.length} / 160</div></div>}
              {item.channel === 'push' && (
                <div className="pv-b">
                  <div><b>{fill((item.body as { title: string }).title, sample)}</b></div>
                  <div>{fill((item.body as { text: string }).text, sample)}</div>
                  <div className="small muted">{fill((item.body as { link: string }).link, sample)}</div>
                </div>
              )}
            </div>
          )}
          <details className="small muted">
            <summary>Placeholders filled at send time</summary>
            <div className="row wrap" style={{ gap: 4, marginTop: 6 }}>
              {[...CONTACT_FIELDS, ...(ev?.payload.map((p) => p.name) ?? []), ...OFFER_FIELDS].map((p) => <span key={p} className="chip mono">{`{{${p}}}`}</span>)}
            </div>
          </details>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn outline sm" onClick={() => setSub('create')}>← Create</button>
            <button className="btn outline sm" onClick={() => setSub('details')}>Next: Details →</button>
          </div>
        </>
      )}

      {sub === 'details' && (
        <>
          <div className={full ? 'col' : 'col ro'} style={{ gap: 12 }}>
            <div className="fld">
              <label>Offer <small>(optional)</small></label>
              <select value={d.offerId ?? ''} disabled={!full} onChange={(e) => set({ offerId: e.target.value || null })}>
                <option value="">No offer</option>
                {OFFERS.map((o) => <option key={o.id} value={o.id}>{o.name} · {o.code}</option>)}
              </select>
              <span className="hint">
                {offer ? <>Fills <span className="mono">{'{{offer_name}}'}</span>, <span className="mono">{'{{offer_code}}'}</span> and <span className="mono">{'{{offer_link}}'}</span> in the content. Sends are attributed to {offer.code}.</> : 'Name, code and link of the offer become placeholders; sends are attributed to the offer.'}
              </span>
            </div>
            <div className="fld">
              <label>Communication rules</label>
              <select value={d.policyId ?? ''} disabled={!full} onChange={(e) => set({ policyId: e.target.value || null })}>
                <option value="">No policy</option>
                {POLICIES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {d.policyId && <span className="hint">{POLICIES.find((p) => p.id === d.policyId)?.summary}</span>}
            </div>
            {journey.overrideUnsubscribe && (
              <label className="ck">
                <input type="checkbox" checked={d.sendToUnsubscribed} disabled={!full} onChange={(e) => set({ sendToUnsubscribed: e.target.checked })} />
                <span>Send even to unsubscribed contacts<small>Available because “Override unsubscribe” is on for this journey.</small></span>
              </label>
            )}
          </div>
          <div className="info"><Icon name="info" /> Contacts who can’t be reached on this channel skip this step and continue.</div>
          <button className="btn outline sm" style={{ alignSelf: 'flex-start' }} onClick={() => setSub('channel')}>← Channel</button>
        </>
      )}
    </>
  )
}
