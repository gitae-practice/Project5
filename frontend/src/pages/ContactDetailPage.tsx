import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  getContact,
  getContacts,
  getGifts,
  getMeetings,
  addPreference,
  deletePreference,
  addGift,
  deleteGift,
  addMeeting,
  addMeetingBulk,
  updateMeeting,
  deleteMeeting,
} from '../api/contacts'
import type {
  Contact,
  ContactSummary,
  Gift,
  Meeting,
  MeetingPlaceInput,
  PreferenceType,
} from '../types'
import PlaceSearch from '../components/PlaceSearch'
import PlaceTagList from '../components/PlaceTagList'
import ConfirmModal from '../components/ConfirmModal'
import MeetingMap from '../components/MeetingMap'
import MeetingCalendar from '../components/MeetingCalendar'
import MeetingHeatmap from '../components/MeetingHeatmap'

type Tab = 'preference' | 'gift' | 'meeting'

const PREF_LABELS: Record<PreferenceType, string> = {
  FOOD_LIKE: '좋아하는 음식',
  FOOD_DISLIKE: '못 먹는 음식',
  ALLERGY: '알레르기',
  INTEREST: '관심사',
  BRAND: '선호 브랜드',
  DISLIKE: '싫어하는 것',
  ETC: '기타',
}

const PREF_COLORS: Record<PreferenceType, { bg: string; color: string; border: string }> = {
  FOOD_LIKE: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  FOOD_DISLIKE: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  ALLERGY: { bg: '#fefce8', color: '#ca8a04', border: '#fde68a' },
  INTEREST: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  BRAND: { bg: '#faf5ff', color: '#7c3aed', border: '#ddd6fe' },
  DISLIKE: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  ETC: { bg: '#f9fafb', color: '#4b5563', border: '#e5e7eb' },
}

const REL_GRADIENT: Record<string, string> = {
  친구: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
  가족: 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)',
  직장: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)',
  연인: 'linear-gradient(135deg, #831843 0%, #db2777 100%)',
  지인: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
  기타: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
}

const PREF_ICONS: Record<PreferenceType, string> = {
  FOOD_LIKE: '🍽️',
  FOOD_DISLIKE: '🚫',
  ALLERGY: '⚠️',
  INTEREST: '🎯',
  BRAND: '🏷️',
  DISLIKE: '👎',
  ETC: '💬',
}

const inputClass =
  'box-border rounded-md border border-gray-200 bg-white px-2.5 py-2 text-[13px] text-[#111] outline-none'

