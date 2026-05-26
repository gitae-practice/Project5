import { useEffect, useRef, useState } from 'react'
import type { Meeting } from '../types'
import { loadKakaoSdk } from '../utils/kakaoLoader'

const DEFAULT_LAT = 37.5665
const DEFAULT_LNG = 126.9780

interface Props {
  meetings: Meeting[]
}

export default function MeetingMap({ meetings }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const locationMarkerRef = useRef<any>(null) // 현재 위치 마커
  const locationInfoRef = useRef<any>(null)   // 현재 위치 인포윈도우
  const [ready, setReady] = useState(false)
  const [sdkError, setSdkError] = useState(false)
  const [locating, setLocating] = useState(false)

  const withCoords = meetings.filter(m => m.placeLat && m.placeLng)

  // SDK 동적 로드 → 지도 초기화
  useEffect(() => {
    loadKakaoSdk().then(ok => {
      if (!ok) { setSdkError(true); return }
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

  // 마커 업데이트 (지도 준비 & 만남 변경 시)
  useEffect(() => {
    const kakao = (window as any).kakao
    if (!ready || !kakao?.maps || !mapInstance.current) return

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
        <div style="padding:8px 12px;font-size:12px;font-family:system-ui,sans-serif;min-width:100px;line-height:1.6">
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
  }, [ready, withCoords.length])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {withCoords.length > 0 && (
        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.05em', margin: '0 0 8px' }}>
          VISITED PLACES ({withCoords.length})
        </p>
      )}

      {/* position:relative 래퍼 + 내부 absolute div → Kakao가 크기를 정확히 인식 */}
      <div style={{ flex: 1, position: 'relative', minHeight: 380, borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden', background: '#f9fafb' }}>
        <div ref={mapRef} style={{ position: 'absolute', inset: 0 }} />

        {/* 지도 컨트롤: +  /  -  /  현재위치 */}
        {ready && (
          <div style={{
            position: 'absolute', right: 10, bottom: 20, zIndex: 10,
            display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            {[
              { label: '+', title: '확대', onClick: () => mapInstance.current.setLevel(mapInstance.current.getLevel() - 1) },
              { label: '−', title: '축소', onClick: () => mapInstance.current.setLevel(mapInstance.current.getLevel() + 1) },
              {
                label: locating ? '…' : '⊙', title: '현재 위치',
                onClick: () => {
                  if (!navigator.geolocation || locating) return
                  setLocating(true)
                  navigator.geolocation.getCurrentPosition(
                    pos => {
                      setLocating(false)
                      const kakao = (window as any).kakao
                      const loc = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude)

                      // 기존 현재 위치 마커 제거
                      if (locationMarkerRef.current) locationMarkerRef.current.setMap(null)
                      if (locationInfoRef.current) locationInfoRef.current.close()

                      // 파란 원 이미지로 현재 위치 마커 생성
                      const imgSrc = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png'
                      const imgSize = new kakao.maps.Size(24, 35)
                      const markerImg = new kakao.maps.MarkerImage(imgSrc, imgSize)

                      const marker = new kakao.maps.Marker({ map: mapInstance.current, position: loc, image: markerImg })
                      locationMarkerRef.current = marker

                      const accuracy = Math.round(pos.coords.accuracy)
                      const infoContent = `
                        <div style="padding:8px 12px;font-size:12px;font-family:system-ui,sans-serif;line-height:1.6;min-width:120px">
                          <strong style="color:#1d4ed8">현재 위치</strong><br/>
                          <span style="color:#9ca3af">정확도 약 ${accuracy}m</span>
                        </div>
                      `
                      const infoWindow = new kakao.maps.InfoWindow({ content: infoContent, removable: true })
                      infoWindow.open(mapInstance.current, marker)
                      locationInfoRef.current = infoWindow

                      mapInstance.current.setCenter(loc)
                      mapInstance.current.setLevel(4)
                    },
                    () => setLocating(false),
                    { enableHighAccuracy: true, timeout: 10000 }
                  )
                },
              },
            ].map(btn => (
              <button
                key={btn.label}
                onClick={btn.onClick}
                title={btn.title}
                style={{
                  width: 32, height: 32, borderRadius: 4,
                  background: '#fff', border: '1px solid #d1d5db',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                  fontSize: btn.label === '⊙' ? 18 : 20, fontWeight: 600, color: '#374151',
                  lineHeight: 1,
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}

        {sdkError && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 8, background: '#f9fafb',
          }}>
            <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>지도를 불러올 수 없어요</span>
            <span style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', lineHeight: 1.8 }}>
              네트워크 연결을 확인하거나 페이지를 새로고침 해주세요
            </span>
          </div>
        )}
      </div>

      {withCoords.length === 0 && !sdkError && (
        <p style={{ textAlign: 'center', fontSize: 12, color: '#d1d5db', margin: '8px 0 0' }}>
          장소를 추가하면 지도에 표시돼요
        </p>
      )}
    </div>
  )
}
