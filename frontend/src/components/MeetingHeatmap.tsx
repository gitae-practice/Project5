import { useMemo, useState } from 'react'
import type { Meeting } from '../types'

interface Props {
  meetings: Meeting[]
}

const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function getDotStyle(count: number): React.CSSProperties {
  if (count === 0) return {}
  const bg = count === 1 ? '#fde68a' : count === 2 ? '#fb923c' : '#ea580c'
  const size = count === 1 ? 28 : count === 2 ? 30 : 32
  return {
    background: bg,
    width: size, height: size,
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: count >= 3 ? '0 2px 6px rgba(234,88,12,0.35)' : 'none',
  }
}

function getMeetingBadge(count: number): React.CSSProperties {
  if (count === 0) return { display: 'none' }
  const bg = count === 1 ? '#fbbf24' : count === 2 ? '#f97316' : '#dc2626'
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 18, height: 18, borderRadius: 9,
    background: bg, color: '#fff',
    fontSize: 10, fontWeight: 700, padding: '0 5px',
    marginLeft: 6,
  }
}

export default function MeetingHeatmap({ meetings }: Props) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)

  const { months, totalCount } = useMemo(() => {
    const countMap: Record<string, number> = {}
    for (const m of meetings) {
      const d = m.date.slice(0, 10)
      countMap[d] = (countMap[d] ?? 0) + 1
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const result = []

    // 최근 6개월 (이번달 포함)
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const year = d.getFullYear()
      const month = d.getMonth()
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      const firstDow = new Date(year, month, 1).getDay() // 0=일

      const days: { day: number; count: number; dateStr: string; isToday: boolean; isFuture: boolean }[] = []
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const cellDate = new Date(year, month, day)
        days.push({
          day,
          count: countMap[dateStr] ?? 0,
          dateStr,
          isToday: cellDate.getTime() === today.getTime(),
          isFuture: cellDate > today,
        })
      }

      const monthTotal = days.reduce((s, d) => s + d.count, 0)
      result.push({ year, month, firstDow, days, monthTotal })
    }

    const totalCount = result.reduce((s, m) => s + m.monthTotal, 0)
    return { months: result, totalCount }
  }, [meetings])

  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
      padding: '18px 20px', marginBottom: 20,
    }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>최근 6개월 만남</span>
        <span style={{
          fontSize: 11, fontWeight: 700, color: '#fff',
          background: totalCount > 0 ? '#ea580c' : '#d1d5db',
          borderRadius: 10, padding: '1px 8px',
        }}>
          총 {totalCount}회
        </span>
      </div>

      {/* 캘린더 카드 그리드 */}
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        {months.map(({ year, month, firstDow, days, monthTotal }) => (
          <div key={`${year}-${month}`} style={{
            flex: '0 0 148px',
            border: '1px solid #f3f4f6',
            borderRadius: 8, padding: '10px 8px',
            background: '#fafafa',
          }}>
            {/* 월 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>
                {year !== new Date().getFullYear() ? `${year}.` : ''}{MONTH_LABELS[month]}
              </span>
              {monthTotal > 0 && (
                <span style={getMeetingBadge(Math.min(monthTotal, 3))}>{monthTotal}</span>
              )}
            </div>

            {/* 요일 헤더 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
              {DAY_LABELS.map((d, i) => (
                <div key={d} style={{
                  fontSize: 8, fontWeight: 600, textAlign: 'center',
                  color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#9ca3af',
                  padding: '1px 0',
                }}>
                  {d}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
              {/* 첫째 날 전 빈 칸 */}
              {Array.from({ length: firstDow }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {days.map(({ day, count, dateStr, isToday, isFuture }) => (
                <div
                  key={dateStr}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    height: 20, position: 'relative',
                  }}
                  onMouseEnter={e => {
                    if (isFuture) return
                    const rect = e.currentTarget.getBoundingClientRect()
                    setTooltip({
                      x: rect.left + rect.width / 2,
                      y: rect.top - 6,
                      text: count > 0 ? `${dateStr} · ${count}회` : `${dateStr} · 없음`,
                    })
                  }}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <div style={{
                    ...getDotStyle(count),
                    width: count > 0 ? undefined : 20,
                    height: count > 0 ? undefined : 20,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    outline: isToday ? '2px solid #6366f1' : 'none',
                    outlineOffset: 1,
                    borderRadius: '50%',
                    cursor: count > 0 ? 'pointer' : 'default',
                  }}>
                    <span style={{
                      fontSize: 9,
                      fontWeight: isToday ? 800 : count > 0 ? 700 : 400,
                      color: count >= 2 ? '#fff' : count === 1 ? '#92400e' : isFuture ? '#d1d5db' : '#6b7280',
                      lineHeight: 1,
                    }}>
                      {day}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 범례 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, justifyContent: 'flex-end' }}>
        {[
          { label: '만남 없음', color: '#e5e7eb' },
          { label: '1회', color: '#fde68a' },
          { label: '2회', color: '#fb923c' },
          { label: '3회+', color: '#ea580c' },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
            <span style={{ fontSize: 9, color: '#9ca3af' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* 툴팁 */}
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x, top: tooltip.y,
          transform: 'translate(-50%, -100%)',
          background: '#1f2937', color: '#fff',
          fontSize: 11, padding: '4px 8px', borderRadius: 5,
          pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 9999,
        }}>
          {tooltip.text}
        </div>
      )}
    </div>
  )
}
