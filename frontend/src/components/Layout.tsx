import { useEffect, useRef, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { getContacts, deleteContact } from '../api/contacts'
import {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  assignGroup,
  reorderGroups,
} from '../api/groups'
import type { ContactGroup, ContactSummary } from '../types'
import IntersectPanel from './IntersectPanel'

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

  const meContact = contacts.find((c) => c.isMe)
  const filtered = contacts.filter(
    (c) => !c.isMe && (c.name.includes(query) || (c.relationship ?? '').includes(query)),
  )
  const ungrouped = filtered.filter((c) => c.groupId == null)

  const handleDeleteGroup = (g: ContactGroup) => {
    setDeleteTarget(g)
  }

  const confirmDeleteGroup = async (withContacts: boolean) => {
    const g = deleteTarget
    if (!g) return
    setDeleteTarget(null)
    await deleteGroup(g.id, withContacts)
    if (withContacts) {
      setContacts((prev) => prev.filter((c) => c.groupId !== g.id))
    } else {
      setContacts((prev) => prev.map((c) => (c.groupId === g.id ? { ...c, groupId: null } : c)))
    }
    setGroups((prev) => prev.filter((x) => x.id !== g.id))
  }

  // 그룹명 저장
  const handleSaveGroupName = async (id: number) => {
    const name = editingName.trim()
    if (!name) {
      setEditingGroupId(null)
      return
    }
    const updated = await updateGroup(id, name)
    setGroups((prev) => prev.map((g) => (g.id === id ? updated : g)))
    setEditingGroupId(null)
  }

  // 새 그룹 생성
  const handleCreateGroup = async () => {
    const name = newGroupName.trim()
    if (!name) {
      setShowNewGroup(false)
      setNewGroupError('')
      return
    }
    try {
      const created = await createGroup(name)
      setGroups((prev) => [...prev, created])
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
      setDraggingGroupId(null)
      setGroupDragOverId(null)
      return
    }
    const newOrder = [...groups]
    const fromIdx = newOrder.findIndex((g) => g.id === draggingGroupId)
    const toIdx = newOrder.findIndex((g) => g.id === targetGroupId)
    const [moved] = newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, moved)
    const ordered = newOrder.map((g, i) => ({ ...g, sortOrder: i }))
    setGroups(ordered)
    setDraggingGroupId(null)
    setGroupDragOverId(null)
    await reorderGroups(ordered.map((g) => ({ id: g.id, sortOrder: g.sortOrder ?? 0 })))
  }

  // 드롭: 지인을 그룹에 배정
  const handleDrop = async (target: DropTarget) => {
    if (draggingId === null || target === null) return
    const c = contacts.find((x) => x.id === draggingId)
    const newGroupId = target === 'ungrouped' ? null : target
    // 같은 그룹이면 무시
    if ((c?.groupId ?? null) === newGroupId) {
      setDraggingId(null)
      setDropTarget(null)
      return
    }

    // 낙관적 업데이트 (API 완료 전에 UI 반영)
    setContacts((prev) =>
      prev.map((x) => (x.id === draggingId ? { ...x, groupId: newGroupId } : x)),
    )
    if (typeof target === 'number') setCollapsed((prev) => ({ ...prev, [target]: false }))
    setDraggingId(null)
    setDropTarget(null)
    await assignGroup(draggingId, newGroupId)
  }

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (!confirm('삭제할까요?')) return
    await deleteContact(id)
    setContacts((prev) => prev.filter((c) => c.id !== id))
    if (activeId === String(id)) navigate('/')
  }

  // 드롭존 공통 props
  const dropZoneProps = (target: DropTarget) => ({
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault()
      setDropTarget(target)
    },
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
        onDragEnd={() => {
          setDraggingId(null)
          setDropTarget(null)
        }}
        onClick={() => navigate(`/contacts/${c.id}`)}
        style={{
          background: isActive ? color + '18' : undefined,
          borderLeft: isActive ? `3px solid ${color}` : '3px solid transparent',
          opacity: draggingId === c.id ? 0.4 : 1,
        }}
        className={`group mx-2 my-px flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 transition-colors duration-150 ${
          !isActive ? 'hover:bg-slate-100' : ''
        }`}
      >
        <div
          style={{ background: color + '20', color, border: `1.5px solid ${color}40` }}
          className="flex h-8.5 w-8.5 shrink-0 items-center justify-center overflow-hidden rounded-full pointer-events-none text-[13px] font-bold"
        >
          {c.photoUrl ? (
            <img src={c.photoUrl} alt={c.name} className="h-full w-full object-cover" />
          ) : (
            c.name[0]
          )}
        </div>
        <div className="pointer-events-none min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-1.25">
            <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-semibold text-[#111]">
              {c.name}
            </span>
            {dday && (
              <span
                className={`shrink-0 rounded-[20px] px-1.25 py-px text-[10px] font-bold text-white ${
                  dday === 'D-Day' ? 'bg-pink-500' : 'bg-pink-400'
                }`}
              >
                {dday}
              </span>
            )}
          </div>
          <span
            style={{ color, background: color + '15' }}
            className="rounded px-1.25 py-px text-[10px] font-semibold"
          >
            {c.relationship}
          </span>
        </div>
        <button
          onClick={(e) => handleDelete(e, c.id)}
          className="shrink-0 cursor-pointer border-none bg-transparent px-1 py-0.5 text-[13px] text-gray-300 opacity-0 transition-opacity group-hover:opacity-100"
        >
          ✕
        </button>
      </div>
    )
  }

  // 섹션 헤더 (미분류 / 커스텀 그룹 공통)
  const sectionHeaderClass = (isTarget: boolean, variant: 'gray' | 'indigo' = 'gray') =>
    `flex cursor-pointer select-none items-center gap-2 border-l-[3px] px-3.5 pb-1 pt-2.5 transition-colors duration-100 ${
      isTarget
        ? variant === 'indigo'
          ? 'border-indigo-500 bg-indigo-500/[12.5%]'
          : 'border-gray-300 bg-gray-300/[12.5%]'
        : 'border-transparent'
    }`

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f5f5]">
      <aside className="flex w-65 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-slate-50">
        {/* 헤더 */}
        <div className="border-b border-slate-200 px-4 pb-3.5 pt-4.5">
          <div className="mb-3 flex items-center justify-between">
            <span
              onClick={() => navigate('/')}
              className="cursor-pointer text-[15px] font-bold tracking-[-0.3px] text-[#111]"
            >
              알쓸지인
            </span>
            <button
              onClick={() => navigate('/contacts/new')}
              className="cursor-pointer rounded-md border-none bg-[#111] px-2.5 py-1.25 text-xs font-semibold text-white"
            >
              + 추가
            </button>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름, 관계 검색..."
            className="box-border w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.75 text-[13px] text-gray-700 outline-none"
          />
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto">
          {/* 나 섹션 */}
          <div className="flex items-center gap-2 px-3.5 pb-1 pt-2">
            <span className="text-[10px] font-bold tracking-[0.06em] text-gray-400">나</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {meContact ? (
            <div
              className={`mx-2 my-px flex items-center gap-2.5 rounded-lg px-3 py-1.75 ${
                activeId === String(meContact.id) ? 'bg-slate-200' : ''
              }`}
            >
              <div
                onClick={() => navigate(`/contacts/${meContact.id}`)}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5"
              >
                <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-gray-700 bg-[#111] text-[15px] text-white">
                  {meContact.photoUrl ? (
                    <img
                      src={meContact.photoUrl}
                      alt={meContact.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    '⭐'
                  )}
                </div>
                <div className="min-w-0">
                  <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-semibold text-[#111]">
                    {meContact.name}
                  </div>
                  <div className="text-[11px] text-gray-400">내 정보</div>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => navigate(`/contacts/${meContact.id}/edit?me=true`)}
                  className="cursor-pointer rounded px-2 py-0.75 text-[11px] text-gray-500 border border-slate-200 bg-transparent"
                >
                  수정
                </button>
                <button
                  onClick={(e) => handleDelete(e, meContact.id)}
                  className="cursor-pointer rounded px-2 py-0.75 text-[11px] text-red-500 border border-red-200 bg-transparent"
                >
                  삭제
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => navigate('/contacts/new?me=true')}
              className="flex cursor-pointer items-center gap-2 px-3.5 py-2.25 text-gray-400 hover:bg-slate-100"
            >
              <span className="text-sm">⭐</span>
              <span className="text-xs">내 정보 등록하기</span>
            </div>
          )}

          {/* 미분류 섹션 — 지인 드래그 중에도 표시해서 그룹 밖으로 빼낼 드롭존 보장 */}
          {(ungrouped.length > 0 || draggingId !== null) && (
            <div {...dropZoneProps('ungrouped')}>
              <div
                onClick={() => setCollapsed((p) => ({ ...p, ungrouped: !p.ungrouped }))}
                className={sectionHeaderClass(dropTarget === 'ungrouped')}
              >
                <span className="text-[10px] font-bold tracking-[0.06em] text-gray-400">
                  미분류
                </span>
                <span className="text-[10px] font-semibold text-gray-300">{ungrouped.length}</span>
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[9px] text-[#c4c4c4]">{collapsed.ungrouped ? '▶' : '▼'}</span>
              </div>
              {!collapsed.ungrouped && ungrouped.map(renderContact)}
            </div>
          )}

          {/* 커스텀 그룹 목록 */}
          {groups.map((g) => {
            const members = filtered.filter((c) => c.groupId === g.id)
            const isTarget = dropTarget === g.id && draggingGroupId === null
            const isGroupTarget =
              groupDragOverId === g.id && draggingGroupId !== null && draggingGroupId !== g.id
            const isCollapsed = !!collapsed[g.id]
            const isHovered = hoverGroupId === g.id
            const isEditing = editingGroupId === g.id

            return (
              <div
                key={g.id}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (draggingGroupId !== null) setGroupDragOverId(g.id)
                  else setDropTarget(g.id)
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDropTarget(null)
                    setGroupDragOverId(null)
                  }
                }}
                onDrop={() => {
                  if (draggingGroupId !== null) handleGroupDrop(g.id)
                  else handleDrop(g.id)
                }}
                style={{ opacity: draggingGroupId === g.id ? 0.4 : 1 }}
                className="transition-opacity duration-150"
              >
                {/* 그룹 헤더 */}
                <div
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation()
                    setDraggingGroupId(g.id)
                  }}
                  onDragEnd={() => {
                    setDraggingGroupId(null)
                    setGroupDragOverId(null)
                  }}
                  onClick={() => {
                    if (!isEditing) setCollapsed((p) => ({ ...p, [g.id]: !p[g.id] }))
                  }}
                  onMouseEnter={() => setHoverGroupId(g.id)}
                  onMouseLeave={() => setHoverGroupId(null)}
                  className={`cursor-grab ${sectionHeaderClass(isTarget, 'indigo')} ${
                    isGroupTarget ? 'border-t-2 border-t-indigo-500' : ''
                  }`}
                >
                  {isEditing ? (
                    // 인라인 이름 수정 입력창
                    <input
                      ref={editInputRef}
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveGroupName(g.id)
                        if (e.key === 'Escape') setEditingGroupId(null)
                      }}
                      onBlur={() => handleSaveGroupName(g.id)}
                      className="w-25 rounded border border-indigo-500 bg-white px-1.5 py-px text-[11px] font-bold text-gray-700 outline-none"
                    />
                  ) : (
                    <span className="text-[10px] font-bold tracking-[0.06em] text-indigo-500">
                      {g.name}
                    </span>
                  )}
                  <span className="text-[10px] font-semibold text-gray-300">{members.length}</span>
                  <div className="h-px flex-1 bg-slate-200" />

                  {/* hover 시 수정/삭제 버튼 */}
                  {isHovered && !isEditing && (
                    <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setEditingGroupId(g.id)
                          setEditingName(g.name)
                        }}
                        title="이름 수정"
                        className="cursor-pointer border-none bg-transparent px-0.5 text-[11px] leading-none text-gray-400"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(g)}
                        title="그룹 삭제"
                        className="cursor-pointer border-none bg-transparent px-0.5 text-[11px] leading-none text-gray-400"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                  {(!isHovered || isEditing) && (
                    <span className="text-[9px] text-[#c4c4c4]">{isCollapsed ? '▶' : '▼'}</span>
                  )}
                </div>

                {/* 멤버 목록 */}
                {!isCollapsed && (
                  <>
                    {members.map(renderContact)}
                    {members.length === 0 && (
                      <div
                        className={`px-3.5 py-2 text-center text-[11px] ${
                          isTarget ? 'text-indigo-500' : 'text-gray-300'
                        }`}
                      >
                        {isTarget ? '여기에 놓기' : '지인을 드래그해서 추가하세요'}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}

          {/* 그룹 추가 */}
          <div className="px-3.5 py-2">
            {showNewGroup ? (
              <div>
                <input
                  ref={newGroupInputRef}
                  value={newGroupName}
                  onChange={(e) => {
                    setNewGroupName(e.target.value)
                    setNewGroupError('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateGroup()
                    if (e.key === 'Escape') {
                      setShowNewGroup(false)
                      setNewGroupName('')
                      setNewGroupError('')
                    }
                  }}
                  onBlur={handleCreateGroup}
                  placeholder="그룹 이름 입력..."
                  className={`box-border w-full rounded-md border bg-white px-2.5 py-1.5 text-xs text-gray-700 outline-none ${
                    newGroupError ? 'border-red-500' : 'border-indigo-500'
                  }`}
                />
                {newGroupError && (
                  <p className="m-0 mt-1 text-[11px] text-red-500">{newGroupError}</p>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowNewGroup(true)}
                className="w-full cursor-pointer rounded-md border border-dashed border-slate-200 bg-transparent p-1.5 text-center text-[11px] text-gray-400"
              >
                + 그룹 추가
              </button>
            )}
          </div>
        </div>

        {/* 하단 */}
        <div className="border-t border-slate-200 px-4 py-2.5">
          <button
            onClick={() => setIntersectOpen(true)}
            className="mb-1.5 w-full cursor-pointer rounded-[7px] border border-slate-200 bg-slate-100 p-2 text-xs font-semibold text-gray-700"
          >
            취향 비교
          </button>
          <div className="text-[11px] text-gray-400">
            {contacts.filter((c) => !c.isMe).length}명 등록됨
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      <IntersectPanel open={intersectOpen} onClose={() => setIntersectOpen(false)} />

      {/* 그룹 삭제 확인 모달 */}
      {deleteTarget && (
        <div
          onClick={() => setDeleteTarget(null)}
          className="fixed inset-0 z-1000 flex items-center justify-center bg-black/35 animate-[fadeIn_0.15s_ease-out]"
        >
          <style>{`@keyframes fadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }`}</style>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-90 rounded-[10px] bg-white px-7 pb-6 pt-7 shadow-[0_8px_32px_rgba(0,0,0,0.14)] animate-[fadeIn_0.15s_ease-out]"
          >
            <div className="mb-2 flex items-center gap-2.5">
              <span className="text-xl">🗑️</span>
              <span className="text-[15px] font-bold text-[#111]">
                "{deleteTarget.name}" 그룹 삭제
              </span>
            </div>
            <p className="m-0 mb-5 text-[13px] leading-[1.6] text-gray-500">
              {contacts.some((c) => c.groupId === deleteTarget.id)
                ? '소속 지인을 어떻게 처리할까요?'
                : '그룹을 삭제할까요?'}
            </p>

            <div className="mb-4 flex flex-col gap-2">
              {contacts.some((c) => c.groupId === deleteTarget.id) ? (
                <>
                  <button
                    onClick={() => confirmDeleteGroup(false)}
                    className="cursor-pointer rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-left text-[13px] font-semibold text-gray-700 transition-colors duration-100 hover:bg-gray-100"
                  >
                    📂 소속 지인을 미분류로 이동
                    <div className="mt-0.5 text-[11px] font-normal text-gray-400">
                      지인은 그대로 유지되고 그룹만 삭제돼요
                    </div>
                  </button>
                  <button
                    onClick={() => confirmDeleteGroup(true)}
                    className="cursor-pointer rounded-lg border border-red-500 bg-red-500 px-4 py-2.5 text-left text-[13px] font-semibold text-white transition-colors duration-100 hover:bg-red-600"
                  >
                    🗑️ 지인도 함께 삭제
                    <div className="mt-0.5 text-[11px] font-normal text-red-200">
                      그룹과 소속 지인이 모두 삭제돼요
                    </div>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => confirmDeleteGroup(false)}
                  className="cursor-pointer rounded-lg border border-red-500 bg-red-500 px-4 py-2.5 text-center text-[13px] font-semibold text-white transition-colors duration-100 hover:bg-red-600"
                >
                  그룹 삭제
                </button>
              )}
            </div>

            <button
              onClick={() => setDeleteTarget(null)}
              className="w-full cursor-pointer border-none bg-transparent p-2 text-[13px] text-gray-400"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
