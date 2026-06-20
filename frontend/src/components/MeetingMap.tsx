import { useEffect, useRef, useState } from 'react'
import type { Meeting } from '../types'
import { loadKakaoSdk } from '../utils/kakaoLoader'

const DEFAULT_LAT = 37.5665
const DEFAULT_LNG = 126.978

interface Props {
  meetings: Meeting[]
}

export default function MeetingMap({ meetings }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [ready, setReady] = useState(false)
  const [sdkError, setSdkError] = useState(false)

  // 모든 만남의 장소를 평탄화 (좌표 있는 것만)
  const allPlaces = meetings.flatMap((m) =>
    m.places.filter((p) => p.lat && p.lng).map((p) => ({ ...p, meetingDate: m.date })),
  )

  // SDK 동적 로드 → 지도 초기화
  useEffect(() => {
    loadKakaoSdk().then((ok) => {
      if (!ok) {
        setSdkError(true)
        return
      }
      if (!mapRef.current || mapInstance.current) return
      const kakao = (window as any).kakao
      try {
        const center = new kakao.maps.LatLng(DEFAULT_LAT, DEFAULT_LNG)
        mapInstance.current = new kakao.maps.Map(mapRef.current, { center, level: 8 })
        setReady(true)
      } catch {
        setSdkError(true)
      }
    })
  }, [])

  // 장소 목록의 내용(이름+좌표)을 문자열 키로 만들어 실제 변경 감지
  const allPlacesKey = allPlaces.map((p) => `${p.name}:${p.lat}:${p.lng}`).join('|')

  // 마커 업데이트 (지도 준비 & 장소 내용 변경 시)
  useEffect(() => {
    const kakao = (window as any).kakao
    if (!ready || !kakao?.maps || !mapInstance.current) return

    // 기존 마커 제거
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []

    if (allPlaces.length === 0) return

    const map = mapInstance.current
    const bounds = new kakao.maps.LatLngBounds()

    allPlaces.forEach((p) => {
      const pos = new kakao.maps.LatLng(p.lat, p.lng)
      bounds.extend(pos)

      const marker = new kakao.maps.Marker({ map, position: pos })
      markersRef.current.push(marker)

      const infoContent = `
        <div style="padding:8px 12px;font-size:12px;font-family:system-ui,sans-serif;min-width:100px;line-height:1.6">
          <strong>${p.name}</strong><br/>
          <span style="color:#9ca3af">${p.meetingDate}</span>
        </div>
      `
      const infoWindow = new kakao.maps.InfoWindow({ content: infoContent, removable: true })
      kakao.maps.event.addListener(marker, 'click', () => infoWindow.open(map, marker))
    })

    if (allPlaces.length === 1) {
      map.setCenter(new kakao.maps.LatLng(allPlaces[0].lat, allPlaces[0].lng))
      map.setLevel(4)
    } else {
      map.setBounds(bounds)
    }
  }, [ready, allPlacesKey])

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
            {[
              {
                label: '+',
                title: '확대',
                onClick: () => mapInstance.current.setLevel(mapInstance.current.getLevel() - 1),
              },
              {
                label: '−',
                title: '축소',
                onClick: () => mapInstance.current.setLevel(mapInstance.current.getLevel() + 1),
              },
            ].map((btn) => (
              <button
                key={btn.label}
                onClick={btn.onClick}
                title={btn.title}
                className="flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-xl font-semibold leading-none text-gray-700 shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
              >
                {btn.label}
              </button>
            ))}
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
