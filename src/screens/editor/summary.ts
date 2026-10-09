import { SEGMENTS, contentById, eventById } from '../../mock'
import { oneLineSummary } from '../../model/graph'
import type { Step, Version } from '../../model/types'

export const summaryFor = (step: Step, version: Version) =>
  oneLineSummary(step, {
    eventName: (id) => eventById(id)?.name ?? id,
    segmentName: (id) => SEGMENTS.find((s) => s.id === id)?.name ?? id,
    stepName: (id) => version.steps.find((s) => s.id === id)?.name ?? '?',
    contentName: (id) => {
      const c = contentById(id)
      return c ? `${c.name} (${c.language.toUpperCase()})` : undefined
    },
  })
