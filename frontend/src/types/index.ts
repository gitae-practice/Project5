export interface Contact {
  id: number;
  name: string;
  relationship: string;
  photoUrl?: string;
  birthday?: string;
  memo?: string;
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

export interface Meeting {
  id: number;
  contactId: number;
  date: string;
  place?: string;
  memo?: string;
  createdAt: string;
}
