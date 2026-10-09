import { useState } from 'react'
import { Icon } from '../../ui/Icon'
import { DRAG_MIME } from './Canvas'
import { PALETTE, type PaletteItem } from './stepTypes'

export function Palette({ onDragState, onClickItem }: { onDragState: (d: boolean) => void; onClickItem: (item: PaletteItem) => void }) {
  const [drag, setDrag] = useState<string | null>(null)
  const groups = ['Entry', 'Message', 'Wait', 'Split', 'Action'] as const
  return (
    <aside className="palette">
      <div className="pt">Steps</div>
      <div className="ps">Drag onto a connection, use “+” on a connection, or “Add next step” in a step’s panel.</div>
      {groups.map((g) => (
        <div key={g} className="col" style={{ gap: 4 }}>
          <div className="pg">{g}</div>
          {PALETTE.filter((p) => p.group === g).map((p) => {
            const isEntry = p.type === 'event'
            return (
              <button
                key={p.key}
                className={`pi ${drag === p.key ? 'dragging' : ''}`}
                draggable={!isEntry}
                disabled={isEntry}
                title={isEntry ? 'Every journey has exactly one Event entry' : `Drag “${p.label}” onto a connection`}
                onDragStart={(e) => {
                  e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ type: p.type }))
                  e.dataTransfer.effectAllowed = 'copy'
                  setDrag(p.key)
                  onDragState(true)
                }}
                onDragEnd={() => {
                  setDrag(null)
                  onDragState(false)
                }}
                onClick={() => !isEntry && onClickItem(p)}
                style={isEntry ? { opacity: 0.6, cursor: 'default' } : undefined}
              >
                <span className={`pal-ic t-${p.tint}`}><Icon name={p.icon} size={12} /></span>
                {p.label}
              </button>
            )
          })}
        </div>
      ))}
    </aside>
  )
}
