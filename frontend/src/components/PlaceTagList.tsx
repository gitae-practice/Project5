import { useState } from 'react'
import type { MeetingPlaceInput } from '../types'

// 드래그앤드롭으로 순서 변경 가능한 장소 태그 목록
export default function PlaceTagList({ places, onChange }: {
  places: MeetingPlaceInput[]
  onChange: (places: MeetingPlaceInput[]) => void
}) {
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  if (places.length === 0) return null

  const handleDrop = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault()
    if (draggingIdx === null || draggingIdx === toIdx) { setDragOverIdx(null); return }
    const next = [...places]
    const [item] = next.splice(draggingIdx, 1)
    next.splice(toIdx, 0, item)
    onChange(next)
    setDraggingIdx(null)
    setDragOverIdx(null)
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {places.map((p, i) => (
        <span
          key={i}
          draggable
          onDragStart={() => setDraggingIdx(i)}
          onDragOver={e => { e.preventDefault(); setDragOverIdx(i) }}
          onDragLeave={() => setDragOverIdx(null)}
          onDrop={e => handleDrop(e, i)}
          onDragEnd={() => { setDraggingIdx(null); setDragOverIdx(null) }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 12,
            background: dragOverIdx === i ? '#eff6ff' : '#f3f4f6',
            border: `1px solid ${dragOverIdx === i ? '#bfdbfe' : '#e5e7eb'}`,
            borderRadius: 5, padding: '3px 8px', color: '#374151',
            cursor: 'grab', userSelect: 'none',
            opacity: draggingIdx === i ? 0.4 : 1,
            transition: 'opacity 0.1s, background 0.1s, border-color 0.1s',
          }}
        >
          <span style={{ color: '#9ca3af', fontSize: 11 }}>⠿</span>
          📍 {p.name}
          <button
            type="button"
            onClick={() => onChange(places.filter((_, j) => j !== i))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 13, padding: 0, lineHeight: 1 }}
          >×</button>
        </span>
      ))}
    </div>
  )
}
