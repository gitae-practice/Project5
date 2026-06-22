import { useEffect, useState } from 'react'
import type { Meeting } from '../types'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const MONTH_LABELS = [
  '1월',
  '2월',
  '3월',
  '4월',
  '5월',
  '6월',
  '7월',
  '8월',
  '9월',
  '10월',
  '11월',
  '12월',
]

type ViewMode = 'days' | 'months' | 'years'

interface Props {
  meetings: Meeting[]
  selectedDate?: string | null
  onDateSelect?: (date: string | null) => void
  // 외부(히트맵 클릭 등)에서 달력이 특정 날짜가 속한 달로 이동하도록 트리거하는 값
  focusDate?: string | null
}

export default function MeetingCalendar({
  meetings,
  selectedDate,
  onDateSelect,
  focusDate,
}: Props) {
  const now = new Date()
  // selectedDate가 있으면 그 달로 초기화 (홈 대시보드 딥링크 대응)
  const initDate = selectedDate ? new Date(selectedDate + 'T00:00:00') : now
  const [year, setYear] = useState(initDate.getFullYear())
  const [month, setMonth] = useState(initDate.getMonth())
  const [viewMode, setViewMode] = useState<ViewMode>('days')
  const [yearRangeStart, setYearRangeStart] = useState(Math.floor(initDate.getFullYear() / 12) * 12)

  // focusDate가 바뀌면(히트맵 클릭 등) 해당 날짜가 속한 달로 이동
  // year/month는 이전/다음 버튼으로도 독립적으로 바뀌는 상태라 derived value로 대체 불가
  useEffect(() => {
    if (!focusDate) return
    const d = new Date(focusDate + 'T00:00:00')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setYear(d.getFullYear())
    setMonth(d.getMonth())
    setViewMode('days')
  }, [focusDate])

  const prevUnit = () => {
    if (viewMode === 'days') {
      if (month === 0) {
        setYear((y) => y - 1)
        setMonth(11)
      } else setMonth((m) => m - 1)
    } else if (viewMode === 'months') {
      setYear((y) => y - 1)
    } else {
      setYearRangeStart((y) => y - 12)
    }
  }

  const nextUnit = () => {
    if (viewMode === 'days') {
      if (month === 11) {
        setYear((y) => y + 1)
        setMonth(0)
      } else setMonth((m) => m + 1)
    } else if (viewMode === 'months') {
      setYear((y) => y + 1)
    } else {
      setYearRangeStart((y) => y + 12)
    }
  }

  const handleHeaderClick = () => {
    if (viewMode === 'days') setViewMode('months')
    else if (viewMode === 'months') setViewMode('years')
    else setViewMode('days')
  }

  const selectMonth = (m: number) => {
    setMonth(m)
    setViewMode('days')
  }
  const selectYear = (y: number) => {
    setYear(y)
    setViewMode('months')
  }

  // 이번 달 만남 날짜 Set
  const meetingDates = new Set(
    meetings
      .filter((m) => {
        const d = new Date(m.date + 'T00:00:00')
        return d.getFullYear() === year && d.getMonth() === month
      })
      .map((m) => new Date(m.date + 'T00:00:00').getDate()),
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
    viewMode === 'days'
      ? `${year}년 ${month + 1}월`
      : viewMode === 'months'
        ? `${year}년`
        : `${yearRangeStart} – ${yearRangeStart + 11}`

  const btnClass =
    'cursor-pointer border-none bg-transparent px-2.5 py-0.5 text-[22px] leading-none text-gray-700'

  return (
    <div className="mb-5 rounded-[10px] border border-gray-200 bg-white p-6">
      {/* 헤더 */}
      <div className="mb-5 flex items-center justify-between">
        <button type="button" onClick={prevUnit} className={btnClass}>
          ‹
        </button>
        <button
          type="button"
          onClick={handleHeaderClick}
          className="cursor-pointer rounded-md border-none bg-transparent px-2 py-1 text-[17px] font-bold text-[#111]"
        >
          {headerText} <span className="text-[11px] text-gray-400">▾</span>
        </button>
        <button type="button" onClick={nextUnit} className={btnClass}>
          ›
        </button>
      </div>

      {/* 날짜 뷰 */}
      {viewMode === 'days' && (
        <>
          <div className="mb-1.5 grid grid-cols-7">
            {DAY_LABELS.map((d, i) => (
              <div
                key={d}
                className={`pb-2 text-center text-xs font-semibold ${
                  i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-400'
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              const isToday = isCurrentMonth && day === todayDate
              const hasMeeting = day !== null && meetingDates.has(day)
              const isSun = i % 7 === 0
              const isSat = i % 7 === 6

              let bgClass = ''
              let borderClass = ''
              let colorClass = isSun ? 'text-red-500' : isSat ? 'text-blue-500' : 'text-[#111]'
              let fwClass = 'font-normal'

              if (hasMeeting && isToday) {
                // 오늘 + 만남: 빨간 채움
                bgClass = 'bg-red-500'
                colorClass = 'text-white'
                fwClass = 'font-bold'
              } else if (hasMeeting) {
                // 만남: 빨간 테두리 원
                borderClass = 'border-2 border-red-500'
                colorClass = 'text-red-500'
                fwClass = 'font-bold'
              } else if (isToday) {
                // 오늘: 검은 채움
                bgClass = 'bg-[#111]'
                colorClass = 'text-white'
                fwClass = 'font-bold'
              }

              const dateStr =
                day !== null
                  ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  : null
              const isSelected = dateStr !== null && selectedDate === dateStr

              return (
                <div key={i} className="flex justify-center py-1">
                  {day !== null && (
                    <div
                      onClick={() => onDateSelect?.(isSelected ? null : dateStr)}
                      className={`flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-full text-sm ${bgClass} ${borderClass} ${colorClass} ${fwClass} ${
                        // 선택된 날: 파란 외곽선으로 표시
                        isSelected
                          ? 'outline outline-[2.5px] outline-offset-2 outline-blue-500'
                          : 'outline-none'
                      }`}
                    >
                      {day}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {meetingDates.size > 0 && (
            <div className="mt-3.5 border-t border-gray-100 pt-3.5 text-center text-xs text-gray-400">
              {year}년 {month + 1}월 만남 {meetingDates.size}회
            </div>
          )}
        </>
      )}

      {/* 월 선택 뷰 */}
      {viewMode === 'months' && (
        <div className="grid grid-cols-4 gap-2">
          {MONTH_LABELS.map((label, i) => {
            const isSelected = i === month
            return (
              <button
                key={i}
                type="button"
                onClick={() => selectMonth(i)}
                className={`cursor-pointer rounded-lg px-0 py-3.5 text-sm ${
                  isSelected
                    ? 'border-none bg-[#111] font-bold text-white'
                    : 'border border-gray-200 bg-white font-normal text-[#111]'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {/* 년도 선택 뷰 */}
      {viewMode === 'years' && (
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 12 }, (_, i) => yearRangeStart + i).map((y) => {
            const isSelected = y === year
            return (
              <button
                key={y}
                type="button"
                onClick={() => selectYear(y)}
                className={`cursor-pointer rounded-lg px-0 py-3.5 text-sm ${
                  isSelected
                    ? 'border-none bg-[#111] font-bold text-white'
                    : 'border border-gray-200 bg-white font-normal text-[#111]'
                }`}
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
