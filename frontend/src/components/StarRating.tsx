// 별점 표시/입력 공통 컴포넌트. onChange를 넘기면 클릭으로 별점 입력, 없으면 읽기 전용 표시
export default function StarRating({
  rating,
  onChange,
  size = 'text-xs',
}: {
  rating?: number
  onChange?: (rating: number) => void
  size?: string
}) {
  if (!onChange && !rating) return null

  return (
    <span className={`inline-flex items-center gap-px ${size}`}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n === rating ? 0 : n)}
            className="cursor-pointer border-none bg-transparent p-0 leading-none"
            title={`${n}점`}
          >
            <span className={n <= (rating ?? 0) ? 'text-[#f97316]' : 'text-gray-300'}>★</span>
          </button>
        ) : (
          <span key={n} className={n <= (rating ?? 0) ? 'text-[#f97316]' : 'text-gray-300'}>
            ★
          </span>
        ),
      )}
    </span>
  )
}
