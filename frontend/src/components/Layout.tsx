import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { getContacts, deleteContact, updateRelationship } from '../api/contacts'
import type { ContactSummary } from '../types'
import IntersectPanel from './IntersectPanel'

const REL_COLOR: Record<string, string> = {
  친구: '#3b82f6',
  가족: '#22c55e',
  직장: '#f59e0b',
  연인: '#ec4899',
  지인: '#9ca3af',
  기타: '#9ca3af',
}

// 기본 그룹 순서
const GROUP_ORDER = ['친구', '가족', '연인', '직장', '지인', '기타']

function getDday(birthday?: string) {
  if (!birthday) return null
  const today = new Date()
  const bday = new Date(birthday)
  const next = new Date(today.getFullYear(), bday.getMonth(), bday.getDate())
  if (next < today) next.setFullYear(today.getFullYear() + 1)
  const diff = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diff === 0 ? 'D-Day' : `D-${diff}`
}

export default function Layout() {
  const [contacts, setContacts] = useState<ContactSummary[]>([])
  const [query, setQuery] = useState('')
  const [intersectOpen, setIntersectOpen] = useState(false)
  // 그룹 접기/펼치기 (기본: 모두 펼침)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  // 드래그 중인 contact id
  const [draggingId, setDraggingId] = useState<number | null>(null)
  // 드래그 오버 중인 그룹
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null)

  const navigate = useNavigate()
  const location = useLocation()
  const activeId = location.pathname.match(/\/contacts\/(\d+)/)?.[1]

  useEffect(() => {
    getContacts().then(setContacts)
  }, [location])

  const meContact = contacts.find(c => c.isMe)
  const filtered = contacts.filter(c =>
    !c.isMe && (c.name.includes(query) || (c.relationship ?? '').includes(query))
  )

  // 관계별 그룹 생성 (GROUP_ORDER 순서 + 미정의 관계 뒤에 추가)
  const groups: { rel: string; items: ContactSummary[] }[] = []
  GROUP_ORDER.forEach(rel => {
    const items = filtered.filter(c => c.relationship === rel)
    if (items.length > 0) groups.push({ rel, items })
  })
  filtered.filter(c => !GROUP_ORDER.includes(c.relationship)).forEach(c => {
    const g = groups.find(g => g.rel === c.relationship)
    if (g) g.items.push(c)
    else groups.push({ rel: c.relationship, items: [c] })
  })

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (!confirm('삭제할까요?')) return
    await deleteContact(id)
    setContacts(prev => prev.filter(c => c.id !== id))
    if (activeId === String(id)) navigate('/')
  }

  // 드래그앤드롭으로 그룹(관계) 변경
  const handleGroupDrop = async (rel: string) => {
    if (draggingId === null) return
    const contact = contacts.find(c => c.id === draggingId)
    if (!contact || contact.relationship === rel) {
      setDraggingId(null); setDragOverGroup(null); return
    }
    setContacts(prev => prev.map(c => c.id === draggingId ? { ...c, relationship: rel } : c))
    // 드롭된 그룹 자동 펼치기
    setCollapsed(prev => ({ ...prev, [rel]: false }))
    setDraggingId(null); setDragOverGroup(null)
    await updateRelationship(draggingId, rel)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f5f5f5' }}>
      {/* 사이드바 */}
      <aside style={{
        width: 260, flexShrink: 0,
        background: '#fff', borderRight: '1px solid #e5e7eb',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* 헤더 */}
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span
              onClick={() => navigate('/')}
              style={{ fontSize: 15, fontWeight: 700, color: '#111', cursor: 'pointer' }}
            >알쓸지인</span>
            <button
              onClick={() => navigate('/contacts/new')}
              style={{
                fontSize: 12, fontWeight: 600, color: '#fff',
                background: '#111', border: 'none', borderRadius: 6,
                padding: '5px 10px', cursor: 'pointer',
              }}
            >
              + 추가
            </button>
          </div>
          <input
            type="text" value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="이름, 관계 검색..."
            style={{
              width: '100%', boxSizing: 'border-box',
              fontSize: 13, color: '#374151',
              background: '#f9fafb', border: '1px solid #e5e7eb',
              borderRadius: 6, padding: '7px 10px', outline: 'none',
            }}
          />
        </div>

        {/* 목록 */}
        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* 나 섹션 */}
          <div style={{ padding: '8px 14px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#d1d5db', letterSpacing: '0.06em' }}>나</span>
            <div style={{ flex: 1, height: 1, background: '#f3f4f6' }} />
          </div>

          {meContact ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px', background: activeId === String(meContact.id) ? '#f3f4f6' : 'transparent' }}>
              <div
                onClick={() => navigate(`/contacts/${meContact.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer', minWidth: 0 }}
                onMouseEnter={e => { if (activeId !== String(meContact.id)) (e.currentTarget as HTMLElement).style.opacity = '0.7' }}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: '#111', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, flexShrink: 0, overflow: 'hidden',
                }}>
                  {meContact.photoUrl
                    ? <img src={meContact.photoUrl} alt={meContact.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : '⭐'
                  }
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meContact.name}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>내 정보</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button onClick={() => navigate(`/contacts/${meContact.id}/edit?me=true`)} style={{ fontSize: 11, color: '#6b7280', background: 'none', border: '1px solid #e5e7eb', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>수정</button>
                <button onClick={e => handleDelete(e, meContact.id)} style={{ fontSize: 11, color: '#ef4444', background: 'none', border: '1px solid #fecaca', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>삭제</button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => navigate('/contacts/new?me=true')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', cursor: 'pointer', color: '#9ca3af' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f9fafb'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <span style={{ fontSize: 14 }}>⭐</span>
              <span style={{ fontSize: 12 }}>내 정보 등록하기</span>
            </div>
          )}

          {/* 지인 — 그룹별 */}
          {groups.length === 0 ? (
            <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 16 }}>
              {query ? '검색 결과 없음' : '등록된 지인이 없어요'}
            </p>
          ) : groups.map(({ rel, items }) => {
            const isCollapsed = !!collapsed[rel]
            const isDragTarget = dragOverGroup === rel
            const color = REL_COLOR[rel] ?? '#9ca3af'

            return (
              <div
                key={rel}
                // 그룹 전체가 드롭 타겟 (자식으로 나갈 때 오발사 방지)
                onDragOver={e => { e.preventDefault(); setDragOverGroup(rel) }}
                onDragLeave={e => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverGroup(null)
                }}
                onDrop={() => handleGroupDrop(rel)}
              >
                {/* 그룹 헤더 — 클릭으로 접기/펼치기 */}
                <div
                  onClick={() => setCollapsed(prev => ({ ...prev, [rel]: !prev[rel] }))}
                  style={{
                    padding: '10px 14px 4px',
                    display: 'flex', alignItems: 'center', gap: 8,
                    cursor: 'pointer',
                    borderLeft: isDragTarget ? `3px solid ${color}` : '3px solid transparent',
                    background: isDragTarget ? color + '0d' : 'transparent',
                    transition: 'background 0.1s, border-color 0.1s',
                    userSelect: 'none',
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: '0.06em' }}>{rel}</span>
                  <span style={{ fontSize: 10, color: '#d1d5db', fontWeight: 600 }}>{items.length}</span>
                  <div style={{ flex: 1, height: 1, background: '#f3f4f6' }} />
                  <span style={{ fontSize: 9, color: '#c4c4c4' }}>{isCollapsed ? '▶' : '▼'}</span>
                </div>

                {/* 그룹 내 지인 목록 */}
                {!isCollapsed && items.map(c => {
                  const dday = getDday(c.birthday)
                  const isActive = activeId === String(c.id)
                  const isDragging = draggingId === c.id
                  return (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={() => setDraggingId(c.id)}
                      onDragEnd={() => { setDraggingId(null); setDragOverGroup(null) }}
                      onClick={() => navigate(`/contacts/${c.id}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 14px', cursor: isDragging ? 'grabbing' : 'pointer',
                        background: isActive ? '#f3f4f6' : 'transparent',
                        opacity: isDragging ? 0.4 : 1,
                        transition: 'background 0.1s, opacity 0.1s',
                      }}
                      onMouseEnter={e => { if (!isActive && !isDragging) (e.currentTarget as HTMLElement).style.background = '#f9fafb' }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = isActive ? '#f3f4f6' : 'transparent' }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: color + '22', color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 700, flexShrink: 0, overflow: 'hidden',
                        pointerEvents: 'none',
                      }}>
                        {c.photoUrl
                          ? <img src={c.photoUrl} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : c.name[0]
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0, pointerEvents: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.name}
                          </span>
                          {dday && <span style={{ fontSize: 11, color: '#ec4899', flexShrink: 0 }}>{dday}</span>}
                        </div>
                      </div>
                      <button
                        onClick={e => handleDelete(e, c.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 14, padding: '2px 4px', flexShrink: 0 }}
                        title="삭제"
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* 하단 */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid #f3f4f6' }}>
          <button
            onClick={() => setIntersectOpen(true)}
            style={{
              width: '100%', padding: '8px', marginBottom: 6,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: '#f3f4f6', color: '#374151',
              border: '1px solid #e5e7eb', borderRadius: 7,
              fontFamily: 'inherit',
            }}
          >
            취향 비교
          </button>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>
            {contacts.filter(c => !c.isMe).length}명 등록됨
          </div>
        </div>
      </aside>

      {/* 메인 */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <Outlet />
      </main>

      <IntersectPanel open={intersectOpen} onClose={() => setIntersectOpen(false)} />
    </div>
  )
}
