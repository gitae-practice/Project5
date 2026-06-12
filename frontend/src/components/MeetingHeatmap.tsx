import { useMemo, useState } from 'react'
import type { Meeting } from '../types'

interface Props {
  meetings: Meeting[]
}

const VW = 700
const VH = 200
const PL = 28  // left padding (Y축)
const PR = 12
const PT = 20
const PB = 32  // bottom padding (X축 레이블)
const IW = VW - PL - PR
const IH = VH - PT - PB
const WEEKS = 52

function toISOWeek(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  // 월요일 기준 주 시작
  const day = d.getDay() || 7
  d.setDate(d.getDate() + 4 - day)
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const wk = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getFullYear()}-W${String(wk).padStart(2, '0')}`
}

// 베지어 곡선 path 생성 (부드러운 에리어용)
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

export default function MeetingHeatmap({ meetings }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const { weeks, maxCount, totalCount, monthMarkers } = useMemo(() => {
    // 오늘 기준 52주 데이터
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 주의 시작(월요일) 배열 생성
    const startMonday = new Date(today)
    const dow = today.getDay() || 7
    startMonday.setDate(today.getDate() - (dow - 1) - (WEEKS - 1) * 7)

    // 날짜별 만남 횟수
    const dayMap: Record<string, number> = {}
    for (const m of meetings) {
      const k = m.date.slice(0, 10)
      dayMap[k] = (dayMap[k] ?? 0) + 1
    }

    const weeks: {
      startDate: Date
      endDate: Date
      count: number
      label: string
      isCurrent: boolean
    }[] = []

    for (let w = 0; w < WEEKS; w++) {
      const mon = new Date(startMonday)
      mon.setDate(startMonday.getDate() + w * 7)
      const sun = new Date(mon)
      sun.setDate(mon.getDate() + 6)

      let count = 0
      for (let d = 0; d < 7; d++) {
        const day = new Date(mon)
        day.setDate(mon.getDate() + d)
        const k = day.toISOString().slice(0, 10)
        count += dayMap[k] ?? 0
      }

      const m = mon.getMonth() + 1
      const wkInMonth = Math.ceil(mon.getDate() / 7)
      weeks.push({
        startDate: mon,
        endDate: sun,
        count,
        label: `${mon.getFullYear()}.${m}월 ${wkInMonth}주차`,
        isCurrent: w === WEEKS - 1,
      })
    }

    // 월 구분선 위치 계산
    const monthMarkers: { x: number; label: string }[] = []
    let lastMonth = -1
    weeks.forEach((wk, i) => {
      const m = wk.startDate.getMonth()
      if (m !== lastMonth) {
        const x = PL + (i / (WEEKS - 1)) * IW
        monthMarkers.push({
          x,
          label: `${wk.startDate.getMonth() + 1}월`,
        })
        lastMonth = m
      }
    })

    const maxCount = Math.max(...weeks.map(w => w.count), 1)
    const totalCount = weeks.reduce((s, w) => s + w.count, 0)
    return { weeks, maxCount, totalCount, monthMarkers }
  }, [meetings])

  // 포인트 좌표 계산
  const pts: [number, number][] = weeks.map((wk, i) => {
    const x = PL + (i / (WEEKS - 1)) * IW
    const y = PT + IH - (wk.count / maxCount) * IH
    return [x, y]
  })

  const linePath = smoothLinePath(pts)
  const areaPath = pts.length > 0
    ? `${linePath} L ${pts[pts.length - 1][0]},${PT + IH} L ${pts[0][0]},${PT + IH} Z`
    : ''

  // Y축 눈금
  const yTicks = [0, Math.round(maxCount / 2), maxCount]

  const hov = hoveredIdx !== null ? weeks[hoveredIdx] : null
  const hovPt = hoveredIdx !== null ? pts[hoveredIdx] : null

  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
      padding: '18px 20px 14px', marginBottom: 20,
    }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>최근 1년 만남</span>
        <span style={{
          fontSize: 11, fontWeight: 700, color: '#fff', borderRadius: 10, padding: '1px 8px',
          background: totalCount > 0 ? '#ea580c' : '#d1d5db',
        }}>
          총 {totalCount}회
        </span>
      </div>

      {/* SVG 차트 */}
      <div style={{ position: 'relative' }}>
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

          {/* Y축 수평 눈금선 */}
          {yTicks.map(v => {
            const y = PT + IH - (v / maxCount) * IH
            return (
              <g key={v}>
                <line x1={PL} y1={y} x2={PL + IW} y2={y}
                  stroke="#f3f4f6" strokeWidth="1" />
                <text x={PL - 4} y={y + 3.5} textAnchor="end"
                  fontSize="9" fill="#c4c4c4">{v}</text>
              </g>
            )
          })}

          {/* 월 구분 세로 점선 + 레이블 */}
          {monthMarkers.map(({ x, label }) => (
            <g key={label + x}>
              <line x1={x} y1={PT} x2={x} y2={PT + IH}
                stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3,3" />
              <text x={x + 3} y={PT + IH + 18} fontSize="9" fill="#9ca3af">{label}</text>
            </g>
          ))}

          {/* 현재 주 하이라이트 밴드 */}
          {pts.length > 0 && (() => {
            const lastX = pts[pts.length - 1][0]
            const bw = IW / WEEKS
            return (
              <rect
                x={lastX - bw / 2} y={PT}
                width={bw} height={IH}
                fill="#6366f1" fillOpacity="0.06" rx="2"
              />
            )
          })()}

          {/* 에리어 채움 */}
          <path d={areaPath} fill="url(#areaGrad)" />

          {/* 라인 */}
          <path d={linePath} fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* 호버 세로선 */}
          {hovPt && (
            <line
              x1={hovPt[0]} y1={PT}
              x2={hovPt[0]} y2={PT + IH}
              stroke="#f97316" strokeWidth="1" strokeDasharray="3,3" opacity="0.5"
            />
          )}

          {/* 데이터 포인트 (만남 있는 주만) */}
          {pts.map(([x, y], i) => {
            const wk = weeks[i]
            if (wk.count === 0 && hoveredIdx !== i) return null
            const isHov = hoveredIdx === i
            return (
              <circle
                key={i}
                cx={x} cy={y}
                r={isHov ? 5 : 3.5}
                fill={isHov ? '#ea580c' : '#f97316'}
                stroke="#fff"
                strokeWidth={isHov ? 2 : 1.5}
                style={{ transition: 'r 0.1s' }}
              />
            )
          })}

          {/* 인터랙션 오버레이 */}
          {pts.map(([x], i) => {
            const slotW = IW / WEEKS
            return (
              <rect
                key={i}
                x={x - slotW / 2} y={PT}
                width={slotW} height={IH}
                fill="transparent"
                style={{ cursor: 'crosshair' }}
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
                <rect x={boxX} y={ty - 16} width={boxW} height={22}
                  rx="5" fill="#1f2937" />
                <text x={boxX + boxW / 2} y={ty - 1}
                  textAnchor="middle" fontSize="10" fill="#fff" fontWeight="600">
                  {text}
                </text>
              </g>
            )
          })()}

          {/* X축 베이스라인 */}
          <line x1={PL} y1={PT + IH} x2={PL + IW} y2={PT + IH}
            stroke="#e5e7eb" strokeWidth="1" />
        </svg>
      </div>
    </div>
  )
}
