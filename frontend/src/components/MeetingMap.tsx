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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {allPlaces.length > 0 && (
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#9ca3af',
            letterSpacing: '0.05em',
            margin: '0 0 8px',
          }}
        >
          VISITED PLACES ({allPlaces.length})
        </p>
      )}

      {/* position:relative 래퍼 + 내부 absolute div → Kakao가 크기를 정확히 인식 */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          minHeight: 380,
          borderRadius: 10,
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          background: '#f9fafb',
        }}
      >
        <div ref={mapRef} style={{ position: 'absolute', inset: 0 }} />

        {/* 지도 컨트롤: + / - */}
        {ready && (
          <div
            style={{
              position: 'absolute',
              right: 10,
              bottom: 20,
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
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
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 4,
                  background: '#fff',
                  border: '1px solid #d1d5db',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                  fontSize: 20,
                  fontWeight: 600,
                  color: '#374151',
                  lineHeight: 1,
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}

        {sdkError && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: '#f9fafb',
            }}
          >
            <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>
              지도를 불러올 수 없어요
            </span>
            <span style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', lineHeight: 1.8 }}>
              네트워크 연결을 확인하거나 페이지를 새로고침 해주세요
            </span>
          </div>
        )}
      </div>

      {allPlaces.length === 0 && !sdkError && (
        <p style={{ textAlign: 'center', fontSize: 12, color: '#d1d5db', margin: '8px 0 0' }}>
          장소를 추가하면 지도에 표시돼요
        </p>
      )}
    </div>
  )
}
