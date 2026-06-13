import { useMemo, useState } from 'react'
import type { Meeting } from '../types'

interface Props {
  meetings: Meeting[]
}

type FilterMode = 'year' | 'month' | 'week'

interface DataPoint {
  startDate: Date
  endDate: Date
  count: number
  label: string
  isCurrent: boolean
}

const VW = 700
const VH = 200
const PL = 28
const PR = 12
const PT = 20
const PB = 32
const IW = VW - PL - PR
const IH = VH - PT - PB

function smoothLinePath(pts: [number, number][]): string {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M ${pts[0][0]},${pts[0][1]}`
  let d = `M ${pts[0][0]},${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    const cpx = (x0 + x1) / 2
    d += ` C ${cpx},${y0} ${cpx},${y1} ${x1},${y1}`
  }
  return d
}

function buildDayMap(meetings: Meeting[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const m of meetings) {
    const k = m.date.slice(0, 10)
    map[k] = (map[k] ?? 0) + 1
  }
  return map
}

function buildYearData(meetings: Meeting[], today: Date): { points: DataPoint[]; markers: { x: number; label: string }[] } {
  const WEEKS = 52
  const dayMap = buildDayMap(meetings)

  const startMonday = new Date(today)
  const dow = today.getDay() || 7
  startMonday.setDate(today.getDate() - (dow - 1) - (WEEKS - 1) * 7)

  const points: DataPoint[] = []
  for (let w = 0; w < WEEKS; w++) {
    const mon = new Date(startMonday)
    mon.setDate(startMonday.getDate() + w * 7)
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)

    let count = 0
    for (let d = 0; d < 7; d++) {
      const day = new Date(mon)
      day.setDate(mon.getDate() + d)
      count += dayMap[day.toISOString().slice(0, 10)] ?? 0
    }

    const mo = mon.getMonth() + 1
    const wkInMonth = Math.ceil(mon.getDate() / 7)
    points.push({
      startDate: new Date(mon),
      endDate: sun,
      count,
      label: `${mon.getFullYear()}.${mo}월 ${wkInMonth}주차`,
      isCurrent: w === WEEKS - 1,
    })
  }

  const markers: { x: number; label: string }[] = []
  let lastMonth = -1
  points.forEach((p, i) => {
    const mo = p.startDate.getMonth()
    if (mo !== lastMonth) {
      markers.push({ x: PL + (i / (WEEKS - 1)) * IW, label: `${mo + 1}월` })
      lastMonth = mo
    }
  })

  return { points, markers }
}

function buildMonthData(meetings: Meeting[], today: Date): { points: DataPoint[]; markers: { x: number; label: string }[] } {
  const year = today.getFullYear()
  const month = today.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const dayMap = buildDayMap(meetings)

  const startDow = firstDay.getDay() || 7
  const weekStart = new Date(firstDay)
  weekStart.setDate(firstDay.getDate() - (startDow - 1))

  const todayDow = today.getDay() || 7
  const currentWeekMon = new Date(today)
  currentWeekMon.setDate(today.getDate() - (todayDow - 1))

  const points: DataPoint[] = []
  const cur = new Date(weekStart)
  while (cur <= lastDay) {
    const mon = new Date(cur)
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)

    let count = 0
    for (let d = 0; d < 7; d++) {
      const day = new Date(mon)
      day.setDate(mon.getDate() + d)
      count += dayMap[day.toISOString().slice(0, 10)] ?? 0
    }

    const wkInMonth = Math.ceil((mon.getDate() + (mon.getDay() || 7) - 1) / 7)
    points.push({
      startDate: new Date(mon),
      endDate: sun,
      count,
      label: `${mon.getFullYear()}.${mon.getMonth() + 1}월 ${wkInMonth}주차`,
      isCurrent: mon.toDateString() === currentWeekMon.toDateString(),
    })

    cur.setDate(cur.getDate() + 7)
  }

  const N = points.length
  const markers = points.map((p, i) => ({
    x: PL + (N > 1 ? (i / (N - 1)) * IW : IW / 2),
    label: `${p.startDate.getDate()}일~`,
  }))

  return { points, markers }
}

function buildWeekData(meetings: Meeting[], today: Date): { points: DataPoint[]; markers: { x: number; label: string }[] } {
  const dow = today.getDay() || 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dow - 1))
  const dayMap = buildDayMap(meetings)

  const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']
  const points: DataPoint[] = DAY_LABELS.map((_, d) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + d)
    const k = day.toISOString().slice(0, 10)
    return {
      startDate: new Date(day),
      endDate: new Date(day),
      count: dayMap[k] ?? 0,
      label: `${day.getFullYear()}.${day.getMonth() + 1}.${day.getDate()} (${DAY_LABELS[d]})`,
      isCurrent: day.toDateString() === today.toDateString(),
    }
  })

  const markers = DAY_LABELS.map((label, i) => ({
    x: PL + (i / 6) * IW,
    label,
  }))

  return { points, markers }
}

const FILTERS: { key: FilterMode; label: string }[] = [
  { key: 'year', label: '년' },
  { key: 'month', label: '월' },
  { key: 'week', label: '주' },
]

const FILTER_TITLE: Record<FilterMode, string> = {
  year: '최근 1년',
  month: '이번 달',
  week: '이번 주',
}

