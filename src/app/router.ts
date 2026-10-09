import { useEffect, useState } from 'react'

// A tiny hash router: #/journeys · #/journeys/:id · #/journeys/:id/monitor
export type Route =
  | { name: 'journeys' }
  | { name: 'editor'; journeyId: string; versionId?: string }
  | { name: 'monitor'; journeyId: string; tab?: string; stepId?: string }

export function parseHash(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?')
  const parts = path.split('/').filter(Boolean)
  const q = new URLSearchParams(query)
  if (parts[0] === 'journeys' && parts[1]) {
    if (parts[2] === 'monitor') return { name: 'monitor', journeyId: parts[1], tab: q.get('tab') ?? undefined, stepId: q.get('step') ?? undefined }
    return { name: 'editor', journeyId: parts[1], versionId: q.get('v') ?? undefined }
  }
  return { name: 'journeys' }
}

export function hrefFor(r: Route): string {
  if (r.name === 'journeys') return '#/journeys'
  if (r.name === 'editor') return `#/journeys/${r.journeyId}${r.versionId ? `?v=${r.versionId}` : ''}`
  const q = new URLSearchParams()
  if (r.tab) q.set('tab', r.tab)
  if (r.stepId) q.set('step', r.stepId)
  const s = q.toString()
  return `#/journeys/${r.journeyId}/monitor${s ? `?${s}` : ''}`
}

export const navigate = (r: Route) => {
  window.location.hash = hrefFor(r)
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))
  useEffect(() => {
    const on = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}
