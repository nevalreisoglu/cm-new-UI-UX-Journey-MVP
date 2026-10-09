import type { Offer, Policy, Segment, User } from '../model/types'

// Short fixed lists used only in dropdowns (no management pages).

export const SEGMENTS: Segment[] = [
  { id: 'seg-account-today', name: 'Account created today', description: 'Activation date = today' },
  { id: 'seg-high-value', name: 'High-value customers', description: 'Monthly spend above 60 $' },
  { id: 'seg-prepaid', name: 'Prepaid plans', description: 'Any prepaid plan' },
  { id: 'seg-multi-line', name: 'Multi-line accounts', description: 'Two or more lines on the account' },
  { id: 'seg-fr-quebec', name: 'Québec – French', description: 'Province QC, language FR' },
  { id: 'seg-recent-device', name: 'Bought a device in the last 90 days', description: 'Device order completed < 90 d' },
]

export const OFFERS: Offer[] = [
  { id: 'off-10-off', name: '10 $ off next device', code: 'DEV10' },
  { id: 'off-free-month', name: 'One month free', code: 'FREE1M' },
  { id: 'off-5gb', name: '+5 GB for 3 months', code: 'PLUS5GB' },
  { id: 'off-roaming', name: 'Roaming pass 50 % off', code: 'ROAM50' },
]

export const POLICIES: Policy[] = [
  { id: 'pol-default', name: 'Default contact policy', summary: 'Max 3 marketing messages / 7 days, quiet hours 21:00–08:00' },
  { id: 'pol-transactional', name: 'Transactional', summary: 'No frequency cap, no quiet hours' },
  { id: 'pol-light', name: 'Light touch', summary: 'Max 1 marketing message / 7 days' },
]

export const USERS: User[] = [
  { id: 'u-marketer', name: 'Marie Tremblay', role: 'marketer' },
  { id: 'u-approver', name: 'Daniel Roy', role: 'approver' },
]

export const userByRole = (role: 'marketer' | 'approver') => USERS.find((u) => u.role === role)!
export const userName = (id: string) => USERS.find((u) => u.id === id)?.name ?? id
