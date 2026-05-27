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
  FOOD_LIKE:    { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  FOOD_DISLIKE: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  ALLERGY:      { bg: '#fefce8', text: '#ca8a04', border: '#fef08a' },
  INTEREST:     { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  BRAND:        { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff' },
  DISLIKE:      { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  ETC:          { bg: '#f9fafb', text: '#4b5563', border: '#e5e7eb' },
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
  const grouped: Partial<Record<PreferenceType, Array<{ value: string; count: number; total: number; names: string[] }>>> = {}
  for (const entry of map.values()) {
    if (!grouped[entry.type]) grouped[entry.type] = []
    grouped[entry.type]!.push({
      value: entry.value,
      count: entry.people.length,
      total: selected.length,
      names: entry.people.map(p => p.name),
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
    getContactsFull().then(data => {
      setContacts(data)
      setLoading(false)
    })
  }, [open])

  const meContact = contacts.find(c => c.isMe)
  // "나" 먼저, 나머지 이름 순
  const sortedContacts = [
    ...(meContact ? [meContact] : []),
    ...contacts.filter(c => !c.isMe),
  ]
  // 아직 그룹에 없는 사람만 목록에 표시
  const available = sortedContacts.filter(c => !group.find(g => g.id === c.id))

  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('contactId', String(id))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const id = Number(e.dataTransfer.getData('contactId'))
    const contact = contacts.find(c => c.id === id)
    if (contact && !group.find(g => g.id === id)) {
      setGroup(prev => [...prev, contact])
    }
  }

  const removeFromGroup = (id: number) => setGroup(prev => prev.filter(c => c.id !== id))

  const intersection = useMemo(() => {
    if (group.length < 2) return null
    return calcIntersection(group)
  }, [group])

  if (!open) return null

  return (
    // 배경 오버레이
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)' }}
      />

      {/* 패널 본체 */}
      <div style={{
        position: 'relative', width: 480, maxWidth: '90vw',
        height: '100%', background: '#fff',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* 헤더 */}
        <div style={{
          padding: '18px 20px 14px',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>취향 교집합 비교</span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 18, color: '#9ca3af', padding: '2px 6px',
            }}
          >✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {/* 비교 그룹 드롭존 */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.05em', marginBottom: 8 }}>
              비교 그룹
            </p>
            <div
              onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              style={{
                minHeight: 64,
                border: `2px dashed ${isDragOver ? '#6366f1' : '#e5e7eb'}`,
                borderRadius: 10,
                background: isDragOver ? '#eef2ff' : '#f9fafb',
                padding: '10px 12px',
                display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              {group.length === 0 ? (
                <span style={{ fontSize: 12, color: '#d1d5db' }}>
                  아래 목록에서 사람을 드래그해서 추가하세요
                </span>
              ) : group.map(c => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: c.isMe ? '#111' : '#f3f4f6',
                    color: c.isMe ? '#fff' : '#111',
                    borderRadius: 20, padding: '4px 10px 4px 8px',
                    fontSize: 13, fontWeight: 600,
                  }}
                >
                  <span style={{ fontSize: 11 }}>{c.isMe ? '⭐' : '○'}</span>
                  {c.name}
                  <button
                    onClick={() => removeFromGroup(c.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: c.isMe ? '#9ca3af' : '#9ca3af',
                      fontSize: 12, padding: '0 0 0 4px', lineHeight: 1,
                    }}
                  >✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* 전체 목록 (드래그 가능) */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.05em', marginBottom: 8 }}>
              전체 목록 <span style={{ fontWeight: 400 }}>(드래그해서 비교 그룹에 추가)</span>
            </p>

            {loading ? (
              <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>불러오는 중...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {/* 나 등록 안된 경우 */}
                {!meContact && (
                  <div
                    onClick={() => { onClose(); navigate('/contacts/new?me=true') }}
                    style={{
                      padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                      border: '1px dashed #d1d5db', background: '#f9fafb',
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: 13, color: '#9ca3af',
                    }}
                  >
                    <span>⭐</span>
                    <span style={{ fontWeight: 600 }}>내 정보 등록하기</span>
                    <span style={{ fontSize: 11 }}>→ 교집합 비교에서 나도 포함할 수 있어요</span>
                  </div>
                )}

                {available.length === 0 && meContact && (
                  <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '12px 0' }}>
                    모든 사람이 비교 그룹에 추가됐어요
                  </p>
                )}

                {available.map(c => (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={e => handleDragStart(e, c.id)}
                    style={{
                      padding: '9px 12px', borderRadius: 8, cursor: 'grab',
                      border: '1px solid #e5e7eb', background: '#fff',
                      display: 'flex', alignItems: 'center', gap: 10,
                      userSelect: 'none',
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: c.isMe ? '#111' : '#f3f4f6',
                      color: c.isMe ? '#fff' : '#374151',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, overflow: 'hidden',
                    }}>
                      {c.photoUrl
                        ? <img src={c.photoUrl} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : c.isMe ? '⭐' : c.name[0]
                      }
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>
                        {c.name} {c.isMe && <span style={{ fontSize: 11, color: '#6b7280' }}>(본인)</span>}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>
                        {c.isMe ? '내 정보' : c.relationship} · 취향 {c.preferences.length}개
                      </div>
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: 13, color: '#d1d5db' }}>⠿</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 교집합 결과 */}
          {group.length >= 2 && (
            <div>
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 16, marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.05em', margin: 0 }}>
                  공통 취향 ({group.length}명 기준)
                </p>
              </div>

              {intersection && Object.keys(intersection).length > 0 ? (
                (Object.entries(intersection) as [PreferenceType, any[]][]).map(([type, items]) => (
                  <div key={type} style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      {PREF_LABEL[type]}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {items.map(item => {
                        const col = PREF_COLOR[type]
                        const isAll = item.count === item.total
                        return (
                          <div
                            key={item.value}
                            title={`${item.names.join(', ')}`}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              padding: '4px 10px', borderRadius: 20,
                              background: col.bg,
                              border: `1px solid ${isAll ? col.border : '#e5e7eb'}`,
                              opacity: isAll ? 1 : 0.7,
                            }}
                          >
                            <span style={{ fontSize: 12, color: col.text, fontWeight: 600 }}>
                              {item.value}
                            </span>
                            <span style={{
                              fontSize: 10, fontWeight: 700,
                              color: isAll ? col.text : '#9ca3af',
                              background: isAll ? col.border : '#f3f4f6',
                              borderRadius: 10, padding: '1px 6px',
                            }}>
                              {item.count}/{item.total}명
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>
                  공통 취향이 없어요
                </p>
              )}
            </div>
          )}

          {group.length === 1 && (
            <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '12px 0' }}>
              한 명 더 추가하면 교집합을 볼 수 있어요
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
