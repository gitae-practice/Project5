import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard } from '../api/dashboard'
import {
  getContacts,
  addMeeting,
  addMeetingBulk,
  updateMeeting,
  deleteMeeting,
} from '../api/contacts'
import PlaceSearch from '../components/PlaceSearch'
import PlaceTagList from '../components/PlaceTagList'
import ConfirmModal from '../components/ConfirmModal'
import { todayKey } from '../utils/date'
import type {
  ContactSummary,
  DashboardResponse,
  DashboardBirthdayItem,
  DashboardNotSeenItem,
  DashboardRecentMeetingItem,
  MeetingPlaceInput,
} from '../types'

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
function Avatar({
  name,
  photoUrl,
  relationship,
  size = 40,
}: {
  name: string
  photoUrl?: string
  relationship: string
  size?: number
}) {
  const color = relColor(relationship)
  return (
    <div
      style={{
        width: size,
        height: size,
        background: photoUrl ? '#f3f4f6' : color + '22',
        color,
        fontSize: size * 0.38,
      }}
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold"
    >
      {photoUrl ? (
        <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        name[0]
      )}
    </div>
  )
}

// 섹션 헤더
function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="text-xs font-bold text-gray-700">{title}</span>
      {count !== undefined && (
        <span className="rounded-[10px] bg-gray-100 px-1.75 py-px text-[10px] font-bold text-gray-400">
          {count}
        </span>
      )}
    </div>
  )
}

// 빈 상태 메시지
function EmptyMsg({ text }: { text: string }) {
  return <p className="m-0 py-2.5 text-xs text-gray-300">{text}</p>
}

// 생일 카드
function BirthdayCard({ item, onClick }: { item: DashboardBirthdayItem; onClick: () => void }) {
  const isToday = item.daysUntil === 0
  return (
    <div
      onClick={onClick}
      className={`flex min-w-22.5 shrink-0 flex-col items-center gap-2 rounded-[10px] border px-3 py-3.5 cursor-pointer transition-shadow duration-150 hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] ${
        isToday ? 'border-pink-100 bg-[#fff7fb]' : 'border-gray-200 bg-white'
      }`}
    >
      <Avatar
        name={item.name}
        photoUrl={item.photoUrl}
        relationship={item.relationship}
        size={44}
      />
      <div className="text-center">
        <div className="text-xs font-semibold text-[#111]">{item.name}</div>
        <div
          className={`mt-0.5 text-[11px] font-bold ${isToday ? 'text-pink-500' : 'text-amber-500'}`}
        >
          {isToday ? '🎂 오늘!' : `D-${item.daysUntil}`}
        </div>
      </div>
    </div>
  )
}

