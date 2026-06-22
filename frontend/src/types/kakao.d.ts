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

// 인스턴스 내부를 직접 다루지 않고 Marker 생성자에 그대로 넘기기만 하는 opaque 핸들
type KakaoMarkerImage = object
type KakaoSize = object
type KakaoPoint = object

interface KakaoInfoWindow {
  open(map: KakaoMap, marker: KakaoMarker): void
  close(): void
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
    Size: new (width: number, height: number) => KakaoSize
    Point: new (x: number, y: number) => KakaoPoint
    MarkerImage: new (
      src: string,
      size: KakaoSize,
      options?: { offset?: KakaoPoint },
    ) => KakaoMarkerImage
    Marker: new (options: {
      map: KakaoMap
      position: KakaoLatLng
      image?: KakaoMarkerImage
    }) => KakaoMarker
    InfoWindow: new (options: {
      content: string
      removable: boolean
      zIndex?: number
    }) => KakaoInfoWindow
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
