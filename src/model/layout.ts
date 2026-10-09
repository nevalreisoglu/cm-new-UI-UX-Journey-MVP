import dagre from '@dagrejs/dagre'
import type { Orientation, Step } from './types'
import { entryStep, stepMap } from './graph'

// Auto-layout only (no free positioning). dagre places the steps; the canvas draws them.

export type NodeStatus = 'added' | 'removed' | 'changed'

export interface GraphNode {
  id: string
  kind: 'step' | 'stub' | 'end'
  step?: Step
  /** for stubs: how many steps are hidden behind a collapsed split path */
  hidden?: number
  /** diff colouring */
  status?: NodeStatus
}

export interface GraphEdge {
  id: string
  from: string
  to: string
  outletId: string
  label: string
  /** true when the outlet has no next step (path without Exit) */
  dangling: boolean
  status?: NodeStatus
}

export interface Graph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

/** Build the drawable graph for a set of steps. Collapsed splits hide their paths behind stubs. */
export function buildGraph(steps: Step[], opts: { collapse?: boolean } = {}): Graph {
  const map = stepMap(steps)
  const entry = entryStep(steps)
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  if (!entry) return { nodes, edges }
  const seen = new Set<string>()
  const countSubtree = (id: string): number => {
    let n = 0
    const walk = (sid: string) => {
      const s = map.get(sid)
      if (!s) return
      n++
      for (const o of s.outlets) if (o.next) walk(o.next)
    }
    walk(id)
    return n
  }
  const walk = (id: string) => {
    if (seen.has(id)) return
    const step = map.get(id)
    if (!step) return
    seen.add(id)
    nodes.push({ id, kind: 'step', step })
    const collapsed = !!opts.collapse && !!step.collapsed && step.outlets.length > 1
    step.outlets.forEach((o, i) => {
      if (!o.next) {
        const endId = `${id}-end-${i}`
        nodes.push({ id: endId, kind: 'end' })
        edges.push({ id: `${id}:${o.id}`, from: id, to: endId, outletId: o.id, label: o.label, dangling: true })
        return
      }
      if (collapsed) {
        const stubId = `${id}-stub-${i}`
        nodes.push({ id: stubId, kind: 'stub', hidden: countSubtree(o.next) })
        edges.push({ id: `${id}:${o.id}`, from: id, to: stubId, outletId: o.id, label: o.label, dangling: false })
        return
      }
      edges.push({ id: `${id}:${o.id}`, from: id, to: o.next, outletId: o.id, label: o.label, dangling: false })
      walk(o.next)
    })
  }
  walk(entry.id)
  return { nodes, edges }
}

export interface Placed {
  id: string
  x: number
  y: number
  w: number
  h: number
}

export interface Layout {
  nodes: Record<string, Placed>
  width: number
  height: number
}

export const NODE_W = 208
export const NODE_H = 66
export const STUB_W = 150
export const STUB_H = 36
export const END_W = 24
export const END_H = 24

export function layoutGraph(graph: Graph, orientation: Orientation, sizeOf?: (n: GraphNode) => { w: number; h: number }): Layout {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: orientation, nodesep: orientation === 'LR' ? 28 : 36, ranksep: orientation === "LR" ? 64 : 56, marginx: 24, marginy: 24 })
  g.setDefaultEdgeLabel(() => ({}))
  for (const n of graph.nodes) {
    const base = n.kind === 'step' ? { w: NODE_W, h: NODE_H } : n.kind === 'stub' ? { w: STUB_W, h: STUB_H } : { w: END_W, h: END_H }
    const size = n.kind === 'step' && sizeOf ? sizeOf(n) : base
    g.setNode(n.id, { width: size.w, height: size.h })
  }
  for (const e of graph.edges) g.setEdge(e.from, e.to)
  dagre.layout(g)
  const nodes: Record<string, Placed> = {}
  let width = 0
  let height = 0
  for (const id of g.nodes()) {
    const n = g.node(id)
    if (!n) continue
    const p = { id, x: n.x - n.width / 2, y: n.y - n.height / 2, w: n.width, h: n.height }
    nodes[id] = p
    width = Math.max(width, p.x + p.w)
    height = Math.max(height, p.y + p.h)
  }
  return { nodes, width: width + 24, height: height + 24 }
}

/** Anchor points and a cubic path for an edge. Splits fan their outlets along the exit side. */
export function edgePath(from: Placed, to: Placed, orientation: Orientation, index: number, count: number, labelT = 0.5): { d: string; mid: { x: number; y: number }; labelAt: { x: number; y: number } } {
  const spread = (size: number) => (count <= 1 ? 0 : ((index + 1) / (count + 1) - 0.5) * size * 0.9)
  let x1: number, y1: number, x2: number, y2: number
  if (orientation === 'LR') {
    x1 = from.x + from.w
    y1 = from.y + from.h / 2 + spread(from.h)
    x2 = to.x
    y2 = to.y + to.h / 2
  } else {
    x1 = from.x + from.w / 2 + spread(from.w)
    y1 = from.y + from.h
    x2 = to.x + to.w / 2
    y2 = to.y
  }
  const dx = x2 - x1
  const dy = y2 - y1
  const c1 = orientation === 'LR' ? { x: x1 + dx * 0.5, y: y1 } : { x: x1, y: y1 + dy * 0.5 }
  const c2 = orientation === 'LR' ? { x: x2 - dx * 0.5, y: y2 } : { x: x2, y: y2 - dy * 0.5 }
  const d = `M ${x1} ${y1} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${x2} ${y2}`
  const at = (t: number) => {
    const mt = 1 - t
    return {
      x: mt * mt * mt * x1 + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t * t * t * x2,
      y: mt * mt * mt * y1 + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t * t * t * y2,
    }
  }
  return { d, mid: at(0.5), labelAt: at(labelT) }
}
