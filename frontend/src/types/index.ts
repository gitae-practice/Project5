export interface Contact {
  id: number;
  name: string;
  relationship: string;
  photoUrl?: string;
  birthday?: string;
  memo?: string;
  isMe?: boolean;
  createdAt: string;
  updatedAt: string;
  preferences: Preference[];
}

export interface ContactSummary {
  id: number;
  name: string;
  relationship: string;
  photoUrl?: string;
  birthday?: string;
  isMe?: boolean;
  groupId?: number | null; // 커스텀 그룹 ID (null이면 미분류)
}

export interface ContactGroup {
  id: number;
  name: string;
  sortOrder?: number;
}

export interface Preference {
  id: number;
  type: PreferenceType;
  value: string;
}

export type PreferenceType =
  | 'FOOD_LIKE'
  | 'FOOD_DISLIKE'
  | 'ALLERGY'
  | 'INTEREST'
  | 'BRAND'
  | 'DISLIKE'
  | 'ETC';

export interface Gift {
  id: number;
  contactId: number;
  item: string;
  price?: number;
  date?: string;
  occasion?: string;
  memo?: string;
  isWishlist: boolean;
  createdAt: string;
}

export interface MeetingPlace {
  id: number;
  name: string;
  lat?: number;
  lng?: number;
}

// 만남 추가/수정 시 장소 입력용 (id 없음)
export interface MeetingPlaceInput {
  name: string;
  lat?: number;
  lng?: number;
}

export interface Meeting {
  id: number;
  contactId: number;
  date: string;
  places: MeetingPlace[];
  memo?: string;
  createdAt: string;
}

// 대시보드 API 응답 타입
export interface DashboardBirthdayItem {
  id: number;
  name: string;
  photoUrl?: string;
  relationship: string;
  birthday: string;
  daysUntil: number;
}

export interface DashboardNotSeenItem {
  id: number;
  name: string;
  photoUrl?: string;
  relationship: string;
  lastMeetingDate?: string;
  daysSince?: number;
}

export interface DashboardRecentMeetingItem {
  meetingId: number;  // 수정/삭제용
  groupId?: string;   // 같은 그룹 만남 공유 UUID (없으면 레거시 레코드)
  contactId: number;
  contactName: string;
  contactPhotoUrl?: string;
  contactRelationship: string;
  date: string;
  places: MeetingPlace[];
  memo?: string;
}

export interface DashboardResponse {
  upcomingBirthdays: DashboardBirthdayItem[];
  notSeenRecently: DashboardNotSeenItem[];
  recentMeetings: DashboardRecentMeetingItem[];
  upcomingMeetings: DashboardRecentMeetingItem[]; // 오늘 이후 예정된 만남
}
