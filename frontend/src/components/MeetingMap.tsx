import { useEffect, useRef } from 'react'
import type { Meeting } from '../types'

interface Props {
  meetings: Meeting[]
}

// 서울 기본 좌표
const DEFAULT_LAT = 37.5665
const DEFAULT_LNG = 126.9780

export default function MeetingMap({ meetings }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  const withCoords = meetings.filter(m => m.placeLat && m.placeLng)

  // 지도 초기화
  useEffect(() => {
    if (!mapRef.current) return
    const kakao = (window as any).kakao
    if (!kakao?.maps) return

    const center = new kakao.maps.LatLng(DEFAULT_LAT, DEFAULT_LNG)
    mapInstance.current = new kakao.maps.Map(mapRef.current, {
      center,
      level: 8,
    })
  }, [])

  // 마커 업데이트
  useEffect(() => {
    const kakao = (window as any).kakao
    if (!kakao?.maps || !mapInstance.current) return

    // 기존 마커 제거
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

    if (withCoords.length === 0) return

    const map = mapInstance.current
    const bounds = new kakao.maps.LatLngBounds()

    withCoords.forEach(m => {
      const pos = new kakao.maps.LatLng(m.placeLat, m.placeLng)
      bounds.extend(pos)

      const marker = new kakao.maps.Marker({ map, position: pos })
      markersRef.current.push(marker)

      const infoContent = `
        <div style="padding:8px 12px;font-size:12px;font-family:system-ui,sans-serif;min-width:100px">
          <strong>${m.place}</strong><br/>
          <span style="color:#9ca3af">${m.date}</span>
        </div>
      `
      const infoWindow = new kakao.maps.InfoWindow({ content: infoContent, removable: true })
      kakao.maps.event.addListener(marker, 'click', () => infoWindow.open(map, marker))
    })

    if (withCoords.length === 1) {
      map.setCenter(new kakao.maps.LatLng(withCoords[0].placeLat, withCoords[0].placeLng))
      map.setLevel(4)
    } else {
      map.setBounds(bounds)
    }
  }, [withCoords.length])

  return (
    <div>
      {withCoords.length > 0 && (
        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.05em', marginBottom: 8 }}>
          VISITED PLACES ({withCoords.length})
        </p>
      )}
      <div
        ref={mapRef}
        style={{ width: '100%', height: '100%', minHeight: 300, borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}
      />
      {withCoords.length === 0 && (
        <p style={{ textAlign: 'center', fontSize: 12, color: '#d1d5db', marginTop: 8 }}>
          장소를 추가하면 지도에 표시돼요
        </p>
      )}
    </div>
  )
}
