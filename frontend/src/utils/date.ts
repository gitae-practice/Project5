// 로컬 타임존 기준 YYYY-MM-DD 문자열 생성
// Date.toISOString()은 UTC로 변환하기 때문에 한국(UTC+9) 등에서는 날짜가 하루 밀릴 수 있어 사용하지 않는다.
export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayKey(): string {
  return toDateKey(new Date())
}
