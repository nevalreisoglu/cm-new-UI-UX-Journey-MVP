import type { Step, Version } from './types'
import { buildGraph, type Graph, type NodeStatus } from './layout'

// Roadmap item 1 — approver "View changes": canvas diff of a pending version vs. the Active one.

export interface DiffEntry {
  stepId: string
  name: string
  status: NodeStatus
  detail: string
}

const structural = (s: Step) => {
  const { name: _n, collapsed: _c, ...rest } = s
  void _n
  void _c
  if (rest.type === 'message') {
    const { content: _content, ...m } = rest.message
    void _content
    return JSON.stringify({ ...rest, message: m })
  }
  return JSON.stringify(rest)
}
const contentOf = (s: Step) => (s.type === 'message' ? JSON.stringify(s.message.content) : '')

export function diffVersions(pending: Version, active: Version | undefined): { entries: DiffEntry[]; structureChanged: boolean; graph: Graph } {
  const entries: DiffEntry[] = []
  const a = new Map((active?.steps ?? []).map((s) => [s.id, s]))
  const p = new Map(pending.steps.map((s) => [s.id, s]))
  const status: Record<string, NodeStatus> = {}
  for (const s of pending.steps) {
    const old = a.get(s.id)
    if (!old) {
      status[s.id] = 'added'
      entries.push({ stepId: s.id, name: s.name, status: 'added', detail: 'New step' })
    } else if (structural(old) !== structural(s)) {
      status[s.id] = 'changed'
      entries.push({ stepId: s.id, name: s.name, status: 'changed', detail: describeChange(old, s) })
    } else if (contentOf(old) !== contentOf(s)) {
      status[s.id] = 'changed'
      entries.push({ stepId: s.id, name: s.name, status: 'changed', detail: 'Message content changed' })
    } else if (old.name !== s.name) {
      status[s.id] = 'changed'
      entries.push({ stepId: s.id, name: s.name, status: 'changed', detail: `Renamed from “${old.name}”` })
    }
  }
  for (const s of active?.steps ?? []) if (!p.has(s.id)) entries.push({ stepId: s.id, name: s.name, status: 'removed', detail: 'Step removed' })

  // Union graph: pending steps plus the removed steps re-attached where they were.
  const graph = buildGraph(pending.steps)
  for (const n of graph.nodes) if (n.kind === 'step' && status[n.id]) n.status = status[n.id]
  const removed = (active?.steps ?? []).filter((s) => !p.has(s.id))
  for (const s of removed) {
    graph.nodes.push({ id: s.id, kind: 'step', step: s, status: 'removed' })
  }
  for (const s of active?.steps ?? []) {
    for (const o of s.outlets) {
      if (!o.next) continue
      const fromRemoved = !p.has(s.id)
      const toRemoved = !p.has(o.next)
      if (!fromRemoved && !toRemoved) continue
      if (!graph.nodes.some((n) => n.id === s.id) || !graph.nodes.some((n) => n.id === o.next)) continue
      graph.edges.push({ id: `old-${s.id}:${o.id}`, from: s.id, to: o.next, outletId: o.id, label: o.label, dangling: false, status: 'removed' })
    }
  }
  for (const e of graph.edges) {
    if (e.status) continue
    const oldFrom = a.get(e.from)
    const oldOutlet = oldFrom?.outlets.find((o) => o.id === e.outletId)
    if (!oldFrom || !oldOutlet || oldOutlet.next !== e.to) e.status = 'added'
  }
  const structureChanged = entries.some((e) => e.status !== 'changed' || e.detail !== 'Message content changed')
  return { entries, structureChanged, graph }
}

function describeChange(old: Step, s: Step): string {
  if (old.type !== s.type) return `Type changed ${old.type} → ${s.type}`
  if (s.type === 'wait' && old.type === 'wait') return `Wait ${old.wait.amount} ${old.wait.unit} → ${s.wait.amount} ${s.wait.unit}`
  if (s.type === 'shuffleSplit' && old.type === 'shuffleSplit') return 'Shuffle percentages changed'
  if (s.type === 'segmentSplit') return 'Segments changed'
  if (s.type === 'engagementSplit') return 'Linked message changed'
  if (s.type === 'event' && old.type === 'event') return `Entry: ${old.event.eventId} / ${old.event.entryMode} → ${s.event.eventId} / ${s.event.entryMode}`
  if (s.type === 'message' && old.type === 'message') {
    const bits: string[] = []
    if (old.message.offerId !== s.message.offerId) bits.push('offer')
    if (old.message.controlGroupShare !== s.message.controlGroupShare) bits.push('control group share')
    if (old.message.policyId !== s.message.policyId) bits.push('communication rules')
    if (old.message.defaultLanguage !== s.message.defaultLanguage) bits.push('default language')
    if (old.message.sendToUnsubscribed !== s.message.sendToUnsubscribed) bits.push('send to unsubscribed')
    const outlets = old.outlets.map((o) => o.next).join() !== s.outlets.map((o) => o.next).join()
    if (outlets) bits.push('next step')
    return bits.length ? `Changed: ${bits.join(', ')}` : 'Settings changed'
  }
  const outlets = old.outlets.map((o) => o.next).join() !== s.outlets.map((o) => o.next).join()
  return outlets ? 'Next step changed' : 'Settings changed'
}
