import { useState } from 'react'
import type { Meeting } from '../types'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

interface Props {
  meetings: Meeting[]
}

export default function MeetingCalendar({ meetings }: Props) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-indexed

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  // 이번 달에 만남이 있는 날짜 Set
  const meetingDates = new Set(
    meetings
      .filter(m => {
        const d = new Date(m.date + 'T00:00:00')
        return d.getFullYear() === year && d.getMonth() === month
      })
      .map(m => new Date(m.date + 'T00:00:00').getDate())
  )

  // 이번 달 첫 날 요일, 총 일수
  const firstDayOfWeek = new Date(year, month, 1).getDay() // 0=일
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month
  const todayDate = now.getDate()

  // 달력 셀 배열 (null = 빈 셀)
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const monthMeetingCount = meetingDates.size

  return (
    <div style={{
      background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb',
      padding: '24px', marginBottom: 20,
    }}>
      {/* 월 이동 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button
          type="button" onClick={prevMonth}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#374151', padding: '2px 10px', lineHeight: 1 }}
        >
          ‹
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>
          {year}년 {month + 1}월
        </span>
        <button
          type="button" onClick={nextMonth}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#374151', padding: '2px 10px', lineHeight: 1 }}
        >
          ›
        </button>
      </div>

      {/* 요일 헤더 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6 }}>
        {DAY_LABELS.map((d, i) => (
          <div
            key={d}
            style={{
              textAlign: 'center', fontSize: 12, fontWeight: 600,
              color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#9ca3af',
              paddingBottom: 8,
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {cells.map((day, i) => {
          const isToday = isCurrentMonth && day === todayDate
          const hasMeeting = day !== null && meetingDates.has(day)
          const isSun = i % 7 === 0
          const isSat = i % 7 === 6

          return (
            <div
              key={i}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '5px 0',
              }}
            >
              {day !== null && (
                <>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isToday ? '#111' : 'transparent',
                    fontSize: 14,
                    fontWeight: isToday || hasMeeting ? 700 : 400,
                    color: isToday ? '#fff' : isSun ? '#ef4444' : isSat ? '#3b82f6' : '#111',
                  }}>
                    {day}
                  </div>
                  {/* 만남이 있는 날: 점 표시 */}
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', marginTop: 3,
                    background: hasMeeting ? (isToday ? '#fff' : '#111') : 'transparent',
                  }} />
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* 하단 요약 */}
      {monthMeetingCount > 0 && (
        <div style={{
          marginTop: 14, paddingTop: 14, borderTop: '1px solid #f3f4f6',
          fontSize: 12, color: '#9ca3af', textAlign: 'center',
        }}>
          {year}년 {month + 1}월 만남 {monthMeetingCount}회
        </div>
      )}
    </div>
  )
}
