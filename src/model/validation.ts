import type { Step, Version } from './types'
import { isRemainingOutlet, entryStep } from './graph'

// Roadmap item 1 — validation blocks "Submit for approval".

export interface Issue {
  id: string
  stepId: string | null
  text: string
}

export function validate(version: Version): Issue[] {
  const issues: Issue[] = []
  const steps = version.steps
  const entry = entryStep(steps)
  if (!entry) {
    issues.push({ id: 'no-entry', stepId: null, text: 'The journey has no Event entry.' })
    return issues
  }
  const map = new Map(steps.map((s) => [s.id, s]))
  const seen = new Set<string>()
  const walk = (s: Step) => {
    if (seen.has(s.id)) return
    seen.add(s.id)
    switch (s.type) {
      case 'segmentSplit': {
        const paths = s.outlets.filter((o) => !isRemainingOutlet(o))
        if (paths.length === 0 || paths.some((o) => !s.segmentSplit.segments[o.id]))
          issues.push({ id: `seg-${s.id}`, stepId: s.id, text: `“${s.name}”: segment split without a segment on every path.` })
        break
      }
      case 'shuffleSplit': {
        const total = s.outlets.reduce((a, o) => a + (s.shuffleSplit.percents[o.id] ?? 0), 0)
        if (total !== 100) issues.push({ id: `shuffle-${s.id}`, stepId: s.id, text: `“${s.name}”: shuffle split paths total ${total} %, not 100 %.` })
        break
      }
      case 'engagementSplit': {
        if (!s.engagementSplit.messageStepId || !map.has(s.engagementSplit.messageStepId))
          issues.push({ id: `eng-${s.id}`, stepId: s.id, text: `“${s.name}”: engagement split without a linked message.` })
        break
      }
      case 'delivery': {
        if (!s.delivery.contentId) issues.push({ id: `content-${s.id}`, stepId: s.id, text: `“${s.name}”: delivery without content.` })
        break
      }
    }
    for (const o of s.outlets) {
      if (!o.next) issues.push({ id: `exit-${s.id}-${o.id}`, stepId: s.id, text: `“${s.name}”${o.label ? ` · ${o.label}` : ''}: path does not end with Exit.` })
      else {
        const n = map.get(o.next)
        if (n) walk(n)
      }
    }
  }
  walk(entry)
  return issues
}

export const invalidStepIds = (issues: Issue[]) => new Set(issues.map((i) => i.stepId).filter((x): x is string => !!x))
