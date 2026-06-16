import axios from 'axios'
import type { DashboardResponse } from '../types'

const api = axios.create({ baseURL: '/api' })

export const getDashboard = () => api.get<DashboardResponse>('/dashboard').then((r) => r.data)
