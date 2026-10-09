import { useEffect } from 'react'
import { useActions, useStore } from '../app/store'

export function Toasts() {
  const { state } = useStore()
  const { dismissToast } = useActions()
  const latest = state.toasts[state.toasts.length - 1]
  useEffect(() => {
    if (!latest) return
    const t = setTimeout(() => dismissToast(latest.id), latest.text && latest.text.length > 120 ? 9000 : 4500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest?.id])
  if (!state.toasts.length) return null
  return (
    <div className="toast-wrap">
      {state.toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind === 'info' ? '' : t.kind}`} onClick={() => dismissToast(t.id)}>
          <b>{t.title}</b>
          {t.text && <div style={{ whiteSpace: 'pre-wrap' }}>{t.text}</div>}
        </div>
      ))}
    </div>
  )
}
