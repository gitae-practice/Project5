// 카카오맵 JS SDK 최소 타입 선언 (공식 @types 패키지 없음, 실제 사용하는 API만 정의)

interface KakaoLatLng {
  getLat(): number
  getLng(): number
}

interface KakaoMap {
  setLevel(level: number): void
  getLevel(): number
  setCenter(latlng: KakaoLatLng): void
  setBounds(bounds: KakaoLatLngBounds): void
}

interface KakaoLatLngBounds {
  extend(latlng: KakaoLatLng): void
}

interface KakaoMarker {
  setMap(map: KakaoMap | null): void
}

interface KakaoInfoWindow {
  open(map: KakaoMap, marker: KakaoMarker): void
}

interface KakaoPlaceSearchResult {
  place_name: string
  address_name: string
  y: string
  x: string
}

type KakaoPlacesStatus = 'OK' | 'ZERO_RESULT' | 'ERROR'

interface KakaoPlaces {
  keywordSearch(
    query: string,
    callback: (data: KakaoPlaceSearchResult[], status: KakaoPlacesStatus) => void,
  ): void
}

interface KakaoSDK {
  maps: {
    load(callback: () => void): void
    LatLng: new (lat: number, lng: number) => KakaoLatLng
    Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMap
    LatLngBounds: new () => KakaoLatLngBounds
    Marker: new (options: { map: KakaoMap; position: KakaoLatLng }) => KakaoMarker
    InfoWindow: new (options: { content: string; removable: boolean }) => KakaoInfoWindow
    event: {
      addListener(target: KakaoMarker, type: string, handler: () => void): void
    }
    services: {
      Places: new () => KakaoPlaces
      Status: { OK: KakaoPlacesStatus }
    }
  }
}

interface Window {
  kakao: KakaoSDK
}
