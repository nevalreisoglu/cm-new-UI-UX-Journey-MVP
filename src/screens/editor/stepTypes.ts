import type { Channel, StepType } from '../../model/types'

export interface PaletteItem {
  key: string
  group: 'Entry' | 'Message' | 'Wait' | 'Split' | 'Action'
  label: string
  type: StepType
  channel?: Channel
  icon: string
  tint: string
}

// Palette (left): Entry: Event · Message: Email, SMS, Push · Wait: Duration ·
// Split: Segment, Engagement, Shuffle · Action: Control group, Exit.
export const PALETTE: PaletteItem[] = [
  { key: 'event', group: 'Entry', label: 'Event', type: 'event', icon: 'event', tint: 'entry' },
  { key: 'email', group: 'Message', label: 'Email', type: 'message', channel: 'email', icon: 'email', tint: 'message' },
  { key: 'sms', group: 'Message', label: 'SMS', type: 'message', channel: 'sms', icon: 'sms', tint: 'message' },
  { key: 'push', group: 'Message', label: 'Push', type: 'message', channel: 'push', icon: 'push', tint: 'message' },
  { key: 'wait', group: 'Wait', label: 'Duration', type: 'wait', icon: 'wait', tint: 'wait' },
  { key: 'segmentSplit', group: 'Split', label: 'Segment', type: 'segmentSplit', icon: 'segment', tint: 'split' },
  { key: 'engagementSplit', group: 'Split', label: 'Engagement', type: 'engagementSplit', icon: 'engagement', tint: 'split' },
  { key: 'shuffleSplit', group: 'Split', label: 'Shuffle', type: 'shuffleSplit', icon: 'shuffle', tint: 'split' },
  { key: 'controlGroup', group: 'Action', label: 'Control group', type: 'controlGroup', icon: 'control', tint: 'control' },
  { key: 'exit', group: 'Action', label: 'Exit', type: 'exit', icon: 'exit', tint: 'exit' },
]

export const ADDABLE = PALETTE.filter((p) => p.type !== 'event')

export function paletteFor(type: StepType, channel?: Channel): PaletteItem {
  return PALETTE.find((p) => p.type === type && (type !== 'message' || p.channel === channel)) ?? PALETTE[0]
}
