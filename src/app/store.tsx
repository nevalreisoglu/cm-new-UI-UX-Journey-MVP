import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react'
import type { Contact, ContactState, Journey, Orientation, Role, Step, Version } from '../model/types'
import { seed, userByRole } from '../mock'
import { insertOnConnection, makeStep, removeStep, uid } from '../model/graph'

// All state lives in memory (no backend). Seeded once from src/mock.

export interface Toast {
  id: number
  kind: 'ok' | 'warn' | 'bad' | 'info'
  title: string
  text?: string
}

export interface State {
  role: Role
  journeys: Journey[]
  contacts: Contact[]
  states: ContactState[]
  toasts: Toast[]
  clock: string
}

type VersionPatch = (v: Version, actor: string, at: string) => Version

export type Action =
  | { type: 'setRole'; role: Role }
  | { type: 'toast'; toast: Omit<Toast, 'id'> }
  | { type: 'dismissToast'; id: number }
  | { type: 'addJourney'; journey: Journey }
  | { type: 'updateJourney'; id: string; patch: Partial<Journey> }
  | { type: 'deleteJourney'; id: string }
  | { type: 'updateVersion'; journeyId: string; versionId: string; fn: VersionPatch }
  | { type: 'addVersion'; journeyId: string; version: Version }
  | { type: 'deleteVersion'; journeyId: string; versionId: string }
  | { type: 'setSteps'; journeyId: string; versionId: string; steps: Step[]; log?: string }

let toastId = 1
const nowIso = () => new Date().toISOString()

function reducer(state: State, action: Action): State {
  const actor = userByRole(state.role).id
  const at = nowIso()
  const mapJ = (id: string, fn: (j: Journey) => Journey) => ({
    ...state,
    journeys: state.journeys.map((j) => (j.id === id ? { ...fn(j), updatedAt: at, updatedBy: actor } : j)),
  })
  switch (action.type) {
    case 'setRole':
      return { ...state, role: action.role }
    case 'toast':
      return { ...state, toasts: [...state.toasts, { ...action.toast, id: toastId++ }] }
    case 'dismissToast':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) }
    case 'addJourney':
      return { ...state, journeys: [action.journey, ...state.journeys] }
    case 'updateJourney':
      return mapJ(action.id, (j) => ({ ...j, ...action.patch }))
    case 'deleteJourney':
      return { ...state, journeys: state.journeys.filter((j) => j.id !== action.id) }
    case 'updateVersion':
      return mapJ(action.journeyId, (j) => ({
        ...j,
        versions: j.versions.map((v) => (v.id === action.versionId ? action.fn(v, actor, at) : v)),
      }))
    case 'addVersion':
      return mapJ(action.journeyId, (j) => ({ ...j, versions: [...j.versions, action.version] }))
    case 'deleteVersion':
      return mapJ(action.journeyId, (j) => ({ ...j, versions: j.versions.filter((v) => v.id !== action.versionId) }))
    case 'setSteps':
      return mapJ(action.journeyId, (j) => ({
        ...j,
        versions: j.versions.map((v) =>
          v.id === action.versionId
            ? { ...v, steps: action.steps, history: action.log ? [...v.history, { at, by: actor, text: action.log }] : v.history }
            : v,
        ),
      }))
  }
}

const Ctx = createContext<{ state: State; dispatch: (a: Action) => void } | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, () => {
    const w = seed()
    return { role: 'marketer' as Role, ...w, toasts: [], clock: nowIso() }
  })
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('StoreProvider missing')
  return ctx
}

