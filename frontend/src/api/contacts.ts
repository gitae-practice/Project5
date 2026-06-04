import axios from 'axios';
import type { Contact, ContactSummary, Gift, Meeting, MeetingPlaceInput, Preference, PreferenceType } from '../types';

const api = axios.create({ baseURL: '/api' });

export const getContacts = () =>
  api.get<ContactSummary[]>('/contacts').then(r => r.data);

// 교집합 비교용: 취향 포함 전체 목록
export const getContactsFull = () =>
  api.get<Contact[]>('/contacts/full').then(r => r.data);

export const getContact = (id: number) =>
  api.get<Contact>(`/contacts/${id}`).then(r => r.data);

export const createContact = (data: Partial<Contact>) =>
  api.post<Contact>('/contacts', data).then(r => r.data);

export const updateContact = (id: number, data: Partial<Contact>) =>
  api.put<Contact>(`/contacts/${id}`, data).then(r => r.data);

export const deleteContact = (id: number) =>
  api.delete(`/contacts/${id}`);

// 드래그앤드롭 그룹 이동 전용
export const updateRelationship = (id: number, relationship: string) =>
  api.patch(`/contacts/${id}/relationship`, { relationship });

export const uploadPhoto = (contactId: number, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post<{ photoUrl: string }>(`/contacts/${contactId}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data.photoUrl);
};

export const addPreference = (contactId: number, type: PreferenceType, value: string) =>
  api.post<Preference>(`/contacts/${contactId}/preferences`, { type, value }).then(r => r.data);

export const deletePreference = (preferenceId: number) =>
  api.delete(`/contacts/preferences/${preferenceId}`);

export const getGifts = (contactId: number) =>
  api.get<Gift[]>(`/contacts/${contactId}/gifts`).then(r => r.data);

export const addGift = (contactId: number, data: Partial<Gift>) =>
  api.post<Gift>(`/contacts/${contactId}/gifts`, data).then(r => r.data);

export const deleteGift = (giftId: number) =>
  api.delete(`/contacts/gifts/${giftId}`);

export const getMeetings = (contactId: number) =>
  api.get<Meeting[]>(`/contacts/${contactId}/meetings`).then(r => r.data);

export const addMeeting = (contactId: number, data: { date: string; places?: MeetingPlaceInput[]; memo?: string }) =>
  api.post<Meeting>(`/contacts/${contactId}/meetings`, data).then(r => r.data);

// 여러 지인에게 동시에 만남 추가 (fan-out: 각자 Meeting 레코드 생성)
export const addMeetingBulk = (data: { contactIds: number[]; date: string; places?: MeetingPlaceInput[]; memo?: string }) =>
  api.post<Meeting[]>('/contacts/meetings/bulk', data).then(r => r.data);

export const updateMeeting = (meetingId: number, data: { date: string; places?: MeetingPlaceInput[]; memo?: string }) =>
  api.put<Meeting>(`/contacts/meetings/${meetingId}`, data).then(r => r.data);

export const deleteMeeting = (meetingId: number) =>
  api.delete(`/contacts/meetings/${meetingId}`);
