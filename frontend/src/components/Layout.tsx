import { useEffect, useRef, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { getContacts, deleteContact } from '../api/contacts'
import { getGroups, createGroup, updateGroup, deleteGroup, assignGroup, reorderGroups } from '../api/groups'
import type { ContactGroup, ContactSummary } from '../types'
import IntersectPanel from './IntersectPanel'

const REL_COLOR: Record<string, string> = {
  친구: '#3b82f6', 가족: '#22c55e', 직장: '#f59e0b',
  연인: '#ec4899', 지인: '#9ca3af', 기타: '#9ca3af',
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

// 드롭 타겟 ID (커스텀 그룹 id 숫자 또는 'ungrouped')
type DropTarget = number | 'ungrouped' | null

export default function Layout() {
  const [contacts, setContacts] = useState<ContactSummary[]>([])
  const [groups, setGroups] = useState<ContactGroup[]>([])
  const [query, setQuery] = useState('')
  const [intersectOpen, setIntersectOpen] = useState(false)

  // 그룹 접기/펼치기 (key: groupId or 'ungrouped')
  const [collapsed, setCollapsed] = useState<Record<string | number, boolean>>({})
  // 그룹 삭제 확인 모달
  const [deleteTarget, setDeleteTarget] = useState<ContactGroup | null>(null)
  // 지인 드래그 상태
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget>(null)
  // 그룹 순서 드래그 상태
  const [draggingGroupId, setDraggingGroupId] = useState<number | null>(null)
  const [groupDragOverId, setGroupDragOverId] = useState<number | null>(null)
  // 그룹 헤더 hover (edit/delete 버튼 표시)
  const [hoverGroupId, setHoverGroupId] = useState<number | null>(null)
  // 그룹명 인라인 수정
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  // 새 그룹 생성
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupError, setNewGroupError] = useState('')

  const newGroupInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  const navigate = useNavigate()
  const location = useLocation()
  const activeId = location.pathname.match(/\/contacts\/(\d+)/)?.[1]

  useEffect(() => {
    getContacts().then(setContacts)
    getGroups().then(setGroups)
  }, [location])

  // 새 그룹 입력창 auto-focus
  useEffect(() => {
    if (showNewGroup) newGroupInputRef.current?.focus()
  }, [showNewGroup])
  useEffect(() => {
    if (editingGroupId !== null) editInputRef.current?.focus()
  }, [editingGroupId])

  const meContact = contacts.find(c => c.isMe)
  const filtered = contacts.filter(c =>
    !c.isMe && (c.name.includes(query) || (c.relationship ?? '').includes(query))
  )
  const ungrouped = filtered.filter(c => c.groupId == null)

  const handleDeleteGroup = (g: ContactGroup) => {
    setDeleteTarget(g)
  }

  const confirmDeleteGroup = async (withContacts: boolean) => {
    const g = deleteTarget
    if (!g) return
    setDeleteTarget(null)
    await deleteGroup(g.id, withContacts)
    if (withContacts) {
      setContacts(prev => prev.filter(c => c.groupId !== g.id))
    } else {
      setContacts(prev => prev.map(c => c.groupId === g.id ? { ...c, groupId: null } : c))
    }
    setGroups(prev => prev.filter(x => x.id !== g.id))
  }

  // 그룹명 저장
  const handleSaveGroupName = async (id: number) => {
    const name = editingName.trim()
    if (!name) { setEditingGroupId(null); return }
    const updated = await updateGroup(id, name)
    setGroups(prev => prev.map(g => g.id === id ? updated : g))
    setEditingGroupId(null)
  }

  // 새 그룹 생성
  const handleCreateGroup = async () => {
    const name = newGroupName.trim()
    if (!name) { setShowNewGroup(false); setNewGroupError(''); return }
    try {
      const created = await createGroup(name)
      setGroups(prev => [...prev, created])
      setNewGroupName('')
      setNewGroupError('')
      setShowNewGroup(false)
    } catch {
      setNewGroupError('같은 이름의 그룹이 이미 있어요.')
    }
  }

  // 드롭: 그룹 순서 재정렬
  const handleGroupDrop = async (targetGroupId: number) => {
    if (draggingGroupId === null || draggingGroupId === targetGroupId) {
      setDraggingGroupId(null); setGroupDragOverId(null); return
    }
    const newOrder = [...groups]
    const fromIdx = newOrder.findIndex(g => g.id === draggingGroupId)
    const toIdx = newOrder.findIndex(g => g.id === targetGroupId)
    const [moved] = newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, moved)
    const ordered = newOrder.map((g, i) => ({ ...g, sortOrder: i }))
    setGroups(ordered)
    setDraggingGroupId(null); setGroupDragOverId(null)
    await reorderGroups(ordered.map(g => ({ id: g.id, sortOrder: g.sortOrder ?? 0 })))
  }


  // 드롭: 지인을 그룹에 배정
  const handleDrop = async (target: DropTarget) => {
    if (draggingId === null || target === null) return
    const c = contacts.find(x => x.id === draggingId)
    const newGroupId = target === 'ungrouped' ? null : target
    // 같은 그룹이면 무시
    if ((c?.groupId ?? null) === newGroupId) { setDraggingId(null); setDropTarget(null); return }

    // 낙관적 업데이트 (API 완료 전에 UI 반영)
    setContacts(prev => prev.map(x => x.id === draggingId ? { ...x, groupId: newGroupId } : x))
    if (typeof target === 'number') setCollapsed(prev => ({ ...prev, [target]: false }))
    setDraggingId(null); setDropTarget(null)
    await assignGroup(draggingId, newGroupId)
  }

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (!confirm('삭제할까요?')) return
    await deleteContact(id)
    setContacts(prev => prev.filter(c => c.id !== id))
    if (activeId === String(id)) navigate('/')
  }

  // 드롭존 공통 props
  const dropZoneProps = (target: DropTarget) => ({
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDropTarget(target) },
    onDragLeave: (e: React.DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null)
    },
    onDrop: () => handleDrop(target),
  })

  // 지인 카드 렌더
  const renderContact = (c: ContactSummary) => {
    const dday = getDday(c.birthday)
    const isActive = activeId === String(c.id)
    const color = REL_COLOR[c.relationship] ?? '#9ca3af'
    return (
      <div
        key={c.id}
        draggable
        onDragStart={() => setDraggingId(c.id)}
        onDragEnd={() => { setDraggingId(null); setDropTarget(null) }}
        onClick={() => navigate(`/contacts/${c.id}`)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px', margin: '1px 8px', borderRadius: 8,
          cursor: 'pointer',
          background: isActive ? color + '18' : 'transparent',
          borderLeft: isActive ? `3px solid ${color}` : '3px solid transparent',
          opacity: draggingId === c.id ? 0.4 : 1,
          transition: 'background 0.12s, border-color 0.12s, opacity 0.15s',
        }}
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#f9fafb' }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: color + '20', color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, flexShrink: 0, overflow: 'hidden',
          border: `1.5px solid ${color}40`,
          pointerEvents: 'none',
        }}>
          {c.photoUrl
            ? <img src={c.photoUrl} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : c.name[0]
          }
        </div>
        <div style={{ flex: 1, minWidth: 0, pointerEvents: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.name}
            </span>
            {dday && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#fff',
                background: dday === 'D-Day' ? '#ec4899' : '#f472b6',
                borderRadius: 20, padding: '1px 5px', flexShrink: 0,
              }}>{dday}</span>
            )}
          </div>
          <span style={{
            fontSize: 10, fontWeight: 600, color,
            background: color + '15', borderRadius: 4, padding: '1px 5px',
          }}>{c.relationship}</span>
        </div>
        <button
          onClick={e => handleDelete(e, c.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 13, padding: '2px 4px', flexShrink: 0, opacity: 0 }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0'}
        >✕</button>
      </div>
    )
  }

  // 섹션 헤더 (미분류 / 커스텀 그룹 공통)
  const sectionHeaderStyle = (isTarget: boolean, color = '#d1d5db'): React.CSSProperties => ({
    padding: '10px 14px 4px',
    display: 'flex', alignItems: 'center', gap: 8,
    cursor: 'pointer', userSelect: 'none',
    borderLeft: isTarget ? `3px solid ${color}` : '3px solid transparent',
    background: isTarget ? color + '15' : 'transparent',
    transition: 'background 0.1s, border-color 0.1s',
  })

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f5f5f5' }}>
      <aside style={{ width: 260, flexShrink: 0, background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* 헤더 */}
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span onClick={() => navigate('/')} style={{ fontSize: 15, fontWeight: 700, color: '#111', cursor: 'pointer' }}>알쓸지인</span>
            <button onClick={() => navigate('/contacts/new')} style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: '#111', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>
              + 추가
            </button>
          </div>
          <input
            type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="이름, 관계 검색..."
            style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, color: '#374151', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '7px 10px', outline: 'none' }}
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
              <div onClick={() => navigate(`/contacts/${meContact.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer', minWidth: 0 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#111', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, overflow: 'hidden' }}>
                  {meContact.photoUrl ? <img src={meContact.photoUrl} alt={meContact.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '⭐'}
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
            <div onClick={() => navigate('/contacts/new?me=true')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', cursor: 'pointer', color: '#9ca3af' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f9fafb'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <span style={{ fontSize: 14 }}>⭐</span>
              <span style={{ fontSize: 12 }}>내 정보 등록하기</span>
            </div>
          )}

          {/* 미분류 섹션 */}
          {(ungrouped.length > 0 || dropTarget === 'ungrouped') && (
            <div {...dropZoneProps('ungrouped')}>
              <div
                onClick={() => setCollapsed(p => ({ ...p, ungrouped: !p.ungrouped }))}
                style={sectionHeaderStyle(dropTarget === 'ungrouped')}
              >
                <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.06em' }}>미분류</span>
                <span style={{ fontSize: 10, color: '#d1d5db', fontWeight: 600 }}>{ungrouped.length}</span>
                <div style={{ flex: 1, height: 1, background: '#f3f4f6' }} />
                <span style={{ fontSize: 9, color: '#c4c4c4' }}>{collapsed.ungrouped ? '▶' : '▼'}</span>
              </div>
              {!collapsed.ungrouped && ungrouped.map(renderContact)}
            </div>
          )}

          {/* 커스텀 그룹 목록 */}
          {groups.map(g => {
            const members = filtered.filter(c => c.groupId === g.id)
            const isTarget = dropTarget === g.id && draggingGroupId === null
            const isGroupTarget = groupDragOverId === g.id && draggingGroupId !== null && draggingGroupId !== g.id
            const isCollapsed = !!collapsed[g.id]
            const isHovered = hoverGroupId === g.id
            const isEditing = editingGroupId === g.id

            return (
              <div
                key={g.id}
                onDragOver={e => {
                  e.preventDefault()
                  if (draggingGroupId !== null) setGroupDragOverId(g.id)
                  else setDropTarget(g.id)
                }}
                onDragLeave={e => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDropTarget(null); setGroupDragOverId(null)
                  }
                }}
                onDrop={() => {
                  if (draggingGroupId !== null) handleGroupDrop(g.id)
                  else handleDrop(g.id)
                }}
                style={{ opacity: draggingGroupId === g.id ? 0.4 : 1, transition: 'opacity 0.15s' }}
              >
                {/* 그룹 헤더 */}
                <div
                  draggable
                  onDragStart={e => { e.stopPropagation(); setDraggingGroupId(g.id) }}
                  onDragEnd={() => { setDraggingGroupId(null); setGroupDragOverId(null) }}
                  onClick={() => { if (!isEditing) setCollapsed(p => ({ ...p, [g.id]: !p[g.id] })) }}
                  onMouseEnter={() => setHoverGroupId(g.id)}
                  onMouseLeave={() => setHoverGroupId(null)}
                  style={{
                    ...sectionHeaderStyle(isTarget, '#6366f1'),
                    borderTop: isGroupTarget ? '2px solid #6366f1' : undefined,
                    cursor: 'grab',
                  }}
                >
                  {isEditing ? (
                    // 인라인 이름 수정 입력창
                    <input
                      ref={editInputRef}
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveGroupName(g.id)
                        if (e.key === 'Escape') setEditingGroupId(null)
                      }}
                      onBlur={() => handleSaveGroupName(g.id)}
                      style={{ fontSize: 11, fontWeight: 700, color: '#374151', border: '1px solid #6366f1', borderRadius: 4, padding: '1px 6px', outline: 'none', width: 100, fontFamily: 'inherit' }}
                    />
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', letterSpacing: '0.06em' }}>{g.name}</span>
                  )}
                  <span style={{ fontSize: 10, color: '#d1d5db', fontWeight: 600 }}>{members.length}</span>
                  <div style={{ flex: 1, height: 1, background: '#f3f4f6' }} />

                  {/* hover 시 수정/삭제 버튼 */}
                  {isHovered && !isEditing && (
                    <div style={{ display: 'flex', gap: 2 }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { setEditingGroupId(g.id); setEditingName(g.name) }}
                        title="이름 수정"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#9ca3af', padding: '0 2px', lineHeight: 1 }}
                      >✏️</button>
                      <button
                        onClick={() => handleDeleteGroup(g)}
                        title="그룹 삭제"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#9ca3af', padding: '0 2px', lineHeight: 1 }}
                      >🗑️</button>
                    </div>
                  )}
                  {(!isHovered || isEditing) && (
                    <span style={{ fontSize: 9, color: '#c4c4c4' }}>{isCollapsed ? '▶' : '▼'}</span>
                  )}
                </div>

                {/* 멤버 목록 */}
                {!isCollapsed && (
                  <>
                    {members.map(renderContact)}
                    {members.length === 0 && (
                      <div style={{ padding: '8px 14px', fontSize: 11, color: isTarget ? '#6366f1' : '#d1d5db', textAlign: 'center' }}>
                        {isTarget ? '여기에 놓기' : '지인을 드래그해서 추가하세요'}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}

          {/* 그룹 추가 */}
          <div style={{ padding: '8px 14px' }}>
            {showNewGroup ? (
              <div>
                <input
                  ref={newGroupInputRef}
                  value={newGroupName}
                  onChange={e => { setNewGroupName(e.target.value); setNewGroupError('') }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCreateGroup()
                    if (e.key === 'Escape') { setShowNewGroup(false); setNewGroupName(''); setNewGroupError('') }
                  }}
                  onBlur={handleCreateGroup}
                  placeholder="그룹 이름 입력..."
                  style={{
                    width: '100%', boxSizing: 'border-box', fontSize: 12, color: '#374151',
                    background: '#f9fafb', border: `1px solid ${newGroupError ? '#ef4444' : '#6366f1'}`,
                    borderRadius: 6, padding: '6px 10px', outline: 'none', fontFamily: 'inherit',
                  }}
                />
                {newGroupError && (
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#ef4444' }}>{newGroupError}</p>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowNewGroup(true)}
                style={{ width: '100%', fontSize: 11, color: '#9ca3af', background: 'none', border: '1px dashed #e5e7eb', borderRadius: 6, padding: '6px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center' }}
              >
                + 그룹 추가
              </button>
            )}
          </div>
        </div>

        {/* 하단 */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid #f3f4f6' }}>
          <button onClick={() => setIntersectOpen(true)} style={{ width: '100%', padding: '8px', marginBottom: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 7, fontFamily: 'inherit' }}>
            취향 비교
          </button>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>{contacts.filter(c => !c.isMe).length}명 등록됨</div>
        </div>
      </aside>

      <main style={{ flex: 1, overflowY: 'auto' }}>
        <Outlet />
      </main>

      <IntersectPanel open={intersectOpen} onClose={() => setIntersectOpen(false)} />

      {/* 그룹 삭제 확인 모달 */}
      {deleteTarget && (
        <div
          onClick={() => setDeleteTarget(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          <style>{`@keyframes fadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }`}</style>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 10, padding: '28px 28px 24px',
              width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>🗑️</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>
                "{deleteTarget.name}" 그룹 삭제
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px', lineHeight: 1.6 }}>
              {contacts.some(c => c.groupId === deleteTarget.id)
                ? '소속 지인을 어떻게 처리할까요?'
                : '그룹을 삭제할까요?'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {contacts.some(c => c.groupId === deleteTarget.id) ? (
                <>
                  <button
                    onClick={() => confirmDeleteGroup(false)}
                    style={{
                      padding: '10px 16px', fontSize: 13, fontWeight: 600,
                      color: '#374151', background: '#f9fafb',
                      border: '1px solid #e5e7eb', borderRadius: 8,
                      cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#f9fafb')}
                  >
                    📂 소속 지인을 미분류로 이동
                    <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400, marginTop: 2 }}>
                      지인은 그대로 유지되고 그룹만 삭제돼요
                    </div>
                  </button>
                  <button
                    onClick={() => confirmDeleteGroup(true)}
                    style={{
                      padding: '10px 16px', fontSize: 13, fontWeight: 600,
                      color: '#fff', background: '#ef4444',
                      border: '1px solid #ef4444', borderRadius: 8,
                      cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#dc2626')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#ef4444')}
                  >
                    🗑️ 지인도 함께 삭제
                    <div style={{ fontSize: 11, color: '#fecaca', fontWeight: 400, marginTop: 2 }}>
                      그룹과 소속 지인이 모두 삭제돼요
                    </div>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => confirmDeleteGroup(false)}
                  style={{
                    padding: '10px 16px', fontSize: 13, fontWeight: 600,
                    color: '#fff', background: '#ef4444',
                    border: '1px solid #ef4444', borderRadius: 8,
                    cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#dc2626')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#ef4444')}
                >
                  그룹 삭제
                </button>
              )}
            </div>

            <button
              onClick={() => setDeleteTarget(null)}
              style={{
                width: '100%', padding: '8px', fontSize: 13, color: '#9ca3af',
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
