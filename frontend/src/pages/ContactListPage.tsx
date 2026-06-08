import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard } from '../api/dashboard'
import { getContacts, addMeeting, addMeetingBulk, updateMeeting, deleteMeeting } from '../api/contacts'
import PlaceSearch from '../components/PlaceSearch'
import PlaceTagList from '../components/PlaceTagList'
import ConfirmModal from '../components/ConfirmModal'
import type { ContactSummary, DashboardResponse, DashboardBirthdayItem, DashboardNotSeenItem, DashboardRecentMeetingItem, MeetingPlaceInput } from '../types'

// 관계별 색상 (Layout.tsx와 동일)
const REL_COLOR: Record<string, string> = {
  친구: '#3b82f6',
  가족: '#22c55e',
  직장: '#f59e0b',
  연인: '#ec4899',
  지인: '#9ca3af',
  기타: '#9ca3af',
}

function relColor(rel: string) {
  return REL_COLOR[rel] ?? '#9ca3af'
}

// 원형 아바타 (사진 or 이름 첫 글자)
function Avatar({ name, photoUrl, relationship, size = 40 }: { name: string; photoUrl?: string; relationship: string; size?: number }) {
  const color = relColor(relationship)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
      background: photoUrl ? '#f3f4f6' : color + '22',
      color, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700,
    }}>
      {photoUrl
        ? <img src={photoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : name[0]
      }
    </div>
  )
}

// 섹션 헤더
function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{title}</span>
      {count !== undefined && (
        <span style={{
          fontSize: 10, fontWeight: 700, color: '#9ca3af',
          background: '#f3f4f6', borderRadius: 10,
          padding: '1px 7px',
        }}>{count}</span>
      )}
    </div>
  )
}

// 빈 상태 메시지
function EmptyMsg({ text }: { text: string }) {
  return (
    <p style={{ fontSize: 12, color: '#d1d5db', margin: 0, padding: '10px 0' }}>{text}</p>
  )
}

// 생일 카드
function BirthdayCard({ item, onClick }: { item: DashboardBirthdayItem; onClick: () => void }) {
  const isToday = item.daysUntil === 0
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        padding: '14px 12px', borderRadius: 10, cursor: 'pointer',
        border: `1px solid ${isToday ? '#fce7f3' : '#e5e7eb'}`,
        background: isToday ? '#fff7fb' : '#fff',
        minWidth: 90, flexShrink: 0,
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <Avatar name={item.name} photoUrl={item.photoUrl} relationship={item.relationship} size={44} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{item.name}</div>
        <div style={{
          fontSize: 11, fontWeight: 700, marginTop: 2,
          color: isToday ? '#ec4899' : '#f59e0b',
        }}>
          {isToday ? '🎂 오늘!' : `D-${item.daysUntil}`}
        </div>
      </div>
    </div>
  )
}

// 오래 못 본 지인 행
function NotSeenRow({ item, onClick }: { item: DashboardNotSeenItem; onClick: () => void }) {
  const label = item.daysSince == null
    ? '만남 기록 없음'
    : item.daysSince >= 365
      ? `약 ${Math.floor(item.daysSince / 365)}년 전`
      : item.daysSince >= 30
        ? `약 ${Math.floor(item.daysSince / 30)}개월 전`
        : `${item.daysSince}일 전`

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <Avatar name={item.name} photoUrl={item.photoUrl} relationship={item.relationship} size={38} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{item.name}</div>
        <div style={{ fontSize: 11, color: relColor(item.relationship) }}>{item.relationship}</div>
      </div>
      <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>{label}</span>
    </div>
  )
}

// 만남 그룹 타입: groupId 기반(신규) 또는 날짜+장소 기반(레거시)
type GroupedMeeting = {
  groupKey: string       // 그룹 식별 키 (Map key)
  groupId?: string       // 영구 UUID (있으면 신규 레코드, 없으면 레거시)
  meetings: DashboardRecentMeetingItem[]
  date: string
  places: DashboardRecentMeetingItem['places']
  memo?: string
}

