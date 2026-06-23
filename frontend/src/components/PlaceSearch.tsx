import { useState } from 'react'
import { createPortal } from 'react-dom'
import { loadKakaoSdk } from '../utils/kakaoLoader'

interface Props {
  value: string
  onSelect: (place: { name: string; lat: number; lng: number }) => void
  style?: React.CSSProperties
}

export default function PlaceSearch({ value, onSelect, style }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<KakaoPlaceSearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [sdkError, setSdkError] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    // SDK 로드 보장 후 검색
    const ok = await loadKakaoSdk()
    if (!ok) {
      setSdkError(true)
      return
    }
    setSdkError(false)
    const kakao = window.kakao
    const ps = new kakao.maps.services.Places()
    setSearching(true)
    ps.keywordSearch(query, (data, status) => {
      setSearching(false)
      setResults(status === kakao.maps.services.Status.OK ? data : [])
    })
  }

  const handleSelect = (place: KakaoPlaceSearchResult) => {
    onSelect({ name: place.place_name, lat: parseFloat(place.y), lng: parseFloat(place.x) })
    setOpen(false)
    setQuery('')
    setResults([])
  }

  const handleClose = () => {
    setOpen(false)
    setQuery('')
    setResults([])
    setSdkError(false)
  }

  // 모달을 document.body에 포털로 렌더링 → 부모 form의 submit 영향 없음
  const modal = open
    ? createPortal(
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center bg-black/45"
          onClick={handleClose}
        >
          <div
            className="flex max-h-[70vh] w-105 flex-col rounded-[10px] bg-white p-5 shadow-[0_8px_32px_rgba(0,0,0,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3.5 flex items-center justify-between">
              <span className="text-[15px] font-bold text-[#111]">장소 검색</span>
              <button
                type="button"
                onClick={handleClose}
                className="cursor-pointer border-none bg-transparent text-lg leading-none text-gray-400"
              >
                ✕
              </button>
            </div>

            <div className="mb-3 flex gap-2">
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSearch()
                  }
                }}
                placeholder="장소명 검색 (예: 성수동 카페)"
                className="flex-1 rounded-md border border-gray-200 px-3 py-2.25 text-[13px] outline-none"
              />
              {/* type="button" 필수 - 없으면 부모 form submit 트리거 */}
              <button
                type="button"
                onClick={handleSearch}
                className="cursor-pointer rounded-md border-none bg-[#111] px-4 py-2.25 text-[13px] text-white"
              >
                검색
              </button>
            </div>

            {sdkError && (
              <p className="m-0 py-2 text-center text-xs text-red-500">
                지도 SDK를 불러올 수 없어요. 네트워크를 확인해주세요.
              </p>
            )}

            <div className="flex-1 overflow-y-auto">
              {searching && (
                <p className="py-5 text-center text-[13px] text-gray-400">검색 중...</p>
              )}
              {!searching && results.length === 0 && query && !sdkError && (
                <p className="py-5 text-center text-[13px] text-gray-400">검색 결과가 없어요</p>
              )}
              {!searching && results.length === 0 && !query && (
                <p className="py-5 text-center text-[13px] text-gray-300">
                  위에 장소명을 입력하세요
                </p>
              )}
              {results.map((place, i) => (
                <div
                  key={i}
                  onClick={() => handleSelect(place)}
                  className={`cursor-pointer rounded-md px-2 py-2.5 hover:bg-gray-50 ${
                    i < results.length - 1 ? 'border-b border-gray-100' : 'border-b-0'
                  }`}
                >
                  <p className="m-0 mb-0.5 text-sm font-semibold text-[#111]">{place.place_name}</p>
                  <p className="m-0 text-xs text-gray-400">{place.address_name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )
    : null

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        style={style}
        className={`flex cursor-pointer items-center justify-between rounded-md border border-gray-200 bg-white px-2.5 py-2 text-[13px] ${
          value ? 'text-[#111]' : 'text-gray-400'
        }`}
      >
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">
          {value || '장소 검색'}
        </span>
        <span className="ml-1 shrink-0 text-[13px]">🔍</span>
      </div>
      {modal}
    </>
  )
}
