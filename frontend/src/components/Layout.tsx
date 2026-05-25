import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { getContacts, deleteContact } from '../api/contacts'
import type { ContactSummary } from '../types'

const REL_COLOR: Record<string, string> = {
  친구: '#3b82f6',
  가족: '#22c55e',
  직장: '#f59e0b',
  연인: '#ec4899',
  지인: '#9ca3af',
  기타: '#9ca3af',
}

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
  const navigate = useNavigate()
  const location = useLocation()
  const activeId = location.pathname.match(/\/contacts\/(\d+)/)?.[1]

  useEffect(() => {
    getContacts().then(setContacts)
  }, [location])

  const filtered = contacts.filter(c =>
    c.name.includes(query) || (c.relationship ?? '').includes(query)
  )

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (!confirm('삭제할까요?')) return
    await deleteContact(id)
    setContacts(prev => prev.filter(c => c.id !== id))
    if (activeId === String(id)) navigate('/')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f5f5f5' }}>
      {/* 사이드바 */}
      <aside style={{
        width: 260,
        flexShrink: 0,
        background: '#fff',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* 헤더 */}
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>알쓸지인</span>
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
            type="text"
            value={query}
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {filtered.length === 0 ? (
            <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 32 }}>
              {query ? '검색 결과 없음' : '등록된 지인이 없어요'}
            </p>
          ) : filtered.map(c => {
            const dday = getDday(c.birthday)
            const isActive = activeId === String(c.id)
            const color = REL_COLOR[c.relationship] ?? '#9ca3af'
            return (
              <div
                key={c.id}
                onClick={() => navigate(`/contacts/${c.id}`)}
                className="contact-item"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 14px', cursor: 'pointer',
                  background: isActive ? '#f3f4f6' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#f9fafb' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: color + '22', color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, flexShrink: 0,
                  overflow: 'hidden',
                }}>
                  {c.photoUrl
                    ? <img src={c.photoUrl} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : c.name[0]
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name}
                    </span>
                    {dday && <span style={{ fontSize: 11, color: '#ec4899', flexShrink: 0 }}>{dday}</span>}
                  </div>
                  <span style={{ fontSize: 11, color: color }}>
                    {c.relationship}
                  </span>
                </div>
                <button
                  onClick={e => handleDelete(e, c.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#d1d5db', fontSize: 14, padding: '2px 4px',
                    flexShrink: 0,
                  }}
                  title="삭제"
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>

        {/* 하단 */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid #f3f4f6', fontSize: 11, color: '#9ca3af' }}>
          {contacts.length}명 등록됨
        </div>
      </aside>

      {/* 메인 */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