export default function MeetingHeatmap({ meetings }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [filter, setFilter] = useState<FilterMode>('year')

  const { points, markers, maxCount, totalCount } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { points, markers } =
      filter === 'year' ? buildYearData(meetings, today) :
      filter === 'month' ? buildMonthData(meetings, today) :
      buildWeekData(meetings, today)

    const maxCount = Math.max(...points.map(p => p.count), 1)
    const totalCount = points.reduce((s, p) => s + p.count, 0)
    return { points, markers, maxCount, totalCount }
  }, [meetings, filter])

  const N = points.length
  const pts: [number, number][] = points.map((p, i) => [
    N > 1 ? PL + (i / (N - 1)) * IW : PL + IW / 2,
    PT + IH - (p.count / maxCount) * IH,
  ])

  const linePath = smoothLinePath(pts)
  const areaPath = pts.length > 0
    ? `${linePath} L ${pts[pts.length - 1][0]},${PT + IH} L ${pts[0][0]},${PT + IH} Z`
    : ''

  const yTicks = [0, Math.round(maxCount / 2), maxCount]
  const hov = hoveredIdx !== null ? points[hoveredIdx] : null
  const hovPt = hoveredIdx !== null ? pts[hoveredIdx] : null

  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
      padding: '18px 20px 14px', marginBottom: 20,
    }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
            {FILTER_TITLE[filter]} 만남
          </span>
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#fff', borderRadius: 10, padding: '1px 8px',
            background: totalCount > 0 ? '#ea580c' : '#d1d5db',
          }}>
            총 {totalCount}회
          </span>
        </div>

        {/* 필터 탭 */}
        <div style={{ display: 'flex', gap: 2, background: '#f3f4f6', borderRadius: 8, padding: 3 }}>
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setFilter(key); setHoveredIdx(null) }}
              style={{
                fontSize: 11, fontWeight: 600,
                padding: '3px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                transition: 'all 0.15s',
                background: filter === key ? '#fff' : 'transparent',
                color: filter === key ? '#ea580c' : '#6b7280',
                boxShadow: filter === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* SVG 차트 */}
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Y축 눈금선 */}
        {yTicks.map(v => {
          const y = PT + IH - (v / maxCount) * IH
          return (
            <g key={v}>
              <line x1={PL} y1={y} x2={PL + IW} y2={y} stroke="#f3f4f6" strokeWidth="1" />
              <text x={PL - 4} y={y + 3.5} textAnchor="end" fontSize="9" fill="#c4c4c4">{v}</text>
            </g>
          )
        })}

        {/* X축 레이블 + 년 모드 구분 점선 */}
        {markers.map(({ x, label }, idx) => (
          <g key={idx}>
            {filter === 'year' && (
              <line x1={x} y1={PT} x2={x} y2={PT + IH}
                stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3,3" />
            )}
            <text
              x={x + (filter === 'year' ? 3 : 0)}
              y={PT + IH + 18}
              fontSize="9" fill="#9ca3af"
              textAnchor={filter === 'year' ? 'start' : 'middle'}
            >
              {label}
            </text>
          </g>
        ))}

        {/* 현재 주/일 하이라이트 밴드 */}
        {(() => {
          const currentIdx = points.findIndex(p => p.isCurrent)
          if (currentIdx < 0 || pts.length === 0) return null
          const cx = pts[currentIdx][0]
          const bw = N > 1 ? IW / N : IW
          return (
            <rect x={cx - bw / 2} y={PT} width={bw} height={IH}
              fill="#6366f1" fillOpacity="0.06" rx="2" />
          )
        })()}

        {/* 에리어 채움 */}
        <path d={areaPath} fill="url(#areaGrad)" />

        {/* 라인 */}
        <path d={linePath} fill="none" stroke="#f97316" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* 호버 세로선 */}
        {hovPt && (
          <line x1={hovPt[0]} y1={PT} x2={hovPt[0]} y2={PT + IH}
            stroke="#f97316" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
        )}

        {/* 데이터 포인트 */}
        {pts.map(([x, y], i) => {
          if (points[i].count === 0 && hoveredIdx !== i) return null
          const isHov = hoveredIdx === i
          return (
            <circle key={i} cx={x} cy={y}
              r={isHov ? 5 : 3.5}
              fill={isHov ? '#ea580c' : '#f97316'}
              stroke="#fff" strokeWidth={isHov ? 2 : 1.5}
              style={{ transition: 'r 0.1s' }}
            />
          )
        })}

        {/* 인터랙션 오버레이 */}
        {pts.map(([x], i) => {
          const slotW = N > 1 ? IW / N : IW
          return (
            <rect key={i} x={x - slotW / 2} y={PT} width={slotW} height={IH}
              fill="transparent" style={{ cursor: 'crosshair' }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          )
        })}

        {/* 툴팁 */}
        {hov && hovPt && (() => {
          const tx = hovPt[0]
          const ty = hovPt[1] - 14
          const text = `${hov.label} · ${hov.count}회`
          const boxW = text.length * 6.2 + 16
          const boxX = Math.min(Math.max(tx - boxW / 2, PL), PL + IW - boxW)
          return (
            <g>
              <rect x={boxX} y={ty - 16} width={boxW} height={22} rx="5" fill="#1f2937" />
              <text x={boxX + boxW / 2} y={ty - 1}
                textAnchor="middle" fontSize="10" fill="#fff" fontWeight="600">
                {text}
              </text>
            </g>
          )
        })()}

        {/* X축 베이스라인 */}
        <line x1={PL} y1={PT + IH} x2={PL + IW} y2={PT + IH} stroke="#e5e7eb" strokeWidth="1" />
      </svg>
    </div>
  )
}
