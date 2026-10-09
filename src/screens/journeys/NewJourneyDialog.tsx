import { useState } from 'react'
import { useActions } from '../../app/store'
import { navigate } from '../../app/router'
import { EVENTS } from '../../mock'
import { Modal } from '../../ui/Modal'
import type { Journey } from '../../model/types'

// "+ New journey": name, event, single / batch, contact list → opens the editor with Event and Exit placed.
export function NewJourneyDialog({ onClose }: { onClose: () => void }) {
  const { createJourney, toast } = useActions()
  const [name, setName] = useState('')
  const [eventId, setEventId] = useState(EVENTS[0].id)
  const [entryMode, setEntryMode] = useState<'single' | 'batch'>('single')
  const [contactList, setContactList] = useState<Journey['contactList']>('customers')
  const ev = EVENTS.find((e) => e.id === eventId)!

  const create = () => {
    if (!name.trim()) return
    const j = createJourney({ name: name.trim(), eventId, entryMode, contactList })
    toast('ok', 'Journey created', 'Event entry and Exit are already placed. Add steps on the connection between them.')
    onClose()
    navigate({ name: 'editor', journeyId: j.id })
  }

  return (
    <Modal
      title="New journey"
      onClose={onClose}
      footer={
        <>
          <button className="btn outline" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!name.trim()} onClick={create}>Create journey</button>
        </>
      }
    >
      <div className="fld">
        <label>Name</label>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Device order abandonment" onKeyDown={(e) => e.key === 'Enter' && create()} />
      </div>
      <div className="fld">
        <label>Event <small>— every journey starts from an event</small></label>
        <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
          {EVENTS.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.id}</option>)}
        </select>
        <span className="hint">{ev.description} Payload: {ev.payload.map((p) => p.name).join(', ')}.</span>
      </div>
      <div className="form2">
        <div className="fld">
          <label>Entry</label>
          <div className="seg">
            <button className={entryMode === 'single' ? 'on' : ''} onClick={() => setEntryMode('single')}>Single</button>
            <button className={entryMode === 'batch' ? 'on' : ''} onClick={() => setEntryMode('batch')}>Batch</button>
          </div>
          <span className="hint">{entryMode === 'single' ? 'One event per API call.' : 'Many events per API call (API only, no file upload).'}</span>
        </div>
        <div className="fld">
          <label>Contact list</label>
          <div className="seg">
            <button className={contactList === 'customers' ? 'on' : ''} onClick={() => setContactList('customers')}>Customers</button>
            <button className={contactList === 'prospects' ? 'on' : ''} onClick={() => setContactList('prospects')}>Prospects</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
