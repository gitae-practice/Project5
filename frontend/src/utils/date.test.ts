import { describe, expect, it } from 'vitest'
import { toDateKey } from './date'

describe('toDateKey', () => {
  it('월/일을 0으로 패딩한 YYYY-MM-DD 형식으로 반환한다', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('UTC로 변환하지 않고 로컬 날짜 그대로 사용한다', () => {
    // toISOString()을 썼다면 자정 근처 시각에서 UTC 변환으로 날짜가 하루 밀릴 수 있음
    const justAfterMidnight = new Date(2026, 5, 23, 0, 30)
    expect(toDateKey(justAfterMidnight)).toBe('2026-06-23')
  })
})
