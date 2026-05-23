import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getContact, createContact, updateContact } from '../api/contacts'

const RELATIONSHIPS = ['친구', '가족', '직장', '연인', '지인', '기타']

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  border: '1px solid #e5e7eb', borderRadius: 8,
  padding: '10px 12px', fontSize: 14, color: '#111',
  outline: 'none', fontFamily: 'inherit',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600,
  color: '#374151', marginBottom: 6,
}

export default function ContactFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [form, setForm] = useState({ name: '', relationship: '친구', birthday: '', memo: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    getContact(Number(id)).then(c => {
      setForm({
        name: c.name,
        relationship: c.relationship ?? '친구',
        birthday: c.birthday ?? '',
        memo: c.memo ?? '',
      })
    })
  }, [id, isEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = { ...form, birthday: form.birthday || undefined, memo: form.memo || undefined }
      if (isEdit) {
        await updateContact(Number(id), payload)
        navigate(`/contacts/${id}`)
      } else {
        const created = await createContact(payload)
        navigate(`/contacts/${created.id}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', minHeight: '100%', padding: '48px 24px' }}>
      <div style={{
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
        padding: '36px 40px', width: '100%', maxWidth: 480,
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 28, marginTop: 0 }}>
          {isEdit ? '지인 수정' : '지인 추가'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>이름 *</label>
            <input
              type="text" required value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="이름 입력"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>관계</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {RELATIONSHIPS.map(r => (
                <button
                  type="button" key={r}
                  onClick={() => setForm(p => ({ ...p, relationship: r }))}
                  style={{
                    padding: '7px 14px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
                    border: form.relationship === r ? '1px solid #111' : '1px solid #e5e7eb',
                    background: form.relationship === r ? '#111' : '#fff',
                    color: form.relationship === r ? '#fff' : '#374151',
                    fontFamily: 'inherit',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>생일</label>
            <input
              type="date" value={form.birthday}
              onChange={e => setForm(p => ({ ...p, birthday: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>메모</label>
            <textarea
              value={form.memo}
              onChange={e => setForm(p => ({ ...p, memo: e.target.value }))}
              rows={4} placeholder="간단한 메모"
              style={{ ...inputStyle, resize: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button" onClick={() => navigate(-1)}
              style={{
                flex: 1, padding: '11px', fontSize: 14, borderRadius: 8, cursor: 'pointer',
                border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontFamily: 'inherit',
              }}
            >
              취소
            </button>
            <button
              type="submit" disabled={loading}
              style={{
                flex: 1, padding: '11px', fontSize: 14, fontWeight: 600, borderRadius: 8, cursor: 'pointer',
                border: 'none', background: loading ? '#6b7280' : '#111', color: '#fff', fontFamily: 'inherit',
              }}
            >
              {loading ? '저장 중...' : isEdit ? '수정 완료' : '추가하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
