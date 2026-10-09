import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Channel, Orientation, Step, StepType } from '../../model/types'
import { edgePath, layoutGraph, NODE_H, NODE_W, type Graph, type GraphEdge, type GraphNode } from '../../model/layout'
import { Icon } from '../../ui/Icon'
import { ADDABLE, paletteFor, type PaletteItem } from './stepTypes'

// Canvas (centre) — auto-layout only, two orientations, zoom / pan / fit, collapse a split path,
// three ways to add a step (drag from palette onto a connection, "+" on a connection, and
// "Add next step" in the panel, which calls the same onAddStep).

export interface CanvasProps {
  graph: Graph
  orientation: Orientation
  selectedId?: string | null
  onSelect?: (id: string | null) => void
  editable?: boolean
  onAddStep?: (edge: GraphEdge, item: PaletteItem) => void
  onToggleCollapse?: (stepId: string) => void
  invalidIds?: Set<string>
  summary: (step: Step) => string
  /** rendered under the card (Monitor stats strip) */
  extra?: (step: Step) => ReactNode
  extraHeight?: number
  /** edge id → label suffix (Monitor: count and % per split path) */
  edgeStat?: (edge: GraphEdge) => string | undefined
  highlightSteps?: Set<string>
  highlightEdges?: Set<string>
  dragging?: boolean
  /** change to re-fit the view (e.g. version switch) */
  fitKey?: string
}

export const DRAG_MIME = 'application/x-journey-step'

