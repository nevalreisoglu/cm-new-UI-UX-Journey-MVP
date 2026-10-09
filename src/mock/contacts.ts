import type { Contact } from '../model/types'
import { makeRng } from './rng'

const FIRST_FR = ['Camille', 'Léa', 'Mathis', 'Émile', 'Chloé', 'Nathan', 'Florence', 'Olivier', 'Jade', 'Thomas', 'Rosalie', 'Antoine', 'Maude', 'Félix', 'Noémie', 'Gabriel']
const FIRST_EN = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Lucas', 'Mia', 'Logan', 'Grace', 'Owen', 'Hannah', 'Jack', 'Ella', 'Ryan']
const LAST = ['Tremblay', 'Gagnon', 'Roy', 'Côté', 'Bouchard', 'Gauthier', 'Morin', 'Lavoie', 'Fortin', 'Smith', 'Brown', 'Wilson', 'Taylor', 'Martin', 'Lee', 'Walker', 'Nguyen', 'Patel', 'Singh', 'Chen']
const PLANS = ['Mobile 10 GB', 'Mobile 20 GB', 'Mobile 40 GB', 'Home Internet 100', 'Mobile + Home bundle']

/** A few hundred generated contacts. Generic names only. Some have no phone or push token
 *  so that message steps produce skips (item 4). Prospects have no plan. */
export function generateContacts(): Contact[] {
  const rng = makeRng(20261009)
  const out: Contact[] = []
  const total = 420
  for (let i = 0; i < total; i++) {
    const kind = i < 320 ? 'customers' : 'prospects'
    const language = rng.chance(0.58) ? 'fr' : 'en'
    const firstName = rng.pick(language === 'fr' ? FIRST_FR : FIRST_EN)
    const lastName = rng.pick(LAST)
    const n = String(i + 1).padStart(4, '0')
    const id = (kind === 'customers' ? 'CUS-' : 'PRO-') + n
    const hasPhone = rng.chance(kind === 'customers' ? 0.9 : 0.6)
    const hasPush = rng.chance(kind === 'customers' ? 0.62 : 0.25)
    out.push({
      id,
      kind,
      firstName,
      lastName,
      email: `${firstName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}.${lastName.toLowerCase()}${n}@example.com`,
      phone: hasPhone ? `+1 514 555 ${String(1000 + rng.int(0, 8999))}` : undefined,
      pushToken: hasPush ? `tok_${n}${rng.int(100, 999)}` : undefined,
      language,
      plan: kind === 'customers' ? rng.pick(PLANS) : '—',
      unsubscribed: rng.chance(0.08),
    })
  }
  return out
}
