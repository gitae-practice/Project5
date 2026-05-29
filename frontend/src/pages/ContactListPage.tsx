import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard } from '../api/dashboard'
import type { DashboardResponse, DashboardBirthdayItem, DashboardNotSeenItem, DashboardRecentMeetingItem } from '../types'

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

// 최근 만남 행
function RecentMeetingRow({ item, onClick }: { item: DashboardRecentMeetingItem; onClick: () => void }) {
  const mainPlace = item.places[0]?.name
  const extraCount = item.places.length - 1

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
      <Avatar name={item.contactName} photoUrl={item.contactPhotoUrl} relationship={item.contactRelationship} size={38} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{item.contactName}</div>
        {mainPlace && (
          <div style={{ fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📍 {mainPlace}{extraCount > 0 ? ` 외 ${extraCount}곳` : ''}
          </div>
        )}
      </div>
      <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>{item.date}</span>
    </div>
  )
}

export default function ContactListPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboard()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

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

      {/* 최근 만남 */}
      <section>
        <SectionHeader title="최근 만남" />
        {recentMeetings.length === 0 ? (
          <EmptyMsg text="아직 만남 기록이 없어요" />
        ) : (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
            {recentMeetings.map((item, i) => (
              <div key={`${item.contactId}-${item.date}-${i}`} style={{ borderTop: i === 0 ? 'none' : '1px solid #f3f4f6' }}>
                <RecentMeetingRow item={item} onClick={() => navigate(`/contacts/${item.contactId}`)} />
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  )
}
