import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getContactsFull } from '../api/contacts'
import type { Contact, PreferenceType } from '../types'

interface Props {
  open: boolean
  onClose: () => void
}

const PREF_LABEL: Record<PreferenceType, string> = {
  FOOD_LIKE: '좋아하는 음식',
  FOOD_DISLIKE: '못 먹는 음식',
  ALLERGY: '알레르기',
  INTEREST: '관심사',
  BRAND: '선호 브랜드',
  DISLIKE: '싫어하는 것',
  ETC: '기타',
}

const PREF_COLOR: Record<PreferenceType, { bg: string; text: string; border: string }> = {
  FOOD_LIKE: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  FOOD_DISLIKE: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  ALLERGY: { bg: '#fefce8', text: '#ca8a04', border: '#fef08a' },
  INTEREST: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  BRAND: { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff' },
  DISLIKE: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  ETC: { bg: '#f9fafb', text: '#4b5563', border: '#e5e7eb' },
}

// 선택된 사람들의 취향 교집합 계산 (같은 type+value를 몇 명이 갖는지)
function calcIntersection(selected: Contact[]) {
  const map = new Map<string, { type: PreferenceType; value: string; people: Contact[] }>()
  for (const person of selected) {
    for (const pref of person.preferences) {
      const key = `${pref.type}:${pref.value.toLowerCase().trim()}`
      if (!map.has(key)) map.set(key, { type: pref.type, value: pref.value, people: [] })
      map.get(key)!.people.push(person)
    }
  }

  // 타입별로 그룹화, 공유 인원 수 내림차순 정렬
  const grouped: Partial<
    Record<PreferenceType, Array<{ value: string; count: number; total: number; names: string[] }>>
  > = {}
  for (const entry of map.values()) {
    if (!grouped[entry.type]) grouped[entry.type] = []
    grouped[entry.type]!.push({
      value: entry.value,
      count: entry.people.length,
      total: selected.length,
      names: entry.people.map((p) => p.name),
    })
  }
  for (const type in grouped) {
    grouped[type as PreferenceType]!.sort((a, b) => b.count - a.count)
  }
  return grouped
}

export default function IntersectPanel({ open, onClose }: Props) {
  const navigate = useNavigate()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [group, setGroup] = useState<Contact[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [loading, setLoading] = useState(false)

  // 패널 열릴 때 전체 목록 로드
  useEffect(() => {
    if (!open) return
    setLoading(true)
    getContactsFull().then((data) => {
      setContacts(data)
      setLoading(false)
    })
  }, [open])

  const meContact = contacts.find((c) => c.isMe)
  // "나" 먼저, 나머지 이름 순
  const sortedContacts = [...(meContact ? [meContact] : []), ...contacts.filter((c) => !c.isMe)]
  // 아직 그룹에 없는 사람만 목록에 표시
  const available = sortedContacts.filter((c) => !group.find((g) => g.id === c.id))

  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('contactId', String(id))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const id = Number(e.dataTransfer.getData('contactId'))
    const contact = contacts.find((c) => c.id === id)
    if (contact && !group.find((g) => g.id === id)) {
      setGroup((prev) => [...prev, contact])
    }
  }

  const removeFromGroup = (id: number) => setGroup((prev) => prev.filter((c) => c.id !== id))

  const intersection = useMemo(() => {
    if (group.length < 2) return null
    return calcIntersection(group)
  }, [group])

  if (!open) return null

  const sectionLabelClass = 'text-[11px] font-bold tracking-[0.05em] text-gray-400'

  return (
    // 배경 오버레이
    <div className="fixed inset-0 z-[200] flex justify-end">
      <div onClick={onClose} className="absolute inset-0 bg-black/25" />

      {/* 패널 본체 */}
      <div className="relative flex h-full w-[480px] max-w-[90vw] flex-col overflow-hidden bg-white shadow-[-4px_0_20px_rgba(0,0,0,0.1)]">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 pb-[14px] pt-[18px]">
          <span className="text-[15px] font-bold text-[#111]">취향 비교</span>
          <button
            onClick={onClose}
            className="cursor-pointer border-none bg-transparent px-1.5 py-0.5 text-lg text-gray-400"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* 비교 그룹 드롭존 */}
          <div className="mb-5">
            <p className={`${sectionLabelClass} mb-2`}>비교 그룹</p>
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragOver(true)
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`flex min-h-16 flex-wrap items-center gap-2 rounded-[10px] border-2 border-dashed px-3 py-[10px] transition-colors duration-150 ${
                isDragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-gray-50'
              }`}
            >
              {group.length === 0 ? (
                <span className="text-xs text-gray-300">
                  아래 목록에서 사람을 드래그해서 추가하세요
                </span>
              ) : (
                group.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center gap-[5px] rounded-[20px] py-1 pl-2 pr-2.5 text-[13px] font-semibold ${
                      c.isMe ? 'bg-[#111] text-white' : 'bg-gray-100 text-[#111]'
                    }`}
                  >
                    <span className="text-[11px]">{c.isMe ? '⭐' : '○'}</span>
                    {c.name}
                    <button
                      onClick={() => removeFromGroup(c.id)}
                      className="cursor-pointer border-none bg-transparent pl-1 text-xs leading-none text-gray-400"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 전체 목록 (드래그 가능) */}
          <div className="mb-5">
            <p className={`${sectionLabelClass} mb-2`}>
              전체 목록 <span className="font-normal">(드래그해서 비교 그룹에 추가)</span>
            </p>

            {loading ? (
              <p className="py-5 text-center text-xs text-gray-400">불러오는 중...</p>
            ) : (
              <div className="flex flex-col gap-1">
                {/* 나 등록 안된 경우 */}
                {!meContact && (
                  <div
                    onClick={() => {
                      onClose()
                      navigate('/contacts/new?me=true')
                    }}
                    className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-[10px] text-[13px] text-gray-400"
                  >
                    <span>⭐</span>
                    <span className="font-semibold">내 정보 등록하기</span>
                    <span className="text-[11px]">→ 교집합 비교에서 나도 포함할 수 있어요</span>
                  </div>
                )}

                {available.length === 0 && meContact && (
                  <p className="py-3 text-center text-xs text-gray-400">
                    모든 사람이 비교 그룹에 추가됐어요
                  </p>
                )}

                {available.map((c) => (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, c.id)}
                    className="flex select-none items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-[9px] cursor-grab"
                  >
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-[13px] font-bold ${
                        c.isMe ? 'bg-[#111] text-white' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {c.photoUrl ? (
                        <img src={c.photoUrl} alt={c.name} className="h-full w-full object-cover" />
                      ) : c.isMe ? (
                        '⭐'
                      ) : (
                        c.name[0]
                      )}
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-[#111]">
                        {c.name}{' '}
                        {c.isMe && <span className="text-[11px] text-gray-500">(본인)</span>}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {c.isMe ? '내 정보' : c.relationship} · 취향 {c.preferences.length}개
                      </div>
                    </div>
                    <div className="ml-auto text-[13px] text-gray-300">⠿</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 교집합 결과 */}
          {group.length >= 2 && (
            <div>
              <div className="mb-3 border-t border-gray-100 pt-4">
                <p className={sectionLabelClass}>공통 취향 ({group.length}명 기준)</p>
              </div>

              {intersection && Object.keys(intersection).length > 0 ? (
                (Object.entries(intersection) as [PreferenceType, any[]][]).map(([type, items]) => (
                  <div key={type} className="mb-4">
                    <p className="mb-2 text-xs font-semibold text-gray-700">{PREF_LABEL[type]}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((item) => {
                        const col = PREF_COLOR[type]
                        const isAll = item.count === item.total
                        return (
                          <div
                            key={item.value}
                            title={`${item.names.join(', ')}`}
                            style={{
                              background: col.bg,
                              borderColor: isAll ? col.border : '#e5e7eb',
                            }}
                            className={`flex items-center gap-[5px] rounded-[20px] border px-2.5 py-1 ${
                              isAll ? 'opacity-100' : 'opacity-70'
                            }`}
                          >
                            <span style={{ color: col.text }} className="text-xs font-semibold">
                              {item.value}
                            </span>
                            <span
                              style={{
                                color: isAll ? col.text : '#9ca3af',
                                background: isAll ? col.border : '#f3f4f6',
                              }}
                              className="rounded-[10px] px-1.5 py-px text-[10px] font-bold"
                            >
                              {item.count}/{item.total}명
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-5 text-center text-xs text-gray-400">공통 취향이 없어요</p>
              )}
            </div>
          )}

          {group.length === 1 && (
            <p className="py-3 text-center text-xs text-gray-400">
              한 명 더 추가하면 교집합을 볼 수 있어요
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
