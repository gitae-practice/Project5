import axios from 'axios'
import type { ContactGroup } from '../types'

const api = axios.create({ baseURL: '/api' })

export const getGroups = () =>
  api.get<ContactGroup[]>('/groups').then(r => r.data)

export const createGroup = (name: string) =>
  api.post<ContactGroup>('/groups', { name }).then(r => r.data)

export const updateGroup = (id: number, name: string) =>
  api.put<ContactGroup>(`/groups/${id}`, { name }).then(r => r.data)

export const deleteGroup = (id: number) =>
  api.delete(`/groups/${id}`)

export const assignGroup = (contactId: number, groupId: number | null) =>
  api.patch(`/contacts/${contactId}/group`, { groupId })