export function useActions() {
  const { state, dispatch } = useStore()
  const me = userByRole(state.role)
  const toast = (kind: Toast['kind'], title: string, text?: string) => dispatch({ type: 'toast', toast: { kind, title, text } })

  return {
    me,
    toast,
    setRole: (role: Role) => dispatch({ type: 'setRole', role }),
    dismissToast: (id: number) => dispatch({ type: 'dismissToast', id }),

    // ---- journeys (item 7) ----
    createJourney: (input: { name: string; eventId: string; entryMode: 'single' | 'batch'; contactList: Journey['contactList'] }): Journey => {
      const at = nowIso()
      const entry = makeStep('event', { eventId: input.eventId })
      if (entry.type === 'event') entry.event.entryMode = input.entryMode
      const exit = makeStep('exit')
      entry.outlets[0].next = exit.id
      const journey: Journey = {
        id: uid('j'),
        name: input.name,
        description: '',
        contactList: input.contactList,
        overrideUnsubscribe: false,
        testUserIds: [],
        orientation: 'LR',
        createdAt: at,
        updatedAt: at,
        updatedBy: me.id,
        versions: [
          { id: uid('v'), number: 1, status: 'draft', note: '', steps: [entry, exit], createdAt: at, createdBy: me.id, history: [{ at, by: me.id, text: 'Created' }] },
        ],
      }
      dispatch({ type: 'addJourney', journey })
      return journey
    },
    duplicateJourney: (j: Journey): Journey => {
      const at = nowIso()
      const src = j.versions.find((v) => v.status === 'active') ?? [...j.versions].sort((a, b) => b.number - a.number)[0]
      const copy: Journey = {
        ...j,
        id: uid('j'),
        name: `${j.name} (copy)`,
        createdAt: at,
        updatedAt: at,
        updatedBy: me.id,
        versions: [
          { id: uid('v'), number: 1, status: 'draft', note: '', steps: cloneSteps(src.steps), createdAt: at, createdBy: me.id, history: [{ at, by: me.id, text: `Duplicated from “${j.name}” v${src.number}` }] },
        ],
      }
      dispatch({ type: 'addJourney', journey: copy })
      return copy
    },
    updateJourney: (id: string, patch: Partial<Journey>) => dispatch({ type: 'updateJourney', id, patch }),
    setOrientation: (id: string, orientation: Orientation) => dispatch({ type: 'updateJourney', id, patch: { orientation } }),
    deleteJourney: (id: string) => dispatch({ type: 'deleteJourney', id }),

    // ---- editing steps ----
    setSteps: (journeyId: string, versionId: string, steps: Step[], log?: string) => dispatch({ type: 'setSteps', journeyId, versionId, steps, log }),
    updateStep: (journeyId: string, version: Version, step: Step, log?: string) =>
      dispatch({ type: 'setSteps', journeyId, versionId: version.id, steps: version.steps.map((s) => (s.id === step.id ? step : s)), log }),
    addStepOnConnection: (journeyId: string, version: Version, fromId: string, outletId: string, step: Step) => {
      dispatch({ type: 'setSteps', journeyId, versionId: version.id, steps: insertOnConnection(version.steps, fromId, outletId, step) })
      return step
    },
    deleteStep: (journeyId: string, version: Version, stepId: string) =>
      dispatch({ type: 'setSteps', journeyId, versionId: version.id, steps: removeStep(version.steps, stepId) }),

    // ---- version lifecycle (item 1) ----
    submitForApproval: (journeyId: string, versionId: string, note: string) =>
      dispatch({
        type: 'updateVersion',
        journeyId,
        versionId,
        fn: (v, by, at) => ({ ...v, status: 'pending', note: note || v.note, submittedAt: at, submittedBy: by, rejectComment: undefined, history: [...v.history, { at, by, text: `Submitted for approval${note ? `: “${note}”` : ''}` }] }),
      }),
    withdraw: (journeyId: string, versionId: string) =>
      dispatch({ type: 'updateVersion', journeyId, versionId, fn: (v, by, at) => ({ ...v, status: 'draft', history: [...v.history, { at, by, text: 'Withdrawn from approval' }] }) }),
    approve: (journey: Journey, versionId: string) => {
      // previous Active → Closing, this one → Active
      for (const v of journey.versions)
        if (v.status === 'active')
          dispatch({ type: 'updateVersion', journeyId: journey.id, versionId: v.id, fn: (x, by, at) => ({ ...x, status: 'closing', history: [...x.history, { at, by, text: `Superseded by a newer version → Closing` }] }) })
      dispatch({ type: 'updateVersion', journeyId: journey.id, versionId, fn: (v, by, at) => ({ ...v, status: 'active', activatedAt: at, activatedBy: by, history: [...v.history, { at, by, text: 'Approved and activated' }] }) })
    },
    reject: (journeyId: string, versionId: string, comment: string) =>
      dispatch({ type: 'updateVersion', journeyId, versionId, fn: (v, by, at) => ({ ...v, status: 'draft', rejectComment: comment, history: [...v.history, { at, by, text: `Rejected: “${comment}”` }] }) }),
    stop: (journeyId: string, versionId: string, mode: 'closing' | 'closed') =>
      dispatch({
        type: 'updateVersion',
        journeyId,
        versionId,
        fn: (v, by, at) => ({ ...v, status: mode, closedAt: mode === 'closed' ? at : v.closedAt, history: [...v.history, { at, by, text: mode === 'closing' ? 'Stopped → Closing (contacts inside finish their path)' : 'Stopped → Closed' }] }),
      }),
    close: (journeyId: string, versionId: string) =>
      dispatch({ type: 'updateVersion', journeyId, versionId, fn: (v, by, at) => ({ ...v, status: 'closed', closedAt: at, history: [...v.history, { at, by, text: 'Closed' }] }) }),
    copyToNewVersion: (journey: Journey, from: Version): Version => {
      const at = nowIso()
      const number = Math.max(...journey.versions.map((v) => v.number)) + 1
      const version: Version = {
        id: uid('v'),
        number,
        status: 'draft',
        note: '',
        steps: from.steps.map((s) => ({ ...s, outlets: s.outlets.map((o) => ({ ...o })) })),
        createdAt: at,
        createdBy: me.id,
        history: [{ at, by: me.id, text: `Copied from v${from.number}` }],
      }
      dispatch({ type: 'addVersion', journeyId: journey.id, version })
      return version
    },
    deleteVersion: (journeyId: string, versionId: string) => dispatch({ type: 'deleteVersion', journeyId, versionId }),
    addHistory: (journeyId: string, versionId: string, text: string) =>
      dispatch({ type: 'updateVersion', journeyId, versionId, fn: (v, by, at) => ({ ...v, history: [...v.history, { at, by, text }] }) }),
    setNote: (journeyId: string, versionId: string, note: string) =>
      dispatch({ type: 'updateVersion', journeyId, versionId, fn: (v) => ({ ...v, note }) }),
  }
}

