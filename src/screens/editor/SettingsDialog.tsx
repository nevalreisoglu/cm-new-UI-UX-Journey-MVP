import { useState } from 'react'
import { useActions, useStore } from '../../app/store'
import type { Journey } from '../../model/types'
import { Icon } from '../../ui/Icon'
import { Modal } from '../../ui/Modal'

// Journey settings [1][7]: name, description, contact list, override unsubscribe (confirmation), test users.
export function SettingsDialog({ journey, locked, onClose }: { journey: Journey; locked: boolean; onClose: () => void }) {
  const { state } = useStore()
  const { updateJourney, toast } = useActions()
  const [name, setName] = useState(journey.name)
  const [description, setDescription] = useState(journey.description)
  const [contactList, setContactList] = useState(journey.contactList)
  const [override, setOverride] = useState(journey.overrideUnsubscribe)
  const [testUserIds, setTestUserIds] = useState(journey.testUserIds)
  const [confirm, setConfirm] = useState(false)
  const [q, setQ] = useState('')

  const pool = state.contacts.filter((c) => c.kind === contactList)
  const shown = pool.filter((c) => !q || `${c.firstName} ${c.lastName} ${c.email} ${c.id}`.toLowerCase().includes(q.toLowerCase())).slice(0, 12)
  const selected = state.contacts.filter((c) => testUserIds.includes(c.id))

  const save = () => {
    updateJourney(journey.id, { name: name.trim() || journey.name, description, contactList, overrideUnsubscribe: override, testUserIds })
    toast('ok', 'Settings saved')
    onClose()
  }

  return (
    <Modal title="Journey settings" onClose={onClose} size="lg" footer={<><button className="btn outline" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Save</button></>}>
      <div className="form2">
        <div className="fld span2"><label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="fld span2"><label>Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
        <div className="fld">
          <label>Contact list</label>
          <div className="seg" style={{ alignSelf: 'flex-start' }}>
            <button className={contactList === 'customers' ? 'on' : ''} disabled={locked} onClick={() => setContactList('customers')}>Customers</button>
            <button className={contactList === 'prospects' ? 'on' : ''} disabled={locked} onClick={() => setContactList('prospects')}>Prospects</button>
          </div>
          {locked && <span className="hint">Locked while a version is active.</span>}
        </div>
        <div className="fld">
          <label>Override unsubscribe</label>
          <label className="ck">
            <input type="checkbox" checked={override} onChange={(e) => (e.target.checked ? setConfirm(true) : setOverride(false))} />
            <span>Allow messages to unsubscribed contacts<small>Each message step then has a “Send even to unsubscribed” switch. The journey shows a badge.</small></span>
          </label>
        </div>
        <div className="fld span2">
          <label>Test users <small>— used by Test send</small></label>
          <div className="row wrap" style={{ gap: 4 }}>
            {selected.map((c) => (
              <span key={c.id} className="chip">{c.firstName} {c.lastName} · {c.id} <button className="x" style={{ width: 18, height: 18, fontSize: 14 }} onClick={() => setTestUserIds(testUserIds.filter((i) => i !== c.id))}>×</button></span>
            ))}
            {!selected.length && <span className="muted small">No test users yet.</span>}
          </div>
          <label className="search-in" style={{ maxWidth: 'none' }}>
            <Icon name="search" />
            <input placeholder={`Search ${contactList} by name, email or ID`} value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <div className="col" style={{ gap: 2, maxHeight: 180, overflow: 'auto' }}>
            {shown.map((c) => (
              <label key={c.id} className="ck" style={{ padding: '3px 2px' }}>
                <input type="checkbox" checked={testUserIds.includes(c.id)} onChange={(e) => setTestUserIds(e.target.checked ? [...testUserIds, c.id] : testUserIds.filter((i) => i !== c.id))} />
                <span>{c.firstName} {c.lastName} <span className="muted">· {c.id} · {c.email} · {c.language.toUpperCase()}{c.phone ? '' : ' · no phone'}{c.pushToken ? '' : ' · no push'}</span></span>
              </label>
            ))}
          </div>
        </div>
      </div>
      {confirm && (
        <Modal title="Send to unsubscribed contacts?" onClose={() => setConfirm(false)} footer={<><button className="btn outline" onClick={() => setConfirm(false)}>Cancel</button><button className="btn danger" onClick={() => { setOverride(true); setConfirm(false) }}>Yes, allow override</button></>}>
          <p>Messages in this journey may be sent to contacts who unsubscribed from marketing. Use this only for service messages the contact must receive (e.g. a device they asked to be notified about).</p>
          <p className="muted small">The journey list shows an “Override unsubscribe” badge while this is on.</p>
        </Modal>
      )}
    </Modal>
  )
}
