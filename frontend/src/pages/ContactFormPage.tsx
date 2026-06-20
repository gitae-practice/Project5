import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getContact, createContact, updateContact, uploadPhoto } from '../api/contacts'
import { getGroups, assignGroup } from '../api/groups'
import type { ContactGroup } from '../types'

const RELATIONSHIPS = ['친구', '가족', '직장', '연인', '지인', '기타']

const REL_COLOR: Record<string, string> = {
  친구: '#3b82f6',
  가족: '#22c55e',
  직장: '#f59e0b',
  연인: '#ec4899',
  지인: '#9ca3af',
  기타: '#9ca3af',
}

const inputClass =
  'box-border w-full rounded-lg border border-gray-200 px-3 py-[10px] text-sm text-[#111] outline-none'

const labelClass = 'mb-1.5 block text-[13px] font-semibold text-gray-700'

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
    getContact(Number(id)).then((c) => {
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
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string)
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
    <div className="flex min-h-full items-start justify-center px-6 py-12">
      <div className="w-full max-w-[480px] rounded-xl border border-gray-200 bg-white px-10 py-9">
        <h2 className="mb-7 mt-0 text-xl font-bold text-[#111]">
          {isMe ? '내 정보 등록' : isEdit ? '지인 수정' : '지인 추가'}
        </h2>

        <form onSubmit={handleSubmit}>
          {/* 프로필 사진 업로드 */}
          <div className="mb-7 flex justify-center">
            <div className="relative inline-block">
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{ background: color + '22' }}
                className="flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-gray-200"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="프로필" className="h-full w-full object-cover" />
                ) : (
                  <span style={{ color }} className="text-[28px] font-bold">
                    {form.name ? form.name[0] : '?'}
                  </span>
                )}
              </div>
              {/* 카메라 아이콘 배지 */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-[#111] text-xs"
              >
                <span className="text-[11px] text-white">✎</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          <div className="mb-5">
            <label className={labelClass}>이름 *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="이름 입력"
              className={inputClass}
            />
          </div>

          {!isMe && (
            <div className="mb-5">
              <label className={labelClass}>관계</label>
              <div className="flex flex-wrap gap-2">
                {RELATIONSHIPS.map((r) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setForm((p) => ({ ...p, relationship: r }))}
                    className={`cursor-pointer rounded-md px-3.5 py-[7px] text-[13px] ${
                      form.relationship === r
                        ? 'border border-[#111] bg-[#111] text-white'
                        : 'border border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-5">
            <label className={labelClass}>생일</label>
            <input
              type="date"
              value={form.birthday}
              onChange={(e) => setForm((p) => ({ ...p, birthday: e.target.value }))}
              className={inputClass}
            />
          </div>

          <div className="mb-7">
            <label className={labelClass}>메모</label>
            <textarea
              value={form.memo}
              onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))}
              rows={4}
              placeholder="간단한 메모"
              className={`${inputClass} resize-none`}
            />
          </div>

          {!isEdit && !isMe && groups.length > 0 && (
            <div className="mb-7">
              <label className={labelClass}>그룹</label>
              <select
                value={selectedGroupId}
                onChange={(e) =>
                  setSelectedGroupId(e.target.value === '' ? '' : Number(e.target.value))
                }
                onFocus={() => getGroups().then(setGroups)}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="">그룹 없음</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 cursor-pointer rounded-lg border border-gray-200 bg-white py-[11px] text-sm text-gray-700"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 cursor-pointer rounded-lg border-none py-[11px] text-sm font-semibold text-white ${
                loading ? 'bg-gray-500' : 'bg-[#111]'
              }`}
            >
              {loading ? '저장 중...' : isEdit ? '수정 완료' : '추가하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
