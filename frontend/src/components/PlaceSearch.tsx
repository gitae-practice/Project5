import { useState } from 'react'

interface KakaoPlace {
  place_name: string
  address_name: string
  y: string // 위도
  x: string // 경도
}

interface Props {
  value: string
  onSelect: (place: { name: string; lat: number; lng: number }) => void
  style?: React.CSSProperties
}

export default function PlaceSearch({ value, onSelect, style }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<KakaoPlace[]>([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)

  const handleSearch = () => {
    if (!query.trim()) return
    const kakao = (window as any).kakao
    if (!kakao) return
    const ps = new kakao.maps.services.Places()
    setSearching(true)
    ps.keywordSearch(query, (data: KakaoPlace[], status: string) => {
      setSearching(false)
      setResults(status === kakao.maps.services.Status.OK ? data : [])
    })
  }

  const handleSelect = (place: KakaoPlace) => {
    onSelect({ name: place.place_name, lat: parseFloat(place.y), lng: parseFloat(place.x) })
    setOpen(false)
    setQuery('')
    setResults([])
  }

  const handleClose = () => {
    setOpen(false)
    setQuery('')
    setResults([])
  }

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        style={{
          border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 10px',
          fontSize: 13, color: value ? '#111' : '#9ca3af',
          cursor: 'pointer', background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          ...style,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || '장소 검색'}
        </span>
        <span style={{ fontSize: 13, flexShrink: 0, marginLeft: 4 }}>🔍</span>
      </div>

      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={handleClose}
        >
          <div
            style={{
              background: '#fff', borderRadius: 10, padding: 20,
              width: 420, maxHeight: '70vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>장소 검색</span>
              <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9ca3af', lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                autoFocus
                type="text" value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="장소명 검색 (예: 성수동 카페)"
                style={{
                  flex: 1, border: '1px solid #e5e7eb', borderRadius: 6,
                  padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit',
                }}
              />
              <button
                onClick={handleSearch}
                style={{
                  padding: '9px 16px', background: '#111', color: '#fff',
                  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
                }}
              >
                검색
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {searching && (
                <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: '20px 0' }}>검색 중...</p>
              )}
              {!searching && results.length === 0 && query && (
                <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: '20px 0' }}>검색 결과가 없어요</p>
              )}
              {!searching && results.length === 0 && !query && (
                <p style={{ textAlign: 'center', color: '#d1d5db', fontSize: 13, padding: '20px 0' }}>위에 장소명을 입력하세요</p>
              )}
              {results.map((place, i) => (
                <div
                  key={i}
                  onClick={() => handleSelect(place)}
                  style={{
                    padding: '10px 8px', borderRadius: 6, cursor: 'pointer',
                    borderBottom: i < results.length - 1 ? '1px solid #f3f4f6' : 'none',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f9fafb'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 600, color: '#111' }}>{place.place_name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>{place.address_name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
