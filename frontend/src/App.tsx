import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ContactListPage from './pages/ContactListPage'
import ContactDetailPage from './pages/ContactDetailPage'
import ContactFormPage from './pages/ContactFormPage'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<ContactListPage />} />
        <Route path="/contacts/new" element={<ContactFormPage />} />
        <Route path="/contacts/:id" element={<ContactDetailPage />} />
        <Route path="/contacts/:id/edit" element={<ContactFormPage />} />
      </Route>
    </Routes>
  )
}

export default App
