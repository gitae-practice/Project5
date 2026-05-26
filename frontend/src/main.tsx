import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// Kakao Maps SDK 동적 로드 (import.meta.env로 키 주입)
const kakaoKey = import.meta.env.VITE_KAKAO_MAP_KEY
if (kakaoKey) {
  const script = document.createElement('script')
  script.type = 'text/javascript'
  script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&libraries=services`
  document.head.appendChild(script)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
