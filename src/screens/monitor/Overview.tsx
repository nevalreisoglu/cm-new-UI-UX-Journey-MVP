import { useMemo } from 'react'
import { userName } from '../../mock'
import { channelStats, pct, totals } from '../../model/stats'
import type { ContactState, Journey } from '../../model/types'
import { ChannelIcon } from '../../ui/Icon'
import { VersionPill } from '../../ui/Pill'
import { fmtDate, fmtNum } from '../../ui/format'

// Overview: totals, channel breakdown, versions table.
export function Overview({ journey, states }: { journey: Journey; states: ContactState[] }) {
  const t = useMemo(() => totals(states), [states])
  const ch = useMemo(() => channelStats(states, journey.versions), [states, journey.versions])
  const perVersion = useMemo(() => {
    const m: Record<string, ReturnType<typeof totals>> = {}
    for (const v of journey.versions) m[v.id] = totals(states.filter((s) => s.versionId === v.id))
    return m
  }, [states, journey.versions])

  return (
    <div className="col" style={{ gap: 16, overflow: 'auto', flex: 1, minHeight: 0 }}>
      <div className="stats">
        <div className="stat"><span className="s">Entered</span><span className="v num">{fmtNum(t.entered)}</span><span className="d">contacts received the event</span></div>
        <div className="stat"><span className="s">In journey now</span><span className="v num">{fmtNum(t.inside)}</span><span className="d">waiting or in a step</span></div>
        <div className="stat"><span className="s">Exited</span><span className="v num">{fmtNum(t.exited)}</span><span className="d">{pct(t.exited, t.entered)} % of entered</span></div>
        <div className="stat"><span className="s">Skipped</span><span className="v num">{fmtNum(t.skipped)}</span><span className="d">exited after an unreachable step</span></div>
        <div className="stat"><span className="s">Control group</span><span className="v num">{fmtNum(t.control)}</span><span className="d">kept for comparison</span></div>
      </div>

      <div>
        <div className="sec">Channel breakdown</div>
        <table className="tbl" style={{ marginTop: 6 }}>
          <thead>
            <tr><th>Channel</th><th className="r">Sent</th><th className="r">Opened</th><th className="r">Clicked</th><th className="r">Skipped</th><th>Open rate</th></tr>
          </thead>
          <tbody>
            {(['email', 'sms', 'push'] as const).map((c) => {
              const s = ch[c]
              const any = s.sent + s.skipped > 0
              return (
                <tr key={c} style={any ? undefined : { color: 'var(--ink-3)' }}>
                  <td><span className="row" style={{ gap: 8 }}><ChannelIcon channel={c} /> {c === 'email' ? 'Email' : c === 'sms' ? 'SMS' : 'Push'}</span></td>
                  <td className="r num">{fmtNum(s.sent)}</td>
                  <td className="r num">{c === 'sms' ? <span className="muted" title="SMS has no open tracking">—</span> : fmtNum(s.opened)}</td>
                  <td className="r num">{fmtNum(s.clicked)}</td>
                  <td className="r num" style={s.skipped ? { color: 'var(--bad)' } : undefined}>{fmtNum(s.skipped)}</td>
                  <td style={{ width: 220 }}>
                    {c !== 'sms' && any && (
                      <span className="row" style={{ gap: 8 }}>
                        <span className="pbar" style={{ width: 120 }}><i style={{ width: `${pct(s.opened, s.sent)}%` }} /></span>
                        <span className="small num">{pct(s.opened, s.sent)} %</span>
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div>
        <div className="sec">Versions</div>
        <table className="tbl" style={{ marginTop: 6 }}>
          <thead>
            <tr><th>Version</th><th>Status</th><th>Note</th><th>Activated by / when</th><th className="r">Entered</th><th className="r">Inside</th><th className="r">Exited</th></tr>
          </thead>
          <tbody>
            {[...journey.versions].sort((a, b) => b.number - a.number).map((v) => {
              const s = perVersion[v.id]
              return (
                <tr key={v.id}>
                  <td className="t1">v{v.number}</td>
                  <td><VersionPill status={v.status} /></td>
                  <td>{v.note || <span className="muted">—</span>}</td>
                  <td>{v.activatedBy ? <>{userName(v.activatedBy)} <span className="muted">· {fmtDate(v.activatedAt, true)}</span></> : <span className="muted">Not activated</span>}</td>
                  <td className="r num">{fmtNum(s.entered)}</td>
                  <td className="r num">{fmtNum(s.inside)}</td>
                  <td className="r num">{fmtNum(s.exited + s.skipped + s.control)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
