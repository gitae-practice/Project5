import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  getContact, getContacts, getGifts, getMeetings,
  addPreference, deletePreference,
  addGift, deleteGift,
  addMeeting, addMeetingBulk, updateMeeting, deleteMeeting,
} from '../api/contacts'
import type { Contact, ContactSummary, Gift, Meeting, MeetingPlaceInput, PreferenceType } from '../types'
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
  FOOD_LIKE:   { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  FOOD_DISLIKE:{ bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  ALLERGY:     { bg: '#fefce8', color: '#ca8a04', border: '#fde68a' },
  INTEREST:    { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  BRAND:       { bg: '#faf5ff', color: '#7c3aed', border: '#ddd6fe' },
  DISLIKE:     { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  ETC:         { bg: '#f9fafb', color: '#4b5563', border: '#e5e7eb' },
}

const REL_COLORS: Record<string, { bg: string; color: string }> = {
  친구: { bg: '#eff6ff', color: '#1d4ed8' },
  가족: { bg: '#f0fdf4', color: '#15803d' },
  직장: { bg: '#fffbeb', color: '#b45309' },
  연인: { bg: '#fdf2f8', color: '#be185d' },
  지인: { bg: '#f9fafb', color: '#4b5563' },
  기타: { bg: '#f9fafb', color: '#4b5563' },
}

const inputStyle: React.CSSProperties = {
  border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 10px',
  fontSize: 13, outline: 'none', fontFamily: 'inherit', color: '#111',
  background: '#fff', boxSizing: 'border-box',
}

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
  const [tab, setTab] = useState<Tab>(initialTab === 'meeting' || initialTab === 'gift' ? initialTab : 'preference')

  // isMe 연락처로 전환 시 선물/만남 탭에 머물러 있으면 취향 탭으로 리셋
  useEffect(() => {
    if (contact?.isMe && tab !== 'preference') setTab('preference')
  }, [contact?.isMe])
  const [prefType, setPrefType] = useState<PreferenceType>('FOOD_LIKE')
  const [prefValue, setPrefValue] = useState('')
  const [giftForm, setGiftForm] = useState({ item: '', price: '', date: '', occasion: '', isWishlist: false })
  const [showGiftForm, setShowGiftForm] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const [meetForm, setMeetForm] = useState({ date: today, places: [] as MeetingPlaceInput[], memo: '' })
  // 함께한 지인 ID 목록 (현재 페이지 지인은 자동 포함, 여기에는 추가 지인만)
  const [extraContactIds, setExtraContactIds] = useState<number[]>([])
  const [showMeetForm, setShowMeetForm] = useState(false)
  const [meetSubmitAttempted, setMeetSubmitAttempted] = useState(false)
  const [editingMeetingId, setEditingMeetingId] = useState<number | null>(null)
  const [editMeetForm, setEditMeetForm] = useState({ date: '', places: [] as MeetingPlaceInput[], memo: '' })
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [selectedMeetingDate, setSelectedMeetingDate] = useState<string | null>(
    searchParams.get('date') ?? today
  )
  const [heatmapFilter, setHeatmapFilter] = useState<{ start: string; end: string; label: string } | null>(null)

  useEffect(() => {
    getContact(contactId).then(setContact)
    getGifts(contactId).then(setGifts)
    getMeetings(contactId).then(setMeetings)
    // 함께한 지인 다중 선택을 위해 전체 지인 목록 로드
    getContacts().then(all => setAllContacts(all.filter(c => c.id !== contactId && !c.isMe)))
  }, [contactId])

  const handleAddPref = async () => {
    if (!prefValue.trim()) return
    const pref = await addPreference(contactId, prefType, prefValue.trim())
    setContact(prev => prev ? { ...prev, preferences: [...prev.preferences, pref] } : prev)
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
    setGifts(prev => [gift, ...prev])
    setGiftForm({ item: '', price: '', date: '', occasion: '', isWishlist: false })
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
      const mine = results.find(m => m.contactId === contactId)
      if (mine) setMeetings(prev => [mine, ...prev])
    } else {
      const meeting = await addMeeting(contactId, {
        date: meetForm.date,
        places: meetForm.places,
        memo: meetForm.memo || undefined,
      })
      setMeetings(prev => [meeting, ...prev])
    }
    setMeetForm({ date: new Date().toISOString().split('T')[0], places: [], memo: '' })
    setExtraContactIds([])
    setMeetSubmitAttempted(false)
    setShowMeetForm(false)
  }

  const startEditMeeting = (m: Meeting) => {
    setEditingMeetingId(m.id)
    setEditMeetForm({
      date: m.date,
      places: m.places.map(p => ({ name: p.name, lat: p.lat, lng: p.lng })),
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
        setMeetings(prev => prev.map(m => m.id === meetingId ? updated : m))
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
        setMeetings(prev => prev.filter(m => m.id !== meetingId))
      },
    })
  }

  if (!contact) return <div style={{ textAlign: 'center', padding: 80, color: '#9ca3af' }}>불러오는 중...</div>

  const lastMeeting = meetings[0]
  const daysSince = lastMeeting
    ? Math.floor((Date.now() - new Date(lastMeeting.date).getTime()) / (1000 * 60 * 60 * 24))
    : null
  const relStyle = contact.isMe
    ? { bg: '#111', color: '#fff' }
    : (REL_COLORS[contact.relationship] ?? REL_COLORS['기타'])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
      {confirm && (
        <ConfirmModal
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
      {/* 프로필 헤더 */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '24px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 800 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: relStyle.bg, color: relStyle.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 700, flexShrink: 0,
              overflow: 'hidden',
            }}>
              {contact.photoUrl
                ? <img src={contact.photoUrl} alt={contact.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : contact.name[0]
              }
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111' }}>{contact.name}</h2>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                  background: relStyle.bg, color: relStyle.color,
                }}>
                  {contact.isMe ? '내 정보' : contact.relationship}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280' }}>
                {contact.birthday && <span>생일 {contact.birthday}</span>}
                {daysSince !== null && (
                  <span>마지막 만남 {daysSince === 0 ? '오늘' : `${daysSince}일 전`}</span>
                )}
                {contact.memo && <span>{contact.memo}</span>}
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate(`/contacts/${contactId}/edit${contact.isMe ? '?me=true' : ''}`)}
            style={{
              fontSize: 13, color: '#374151', background: '#fff',
              border: '1px solid #e5e7eb', borderRadius: 6,
              padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            수정
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 32px' }}>
        <div style={{ display: 'flex', gap: 0, maxWidth: 800 }}>
          {/* isMe 연락처는 선물/만남 탭 미표시 */}
          {((contact.isMe ? ['preference'] : ['preference', 'gift', 'meeting']) as Tab[]).map(t => {
            const count = t === 'preference' ? contact.preferences.length : t === 'gift' ? gifts.length : meetings.length
            const label = t === 'preference' ? '취향' : t === 'gift' ? '선물' : '만남'
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '14px 20px', fontSize: 14, fontWeight: tab === t ? 600 : 400,
                  color: tab === t ? '#111' : '#9ca3af',
                  background: 'none', border: 'none', borderBottom: tab === t ? '2px solid #111' : '2px solid transparent',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.1s',
                }}
              >
                {label} <span style={{ fontSize: 12 }}>{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 콘텐츠 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        <div style={{ maxWidth: tab === 'meeting' ? 'none' : 800 }}>

          {/* 취향 탭 */}
          {tab === 'preference' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                <select
                  value={prefType}
                  onChange={e => setPrefType(e.target.value as PreferenceType)}
                  style={{ ...inputStyle, padding: '8px 12px' }}
                >
                  {(Object.keys(PREF_LABELS) as PreferenceType[]).map(k => (
                    <option key={k} value={k}>{PREF_LABELS[k]}</option>
                  ))}
                </select>
                <input
                  type="text" value={prefValue}
                  onChange={e => setPrefValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddPref()}
                  placeholder="입력 후 Enter"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={handleAddPref}
                  style={{
                    padding: '8px 16px', fontSize: 13, fontWeight: 600,
                    background: '#111', color: '#fff', border: 'none',
                    borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  추가
                </button>
              </div>

              {contact.preferences.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af', fontSize: 14 }}>
                  아직 취향 정보가 없어요
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {(Object.keys(PREF_LABELS) as PreferenceType[]).map(type => {
                    const items = contact.preferences.filter(p => p.type === type)
                    if (items.length === 0) return null
                    const cs = PREF_COLORS[type]
                    return (
                      <div key={type}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                          {PREF_LABELS[type]}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {items.map(p => (
                            <span key={p.id} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                              fontSize: 13, padding: '5px 10px', borderRadius: 6,
                              background: cs.bg, color: cs.color, border: `1px solid ${cs.border}`,
                            }}>
                              {p.value}
                              <button
                                onClick={() => {
                                  deletePreference(p.id)
                                  setContact(prev => prev ? { ...prev, preferences: prev.preferences.filter(x => x.id !== p.id) } : prev)
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.5, padding: 0, fontSize: 12, lineHeight: 1 }}
                              >✕</button>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>선물 {gifts.length}건</span>
                <button
                  onClick={() => setShowGiftForm(v => !v)}
                  style={{
                    fontSize: 13, fontWeight: 600, padding: '7px 14px',
                    background: '#111', color: '#fff', border: 'none',
                    borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  + 선물 추가
                </button>
              </div>

              {showGiftForm && (
                <form onSubmit={handleAddGift} style={{
                  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
                  padding: '16px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  <input type="text" value={giftForm.item} onChange={e => setGiftForm(p => ({ ...p, item: e.target.value }))} placeholder="선물 이름 *" style={{ ...inputStyle, width: '100%' }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="number" value={giftForm.price} onChange={e => setGiftForm(p => ({ ...p, price: e.target.value }))} placeholder="금액 (원)" style={{ ...inputStyle, flex: 1 }} />
                    <input type="date" value={giftForm.date} onChange={e => setGiftForm(p => ({ ...p, date: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
                    <input type="text" value={giftForm.occasion} onChange={e => setGiftForm(p => ({ ...p, occasion: e.target.value }))} placeholder="기념일" style={{ ...inputStyle, flex: 1 }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                      <input type="checkbox" checked={giftForm.isWishlist} onChange={e => setGiftForm(p => ({ ...p, isWishlist: e.target.checked }))} />
                      위시리스트
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => setShowGiftForm(false)} style={{ fontSize: 13, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
                      <button type="submit" style={{ fontSize: 13, fontWeight: 600, padding: '6px 14px', background: '#111', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}>저장</button>
                    </div>
                  </div>
                </form>
              )}

              {gifts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af', fontSize: 14 }}>선물 기록이 없어요</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {gifts.map(g => (
                    <div key={g.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px',
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{g.item}</span>
                          {g.isWishlist && <span style={{ fontSize: 11, background: '#fdf2f8', color: '#be185d', border: '1px solid #fbcfe8', borderRadius: 4, padding: '1px 6px' }}>위시</span>}
                          {g.occasion && <span style={{ fontSize: 12, color: '#9ca3af' }}>{g.occasion}</span>}
                        </div>
                        <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
                          {[g.date, g.price ? `${g.price.toLocaleString()}원` : null].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <button onClick={() => deleteGift(g.id).then(() => setGifts(prev => prev.filter(x => x.id !== g.id)))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 14 }}>✕</button>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>만남 {meetings.length}회</span>
                <button
                  onClick={() => setShowMeetForm(v => !v)}
                  style={{
                    fontSize: 13, fontWeight: 600, padding: '7px 14px',
                    background: showMeetForm ? '#f3f4f6' : '#111',
                    color: showMeetForm ? '#374151' : '#fff',
                    border: showMeetForm ? '1px solid #e5e7eb' : 'none',
                    borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {showMeetForm ? '취소' : '+ 만남 추가'}
                </button>
              </div>

              {/* 만남 추가 폼 (버튼 클릭 시에만 표시) */}
              {showMeetForm && (
                <form onSubmit={handleAddMeeting} style={{
                  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
                  padding: '16px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="date" value={meetForm.date} onChange={e => setMeetForm(p => ({ ...p, date: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
                    <PlaceSearch
                      value=""
                      onSelect={({ name, lat, lng }) => setMeetForm(p => ({ ...p, places: [...p.places, { name, lat, lng }] }))}
                      style={{ flex: 1 }}
                    />
                  </div>
                  {/* 추가된 장소 태그 목록 (드래그앤드롭 순서 변경 가능) */}
                  <PlaceTagList
                    places={meetForm.places}
                    onChange={places => setMeetForm(p => ({ ...p, places }))}
                  />
                  <input type="text" value={meetForm.memo} onChange={e => setMeetForm(p => ({ ...p, memo: e.target.value }))} placeholder="메모" style={{ ...inputStyle, width: '100%' }} />

                  {/* 함께한 지인 다중 선택 (현재 지인은 자동 포함) */}
                  {allContacts.length > 0 && (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', margin: '0 0 6px', letterSpacing: '0.05em' }}>
                        함께한 지인 (선택)
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {allContacts.map(c => {
                          const selected = extraContactIds.includes(c.id)
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setExtraContactIds(prev =>
                                selected ? prev.filter(id => id !== c.id) : [...prev, c.id]
                              )}
                              style={{
                                fontSize: 12, padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
                                fontFamily: 'inherit', transition: 'all 0.1s',
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
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center' }}>
                    {meetSubmitAttempted && meetForm.places.length === 0 && (
                      <span style={{ fontSize: 11, color: '#ef4444' }}>장소를 1개 이상 추가해주세요</span>
                    )}
                    <button
                      type="submit"
                      style={{
                        fontSize: 13, fontWeight: 600, padding: '6px 14px',
                        background: meetForm.places.length === 0 ? '#e5e7eb' : '#111',
                        color: meetForm.places.length === 0 ? '#9ca3af' : '#fff',
                        border: 'none', borderRadius: 6, cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >저장</button>
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
              <div style={{ display: 'flex', gap: 20, alignItems: 'stretch' }}>
                {/* 왼쪽: 달력 + 만남 목록 */}
                <div style={{ flex: '0 0 390px', display: 'flex', flexDirection: 'column' }}>
                  <MeetingCalendar
                    meetings={meetings}
                    selectedDate={selectedMeetingDate}
                    onDateSelect={date => {
                      setSelectedMeetingDate(date)
                      setHeatmapFilter(null)
                    }}
                  />

                  {meetings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 0', color: '#9ca3af', fontSize: 14 }}>
                      아직 만남 기록이 없어요
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {/* 날짜/기간 필터 표시 */}
                      {(selectedMeetingDate || heatmapFilter) && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600 }}>
                            {heatmapFilter ? heatmapFilter.label : selectedMeetingDate} 만남
                          </span>
                          <button
                            onClick={() => { setSelectedMeetingDate(null); setHeatmapFilter(null) }}
                            style={{ fontSize: 11, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            전체보기
                          </button>
                        </div>
                      )}
                      {(() => {
                        const filtered = heatmapFilter
                          ? meetings.filter(m => m.date >= heatmapFilter.start && m.date <= heatmapFilter.end)
                          : selectedMeetingDate
                          ? meetings.filter(m => m.date === selectedMeetingDate)
                          : meetings
                        return filtered.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '20px 0', color: '#9ca3af', fontSize: 13 }}>
                            {heatmapFilter || selectedMeetingDate ? '이 기간 만남 기록이 없어요' : '아직 만남 기록이 없어요'}
                          </div>
                        ) : null
                      })()}
                      {(() => {
                        const filtered = heatmapFilter
                          ? meetings.filter(m => m.date >= heatmapFilter.start && m.date <= heatmapFilter.end)
                          : selectedMeetingDate
                          ? meetings.filter(m => m.date === selectedMeetingDate)
                          : meetings
                        return filtered
                      })().map(m => (
                        <div key={m.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                          {editingMeetingId === m.id ? (
                            /* 인라인 수정 폼 */
                            <form onSubmit={e => handleUpdateMeeting(e, m.id)} style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <input type="date" value={editMeetForm.date} onChange={e => setEditMeetForm(p => ({ ...p, date: e.target.value }))} style={{ ...inputStyle, flex: 1, fontSize: 12 }} />
                                <PlaceSearch
                                  value=""
                                  onSelect={({ name, lat, lng }) => setEditMeetForm(p => ({ ...p, places: [...p.places, { name, lat, lng }] }))}
                                  style={{ flex: 1, fontSize: 12 }}
                                />
                              </div>
                              {/* 수정 폼 장소 태그 목록 (드래그앤드롭 순서 변경 가능) */}
                              <PlaceTagList
                                places={editMeetForm.places}
                                onChange={places => setEditMeetForm(p => ({ ...p, places }))}
                              />
                              <input type="text" value={editMeetForm.memo} onChange={e => setEditMeetForm(p => ({ ...p, memo: e.target.value }))} placeholder="메모" style={{ ...inputStyle, fontSize: 12 }} />
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                                <button type="button" onClick={() => setEditingMeetingId(null)} style={{ fontSize: 12, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
                                <button type="submit" style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', background: '#111', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}>저장</button>
                              </div>
                            </form>
                          ) : (
                            /* 일반 표시 */
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 14, fontWeight: 600, color: '#111', margin: '0 0 2px' }}>{m.date}</p>
                                {m.places.map((p, i) => (
                                  <p key={i} style={{ fontSize: 12, color: '#6b7280', margin: '0 0 2px' }}>📍 {p.name}</p>
                                ))}
                                {m.memo && <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{m.memo}</p>}
                              </div>
                              <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                                <button
                                  onClick={() => startEditMeeting(m)}
                                  style={{ fontSize: 12, color: '#6b7280', background: 'none', border: '1px solid #e5e7eb', borderRadius: 4, cursor: 'pointer', padding: '3px 8px', fontFamily: 'inherit' }}
                                >
                                  수정
                                </button>
                                <button
                                  onClick={() => handleDeleteMeeting(m.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 14, padding: '3px 4px' }}
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
                <div style={{ flex: 1, minWidth: 0, height: 520 }}>
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
