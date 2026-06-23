import { useEffect, useMemo, useRef, useState } from 'react'
import type { Meeting } from '../types'
import { loadKakaoSdk } from '../utils/kakaoLoader'

const DEFAULT_LAT = 37.5665
const DEFAULT_LNG = 126.978

interface Props {
  meetings: Meeting[]
  // 지정하면 이 기간(달력/히트맵에서 선택한 날짜)에 해당하는 핀만 강조 표시 + 정보창 자동 오픈
  highlightRange?: { start: string; end: string } | null
}

// 강조된 핀용 오렌지 마커 이미지 — 기본 카카오 핀과 같은 물방울 모양, 색만 다르게 (히트맵 라인 컬러와 통일)
const HIGHLIGHT_MARKER_SRC =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">' +
      '<path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 24 16 24s16-13 16-24C32 7.163 24.837 0 16 0z" fill="#f97316" stroke="#fff" stroke-width="2"/>' +
      '<circle cx="16" cy="15" r="6" fill="#fff"/></svg>',
  )

export default function MeetingMap({ meetings, highlightRange }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<KakaoMap | null>(null)
  const markersRef = useRef<KakaoMarker[]>([])
  const infoWindowsRef = useRef<KakaoInfoWindow[]>([])
  const [ready, setReady] = useState(false)
  const [sdkError, setSdkError] = useState(false)

  // 모든 만남의 장소를 평탄화 (좌표 있는 것만), meetings가 바뀔 때만 새로 계산
  const allPlaces = useMemo(() => {
    const flat = meetings.flatMap((m) =>
      m.places
        .filter((p): p is typeof p & { lat: number; lng: number } => !!p.lat && !!p.lng)
        .map((p) => ({ ...p, meetingDate: m.date })),
    )
    // 장소 이름 기준 방문 횟수 집계 (고유 장소 ID가 없어 이름으로만 식별)
    const visitCounts = new Map<string, number>()
    flat.forEach((p) => visitCounts.set(p.name, (visitCounts.get(p.name) ?? 0) + 1))
    return flat.map((p) => ({ ...p, visitCount: visitCounts.get(p.name) ?? 1 }))
  }, [meetings])

  // SDK 동적 로드 → 지도 초기화
  useEffect(() => {
    loadKakaoSdk().then((ok) => {
      if (!ok) {
        setSdkError(true)
        return
      }
      if (!mapRef.current || mapInstance.current) return
      const kakao = window.kakao
      try {
        const center = new kakao.maps.LatLng(DEFAULT_LAT, DEFAULT_LNG)
        mapInstance.current = new kakao.maps.Map(mapRef.current, { center, level: 8 })
        setReady(true)
      } catch {
        setSdkError(true)
      }
    })
  }, [])

  // 마커 업데이트 (지도 준비 & 장소 내용 변경 시)
  useEffect(() => {
    const kakao = window.kakao
    if (!ready || !kakao?.maps || !mapInstance.current) return

    // 기존 마커·정보창 제거 (정보창은 마커와 별개 객체라 명시적으로 닫아야 함)
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []
    infoWindowsRef.current.forEach((iw) => iw.close())
    infoWindowsRef.current = []

    if (allPlaces.length === 0) return

    const map = mapInstance.current
    const bounds = new kakao.maps.LatLngBounds()
    const highlightImage = new kakao.maps.MarkerImage(
      HIGHLIGHT_MARKER_SRC,
      new kakao.maps.Size(32, 40),
      {
        offset: new kakao.maps.Point(16, 40),
      },
    )

    allPlaces.forEach((p) => {
      const pos = new kakao.maps.LatLng(p.lat, p.lng)
      bounds.extend(pos)

      const isHighlighted =
        !!highlightRange &&
        p.meetingDate >= highlightRange.start &&
        p.meetingDate <= highlightRange.end

      const marker = new kakao.maps.Marker({
        map,
        position: pos,
        ...(isHighlighted ? { image: highlightImage } : {}),
      })
      markersRef.current.push(marker)

      const starsHtml = p.rating
        ? `<div>${[1, 2, 3, 4, 5]
            .map((n) => `<span style="color:${n <= p.rating! ? '#f97316' : '#d1d5db'}">★</span>`)
            .join('')}</div>`
        : ''
      const visitCountHtml =
        p.visitCount > 1
          ? `<span style="color:#9ca3af">· ${p.visitCount}회 방문</span>`
          : ''
      const infoContent = `
        <div style="padding:8px 12px;font-size:12px;font-family:system-ui,sans-serif;width:160px;word-break:break-all;line-height:1.6">
          <strong>${p.name}</strong><br/>
          <span style="color:#9ca3af">${p.meetingDate}</span> ${visitCountHtml}
          ${starsHtml}
        </div>
      `
      const infoWindow = new kakao.maps.InfoWindow({
        content: infoContent,
        removable: true,
        zIndex: 10,
      })
      infoWindowsRef.current.push(infoWindow)
      kakao.maps.event.addListener(marker, 'click', () => infoWindow.open(map, marker))

      // 선택된 기간에 해당하는 핀은 정보창을 바로 열어 눌린 상태처럼 표시
      if (isHighlighted) infoWindow.open(map, marker)
    })

    if (allPlaces.length === 1) {
      map.setCenter(new kakao.maps.LatLng(allPlaces[0].lat, allPlaces[0].lng))
      map.setLevel(4)
    } else {
      map.setBounds(bounds)
    }
  }, [ready, allPlaces, highlightRange])

  return (
    <div className="flex h-full flex-col">
      {allPlaces.length > 0 && (
        <p className="m-0 mb-2 text-[11px] font-bold tracking-[0.05em] text-gray-400">
          VISITED PLACES ({allPlaces.length})
        </p>
      )}

      {/* position:relative 래퍼 + 내부 absolute div → Kakao가 크기를 정확히 인식 */}
      <div className="relative min-h-[380px] flex-1 overflow-hidden rounded-[10px] border border-gray-200 bg-gray-50">
        <div ref={mapRef} className="absolute inset-0" />

        {/* 지도 컨트롤: + / - */}
        {ready && (
          <div className="absolute bottom-[20px] right-[10px] z-10 flex flex-col gap-0.5">
            <button
              onClick={() =>
                mapInstance.current?.setLevel((mapInstance.current?.getLevel() ?? 0) - 1)
              }
              title="확대"
              className="flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-xl font-semibold leading-none text-gray-700 shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
            >
              +
            </button>
            <button
              onClick={() =>
                mapInstance.current?.setLevel((mapInstance.current?.getLevel() ?? 0) + 1)
              }
              title="축소"
              className="flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-xl font-semibold leading-none text-gray-700 shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
            >
              −
            </button>
          </div>
        )}

        {sdkError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-50">
            <span className="text-[13px] font-semibold text-red-500">지도를 불러올 수 없어요</span>
            <span className="text-center text-[11px] leading-[1.8] text-gray-400">
              네트워크 연결을 확인하거나 페이지를 새로고침 해주세요
            </span>
          </div>
        )}
      </div>

      {allPlaces.length === 0 && !sdkError && (
        <p className="m-0 mt-2 text-center text-xs text-gray-300">
          장소를 추가하면 지도에 표시돼요
        </p>
      )}
    </div>
  )
}
