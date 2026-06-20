// 카카오맵 SDK를 동적으로 한 번만 로드하는 유틸리티
// autoload=false → kakao.maps.load(callback) 로 명시적 초기화

const APP_KEY = '429ad8e171d2de44ee44ce2f2f5e9a19'

type State = 'idle' | 'loading' | 'done' | 'error'

let state: State = 'idle'
const queue: Array<(ok: boolean) => void> = []

export function loadKakaoSdk(): Promise<boolean> {
  return new Promise((resolve) => {
    if (state === 'done') {
      resolve(true)
      return
    }
    if (state === 'error') {
      resolve(false)
      return
    }

    queue.push(resolve)

    if (state === 'loading') return
    state = 'loading'

    const script = document.createElement('script')
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${APP_KEY}&libraries=services&autoload=false`

    script.onload = () => {
      window.kakao.maps.load(() => {
        state = 'done'
        queue.splice(0).forEach((cb) => cb(true))
      })
    }

    script.onerror = () => {
      state = 'error'
      queue.splice(0).forEach((cb) => cb(false))
    }

    document.head.appendChild(script)
  })
}
