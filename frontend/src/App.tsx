import { Routes, Route, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import ContactListPage from './pages/ContactListPage'
import ContactDetailPage from './pages/ContactDetailPage'
import ContactFormPage from './pages/ContactFormPage'

function App() {
  // /contacts/new ↔ /contacts/:id/edit 전환 시 같은 컴포넌트를 재사용하지 않고
  // 새로 마운트시켜 폼 상태를 깨끗하게 초기화한다.
  const location = useLocation()
  const formKey = location.pathname + location.search

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<ContactListPage />} />
        <Route path="/contacts/new" element={<ContactFormPage key={formKey} />} />
        <Route path="/contacts/:id" element={<ContactDetailPage />} />
        <Route path="/contacts/:id/edit" element={<ContactFormPage key={formKey} />} />
      </Route>
    </Routes>
  )
}

export default App