// 오래 못 본 지인 행
function NotSeenRow({ item, onClick }: { item: DashboardNotSeenItem; onClick: () => void }) {
  const label =
    item.daysSince == null
      ? '만남 기록 없음'
      : item.daysSince >= 365
        ? `약 ${Math.floor(item.daysSince / 365)}년 전`
        : item.daysSince >= 30
          ? `약 ${Math.floor(item.daysSince / 30)}개월 전`
          : `${item.daysSince}일 전`

  return (
    <div
      onClick={onClick}
      className="flex cursor-pointer items-center gap-3 rounded-lg px-3.5 py-2.5 transition-colors duration-100 hover:bg-gray-50"
    >
      <Avatar
        name={item.name}
        photoUrl={item.photoUrl}
        relationship={item.relationship}
        size={38}
      />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-[#111]">{item.name}</div>
        <div style={{ color: relColor(item.relationship) }} className="text-[11px]">
          {item.relationship}
        </div>
      </div>
      <span className="shrink-0 text-[11px] text-gray-400">{label}</span>
    </div>
  )
}

// 만남 그룹 타입: groupId 기반(신규) 또는 날짜+장소 기반(레거시)
type GroupedMeeting = {
  groupKey: string // 그룹 식별 키 (Map key)
  groupId?: string // 영구 UUID (있으면 신규 레코드, 없으면 레거시)
  meetings: DashboardRecentMeetingItem[]
  date: string
  places: DashboardRecentMeetingItem['places']
  memo?: string
}

function groupRecentMeetings(meetings: DashboardRecentMeetingItem[]): GroupedMeeting[] {
  const map = new Map<string, GroupedMeeting>()
  for (const item of meetings) {
    // groupId가 있으면 영구 UUID 기준, 없으면(레거시) 날짜+장소 내용 기반
    const key =
      item.groupId ??
      `legacy|${item.date}|${item.places
        .map((p) => p.name)
        .sort()
        .join('|')}`
    if (!map.has(key)) {
      map.set(key, {
        groupKey: key,
        groupId: item.groupId,
        meetings: [],
        date: item.date,
        places: item.places,
        memo: item.memo,
      })
    }
    map.get(key)!.meetings.push(item)
  }
  return Array.from(map.values())
}

// 그룹 만남 행 (여러 아바타 + 이름 표시)
function GroupedMeetingRow({ group, onClick }: { group: GroupedMeeting; onClick: () => void }) {
  const mainPlace = group.places[0]?.name
  const extraCount = group.places.length - 1
  const names = group.meetings.map((m) => m.contactName).join(', ')
  const canClick = group.meetings.length === 1

  return (
    <div
      onClick={canClick ? onClick : undefined}
      className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 transition-colors duration-100 ${
        canClick ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'
      }`}
    >
      {/* 아바타: 최대 3개 겹쳐서 표시 */}
      <div className="flex shrink-0">
        {group.meetings.slice(0, 3).map((m, i) => (
          <div key={m.meetingId} style={{ zIndex: 3 - i }} className={i === 0 ? '' : '-ml-2.5'}>
            <Avatar
              name={m.contactName}
              photoUrl={m.contactPhotoUrl}
              relationship={m.contactRelationship}
              size={38}
            />
          </div>
        ))}
        {group.meetings.length > 3 && (
          <div className="z-0 -ml-2.5 flex h-9.5 w-9.5 items-center justify-center rounded-full bg-gray-200 text-[11px] font-bold text-gray-500">
            +{group.meetings.length - 3}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-semibold text-[#111]">
          {names}
        </div>
        {mainPlace && (
          <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-gray-500">
            📍 {mainPlace}
            {extraCount > 0 ? ` 외 ${extraCount}곳` : ''}
          </div>
        )}
      </div>
      <span className="shrink-0 text-[11px] text-gray-400">{group.date}</span>
    </div>
  )
}

const inputClass =
  'box-border rounded-md border border-gray-200 bg-white px-2.5 py-1.75 text-[13px] text-[#111] outline-none'

export default function ContactListPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)

  // 빠른 만남 기록 폼
  const today = todayKey()
  const [showQuickForm, setShowQuickForm] = useState(false)
  const [allContacts, setAllContacts] = useState<ContactSummary[]>([])
  const [quickForm, setQuickForm] = useState({
    date: today,
    places: [] as MeetingPlaceInput[],
    memo: '',
  })
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [quickSubmitAttempted, setQuickSubmitAttempted] = useState(false)

  useEffect(() => {
    getDashboard()
      .then(setData)
      .finally(() => setLoading(false))
    // 지인 선택을 위한 전체 목록 로드 (본인 제외)
    getContacts().then((all) => setAllContacts(all.filter((c) => !c.isMe)))
  }, [])

  // 최근 만남 수정/삭제 (그룹 키 기반)
  const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    date: '',
    places: [] as MeetingPlaceInput[],
    memo: '',
  })
  const [editAddContactIds, setEditAddContactIds] = useState<number[]>([]) // 기존 그룹에 추가할 지인
  const [editRemoveMeetingIds, setEditRemoveMeetingIds] = useState<number[]>([]) // 그룹에서 제거할 meetingId
  const [editMode, setEditMode] = useState<'bulk' | 'individual'>('bulk') // 일괄/개별 수정 모드
  const [editMemos, setEditMemos] = useState<Record<number, string>>({}) // 개별 모드 시 meetingId별 메모
  // 확인 모달 (수정 저장 / 삭제 전 사용자 확인)
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null)

  const startEditMeeting = (group: GroupedMeeting) => {
    setEditingGroupKey(group.groupKey)
    setEditForm({
      date: group.date,
      places: group.places.map((p) => ({ name: p.name, lat: p.lat, lng: p.lng, rating: p.rating })),
      memo: group.memo ?? '',
    })
    setEditAddContactIds([])
    setEditRemoveMeetingIds([])
    // 개별 메모: 각 만남 레코드의 실제 메모값으로 초기화
    const memos: Record<number, string> = {}
    for (const m of group.meetings) memos[m.meetingId] = m.memo ?? ''
    setEditMemos(memos)
    // 메모가 하나라도 다르면 개별 수정 모드로 시작
    const uniqueMemos = new Set(group.meetings.map((m) => m.memo ?? ''))
    setEditMode(uniqueMemos.size > 1 ? 'individual' : 'bulk')
  }

  // 그룹 내 모든 만남 수정 + 새 지인 추가 (같은 groupId로 fan-out)
  const handleUpdateMeeting = (e: React.FormEvent, group: GroupedMeeting) => {
    e.preventDefault()
    if (editForm.places.length === 0) return
    setConfirm({
      message:
        editAddContactIds.length > 0
          ? `만남 기록을 수정하고 ${editAddContactIds.length}명을 추가할까요?`
          : '만남 기록을 수정할까요?',
      onConfirm: async () => {
        setConfirm(null)
        // 제거 대상 meetingId는 삭제, 나머지는 업데이트
        const keepMeetings = group.meetings.filter(
          (m) => !editRemoveMeetingIds.includes(m.meetingId),
        )
        await Promise.all(editRemoveMeetingIds.map((id) => deleteMeeting(id)))
        if (editMode === 'individual') {
          // 개별 수정: 각자 메모 따로 적용
          await Promise.all(
            keepMeetings.map((m) =>
              updateMeeting(m.meetingId, {
                date: editForm.date,
                places: editForm.places,
                memo: editMemos[m.meetingId] || undefined,
              }),
            ),
          )
        } else {
          // 일괄 수정: 모두 같은 메모
          await Promise.all(
            keepMeetings.map((m) =>
              updateMeeting(m.meetingId, {
                date: editForm.date,
                places: editForm.places,
                memo: editForm.memo || undefined,
              }),
            ),
          )
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
        setEditRemoveMeetingIds([])
        getDashboard().then(setData)
      },
    })
  }

  // 그룹 내 모든 만남 삭제
  const handleDeleteMeeting = (group: GroupedMeeting) => {
    const multi = group.meetings.length > 1
    setConfirm({
      message: multi
        ? `${group.meetings.map((m) => m.contactName).join(', ')}의 만남 기록을 모두 삭제할까요?\n삭제하면 되돌릴 수 없어요.`
        : '만남 기록을 삭제할까요?\n삭제하면 되돌릴 수 없어요.',
      onConfirm: async () => {
        setConfirm(null)
        await Promise.all(group.meetings.map((m) => deleteMeeting(m.meetingId)))
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
        await addMeeting(selectedIds[0], {
          date: quickForm.date,
          places: quickForm.places,
          memo: quickForm.memo || undefined,
        })
      } else {
        await addMeetingBulk({
          contactIds: selectedIds,
          date: quickForm.date,
          places: quickForm.places,
          memo: quickForm.memo || undefined,
        })
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
      <div className="flex h-full items-center justify-center">
        <span className="text-[13px] text-gray-300">불러오는 중...</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-[13px] text-gray-300">데이터를 불러올 수 없어요</span>
      </div>
    )
  }

  const { upcomingBirthdays, notSeenRecently, recentMeetings, upcomingMeetings } = data
  const hasAnyData =
    upcomingBirthdays.length > 0 ||
    notSeenRecently.length > 0 ||
    recentMeetings.length > 0 ||
    upcomingMeetings.length > 0

  if (!hasAnyData) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <span className="text-[32px]">🗂️</span>
        <p className="m-0 text-sm font-semibold text-gray-700">지인을 추가해보세요</p>
        <p className="m-0 text-xs text-gray-400">왼쪽에서 지인을 등록하면 여기에 요약이 표시돼요</p>
        <button
          onClick={() => navigate('/contacts/new')}
          className="mt-2 cursor-pointer rounded-[7px] border-none bg-[#111] px-4 py-2 text-xs font-semibold text-white"
        >
          + 지인 추가
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-170 px-8 py-7">
      {confirm && (
        <ConfirmModal
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* 빠른 만남 기록 */}
      <section className="mb-8">
        {!showQuickForm ? (
          <button
            onClick={() => setShowQuickForm(true)}
            className="w-full cursor-pointer rounded-[10px] border-[1.5px] border-dashed border-gray-300 bg-[#fafafa] px-4 py-2.75 text-left text-[13px] text-gray-400 transition-colors duration-150 hover:border-[#111] hover:text-gray-700"
          >
            + 만남 기록하기
          </button>
        ) : (
          <form
            onSubmit={handleQuickSave}
            className="flex flex-col gap-2.5 rounded-[10px] border border-gray-200 bg-white p-4"
          >
            <div className="mb-0.5 flex items-center justify-between">
              <span className="text-[13px] font-bold text-[#111]">만남 기록</span>
              <button
                type="button"
                onClick={() => {
                  setShowQuickForm(false)
                  setSelectedIds([])
                  setQuickForm({ date: today, places: [], memo: '' })
                  setQuickSubmitAttempted(false)
                }}
                className="cursor-pointer border-none bg-transparent p-0 text-lg leading-none text-gray-400"
              >
                ×
              </button>
            </div>

            {/* 날짜 + 장소 */}
            <div className="flex gap-2">
              <input
                type="date"
                value={quickForm.date}
                onChange={(e) => setQuickForm((p) => ({ ...p, date: e.target.value }))}
                className={`${inputClass} flex-[0_0_140px]`}
              />
              <PlaceSearch
                value=""
                onSelect={({ name, lat, lng }) =>
                  setQuickForm((p) => ({ ...p, places: [...p.places, { name, lat, lng }] }))
                }
                style={{ flex: 1 }}
              />
            </div>

            {/* 장소 태그 */}
            <PlaceTagList
              places={quickForm.places}
              onChange={(places) => setQuickForm((p) => ({ ...p, places }))}
            />

            {/* 지인 선택 */}
            <div>
              <p className="m-0 mb-1.5 text-[11px] font-bold tracking-wider text-gray-400">
                만난 지인 *
              </p>
              <div className="flex flex-wrap gap-1.5">
                {allContacts.map((c) => {
                  const selected = selectedIds.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        setSelectedIds((prev) =>
                          selected ? prev.filter((id) => id !== c.id) : [...prev, c.id],
                        )
                      }
                      className={`cursor-pointer rounded-[5px] border px-2.5 py-1 text-xs transition-all duration-100 ${
                        selected
                          ? 'border-[#111] bg-[#111] font-semibold text-white'
                          : 'border-gray-200 bg-gray-100 font-normal text-gray-700'
                      }`}
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
              onChange={(e) => setQuickForm((p) => ({ ...p, memo: e.target.value }))}
              placeholder="메모 (선택)"
              className={`${inputClass} w-full`}
            />

            <div className="flex items-center justify-end gap-2.5">
              {/* 저장 시도 후 미충족 조건 안내 */}
              {quickSubmitAttempted && quickForm.places.length === 0 && (
                <span className="text-[11px] text-red-500">장소를 1개 이상 추가해주세요</span>
              )}
              {quickSubmitAttempted && selectedIds.length === 0 && quickForm.places.length > 0 && (
                <span className="text-[11px] text-red-500">만난 지인을 1명 이상 선택해주세요</span>
              )}
              <button
                type="submit"
                disabled={saving}
                className={`cursor-pointer rounded-md border-none px-4.5 py-1.75 text-[13px] font-semibold transition-colors duration-100 ${
                  selectedIds.length === 0 || quickForm.places.length === 0
                    ? 'bg-gray-200 text-gray-400'
                    : 'bg-[#111] text-white'
                }`}
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* 예정된 만남 */}
      {upcomingMeetings.length > 0 && (
        <section className="mb-8">
          <SectionHeader title="예정된 만남" count={groupRecentMeetings(upcomingMeetings).length} />
          <div className="flex flex-col gap-2">
            {groupRecentMeetings(upcomingMeetings).map((group) => {
              const dDay = Math.round(
                (new Date(group.date).getTime() - new Date(today).getTime()) /
                  (1000 * 60 * 60 * 24),
              )
              const dLabel = dDay === 0 ? 'D-Day' : `D-${dDay}`
              const names = group.meetings.map((m) => m.contactName).join(', ')
              const mainPlace = group.places[0]?.name
              const extraCount = group.places.length - 1
              return (
                <div
                  key={group.groupKey}
                  className={`flex items-center gap-3 rounded-[10px] border px-3.5 py-3 ${
                    dDay === 0 ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  {/* D-day 배지 */}
                  <div
                    className={`shrink-0 min-w-12 rounded-md px-1.5 py-1 text-center text-[11px] font-bold ${
                      dDay === 0 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {dLabel}
                  </div>
                  {/* 아바타 */}
                  <div className="flex shrink-0">
                    {group.meetings.slice(0, 3).map((m, i) => (
                      <div
                        key={m.meetingId}
                        style={{ zIndex: 3 - i }}
                        className={i === 0 ? '' : '-ml-2'}
                      >
                        <Avatar
                          name={m.contactName}
                          photoUrl={m.contactPhotoUrl}
                          relationship={m.contactRelationship}
                          size={34}
                        />
                      </div>
                    ))}
                    {group.meetings.length > 3 && (
                      <div className="-ml-2 flex h-8.5 w-8.5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-500">
                        +{group.meetings.length - 3}
                      </div>
                    )}
                  </div>
                  {/* 이름 + 장소 */}
                  <div className="min-w-0 flex-1">
                    <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-semibold text-[#111]">
                      {names}
                    </div>
                    {mainPlace && (
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-gray-500">
                        📍 {mainPlace}
                        {extraCount > 0 ? ` 외 ${extraCount}곳` : ''}
                      </div>
                    )}
                  </div>
                  {/* 날짜 */}
                  <span className="shrink-0 text-[11px] text-gray-400">{group.date}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 생일 임박 */}
      {upcomingBirthdays.length > 0 && (
        <section className="mb-8">
          <SectionHeader title="생일 임박" count={upcomingBirthdays.length} />
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {upcomingBirthdays.map((item) => (
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
      <section className="mb-8">
        <SectionHeader title="오래 못 본 지인" count={notSeenRecently.length} />
        {notSeenRecently.length === 0 ? (
          <EmptyMsg text="최근 30일 이내에 모든 지인을 만났어요" />
        ) : (
          <div className="overflow-hidden rounded-[10px] border border-gray-200 bg-white">
            {notSeenRecently.map((item, i) => (
              <div key={item.id} className={i === 0 ? '' : 'border-t border-gray-100'}>
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
          <div className="overflow-hidden rounded-[10px] border border-gray-200 bg-white">
            {groupRecentMeetings(recentMeetings)
              .slice(0, 5)
              .map((group, i) => (
                <div key={group.groupKey} className={i === 0 ? '' : 'border-t border-gray-100'}>
                  {editingGroupKey === group.groupKey ? (
                    /* 인라인 수정 폼 */
                    <form
                      onSubmit={(e) => handleUpdateMeeting(e, group)}
                      className="flex flex-col gap-2 px-4 py-3"
                    >
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={editForm.date}
                          onChange={(e) => setEditForm((p) => ({ ...p, date: e.target.value }))}
                          className={`${inputClass} flex-[0_0_140px] text-xs`}
                        />
                        <PlaceSearch
                          value=""
                          onSelect={({ name, lat, lng }) =>
                            setEditForm((p) => ({
                              ...p,
                              places: [...p.places, { name, lat, lng }],
                            }))
                          }
                          style={{ flex: 1, fontSize: 12 }}
                        />
                      </div>
                      <PlaceTagList
                        places={editForm.places}
                        onChange={(places) => setEditForm((p) => ({ ...p, places }))}
                      />
                      {editForm.places.length === 0 && (
                        <p className="m-0 text-[11px] text-red-500">장소를 1개 이상 추가해주세요</p>
                      )}

                      {/* 그룹 만남이면 수정 방식 선택 가능 */}
                      {group.meetings.length > 1 && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold tracking-wider text-gray-400">
                            수정 방식
                          </span>
                          <select
                            value={editMode}
                            onChange={(e) => setEditMode(e.target.value as 'bulk' | 'individual')}
                            className="cursor-pointer rounded-[5px] border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
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
                          onChange={(e) => setEditForm((p) => ({ ...p, memo: e.target.value }))}
                          placeholder="메모"
                          className={`${inputClass} text-xs`}
                        />
                      ) : (
                        <div className="flex flex-col gap-1.25">
                          {group.meetings
                            .filter((m) => !editRemoveMeetingIds.includes(m.meetingId))
                            .map((m) => (
                              <div key={m.meetingId} className="flex items-center gap-2">
                                <span className="min-w-13 shrink-0 text-[11px] font-semibold text-gray-700">
                                  {m.contactName}
                                </span>
                                <input
                                  type="text"
                                  value={editMemos[m.meetingId] ?? ''}
                                  onChange={(e) =>
                                    setEditMemos((prev) => ({
                                      ...prev,
                                      [m.meetingId]: e.target.value,
                                    }))
                                  }
                                  placeholder={`${m.contactName} 메모`}
                                  className={`${inputClass} flex-1 text-xs`}
                                />
                              </div>
                            ))}
                        </div>
                      )}

                      {/* 현재 멤버 표시 + 지인 추가 (groupId 있는 신규 그룹만) */}
                      <div>
                        <p className="m-0 mb-1.25 text-[11px] font-bold tracking-wider text-gray-400">
                          만남 멤버
                        </p>
                        <div className="flex flex-wrap gap-1.25">
                          {/* 현재 그룹 멤버: X로 제거 가능 (마지막 1명은 제거 불가) */}
                          {group.meetings.map((m) => {
                            const removing = editRemoveMeetingIds.includes(m.meetingId)
                            const keepCount = group.meetings.length - editRemoveMeetingIds.length
                            const canRemove = keepCount > 1 || removing // 마지막 1명은 제거 불가
                            return (
                              <span
                                key={m.meetingId}
                                className={`inline-flex items-center gap-1 rounded py-0.75 pl-2 pr-1.5 text-[11px] border ${
                                  removing
                                    ? 'border-red-300 bg-red-100 text-red-500 line-through'
                                    : 'border-gray-200 bg-gray-100 text-gray-700'
                                }`}
                              >
                                {m.contactName}
                                {canRemove && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditRemoveMeetingIds((prev) =>
                                        removing
                                          ? prev.filter((id) => id !== m.meetingId)
                                          : [...prev, m.meetingId],
                                      )
                                    }
                                    className={`cursor-pointer border-none bg-transparent p-0 text-xs leading-none ${
                                      removing ? 'text-red-500' : 'text-gray-400'
                                    }`}
                                  >
                                    {removing ? '↩' : '×'}
                                  </button>
                                )}
                              </span>
                            )
                          })}
                          {/* 새로 추가할 지인: 그룹에 없는 지인만 선택 가능 */}
                          {allContacts
                            .filter((c) => !group.meetings.some((m) => m.contactId === c.id))
                            .map((c) => {
                              const selected = editAddContactIds.includes(c.id)
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() =>
                                    setEditAddContactIds((prev) =>
                                      selected ? prev.filter((id) => id !== c.id) : [...prev, c.id],
                                    )
                                  }
                                  className={`cursor-pointer rounded px-2 py-0.75 text-[11px] transition-all duration-100 border ${
                                    selected
                                      ? 'border-[#111] bg-[#111] font-semibold text-white'
                                      : 'border-dashed border-gray-300 bg-transparent font-normal text-gray-400'
                                  }`}
                                >
                                  + {c.name}
                                </button>
                              )
                            })}
                        </div>
                      </div>

                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGroupKey(null)
                            setEditAddContactIds([])
                            setEditRemoveMeetingIds([])
                            setEditMode('bulk')
                            setEditMemos({})
                          }}
                          className="cursor-pointer border-none bg-transparent text-xs text-gray-400"
                        >
                          취소
                        </button>
                        <button
                          type="submit"
                          disabled={editForm.places.length === 0}
                          className={`rounded-md border-none px-3 py-1.25 text-xs font-semibold ${
                            editForm.places.length === 0
                              ? 'cursor-default bg-gray-200 text-gray-400'
                              : 'cursor-pointer bg-[#111] text-white'
                          }`}
                        >
                          저장
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* 일반 표시 + 수정/삭제 버튼 */
                    <div className="flex items-center">
                      <div className="min-w-0 flex-1">
                        <GroupedMeetingRow
                          group={group}
                          onClick={() =>
                            navigate(
                              `/contacts/${group.meetings[0].contactId}?tab=meeting&date=${group.date}`,
                            )
                          }
                        />
                      </div>
                      <div className="flex shrink-0 gap-1 pr-3">
                        <button
                          onClick={() => startEditMeeting(group)}
                          className="cursor-pointer rounded border border-gray-200 bg-transparent px-2 py-0.75 text-[11px] text-gray-500"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDeleteMeeting(group)}
                          className="cursor-pointer border-none bg-transparent px-1 py-0.75 text-sm text-gray-300"
                        >
                          ✕
                        </button>
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
