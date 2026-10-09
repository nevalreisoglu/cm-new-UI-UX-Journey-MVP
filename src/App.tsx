import { StoreProvider, useActions, useStore } from './app/store'
import { navigate, useRoute } from './app/router'
import { Icon } from './ui/Icon'
import { Toasts } from './ui/Toasts'
import { JourneyList } from './screens/journeys/JourneyList'
import { JourneyEditor } from './screens/editor/JourneyEditor'
import { Monitor } from './screens/monitor/Monitor'
import { USERS } from './mock'

function Shell() {
  const route = useRoute()
  const { state } = useStore()
  const { setRole, me } = useActions()
  const journey = route.name !== 'journeys' ? state.journeys.find((j) => j.id === route.journeyId) : undefined

  return (
    <div className="app">
      <header className="topbar">
        <div className="logo">
          <span className="mark" />
          <span className="w">
            <b>ETIYA</b>
            <small>Marketing cloud</small>
          </span>
        </div>
        <span className="pill">Prototype · Journey MVP</span>
        <div className="tright">
          {/* Role switcher — Marketer / Approver */}
          <div className="rolesw">
            <span>Role view</span>
            <div className="seg">
              {USERS.map((u) => (
                <button key={u.id} className={state.role === u.role ? 'on' : ''} onClick={() => setRole(u.role)}>
                  {u.role === 'marketer' ? 'Marketer' : 'Approver'}
                </button>
              ))}
            </div>
          </div>
          <div className="avatar">
            <span className="a" />
            <span className="n">
              <b>{me.name}</b>
              <small>{me.role === 'marketer' ? 'Campaign marketer' : 'Campaign approver'}</small>
            </span>
          </div>
        </div>
      </header>

      <nav className="nav">
        <div className="grp">Journeys</div>
        <button className={route.name === 'journeys' ? 'active' : ''} onClick={() => navigate({ name: 'journeys' })}>
          <Icon name="journeys" /> Journeys
        </button>
        <button
          className={route.name === 'monitor' ? 'active' : ''}
          disabled={!journey}
          title={journey ? `Monitor · ${journey.name}` : 'Open a journey first'}
          onClick={() => journey && navigate({ name: 'monitor', journeyId: journey.id })}
        >
          <Icon name="monitor" /> Monitor
        </button>
        {journey && <div className="sub">{journey.name}</div>}
        <div className="foot">
          Event-triggered, per-customer journeys.
          <br />
          Segment-based campaigns live in Campaigns.
        </div>
      </nav>

      <main className="main">
        {route.name === 'journeys' && <JourneyList key={state.role} />}
        {route.name === 'editor' && <JourneyEditor key={`${route.journeyId}:${route.versionId ?? ""}`} journeyId={route.journeyId} versionId={route.versionId} stepId={route.stepId} />}
        {route.name === 'monitor' && <Monitor key={route.journeyId} journeyId={route.journeyId} tab={route.tab} stepId={route.stepId} />}
      </main>
      <Toasts />
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