export function Canvas(props: CanvasProps) {
  const { graph, orientation, selectedId, onSelect, editable, onAddStep, invalidIds, summary, extra, extraHeight = 0, edgeStat, highlightSteps, highlightEdges, dragging, onToggleCollapse } = props
  const wrapRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState({ x: 0, y: 0, k: 1 })
  const [menuEdge, setMenuEdge] = useState<{ edge: GraphEdge; x: number; y: number } | null>(null)
  const [hoverEdge, setHoverEdge] = useState<string | null>(null)
  const panRef = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null)

  const layout = useMemo(
    () => layoutGraph(graph, orientation, (n: GraphNode) => ({ w: NODE_W, h: NODE_H + (n.step && extra ? extraHeight : 0) })),
    [graph, orientation, extra, extraHeight],
  )

  const fit = useCallback(() => {
    const el = wrapRef.current
    if (!el) return
    const cw = el.clientWidth
    const ch = el.clientHeight
    const k = Math.min(1, (cw - 24) / layout.width, (ch - 24) / layout.height)
    setView({ k, x: (cw - layout.width * k) / 2, y: Math.max(16, (ch - layout.height * k) / 2) })
  }, [layout.width, layout.height])

  // fit on first paint and when the fitKey changes (not on every edit, that would jump around)
  useLayoutEffect(() => {
    fit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.fitKey, orientation])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      setView((v) => {
        const k = Math.min(2, Math.max(0.25, v.k * (e.deltaY < 0 ? 1.1 : 0.9)))
        return { k, x: mx - ((mx - v.x) * k) / v.k, y: my - ((my - v.y) * k) / v.k }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const zoom = (f: number) => {
    const el = wrapRef.current
    if (!el) return
    const mx = el.clientWidth / 2
    const my = el.clientHeight / 2
    setView((v) => {
      const k = Math.min(2, Math.max(0.25, v.k * f))
      return { k, x: mx - ((mx - v.x) * k) / v.k, y: my - ((my - v.y) * k) / v.k }
    })
  }

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    panRef.current = { sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y, moved: false }
  }
  const onMouseMove = (e: React.MouseEvent) => {
    const p = panRef.current
    if (!p) return
    const dx = e.clientX - p.sx
    const dy = e.clientY - p.sy
    if (Math.abs(dx) + Math.abs(dy) > 3) p.moved = true
    if (p.moved) setView((v) => ({ ...v, x: p.ox + dx, y: p.oy + dy }))
  }
  const onMouseUp = (e: React.MouseEvent) => {
    const p = panRef.current
    panRef.current = null
    if (p && !p.moved && e.target === e.currentTarget) {
      onSelect?.(null)
      setMenuEdge(null)
    }
  }

  const edgeGeom = useMemo(() => {
    const byFrom: Record<string, GraphEdge[]> = {}
    for (const e of graph.edges) (byFrom[e.from] ??= []).push(e)
    return graph.edges.map((e) => {
      const from = layout.nodes[e.from]
      const to = layout.nodes[e.to]
      if (!from || !to) return null
      const sib = byFrom[e.from]
      const idx = sib.indexOf(e)
      // the card itself is NODE_H tall; the stats strip hangs below it, so anchor on the card
      const fromCard = orientation === 'LR' ? { ...from, h: Math.min(from.h, NODE_H) } : from
      const toCard = orientation === 'LR' ? { ...to, h: Math.min(to.h, NODE_H) } : to
      // labels sit mid-edge where fanned paths are apart; in the editor the + is there, so move them toward the target
      return { e, ...edgePath(fromCard, toCard, orientation, idx, sib.length, editable ? 0.72 : 0.42) }
    })
  }, [graph.edges, layout, orientation, editable])

  return (
    <div className={`canvas-wrap ${panRef.current ? 'panning' : ''}`} ref={wrapRef} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={() => (panRef.current = null)}>
      <div className="canvas-tools" onMouseDown={(e) => e.stopPropagation()}>
        <button className="ic-btn" title="Zoom in" onClick={() => zoom(1.2)}><Icon name="zoomin" /></button>
        <button className="ic-btn" title="Zoom out" onClick={() => zoom(1 / 1.2)}><Icon name="zoomout" /></button>
        <button className="ic-btn" title="Fit to screen" onClick={fit}><Icon name="fit" /></button>
        <span className="muted small num" style={{ padding: '0 6px' }}>{Math.round(view.k * 100)} %</span>
      </div>
      <div className="canvas-inner" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, width: layout.width, height: layout.height }}>
        <svg className="edges" width={layout.width} height={layout.height}>
          <defs>
            <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill="#6b6b80" />
            </marker>
            <marker id="arr-hl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill="#f58220" />
            </marker>
          </defs>
          {edgeGeom.map((g) => {
            if (!g) return null
            const hl = highlightEdges?.has(g.e.id)
            const cls = ['edge', g.e.dangling ? 'dangling' : '', hl ? 'hl' : '', g.e.status ? `st-${g.e.status}` : '', hoverEdge === g.e.id ? 'hover' : ''].join(' ')
            return <path key={g.e.id} d={g.d} className={cls} markerEnd={hl ? 'url(#arr-hl)' : 'url(#arr)'} />
          })}
        </svg>

        {/* edge labels, "+" buttons and drop zones */}
        {edgeGeom.map((g) => {
          if (!g) return null
          const e = g.e
          const stat = edgeStat?.(e)
          const hasLabel = e.label || stat
          return (
            <div key={e.id}>
              {hasLabel && (
                <div className={`edge-label ${e.status ? `st-${e.status}` : ''}`} style={{ left: g.labelAt.x, top: g.labelAt.y }}>
                  {e.label}
                  {stat && <span className="es">{stat}</span>}
                </div>
              )}
              {editable && (
                <div
                  className={`edge-plus ${dragging ? 'drop' : ''} ${hoverEdge === e.id ? 'hover' : ''}`}
                  style={{ left: g.mid.x, top: g.mid.y }}
                  title="Add a step here"
                  onMouseDown={(ev) => ev.stopPropagation()}
                  onClick={(ev) => {
                    ev.stopPropagation()
                    setMenuEdge(menuEdge?.edge.id === e.id ? null : { edge: e, x: g.mid.x, y: g.mid.y })
                  }}
                  onDragOver={(ev) => {
                    if (ev.dataTransfer.types.includes(DRAG_MIME)) {
                      ev.preventDefault()
                      ev.dataTransfer.dropEffect = 'copy'
                      setHoverEdge(e.id)
                    }
                  }}
                  onDragLeave={() => setHoverEdge((h) => (h === e.id ? null : h))}
                  onDrop={(ev) => {
                    ev.preventDefault()
                    setHoverEdge(null)
                    const raw = ev.dataTransfer.getData(DRAG_MIME)
                    if (!raw) return
                    const { type, channel } = JSON.parse(raw) as { type: StepType; channel?: Channel }
                    onAddStep?.(e, paletteFor(type, channel))
                  }}
                >
                  <Icon name="plus" size={12} />
                </div>
              )}
            </div>
          )
        })}

        {/* nodes */}
        {graph.nodes.map((n) => {
          const p = layout.nodes[n.id]
          if (!p) return null
          if (n.kind === 'end') return <div key={n.id} className="node-end" style={{ left: p.x, top: p.y }} title="This path does not end with Exit" />
          if (n.kind === 'stub')
            return (
              <div key={n.id} className="node-stub" style={{ left: p.x, top: p.y, width: p.w, height: p.h }}>
                {n.hidden} step{n.hidden === 1 ? '' : 's'} hidden
              </div>
            )
          const step = n.step!
          const item = paletteFor(step.type, step.type === 'message' ? step.message.channel : undefined)
          const cls = [
            'node',
            `t-${item.tint}`,
            selectedId === step.id ? 'sel' : '',
            invalidIds?.has(step.id) ? 'invalid' : '',
            highlightSteps?.has(step.id) ? 'hl' : '',
            n.status ? `st-${n.status}` : '',
          ].join(' ')
          return (
            <div
              key={n.id}
              className={cls}
              style={{ left: p.x, top: p.y, width: p.w }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setMenuEdge(null)
                onSelect?.(step.id)
              }}
            >
              <div className="node-card">
                <span className="node-ic"><Icon name={item.icon} size={15} /></span>
                <div className="node-txt">
                  <div className="node-kind">{item.group === 'Message' ? item.label : item.group === 'Split' ? `${item.label} split` : item.label}{n.status && <span className={`node-st st-${n.status}`}>{n.status}</span>}</div>
                  <div className="node-name" title={step.name}>{step.name}</div>
                  <div className="node-sum" title={summary(step)}>{summary(step)}</div>
                </div>
                {step.outlets.length > 1 && onToggleCollapse && (
                  <button className="node-collapse" title={step.collapsed ? 'Expand paths' : 'Collapse paths'} onClick={(e) => { e.stopPropagation(); onToggleCollapse(step.id) }}>
                    <Icon name={step.collapsed ? 'expand' : 'collapse'} size={12} />
                  </button>
                )}
              </div>
              {extra && <div className="node-extra">{extra(step)}</div>}
            </div>
          )
        })}

        {menuEdge && (
          <StepTypeMenu
            style={{ left: menuEdge.x + 14, top: menuEdge.y + 8 }}
            onPick={(item) => {
              onAddStep?.(menuEdge.edge, item)
              setMenuEdge(null)
            }}
          />
        )}
      </div>
    </div>
  )
}

/** Menu of step types (used by the "+" on a connection and by "Add next step" in a panel). */
export function StepTypeMenu({ onPick, style }: { onPick: (item: PaletteItem) => void; style?: React.CSSProperties }) {
  const groups = ['Message', 'Wait', 'Split', 'Action'] as const
  return (
    <div className="menu step-menu" style={style} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      {groups.map((g) => (
        <div key={g}>
          <div className="grp">{g}</div>
          {ADDABLE.filter((p) => p.group === g).map((p) => (
            <button key={p.key} onClick={() => onPick(p)}>
              <span className={`pal-ic t-${p.tint}`}><Icon name={p.icon} size={13} /></span>
              {p.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
