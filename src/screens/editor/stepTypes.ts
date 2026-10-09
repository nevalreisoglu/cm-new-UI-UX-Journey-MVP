import type { StepType } from '../../model/types'

export interface PaletteItem {
  key: string
  group: 'Entry' | 'Message' | 'Wait' | 'Split' | 'Action'
  label: string
  type: StepType
  icon: string
  tint: string
}

// Palette (left): Entry: Event · Message: Delivery · Wait: Duration ·
// Split: Segment, Engagement, Shuffle · Action: Control group, Exit.
export const PALETTE: PaletteItem[] = [
  { key: 'event', group: 'Entry', label: 'Event', type: 'event', icon: 'event', tint: 'entry' },
  { key: 'delivery', group: 'Message', label: 'Delivery', type: 'delivery', icon: 'send', tint: 'message' },
  { key: 'wait', group: 'Wait', label: 'Duration', type: 'wait', icon: 'wait', tint: 'wait' },
  { key: 'segmentSplit', group: 'Split', label: 'Segment', type: 'segmentSplit', icon: 'segment', tint: 'split' },
  { key: 'engagementSplit', group: 'Split', label: 'Engagement', type: 'engagementSplit', icon: 'engagement', tint: 'split' },
  { key: 'shuffleSplit', group: 'Split', label: 'Shuffle', type: 'shuffleSplit', icon: 'shuffle', tint: 'split' },
  { key: 'controlGroup', group: 'Action', label: 'Control group', type: 'controlGroup', icon: 'control', tint: 'control' },
  { key: 'exit', group: 'Action', label: 'Exit', type: 'exit', icon: 'exit', tint: 'exit' },
]

export const ADDABLE = PALETTE.filter((p) => p.type !== 'event')

export function paletteFor(type: StepType): PaletteItem {
  return PALETTE.find((p) => p.type === type) ?? PALETTE[0]
}

/** Card label per step type (splits say "… split"). */
export const kindLabel = (item: PaletteItem) => (item.group === 'Split' ? `${item.label} split` : item.label)
