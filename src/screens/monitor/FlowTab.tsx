import { useMemo, type ReactNode } from 'react'
import { buildGraph, type GraphEdge } from '../../model/layout'
import { pct, stepStats } from '../../model/stats'
import type { ContactState, Journey, Step, Version } from '../../model/types'
import { Canvas } from '../editor/Canvas'
import { summaryFor } from '../editor/summary'

export const STATS_H = 38

// Flow: read-only canvas with a stats strip under each step; count and % per split path.
export function FlowTab({ journey, version, states, onStep, highlightSteps, highlightEdges }: { journey: Journey; version: Version; states: ContactState[]; onStep?: (id: string) => void; highlightSteps?: Set<string>; highlightEdges?: Set<string> }) {
  const stats = useMemo(() => stepStats(states, version.steps), [states, version.steps])
  const graph = useMemo(() => buildGraph(version.steps), [version.steps])
  const extra = (s: Step): ReactNode => {
    const st = stats[s.id]
    if (!st) return null
    if (s.type === 'exit') return <><span><b>{st.entered}</b> exited</span></>
    if (s.type === 'controlGroup') return <><span><b>{st.entered}</b> in group</span></>
    return (
      <>
        <span><b>{st.entered}</b> entered</span>
        <span><b>{st.waiting}</b> waiting</span>
        <span><b>{st.exited}</b> exited</span>
        {s.type === 'delivery' && (
          <>
            <span><b>{st.sent}</b> sent</span>
            <span className={st.skipped ? 'skip' : ''}><b>{st.skipped}</b> skipped</span>
            {s.delivery.channel !== 'sms' && <span><b>{st.opened}</b> opened</span>}
            <span><b>{st.clicked}</b> clicked</span>
          </>
        )}
      </>
    )
  }
  const edgeStat = (e: GraphEdge) => {
    const st = stats[e.from]
    const from = version.steps.find((s) => s.id === e.from)
    if (!st || !from || from.outlets.length <= 1) return undefined
    const n = st.paths[e.outletId] ?? 0
    return `${n} · ${pct(n, st.entered - st.waiting)} %`
  }
  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <Canvas
        graph={graph}
        orientation={journey.orientation}
        summary={(s) => summaryFor(s, version)}
        extra={extra}
        extraHeight={STATS_H}
        edgeStat={edgeStat}
        onSelect={(id) => id && onStep?.(id)}
        highlightSteps={highlightSteps}
        highlightEdges={highlightEdges}
        fitKey={`${version.id}-${highlightSteps ? 'hl' : ''}`}
      />
    </div>
  )
}
