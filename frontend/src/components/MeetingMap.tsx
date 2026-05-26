import { useEffect, useRef } from 'react'
import type { Meeting } from '../types'

interface Props {
  meetings: Meeting[]
}

// 좌표가 있는 만남만 지도에 표시
export default function MeetingMap({ meetings }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)

  const withCoords = meetings.filter(m => m.placeLat && m.placeLng)

  useEffect(() => {
    if (!mapRef.current || withCoords.length === 0) return
    const kakao = (window as any).kakao
    if (!kakao?.maps) return

    const center = new kakao.maps.LatLng(withCoords[0].placeLat, withCoords[0].placeLng)

    if (!mapInstance.current) {
      mapInstance.current = new kakao.maps.Map(mapRef.current, {
        center,
        level: 5,
      })
    }

    const map = mapInstance.current
    const bounds = new kakao.maps.LatLngBounds()

    withCoords.forEach(m => {
      const pos = new kakao.maps.LatLng(m.placeLat, m.placeLng)
      bounds.extend(pos)

      const marker = new kakao.maps.Marker({ map, position: pos })

      // 마커 클릭 시 장소명 + 날짜 표시
      const infoContent = `
        <div style="padding:8px 12px;font-size:12px;font-family:system-ui,sans-serif;min-width:120px">
          <strong style="font-size:13px">${m.place}</strong><br/>
          <span style="color:#9ca3af">${m.date}</span>
        </div>
      `
      const infoWindow = new kakao.maps.InfoWindow({ content: infoContent, removable: true })
      kakao.maps.event.addListener(marker, 'click', () => infoWindow.open(map, marker))
    })

    // 모든 마커가 보이도록 영역 조정
    if (withCoords.length > 1) {
      map.setBounds(bounds)
    } else {
      map.setCenter(new kakao.maps.LatLng(withCoords[0].placeLat, withCoords[0].placeLng))
      map.setLevel(4)
    }
  }, [withCoords.length])

  if (withCoords.length === 0) return null

  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.05em', marginBottom: 8 }}>
        VISITED PLACES ({withCoords.length})
      </p>
      <div
        ref={mapRef}
        style={{ width: '100%', height: 280, borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' }}
      />
    </div>
  )
}
