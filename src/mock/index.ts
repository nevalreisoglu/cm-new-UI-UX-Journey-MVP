import type { Contact, ContactState, Journey } from '../model/types'
import { generateContacts } from './contacts'
import { JOURNEYS } from './journeys'
import { simulateAll } from './simulate'

export interface World {
  journeys: Journey[]
  contacts: Contact[]
  states: ContactState[]
}

/** Builds the in-memory world once. Everything the app shows comes from here. */
export function seed(): World {
  const contacts = generateContacts()
  const journeys = JOURNEYS.map((j) => ({ ...j }))
  const states = simulateAll(journeys, contacts)
  return { journeys, contacts, states }
}

export { EVENTS, eventById, CONTACT_FIELDS } from './events'
export { SEGMENTS, OFFERS, POLICIES, USERS, userByRole, userName } from './lists'
export { NOW } from './journeys'