export default function ContactDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const contactId = Number(id)

  const [contact, setContact] = useState<Contact | null>(null)
  const [gifts, setGifts] = useState<Gift[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  // 함께 만난 지인 다중 선택용 (현재 지인 제외한 전체 목록)
  const [allContacts, setAllContacts] = useState<ContactSummary[]>([])
  // URL ?tab=meeting&date=2026-05-30 으로 초기 탭/날짜 지정 가능 (홈 대시보드 연결용)
  const initialTab = searchParams.get('tab') as Tab | null
  const [tab, setTab] = useState<Tab>(
    initialTab === 'meeting' || initialTab === 'gift' ? initialTab : 'preference',
  )

  // isMe 연락처로 전환 시 선물/만남 탭에 머물러 있으면 취향 탭으로 리셋
  useEffect(() => {
    if (contact?.isMe && tab !== 'preference') setTab('preference')
  }, [contact?.isMe])
  const [prefType, setPrefType] = useState<PreferenceType>('FOOD_LIKE')
  const [prefValue, setPrefValue] = useState('')
  const [giftForm, setGiftForm] = useState({
    item: '',
    price: '',
    date: '',
    occasion: '',
    isWishlist: false,
  })
  const [showGiftForm, setShowGiftForm] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const [meetForm, setMeetForm] = useState({
    date: today,
    places: [] as MeetingPlaceInput[],
    memo: '',
  })
  // 함께한 지인 ID 목록 (현재 페이지 지인은 자동 포함, 여기에는 추가 지인만)
  const [extraContactIds, setExtraContactIds] = useState<number[]>([])
  const [showMeetForm, setShowMeetForm] = useState(false)
  const [meetSubmitAttempted, setMeetSubmitAttempted] = useState(false)
  const [editingMeetingId, setEditingMeetingId] = useState<number | null>(null)
  const [editMeetForm, setEditMeetForm] = useState({
    date: '',
    places: [] as MeetingPlaceInput[],
    memo: '',
  })
  const [confirm, setConfirm] = useState<{
    message: string
    onConfirm: () => void
  } | null>(null)
  const [selectedMeetingDate, setSelectedMeetingDate] = useState<string | null>(
    searchParams.get('date') ?? today,
  )
  const [heatmapFilter, setHeatmapFilter] = useState<{
    start: string
    end: string
    label: string
  } | null>(null)

  useEffect(() => {
    getContact(contactId).then(setContact)
    getGifts(contactId).then(setGifts)
    getMeetings(contactId).then(setMeetings)
    // 함께한 지인 다중 선택을 위해 전체 지인 목록 로드
    getContacts().then((all) => setAllContacts(all.filter((c) => c.id !== contactId && !c.isMe)))
  }, [contactId])

  const handleAddPref = async () => {
    if (!prefValue.trim()) return
    const pref = await addPreference(contactId, prefType, prefValue.trim())
    setContact((prev) => (prev ? { ...prev, preferences: [...prev.preferences, pref] } : prev))
    setPrefValue('')
  }

  const handleAddGift = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!giftForm.item.trim()) return
    const gift = await addGift(contactId, {
      item: giftForm.item,
      price: giftForm.price ? Number(giftForm.price) : undefined,
      date: giftForm.date || undefined,
      occasion: giftForm.occasion || undefined,
      isWishlist: giftForm.isWishlist,
    })
    setGifts((prev) => [gift, ...prev])
    setGiftForm({
      item: '',
      price: '',
      date: '',
      occasion: '',
      isWishlist: false,
    })
    setShowGiftForm(false)
  }

  const handleAddMeeting = async (e: React.FormEvent) => {
    e.preventDefault()
    setMeetSubmitAttempted(true)
    if (!meetForm.date || meetForm.places.length === 0) return
    const allIds = [contactId, ...extraContactIds]
    if (extraContactIds.length > 0) {
      // 여러 명 동시 등록: bulk API 사용
      const results = await addMeetingBulk({
        contactIds: allIds,
        date: meetForm.date,
        places: meetForm.places,
        memo: meetForm.memo || undefined,
      })
      // 현재 페이지 지인의 만남만 목록에 반영
      const mine = results.find((m) => m.contactId === contactId)
      if (mine) setMeetings((prev) => [mine, ...prev])
    } else {
      const meeting = await addMeeting(contactId, {
        date: meetForm.date,
        places: meetForm.places,
        memo: meetForm.memo || undefined,
      })
      setMeetings((prev) => [meeting, ...prev])
    }
    setMeetForm({
      date: new Date().toISOString().split('T')[0],
      places: [],
      memo: '',
    })
    setExtraContactIds([])
    setMeetSubmitAttempted(false)
    setShowMeetForm(false)
  }

  const startEditMeeting = (m: Meeting) => {
    setEditingMeetingId(m.id)
    setEditMeetForm({
      date: m.date,
      places: m.places.map((p) => ({ name: p.name, lat: p.lat, lng: p.lng })),
      memo: m.memo ?? '',
    })
  }

  const handleUpdateMeeting = (e: React.FormEvent, meetingId: number) => {
    e.preventDefault()
    setConfirm({
      message: '만남 기록을 수정할까요?',
      onConfirm: async () => {
        setConfirm(null)
        const updated = await updateMeeting(meetingId, {
          date: editMeetForm.date,
          places: editMeetForm.places,
          memo: editMeetForm.memo || undefined,
        })
        setMeetings((prev) => prev.map((m) => (m.id === meetingId ? updated : m)))
        setEditingMeetingId(null)
      },
    })
  }

  const handleDeleteMeeting = (meetingId: number) => {
    setConfirm({
      message: '만남 기록을 삭제할까요?\n삭제하면 되돌릴 수 없어요.',
      onConfirm: async () => {
        setConfirm(null)
        await deleteMeeting(meetingId)
        setMeetings((prev) => prev.filter((m) => m.id !== meetingId))
      },
    })
  }

  if (!contact) return <div className="p-20 text-center text-gray-400">불러오는 중...</div>

  const lastMeeting = meetings[0]
  const daysSince = lastMeeting
    ? Math.floor((Date.now() - new Date(lastMeeting.date).getTime()) / (1000 * 60 * 60 * 24))
    : null
  return (
    <div className="flex h-full flex-col bg-[#f5f5f5]">
      {confirm && (
        <ConfirmModal
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
      {/* 프로필 헤더 */}
      <div
        style={{
          background: contact.isMe
            ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
            : (REL_GRADIENT[contact.relationship] ?? REL_GRADIENT['기타']),
        }}
        className="relative overflow-hidden px-9 pb-7 pt-9"
      >
        {/* 배경 장식 원 */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-45 w-45 rounded-full bg-white/[0.06]" />
        <div className="pointer-events-none absolute -bottom-5 right-20 h-25 w-25 rounded-full bg-white/[0.04]" />

        <div className="relative max-w-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-white/40 bg-white/15 text-[30px] font-bold text-white shadow-[0_4px_24px_rgba(0,0,0,0.25)]">
                {contact.photoUrl ? (
                  <img
                    src={contact.photoUrl}
                    alt={contact.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  contact.name[0]
                )}
              </div>
              <div>
                <div className="mb-2 flex items-center gap-2.5">
                  <h2 className="m-0 text-[26px] font-extrabold tracking-[-0.5px] text-white">
                    {contact.name}
                  </h2>
                  <span className="rounded-[20px] border border-white/30 bg-white/20 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-[8px]">
                    {contact.isMe ? '내 정보' : contact.relationship}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-white/75">
                  {contact.birthday && <span>🎂 {contact.birthday}</span>}
                  {daysSince !== null && (
                    <span>📅 마지막 만남 {daysSince === 0 ? '오늘' : `${daysSince}일 전`}</span>
                  )}
                  {contact.memo && <span>· {contact.memo}</span>}
                </div>
              </div>
            </div>
            <button
              onClick={() =>
                navigate(`/contacts/${contactId}/edit${contact.isMe ? '?me=true' : ''}`)
              }
              className="cursor-pointer rounded-lg border border-white/30 bg-white/15 px-4.5 py-2 text-[13px] font-semibold text-white backdrop-blur-[8px] transition-colors duration-150 hover:bg-white/25"
            >
              수정
            </button>
          </div>
          {/* 통계 바 */}
          {!contact.isMe && (
            <div className="mt-6 flex w-fit gap-0 rounded-[10px] border border-white/15 bg-white/12 px-5 py-3.5 backdrop-blur-[8px]">
              {[
                { label: '만남', value: meetings.length, unit: '회' },
                { label: '선물', value: gifts.length, unit: '건' },
                {
                  label: '취향',
                  value: contact.preferences.length,
                  unit: '개',
                },
              ].map((s, i) => (
                <div
                  key={s.label}
                  className={`flex flex-col items-center px-5 ${
                    i < 2 ? 'border-r border-white/20' : ''
                  }`}
                >
                  <div className="text-[22px] font-extrabold leading-none text-white">
                    {s.value}
                    <span className="ml-0.5 text-[11px] font-medium opacity-70">{s.unit}</span>
                  </div>
                  <div className="mt-0.75 text-[11px] text-white/60">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 탭 */}
      <div className="border-b border-gray-200 bg-white px-8">
        <div className="flex max-w-200 gap-0">
          {/* isMe 연락처는 선물/만남 탭 미표시 */}
          {((contact.isMe ? ['preference'] : ['preference', 'gift', 'meeting']) as Tab[]).map(
            (t) => {
              const count =
                t === 'preference'
                  ? contact.preferences.length
                  : t === 'gift'
                    ? gifts.length
                    : meetings.length
              const label = t === 'preference' ? '취향' : t === 'gift' ? '선물' : '만남'
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`cursor-pointer border-none border-b-2 bg-transparent px-5 py-3.5 text-sm transition-all duration-100 ${
                    tab === t
                      ? 'border-b-[#111] font-semibold text-[#111]'
                      : 'border-b-transparent font-normal text-gray-400'
                  }`}
                >
                  {label} <span className="text-xs">{count}</span>
                </button>
              )
            },
          )}
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className={tab === 'meeting' ? 'max-w-none' : 'max-w-200'}>
          {/* 취향 탭 */}
          {tab === 'preference' && (
            <div>
              <div className="mb-6 flex gap-2">
                <select
                  value={prefType}
                  onChange={(e) => setPrefType(e.target.value as PreferenceType)}
                  className={`${inputClass} px-3 py-2`}
                >
                  {(Object.keys(PREF_LABELS) as PreferenceType[]).map((k) => (
                    <option key={k} value={k}>
                      {PREF_LABELS[k]}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={prefValue}
                  onChange={(e) => setPrefValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPref()}
                  placeholder="입력 후 Enter"
                  className={`${inputClass} flex-1`}
                />
                <button
                  onClick={handleAddPref}
                  className="cursor-pointer rounded-md border-none bg-[#111] px-4 py-2 text-[13px] font-semibold text-white"
                >
                  추가
                </button>
              </div>

              {contact.preferences.length === 0 ? (
                <div className="py-15 text-center text-sm text-gray-400">
                  아직 취향 정보가 없어요
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(PREF_LABELS) as PreferenceType[]).map((type) => {
                    const items = contact.preferences.filter((p) => p.type === type)
                    if (items.length === 0) return null
                    const cs = PREF_COLORS[type]
                    return (
                      <div
                        key={type}
                        style={{ background: cs.bg, borderColor: cs.border }}
                        className="rounded-[10px] border px-4 py-3.5"
                      >
                        <div className="mb-2.5 flex items-center gap-1.5">
                          <span className="text-[15px]">{PREF_ICONS[type]}</span>
                          <span
                            style={{ color: cs.color }}
                            className="text-[11px] font-bold tracking-[0.03em]"
                          >
                            {PREF_LABELS[type]}
                          </span>
                          <span
                            style={{ color: cs.color }}
                            className="ml-auto text-[10px] opacity-60"
                          >
                            {items.length}개
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {items.map((p) => (
                            <span
                              key={p.id}
                              style={{ color: cs.color, borderColor: cs.border }}
                              className="inline-flex items-center gap-1.25 rounded-[20px] border bg-white px-2.5 py-1 text-xs font-medium"
                            >
                              {p.value}
                              <button
                                onClick={() => {
                                  deletePreference(p.id)
                                  setContact((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          preferences: prev.preferences.filter(
                                            (x) => x.id !== p.id,
                                          ),
                                        }
                                      : prev,
                                  )
                                }}
                                className="cursor-pointer border-none bg-transparent p-0 text-[11px] leading-none text-inherit opacity-40"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* 선물 탭 */}
          {tab === 'gift' && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[13px] text-gray-500">선물 {gifts.length}건</span>
                <button
                  onClick={() => setShowGiftForm((v) => !v)}
                  className="cursor-pointer rounded-md border-none bg-[#111] px-3.5 py-1.75 text-[13px] font-semibold text-white"
                >
                  + 선물 추가
                </button>
              </div>

              {showGiftForm && (
                <form
                  onSubmit={handleAddGift}
                  className="mb-4 flex flex-col gap-2.5 rounded-lg border border-gray-200 bg-white p-4"
                >
                  <input
                    type="text"
                    value={giftForm.item}
                    onChange={(e) => setGiftForm((p) => ({ ...p, item: e.target.value }))}
                    placeholder="선물 이름 *"
                    className={`${inputClass} w-full`}
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={giftForm.price}
                      onChange={(e) => setGiftForm((p) => ({ ...p, price: e.target.value }))}
                      placeholder="금액 (원)"
                      className={`${inputClass} flex-1`}
                    />
                    <input
                      type="date"
                      value={giftForm.date}
                      onChange={(e) => setGiftForm((p) => ({ ...p, date: e.target.value }))}
                      className={`${inputClass} flex-1`}
                    />
                    <input
                      type="text"
                      value={giftForm.occasion}
                      onChange={(e) => setGiftForm((p) => ({ ...p, occasion: e.target.value }))}
                      placeholder="기념일"
                      className={`${inputClass} flex-1`}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex cursor-pointer items-center gap-1.5 text-[13px] text-gray-700">
                      <input
                        type="checkbox"
                        checked={giftForm.isWishlist}
                        onChange={(e) =>
                          setGiftForm((p) => ({
                            ...p,
                            isWishlist: e.target.checked,
                          }))
                        }
                      />
                      위시리스트
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowGiftForm(false)}
                        className="cursor-pointer border-none bg-transparent text-[13px] text-gray-400"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        className="cursor-pointer rounded-md border-none bg-[#111] px-3.5 py-1.5 text-[13px] font-semibold text-white"
                      >
                        저장
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {gifts.length === 0 ? (
                <div className="py-15 text-center text-sm text-gray-400">선물 기록이 없어요</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {gifts.map((g) => (
                    <div
                      key={g.id}
                      className={`flex items-start justify-between rounded-[10px] border px-4 py-3.5 ${
                        g.isWishlist
                          ? 'border-fuchsia-200 bg-linear-to-br from-fuchsia-50 to-pink-100'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 gap-3">
                        <div
                          className={`flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-[10px] text-lg ${
                            g.isWishlist ? 'bg-pink-100' : 'bg-gray-50'
                          }`}
                        >
                          {g.isWishlist ? '🎀' : '🎁'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-bold text-[#111]">{g.item}</span>
                            {g.isWishlist && (
                              <span className="rounded-[20px] bg-pink-700 px-1.75 py-0.5 text-[10px] font-bold text-white">
                                위시리스트
                              </span>
                            )}
                            {g.occasion && (
                              <span className="rounded-[20px] bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                                {g.occasion}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2.5 text-xs text-gray-400">
                            {g.date && <span>📅 {g.date}</span>}
                            {g.price && (
                              <span className="font-semibold text-emerald-600">
                                ₩ {g.price.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          deleteGift(g.id).then(() =>
                            setGifts((prev) => prev.filter((x) => x.id !== g.id)),
                          )
                        }
                        className="shrink-0 cursor-pointer border-none bg-transparent pl-2 text-sm text-gray-300"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 만남 탭 */}
          {tab === 'meeting' && (
            <div>
              {/* 헤더: 만남 수 + 추가 버튼 */}
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[13px] text-gray-500">만남 {meetings.length}회</span>
                <button
                  onClick={() => setShowMeetForm((v) => !v)}
                  className={`cursor-pointer rounded-md px-3.5 py-1.75 text-[13px] font-semibold ${
                    showMeetForm
                      ? 'border border-gray-200 bg-gray-100 text-gray-700'
                      : 'border-none bg-[#111] text-white'
                  }`}
                >
                  {showMeetForm ? '취소' : '+ 만남 추가'}
                </button>
              </div>

              {/* 만남 추가 폼 (버튼 클릭 시에만 표시) */}
              {showMeetForm && (
                <form
                  onSubmit={handleAddMeeting}
                  className="mb-4 flex flex-col gap-2.5 rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={meetForm.date}
                      onChange={(e) => setMeetForm((p) => ({ ...p, date: e.target.value }))}
                      className={`${inputClass} flex-1`}
                    />
                    <PlaceSearch
                      value=""
                      onSelect={({ name, lat, lng }) =>
                        setMeetForm((p) => ({
                          ...p,
                          places: [...p.places, { name, lat, lng }],
                        }))
                      }
                      style={{ flex: 1 }}
                    />
                  </div>
                  {/* 추가된 장소 태그 목록 (드래그앤드롭 순서 변경 가능) */}
                  <PlaceTagList
                    places={meetForm.places}
                    onChange={(places) => setMeetForm((p) => ({ ...p, places }))}
                  />
                  <input
                    type="text"
                    value={meetForm.memo}
                    onChange={(e) => setMeetForm((p) => ({ ...p, memo: e.target.value }))}
                    placeholder="메모"
                    className={`${inputClass} w-full`}
                  />

                  {/* 함께한 지인 다중 선택 (현재 지인은 자동 포함) */}
                  {allContacts.length > 0 && (
                    <div>
                      <p className="m-0 mb-1.5 text-[11px] font-bold tracking-wider text-gray-400">
                        함께한 지인 (선택)
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {allContacts.map((c) => {
                          const selected = extraContactIds.includes(c.id)
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() =>
                                setExtraContactIds((prev) =>
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
                  )}

                  <div className="flex items-center justify-end gap-2">
                    {meetSubmitAttempted && meetForm.places.length === 0 && (
                      <span className="text-[11px] text-red-500">장소를 1개 이상 추가해주세요</span>
                    )}
                    <button
                      type="submit"
                      className={`cursor-pointer rounded-md border-none px-3.5 py-1.5 text-[13px] font-semibold ${
                        meetForm.places.length === 0
                          ? 'bg-gray-200 text-gray-400'
                          : 'bg-[#111] text-white'
                      }`}
                    >
                      저장
                    </button>
                  </div>
                </form>
              )}

              {/* 히트맵 */}
              <MeetingHeatmap
                meetings={meetings}
                selectedRange={heatmapFilter ?? undefined}
                onPointClick={(start, end, label) => {
                  setHeatmapFilter({ start, end, label })
                  setSelectedMeetingDate(null)
                }}
              />

              {/* 2열 레이아웃: 달력(왼쪽) + 지도(오른쪽) */}
              <div className="flex items-stretch gap-5">
                {/* 왼쪽: 달력 + 만남 목록 */}
                <div className="flex flex-[0_0_390px] flex-col">
                  <MeetingCalendar
                    meetings={meetings}
                    selectedDate={selectedMeetingDate}
                    onDateSelect={(date) => {
                      setSelectedMeetingDate(date)
                      setHeatmapFilter(null)
                    }}
                  />

                  {meetings.length === 0 ? (
                    <div className="py-7.5 text-center text-sm text-gray-400">
                      아직 만남 기록이 없어요
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {/* 날짜/기간 필터 표시 */}
                      {(selectedMeetingDate || heatmapFilter) && (
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-semibold text-blue-500">
                            {heatmapFilter ? heatmapFilter.label : selectedMeetingDate} 만남
                          </span>
                          <button
                            onClick={() => {
                              setSelectedMeetingDate(null)
                              setHeatmapFilter(null)
                            }}
                            className="cursor-pointer border-none bg-transparent text-[11px] text-gray-400"
                          >
                            전체보기
                          </button>
                        </div>
                      )}
                      {(() => {
                        const filtered = heatmapFilter
                          ? meetings.filter(
                              (m) => m.date >= heatmapFilter.start && m.date <= heatmapFilter.end,
                            )
                          : selectedMeetingDate
                            ? meetings.filter((m) => m.date === selectedMeetingDate)
                            : meetings
                        return filtered.length === 0 ? (
                          <div className="py-5 text-center text-[13px] text-gray-400">
                            {heatmapFilter || selectedMeetingDate
                              ? '이 기간 만남 기록이 없어요'
                              : '아직 만남 기록이 없어요'}
                          </div>
                        ) : null
                      })()}
                      {(() => {
                        const filtered = heatmapFilter
                          ? meetings.filter(
                              (m) => m.date >= heatmapFilter.start && m.date <= heatmapFilter.end,
                            )
                          : selectedMeetingDate
                            ? meetings.filter((m) => m.date === selectedMeetingDate)
                            : meetings
                        return filtered
                      })().map((m) => (
                        <div
                          key={m.id}
                          className="overflow-hidden rounded-lg border border-gray-200 bg-white"
                        >
                          {editingMeetingId === m.id ? (
                            /* 인라인 수정 폼 */
                            <form
                              onSubmit={(e) => handleUpdateMeeting(e, m.id)}
                              className="flex flex-col gap-2 px-4 py-3"
                            >
                              <div className="flex gap-2">
                                <input
                                  type="date"
                                  value={editMeetForm.date}
                                  onChange={(e) =>
                                    setEditMeetForm((p) => ({
                                      ...p,
                                      date: e.target.value,
                                    }))
                                  }
                                  className={`${inputClass} flex-1 text-xs`}
                                />
                                <PlaceSearch
                                  value=""
                                  onSelect={({ name, lat, lng }) =>
                                    setEditMeetForm((p) => ({
                                      ...p,
                                      places: [...p.places, { name, lat, lng }],
                                    }))
                                  }
                                  style={{ flex: 1, fontSize: 12 }}
                                />
                              </div>
                              {/* 수정 폼 장소 태그 목록 (드래그앤드롭 순서 변경 가능) */}
                              <PlaceTagList
                                places={editMeetForm.places}
                                onChange={(places) => setEditMeetForm((p) => ({ ...p, places }))}
                              />
                              <input
                                type="text"
                                value={editMeetForm.memo}
                                onChange={(e) =>
                                  setEditMeetForm((p) => ({
                                    ...p,
                                    memo: e.target.value,
                                  }))
                                }
                                placeholder="메모"
                                className={`${inputClass} text-xs`}
                              />
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingMeetingId(null)}
                                  className="cursor-pointer border-none bg-transparent text-xs text-gray-400"
                                >
                                  취소
                                </button>
                                <button
                                  type="submit"
                                  className="cursor-pointer rounded-md border-none bg-[#111] px-3 py-1.25 text-xs font-semibold text-white"
                                >
                                  저장
                                </button>
                              </div>
                            </form>
                          ) : (
                            /* 일반 표시 */
                            <div className="flex items-center justify-between px-4 py-3">
                              <div className="min-w-0 flex-1">
                                <p className="m-0 mb-0.5 text-sm font-semibold text-[#111]">
                                  {m.date}
                                </p>
                                {m.places.map((p, i) => (
                                  <p key={i} className="m-0 mb-0.5 text-xs text-gray-500">
                                    📍 {p.name}
                                  </p>
                                ))}
                                {m.memo && <p className="m-0 text-xs text-gray-400">{m.memo}</p>}
                              </div>
                              <div className="ml-2 flex shrink-0 gap-1">
                                <button
                                  onClick={() => startEditMeeting(m)}
                                  className="cursor-pointer rounded border border-gray-200 bg-transparent px-2 py-0.75 text-xs text-gray-500"
                                >
                                  수정
                                </button>
                                <button
                                  onClick={() => handleDeleteMeeting(m.id)}
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
                </div>

                {/* 오른쪽: 지도 — 명시적 height로 Kakao 지도 렌더링 보장 */}
                <div className="h-130 min-w-0 flex-1">
                  <MeetingMap meetings={meetings} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
