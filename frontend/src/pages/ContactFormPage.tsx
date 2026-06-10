import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getContact, createContact, updateContact, uploadPhoto } from '../api/contacts'
import { getGroups, assignGroup } from '../api/groups'
import type { ContactGroup } from '../types'

const RELATIONSHIPS = ['친구', '가족', '직장', '연인', '지인', '기타']

const REL_COLOR: Record<string, string> = {
  친구: '#3b82f6', 가족: '#22c55e', 직장: '#f59e0b',
  연인: '#ec4899', 지인: '#9ca3af', 기타: '#9ca3af',
}

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
  const [searchParams] = useSearchParams()
  const isMe = searchParams.get('me') === 'true'
  const isEdit = !!id

  const [form, setForm] = useState({ name: '', relationship: '친구', birthday: '', memo: '' })
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [groups, setGroups] = useState<ContactGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<number | ''>('')

  useEffect(() => {
    if (!isMe) getGroups().then(setGroups)
  }, [isMe])

  useEffect(() => {
    if (!isEdit) {
      // /contacts/new로 이동 시 폼 전체 초기화
      setForm({ name: '', relationship: isMe ? '본인' : '친구', birthday: '', memo: '' })
      setCurrentPhotoUrl(null)
      setPhotoFile(null)
      setPhotoPreview(null)
      setSelectedGroupId('')
      return
    }
    getContact(Number(id)).then(c => {
      setForm({
        name: c.name,
        relationship: c.relationship ?? '친구',
        birthday: c.birthday ?? '',
        memo: c.memo ?? '',
      })
      setCurrentPhotoUrl(c.photoUrl ?? null)
      setPhotoFile(null)
      setPhotoPreview(null)
    })
  }, [id, isEdit])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = ev => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...form,
        birthday: form.birthday || undefined,
        memo: form.memo || undefined,
        ...(isMe ? { isMe: true } : {}),
      }
      let contactId: number
      if (isEdit) {
        await updateContact(Number(id), payload)
        contactId = Number(id)
      } else {
        const created = await createContact(payload)
        contactId = created.id
      }
      // 사진 파일이 선택된 경우 업로드
      if (photoFile) {
        await uploadPhoto(contactId, photoFile)
      }
      // 새 지인 추가 시 선택한 그룹에 배정
      if (!isEdit && selectedGroupId !== '') {
        await assignGroup(contactId, selectedGroupId)
      }
      navigate(`/contacts/${contactId}`)
    } finally {
      setLoading(false)
    }
  }

  const avatarUrl = photoPreview ?? currentPhotoUrl
  const color = REL_COLOR[form.relationship] ?? '#9ca3af'

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', minHeight: '100%', padding: '48px 24px' }}>
      <div style={{
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
        padding: '36px 40px', width: '100%', maxWidth: 480,
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 28, marginTop: 0 }}>
          {isMe ? '내 정보 등록' : isEdit ? '지인 수정' : '지인 추가'}
        </h2>

        <form onSubmit={handleSubmit}>
          {/* 프로필 사진 업로드 */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: 80, height: 80, borderRadius: '50%', cursor: 'pointer',
                  overflow: 'hidden', border: '2px solid #e5e7eb',
                  background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="프로필" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 28, fontWeight: 700, color }}>
                    {form.name ? form.name[0] : '?'}
                  </span>
                )}
              </div>
              {/* 카메라 아이콘 배지 */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 24, height: 24, borderRadius: '50%',
                  background: '#111', border: '2px solid #fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: 12,
                }}
              >
                <span style={{ color: '#fff', fontSize: 11 }}>✎</span>
              </div>
              <input
                ref={fileInputRef} type="file"
                accept="image/*" onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>이름 *</label>
            <input
              type="text" required value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="이름 입력"
              style={inputStyle}
            />
          </div>

          {!isMe && (
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
          )}

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

          {!isEdit && !isMe && groups.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <label style={labelStyle}>그룹</label>
              <select
                value={selectedGroupId}
                onChange={e => setSelectedGroupId(e.target.value === '' ? '' : Number(e.target.value))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">그룹 없음</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}

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
