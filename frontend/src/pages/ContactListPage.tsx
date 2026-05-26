import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'

export default function ContactListPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Users size={28} className="text-gray-400" />
      </div>
      <h2 className="text-lg font-semibold text-gray-700 mb-1">지인을 선택하세요</h2>
      <p className="text-sm text-gray-400 mb-5">왼쪽 목록에서 지인을 클릭하거나 새로 추가하세요</p>
      <button
        onClick={() => navigate('/contacts/new')}
        className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
      >
        지인 추가하기
      </button>
    </div>
  )
}
