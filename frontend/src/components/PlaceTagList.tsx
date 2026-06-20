import { useState } from 'react'
import type { MeetingPlaceInput } from '../types'

// 드래그앤드롭으로 순서 변경 가능한 장소 태그 목록
export default function PlaceTagList({
  places,
  onChange,
}: {
  places: MeetingPlaceInput[]
  onChange: (places: MeetingPlaceInput[]) => void
}) {
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  if (places.length === 0) return null

  const handleDrop = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault()
    if (draggingIdx === null || draggingIdx === toIdx) {
      setDragOverIdx(null)
      return
    }
    const next = [...places]
    const [item] = next.splice(draggingIdx, 1)
    next.splice(toIdx, 0, item)
    onChange(next)
    setDraggingIdx(null)
    setDragOverIdx(null)
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {places.map((p, i) => (
        <span
          key={i}
          draggable
          onDragStart={() => setDraggingIdx(i)}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOverIdx(i)
          }}
          onDragLeave={() => setDragOverIdx(null)}
          onDrop={(e) => handleDrop(e, i)}
          onDragEnd={() => {
            setDraggingIdx(null)
            setDragOverIdx(null)
          }}
          className={`inline-flex select-none items-center gap-1 rounded-[5px] border px-2 py-[3px] text-xs text-gray-700 transition duration-100 ${
            dragOverIdx === i ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-100'
          } ${draggingIdx === i ? 'opacity-40' : 'opacity-100'} cursor-grab`}
        >
          <span className="text-[11px] text-gray-400">⠿</span>
          📍 {p.name}
          <button
            type="button"
            onClick={() => onChange(places.filter((_, j) => j !== i))}
            className="cursor-pointer border-none bg-transparent p-0 text-[13px] leading-none text-gray-400"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  )
}
