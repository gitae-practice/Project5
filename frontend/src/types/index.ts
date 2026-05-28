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