/** Deep copy of steps with new ids (for duplicating a journey). */
function cloneSteps(steps: Step[]): Step[] {
  const idMap = new Map(steps.map((s) => [s.id, uid('s')]))
  const re = (id: string | null) => (id ? (idMap.get(id) ?? id) : null)
  return steps.map((s) => {
    const nid = idMap.get(s.id)!
    const copy = JSON.parse(JSON.stringify(s)) as Step
    copy.id = nid
    copy.outlets = s.outlets.map((o) => ({ ...o, id: o.id.replace(s.id, nid), next: re(o.next) }))
    if (copy.type === 'segmentSplit' && s.type === 'segmentSplit')
      copy.segmentSplit.segments = Object.fromEntries(Object.entries(s.segmentSplit.segments).map(([k, v]) => [k.replace(s.id, nid), v]))
    if (copy.type === 'shuffleSplit' && s.type === 'shuffleSplit')
      copy.shuffleSplit.percents = Object.fromEntries(Object.entries(s.shuffleSplit.percents).map(([k, v]) => [k.replace(s.id, nid), v]))
    if (copy.type === 'engagementSplit' && s.type === 'engagementSplit') copy.engagementSplit.messageStepId = re(s.engagementSplit.messageStepId)
    return copy
  })
}

export const useJourney = (id: string | undefined) => {
  const { state } = useStore()
  return id ? state.journeys.find((j) => j.id === id) : undefined
}
