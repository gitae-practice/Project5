import { useMemo, useState } from 'react'
import type { Meeting } from '../types'

interface Props {
  meetings: Meeting[]
}

const CELL = 11
const GAP = 2
const WEEK_W = CELL + GAP

// 색상 단계: 0회, 1회, 2회, 3회+
const COLOR = ['#ebedf0', '#9be9a8', '#40c463', '#216e39']

function getColor(count: number) {
  if (count === 0) return COLOR[0]
  if (count === 1) return COLOR[1]
  if (count === 2) return COLOR[2]
  return COLOR[3]
}

export default function MeetingHeatmap({ meetings }: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)

  const { weeks, monthLabels } = useMemo(() => {
    // 오늘 기준 52주(364일) 전 일요일부터 시작
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - 363 - today.getDay())

    // 날짜별 만남 횟수 집계
    const countMap: Record<string, number> = {}
    for (const m of meetings) {
      const d = m.date.slice(0, 10)
      countMap[d] = (countMap[d] ?? 0) + 1
    }

    // 주 배열 구성
    const weeksArr: { date: Date; count: number }[][] = []
    let cur = new Date(startDate)
    while (cur <= today) {
      const week: { date: Date; count: number }[] = []
      for (let d = 0; d < 7; d++) {
        const key = cur.toISOString().slice(0, 10)
        week.push({ date: new Date(cur), count: cur <= today ? (countMap[key] ?? 0) : -1 })
        cur.setDate(cur.getDate() + 1)
      }
      weeksArr.push(week)
    }

    // 월 레이블 계산 (각 월의 첫 주 인덱스)
    const labels: { label: string; x: number }[] = []
    let lastMonth = -1
    weeksArr.forEach((week, wi) => {
      const firstDay = week.find(d => d.count >= 0)?.date ?? week[0].date
      const m = firstDay.getMonth()
      if (m !== lastMonth) {
        labels.push({ label: `${m + 1}월`, x: wi * WEEK_W })
        lastMonth = m
      }
    })

    return { weeks: weeksArr, monthLabels: labels }
  }, [meetings])

  const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
  const svgW = weeks.length * WEEK_W
  const svgH = 7 * WEEK_W

  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
      padding: '16px 20px', marginBottom: 20, position: 'relative',
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 12 }}>
        최근 1년 만남
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {/* 요일 레이블 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: GAP, paddingTop: 18 }}>
          {DAY_LABELS.map((d, i) => (
            <div key={d} style={{
              height: CELL, fontSize: 9, color: '#9ca3af',
              lineHeight: `${CELL}px`, opacity: i % 2 === 1 ? 1 : 0,
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* 히트맵 본체 */}
        <div style={{ overflow: 'auto' }}>
          {/* 월 레이블 */}
          <div style={{ position: 'relative', height: 16, width: svgW }}>
            {monthLabels.map(({ label, x }) => (
              <span key={label + x} style={{
                position: 'absolute', left: x, fontSize: 9, color: '#6b7280', whiteSpace: 'nowrap',
              }}>
                {label}
              </span>
            ))}
          </div>

          {/* 셀 그리드 */}
          <svg width={svgW} height={svgH}>
            {weeks.map((week, wi) =>
              week.map((cell, di) => {
                if (cell.count < 0) return null
                const x = wi * WEEK_W
                const y = di * WEEK_W
                const dateStr = cell.date.toISOString().slice(0, 10).replace(/-/g, '.')
                return (
                  <rect
                    key={`${wi}-${di}`}
                    x={x} y={y} width={CELL} height={CELL} rx={2}
                    fill={getColor(cell.count)}
                    style={{ cursor: cell.count > 0 ? 'pointer' : 'default' }}
                    onMouseEnter={e => {
                      const rect = (e.target as SVGRectElement).getBoundingClientRect()
                      setTooltip({
                        x: rect.left + window.scrollX + CELL / 2,
                        y: rect.top + window.scrollY - 8,
                        text: cell.count > 0
                          ? `${dateStr} · 만남 ${cell.count}건`
                          : `${dateStr} · 만남 없음`,
                      })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                )
              })
            )}
          </svg>
        </div>
      </div>

      {/* 범례 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 9, color: '#9ca3af' }}>적음</span>
        {COLOR.map(c => (
          <div key={c} style={{ width: CELL, height: CELL, borderRadius: 2, background: c }} />
        ))}
        <span style={{ fontSize: 9, color: '#9ca3af' }}>많음</span>
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
