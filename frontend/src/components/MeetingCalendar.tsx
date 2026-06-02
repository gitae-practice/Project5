import { useState } from 'react'
import type { Meeting } from '../types'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

type ViewMode = 'days' | 'months' | 'years'

interface Props {
  meetings: Meeting[]
  selectedDate?: string | null
  onDateSelect?: (date: string | null) => void
}

export default function MeetingCalendar({ meetings, selectedDate, onDateSelect }: Props) {
  const now = new Date()
  // selectedDate가 있으면 그 달로 초기화 (홈 대시보드 딥링크 대응)
  const initDate = selectedDate ? new Date(selectedDate + 'T00:00:00') : now
  const [year, setYear] = useState(initDate.getFullYear())
  const [month, setMonth] = useState(initDate.getMonth())
  const [viewMode, setViewMode] = useState<ViewMode>('days')
  const [yearRangeStart, setYearRangeStart] = useState(Math.floor(initDate.getFullYear() / 12) * 12)

  const prevUnit = () => {
    if (viewMode === 'days') {
      if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
    } else if (viewMode === 'months') {
      setYear(y => y - 1)
    } else {
      setYearRangeStart(y => y - 12)
    }
  }

  const nextUnit = () => {
    if (viewMode === 'days') {
      if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
    } else if (viewMode === 'months') {
      setYear(y => y + 1)
    } else {
      setYearRangeStart(y => y + 12)
    }
  }

  const handleHeaderClick = () => {
    if (viewMode === 'days') setViewMode('months')
    else if (viewMode === 'months') setViewMode('years')
    else setViewMode('days')
  }

  const selectMonth = (m: number) => { setMonth(m); setViewMode('days') }
  const selectYear = (y: number) => { setYear(y); setViewMode('months') }

  // 이번 달 만남 날짜 Set
  const meetingDates = new Set(
    meetings
      .filter(m => {
        const d = new Date(m.date + 'T00:00:00')
        return d.getFullYear() === year && d.getMonth() === month
      })
      .map(m => new Date(m.date + 'T00:00:00').getDate())
  )

  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month
  const todayDate = now.getDate()

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const headerText =
    viewMode === 'days' ? `${year}년 ${month + 1}월` :
    viewMode === 'months' ? `${year}년` :
    `${yearRangeStart} – ${yearRangeStart + 11}`

  const btnStyle: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 22, color: '#374151', padding: '2px 10px', lineHeight: 1,
  }

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: '24px', marginBottom: 20 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button type="button" onClick={prevUnit} style={btnStyle}>‹</button>
        <button
          type="button" onClick={handleHeaderClick}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 17, fontWeight: 700, color: '#111', fontFamily: 'inherit',
            padding: '4px 8px', borderRadius: 6,
          }}
        >
          {headerText} <span style={{ fontSize: 11, color: '#9ca3af' }}>▾</span>
        </button>
        <button type="button" onClick={nextUnit} style={btnStyle}>›</button>
      </div>

      {/* 날짜 뷰 */}
      {viewMode === 'days' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6 }}>
            {DAY_LABELS.map((d, i) => (
              <div key={d} style={{
                textAlign: 'center', fontSize: 12, fontWeight: 600, paddingBottom: 8,
                color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#9ca3af',
              }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {cells.map((day, i) => {
              const isToday = isCurrentMonth && day === todayDate
              const hasMeeting = day !== null && meetingDates.has(day)
              const isSun = i % 7 === 0
              const isSat = i % 7 === 6

              let bg = 'transparent'
              let border = 'none'
              let color = isSun ? '#ef4444' : isSat ? '#3b82f6' : '#111'
              let fw = 400

              if (hasMeeting && isToday) {
                // 오늘 + 만남: 빨간 채움
                bg = '#ef4444'; color = '#fff'; fw = 700
              } else if (hasMeeting) {
                // 만남: 빨간 테두리 원
                border = '2px solid #ef4444'; color = '#ef4444'; fw = 700
              } else if (isToday) {
                // 오늘: 검은 채움
                bg = '#111'; color = '#fff'; fw = 700
              }

              const dateStr = day !== null ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null
              const isSelected = dateStr !== null && selectedDate === dateStr

              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
                  {day !== null && (
                    <div
                      onClick={() => onDateSelect?.(isSelected ? null : dateStr)}
                      style={{
                        width: 34, height: 34, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: bg, border, fontSize: 14, fontWeight: fw, color,
                        cursor: 'pointer',
                        // 선택된 날: 파란 외곽선으로 표시
                        outline: isSelected ? '2.5px solid #3b82f6' : 'none',
                        outlineOffset: '2px',
                      }}
                    >
                      {day}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {meetingDates.size > 0 && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f3f4f6', fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
              {year}년 {month + 1}월 만남 {meetingDates.size}회
            </div>
          )}
        </>
      )}

      {/* 월 선택 뷰 */}
      {viewMode === 'months' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {MONTH_LABELS.map((label, i) => {
            const isSelected = i === month
            return (
              <button
                key={i} type="button" onClick={() => selectMonth(i)}
                style={{
                  padding: '14px 0', fontSize: 14, borderRadius: 8, cursor: 'pointer',
                  border: isSelected ? 'none' : '1px solid #e5e7eb',
                  background: isSelected ? '#111' : '#fff',
                  color: isSelected ? '#fff' : '#111',
                  fontWeight: isSelected ? 700 : 400,
                  fontFamily: 'inherit',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {/* 년도 선택 뷰 */}
      {viewMode === 'years' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {Array.from({ length: 12 }, (_, i) => yearRangeStart + i).map(y => {
            const isSelected = y === year
            return (
              <button
                key={y} type="button" onClick={() => selectYear(y)}
                style={{
                  padding: '14px 0', fontSize: 14, borderRadius: 8, cursor: 'pointer',
                  border: isSelected ? 'none' : '1px solid #e5e7eb',
                  background: isSelected ? '#111' : '#fff',
                  color: isSelected ? '#fff' : '#111',
                  fontWeight: isSelected ? 700 : 400,
                  fontFamily: 'inherit',
                }}
              >
                {y}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