function groupRecentMeetings(meetings: DashboardRecentMeetingItem[]): GroupedMeeting[] {
  const map = new Map<string, GroupedMeeting>()
  for (const item of meetings) {
    // groupId가 있으면 영구 UUID 기준, 없으면(레거시) 날짜+장소 내용 기반
    const key = item.groupId ?? `legacy|${item.date}|${item.places.map(p => p.name).sort().join('|')}`
    if (!map.has(key)) {
      map.set(key, { groupKey: key, groupId: item.groupId, meetings: [], date: item.date, places: item.places, memo: item.memo })
    }
    map.get(key)!.meetings.push(item)
  }
  return Array.from(map.values())
}

// 그룹 만남 행 (여러 아바타 + 이름 표시)
function GroupedMeetingRow({ group, onClick }: { group: GroupedMeeting; onClick: () => void }) {
  const mainPlace = group.places[0]?.name
  const extraCount = group.places.length - 1
  const names = group.meetings.map(m => m.contactName).join(', ')
  const canClick = group.meetings.length === 1

  return (
    <div
      onClick={canClick ? onClick : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', borderRadius: 8,
        cursor: canClick ? 'pointer' : 'default',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (canClick) e.currentTarget.style.background = '#f9fafb' }}
      onMouseLeave={e => { if (canClick) e.currentTarget.style.background = 'transparent' }}
    >
      {/* 아바타: 최대 3개 겹쳐서 표시 */}
      <div style={{ display: 'flex', flexShrink: 0 }}>
        {group.meetings.slice(0, 3).map((m, i) => (
          <div key={m.meetingId} style={{ marginLeft: i === 0 ? 0 : -10, zIndex: 3 - i }}>
            <Avatar name={m.contactName} photoUrl={m.contactPhotoUrl} relationship={m.contactRelationship} size={38} />
          </div>
        ))}
        {group.meetings.length > 3 && (
          <div style={{
            width: 38, height: 38, borderRadius: '50%', marginLeft: -10,
            background: '#e5e7eb', color: '#6b7280',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, zIndex: 0,
          }}>
            +{group.meetings.length - 3}
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {names}
        </div>
        {mainPlace && (
          <div style={{ fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📍 {mainPlace}{extraCount > 0 ? ` 외 ${extraCount}곳` : ''}
          </div>
        )}
      </div>
      <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>{group.date}</span>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  border: '1px solid #e5e7eb', borderRadius: 6, padding: '7px 10px',
  fontSize: 13, outline: 'none', fontFamily: 'inherit', color: '#111',
  background: '#fff', boxSizing: 'border-box',
}

export default function ContactListPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)

  // 빠른 만남 기록 폼
  const today = new Date().toISOString().split('T')[0]
  const [showQuickForm, setShowQuickForm] = useState(false)
  const [allContacts, setAllContacts] = useState<ContactSummary[]>([])
  const [quickForm, setQuickForm] = useState({ date: today, places: [] as MeetingPlaceInput[], memo: '' })
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [quickSubmitAttempted, setQuickSubmitAttempted] = useState(false)

  useEffect(() => {
    getDashboard()
      .then(setData)
      .finally(() => setLoading(false))
    // 지인 선택을 위한 전체 목록 로드 (본인 제외)
    getContacts().then(all => setAllContacts(all.filter(c => !c.isMe)))
  }, [])

  // 최근 만남 수정/삭제 (그룹 키 기반)
  const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ date: '', places: [] as MeetingPlaceInput[], memo: '' })
  const [editAddContactIds, setEditAddContactIds] = useState<number[]>([]) // 기존 그룹에 추가할 지인
  const [editMode, setEditMode] = useState<'bulk' | 'individual'>('bulk') // 일괄/개별 수정 모드
  const [editMemos, setEditMemos] = useState<Record<number, string>>({})  // 개별 모드 시 meetingId별 메모
  // 확인 모달 (수정 저장 / 삭제 전 사용자 확인)
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null)

  const startEditMeeting = (group: GroupedMeeting) => {
    setEditingGroupKey(group.groupKey)
    setEditForm({
      date: group.date,
      places: group.places.map(p => ({ name: p.name, lat: p.lat, lng: p.lng })),
      memo: group.memo ?? '',
    })
    setEditAddContactIds([])
    // 개별 메모: 각 만남 레코드의 실제 메모값으로 초기화
    const memos: Record<number, string> = {}
    for (const m of group.meetings) memos[m.meetingId] = m.memo ?? ''
    setEditMemos(memos)
    // 메모가 하나라도 다르면 개별 수정 모드로 시작
    const uniqueMemos = new Set(group.meetings.map(m => m.memo ?? ''))
    setEditMode(uniqueMemos.size > 1 ? 'individual' : 'bulk')
  }

  // 그룹 내 모든 만남 수정 + 새 지인 추가 (같은 groupId로 fan-out)
  const handleUpdateMeeting = (e: React.FormEvent, group: GroupedMeeting) => {
    e.preventDefault()
    if (editForm.places.length === 0) return
    setConfirm({
      message: editAddContactIds.length > 0
        ? `만남 기록을 수정하고 ${editAddContactIds.length}명을 추가할까요?`
        : '만남 기록을 수정할까요?',
      onConfirm: async () => {
        setConfirm(null)
        if (editMode === 'individual') {
          // 개별 수정: 각자 메모 따로 적용
          await Promise.all(group.meetings.map(m =>
            updateMeeting(m.meetingId, {
              date: editForm.date,
              places: editForm.places,
              memo: editMemos[m.meetingId] || undefined,
            })
          ))
        } else {
          // 일괄 수정: 모두 같은 메모
          await Promise.all(group.meetings.map(m =>
            updateMeeting(m.meetingId, { date: editForm.date, places: editForm.places, memo: editForm.memo || undefined })
          ))
        }
        // 새 지인 추가 (groupId가 있으면 기존 그룹에 합류)
        if (editAddContactIds.length > 0) {
          await addMeetingBulk({
            contactIds: editAddContactIds,
            date: editForm.date,
            places: editForm.places,
            memo: editMode === 'bulk' ? editForm.memo || undefined : undefined,
            groupId: group.groupId,
          })
        }
        setEditingGroupKey(null)
        setEditAddContactIds([])
        getDashboard().then(setData)
      },
    })
  }

  // 그룹 내 모든 만남 삭제
  const handleDeleteMeeting = (group: GroupedMeeting) => {
    const multi = group.meetings.length > 1
    setConfirm({
      message: multi
        ? `${group.meetings.map(m => m.contactName).join(', ')}의 만남 기록을 모두 삭제할까요?\n삭제하면 되돌릴 수 없어요.`
        : '만남 기록을 삭제할까요?\n삭제하면 되돌릴 수 없어요.',
      onConfirm: async () => {
        setConfirm(null)
        await Promise.all(group.meetings.map(m => deleteMeeting(m.meetingId)))
        getDashboard().then(setData)
      },
    })
  }

  const handleQuickSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setQuickSubmitAttempted(true)
    if (selectedIds.length === 0 || !quickForm.date || quickForm.places.length === 0) return
    setSaving(true)
    try {
      if (selectedIds.length === 1) {
        await addMeeting(selectedIds[0], { date: quickForm.date, places: quickForm.places, memo: quickForm.memo || undefined })
      } else {
        await addMeetingBulk({ contactIds: selectedIds, date: quickForm.date, places: quickForm.places, memo: quickForm.memo || undefined })
      }
      // 폼 초기화 후 대시보드 새로고침
      setQuickForm({ date: today, places: [], memo: '' })
      setSelectedIds([])
      setShowQuickForm(false)
      getDashboard().then(setData)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <span style={{ fontSize: 13, color: '#d1d5db' }}>불러오는 중...</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <span style={{ fontSize: 13, color: '#d1d5db' }}>데이터를 불러올 수 없어요</span>
      </div>
    )
  }

  const { upcomingBirthdays, notSeenRecently, recentMeetings } = data
  const hasAnyData = upcomingBirthdays.length > 0 || notSeenRecently.length > 0 || recentMeetings.length > 0

  if (!hasAnyData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
        <span style={{ fontSize: 32 }}>🗂️</span>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: 0 }}>지인을 추가해보세요</p>
        <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>왼쪽에서 지인을 등록하면 여기에 요약이 표시돼요</p>
        <button
          onClick={() => navigate('/contacts/new')}
          style={{
            marginTop: 8, fontSize: 12, fontWeight: 600, color: '#fff',
            background: '#111', border: 'none', borderRadius: 7,
            padding: '8px 16px', cursor: 'pointer',
          }}
        >
          + 지인 추가
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 680, margin: '0 auto' }}>
      {confirm && (
        <ConfirmModal
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* 빠른 만남 기록 */}
      <section style={{ marginBottom: 32 }}>
        {!showQuickForm ? (
          <button
            onClick={() => setShowQuickForm(true)}
            style={{
              width: '100%', padding: '11px 16px', borderRadius: 10,
              border: '1.5px dashed #d1d5db', background: '#fafafa',
              fontSize: 13, color: '#9ca3af', cursor: 'pointer',
              fontFamily: 'inherit', textAlign: 'left',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#111'; e.currentTarget.style.color = '#374151' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#9ca3af' }}
          >
            + 오늘 만남 기록하기
          </button>
        ) : (
          <form
            onSubmit={handleQuickSave}
            style={{
              background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
              padding: '16px', display: 'flex', flexDirection: 'column', gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>만남 기록</span>
              <button
                type="button"
                onClick={() => { setShowQuickForm(false); setSelectedIds([]); setQuickForm({ date: today, places: [], memo: '' }); setQuickSubmitAttempted(false) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18, lineHeight: 1, padding: 0 }}
              >×</button>
            </div>

            {/* 날짜 + 장소 */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="date"
                value={quickForm.date}
                onChange={e => setQuickForm(p => ({ ...p, date: e.target.value }))}
                style={{ ...inputStyle, flex: '0 0 140px' }}
              />
              <PlaceSearch
                value=""
                onSelect={({ name, lat, lng }) => setQuickForm(p => ({ ...p, places: [...p.places, { name, lat, lng }] }))}
                style={{ flex: 1 }}
              />
            </div>

            {/* 장소 태그 */}
            <PlaceTagList
              places={quickForm.places}
              onChange={places => setQuickForm(p => ({ ...p, places }))}
            />

            {/* 지인 선택 */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', margin: '0 0 6px', letterSpacing: '0.05em' }}>
                만난 지인 *
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {allContacts.map(c => {
                  const selected = selectedIds.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedIds(prev =>
                        selected ? prev.filter(id => id !== c.id) : [...prev, c.id]
                      )}
                      style={{
                        fontSize: 12, padding: '4px 10px', borderRadius: 5,
                        cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.1s',
                        background: selected ? '#111' : '#f3f4f6',
                        color: selected ? '#fff' : '#374151',
                        border: selected ? '1px solid #111' : '1px solid #e5e7eb',
                        fontWeight: selected ? 600 : 400,
                      }}
                    >
                      {c.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 메모 */}
            <input
              type="text"
              value={quickForm.memo}
              onChange={e => setQuickForm(p => ({ ...p, memo: e.target.value }))}
              placeholder="메모 (선택)"
              style={{ ...inputStyle, width: '100%' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
              {/* 저장 시도 후 미충족 조건 안내 */}
              {quickSubmitAttempted && quickForm.places.length === 0 && (
                <span style={{ fontSize: 11, color: '#ef4444' }}>장소를 1개 이상 추가해주세요</span>
              )}
              {quickSubmitAttempted && selectedIds.length === 0 && quickForm.places.length > 0 && (
                <span style={{ fontSize: 11, color: '#ef4444' }}>만난 지인을 1명 이상 선택해주세요</span>
              )}
              <button
                type="submit"
                disabled={saving}
                style={{
                  fontSize: 13, fontWeight: 600, padding: '7px 18px',
                  background: (selectedIds.length === 0 || quickForm.places.length === 0) ? '#e5e7eb' : '#111',
                  color: (selectedIds.length === 0 || quickForm.places.length === 0) ? '#9ca3af' : '#fff',
                  border: 'none', borderRadius: 6,
                  cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'background 0.1s',
                }}
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* 생일 임박 */}
      {upcomingBirthdays.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <SectionHeader title="생일 임박" count={upcomingBirthdays.length} />
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {upcomingBirthdays.map(item => (
              <BirthdayCard
                key={item.id}
                item={item}
                onClick={() => navigate(`/contacts/${item.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 오래 못 본 지인 */}
      <section style={{ marginBottom: 32 }}>
        <SectionHeader title="오래 못 본 지인" count={notSeenRecently.length} />
        {notSeenRecently.length === 0 ? (
          <EmptyMsg text="최근 30일 이내에 모든 지인을 만났어요" />
        ) : (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
            {notSeenRecently.map((item, i) => (
              <div key={item.id} style={{ borderTop: i === 0 ? 'none' : '1px solid #f3f4f6' }}>
                <NotSeenRow item={item} onClick={() => navigate(`/contacts/${item.id}`)} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 최근 만남 (같은 날짜+장소면 한 행으로 묶어 표시) */}
      <section>
        <SectionHeader title="최근 만남" />
        {recentMeetings.length === 0 ? (
          <EmptyMsg text="아직 만남 기록이 없어요" />
        ) : (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
            {groupRecentMeetings(recentMeetings).map((group, i) => (
              <div key={group.groupKey} style={{ borderTop: i === 0 ? 'none' : '1px solid #f3f4f6' }}>
                {editingGroupKey === group.groupKey ? (
                  /* 인라인 수정 폼 */
                  <form
                    onSubmit={e => handleUpdateMeeting(e, group)}
                    style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}
                  >
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="date"
                        value={editForm.date}
                        onChange={e => setEditForm(p => ({ ...p, date: e.target.value }))}
                        style={{ ...inputStyle, flex: '0 0 140px', fontSize: 12 }}
                      />
                      <PlaceSearch
                        value=""
                        onSelect={({ name, lat, lng }) => setEditForm(p => ({ ...p, places: [...p.places, { name, lat, lng }] }))}
                        style={{ flex: 1, fontSize: 12 }}
                      />
                    </div>
                    <PlaceTagList
                      places={editForm.places}
                      onChange={places => setEditForm(p => ({ ...p, places }))}
                    />
                    {editForm.places.length === 0 && (
                      <p style={{ fontSize: 11, color: '#ef4444', margin: 0 }}>장소를 1개 이상 추가해주세요</p>
                    )}

                    {/* 그룹 만남이면 수정 방식 선택 가능 */}
                    {group.meetings.length > 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.05em' }}>수정 방식</span>
                        <select
                          value={editMode}
                          onChange={e => setEditMode(e.target.value as 'bulk' | 'individual')}
                          style={{
                            fontSize: 12, padding: '4px 8px', borderRadius: 5,
                            border: '1px solid #e5e7eb', fontFamily: 'inherit',
                            color: '#374151', background: '#fff', cursor: 'pointer',
                          }}
                        >
                          <option value="bulk">일괄 수정</option>
                          <option value="individual">개별 수정</option>
                        </select>
                      </div>
                    )}

                    {/* 메모: 일괄이면 하나, 개별이면 멤버마다 */}
                    {editMode === 'bulk' || group.meetings.length === 1 ? (
                      <input
                        type="text"
                        value={editForm.memo}
                        onChange={e => setEditForm(p => ({ ...p, memo: e.target.value }))}
                        placeholder="메모"
                        style={{ ...inputStyle, fontSize: 12 }}
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {group.meetings.map(m => (
                          <div key={m.meetingId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#374151', minWidth: 52, flexShrink: 0 }}>
                              {m.contactName}
                            </span>
                            <input
                              type="text"
                              value={editMemos[m.meetingId] ?? ''}
                              onChange={e => setEditMemos(prev => ({ ...prev, [m.meetingId]: e.target.value }))}
                              placeholder={`${m.contactName} 메모`}
                              style={{ ...inputStyle, fontSize: 12, flex: 1 }}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 현재 멤버 표시 + 지인 추가 (groupId 있는 신규 그룹만) */}
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', margin: '0 0 5px', letterSpacing: '0.05em' }}>
                        만남 멤버
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {/* 현재 그룹 멤버: 고정 표시 */}
                        {group.meetings.map(m => (
                          <span
                            key={m.meetingId}
                            style={{
                              fontSize: 11, padding: '3px 8px', borderRadius: 4,
                              background: '#f3f4f6', color: '#374151',
                              border: '1px solid #e5e7eb',
                            }}
                          >
                            {m.contactName}
                          </span>
                        ))}
                        {/* 새로 추가할 지인: 그룹에 없는 지인만 선택 가능 */}
                        {allContacts
                          .filter(c => !group.meetings.some(m => m.contactId === c.id))
                          .map(c => {
                            const selected = editAddContactIds.includes(c.id)
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => setEditAddContactIds(prev =>
                                  selected ? prev.filter(id => id !== c.id) : [...prev, c.id]
                                )}
                                style={{
                                  fontSize: 11, padding: '3px 8px', borderRadius: 4,
                                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.1s',
                                  background: selected ? '#111' : 'transparent',
                                  color: selected ? '#fff' : '#9ca3af',
                                  border: selected ? '1px solid #111' : '1px dashed #d1d5db',
                                  fontWeight: selected ? 600 : 400,
                                }}
                              >
                                + {c.name}
                              </button>
                            )
                          })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => { setEditingGroupKey(null); setEditAddContactIds([]); setEditMode('bulk'); setEditMemos({}) }}
                        style={{ fontSize: 12, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                      >취소</button>
                      <button
                        type="submit"
                        disabled={editForm.places.length === 0}
                        style={{
                          fontSize: 12, fontWeight: 600, padding: '5px 12px',
                          background: editForm.places.length === 0 ? '#e5e7eb' : '#111',
                          color: editForm.places.length === 0 ? '#9ca3af' : '#fff',
                          border: 'none', borderRadius: 6,
                          cursor: editForm.places.length === 0 ? 'default' : 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >저장</button>
                    </div>
                  </form>
                ) : (
                  /* 일반 표시 + 수정/삭제 버튼 */
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <GroupedMeetingRow
                        group={group}
                        onClick={() => navigate(`/contacts/${group.meetings[0].contactId}?tab=meeting&date=${group.date}`)}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 4, paddingRight: 12, flexShrink: 0 }}>
                      <button
                        onClick={() => startEditMeeting(group)}
                        style={{ fontSize: 11, color: '#6b7280', background: 'none', border: '1px solid #e5e7eb', borderRadius: 4, cursor: 'pointer', padding: '3px 8px', fontFamily: 'inherit' }}
                      >수정</button>
                      <button
                        onClick={() => handleDeleteMeeting(group)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 14, padding: '3px 4px' }}
                      >✕</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  )
}
