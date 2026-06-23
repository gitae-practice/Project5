interface RatedPlace {
  name: string
  rating?: number
}

interface MeetingLike {
  date: string
  places: RatedPlace[]
}

// 같은 이름의 장소 중 가장 최근 만남에 매긴 별점을 찾음 (없으면 undefined)
export function findLastRating(meetings: MeetingLike[], name: string): number | undefined {
  let lastDate = ''
  let lastRating: number | undefined
  for (const m of meetings) {
    for (const p of m.places) {
      if (p.name === name && p.rating != null && m.date >= lastDate) {
        lastDate = m.date
        lastRating = p.rating
      }
    }
  }
  return lastRating
}
