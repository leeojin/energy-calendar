import { request } from './client.ts'
import type { ApiPort } from './port.ts'

const e = encodeURIComponent

export const httpApi: ApiPort = {
  getHealth: () => request('GET', '/api/health'),
  signup: (req) => request('POST', '/api/auth/signup', req),
  login: (req) => request('POST', '/api/auth/login', req),
  logout: () => request('POST', '/api/auth/logout'),
  getMe: () => request('GET', '/api/me'),
  updateNickname: (req) => request('PATCH', '/api/me/nickname', req),
  updatePassword: (req) => request('PATCH', '/api/me/password', req),
  updateEnergyBudget: (req) => request('PATCH', '/api/me/energy-budget', req),
  reauth: (req) => request('POST', '/api/me/reauth', req),
  getDeleteSummary: () => request('GET', '/api/me/delete-summary'),
  deleteAccount: (req) => request('DELETE', '/api/me', req),
  putDayCondition: (date, req) => request('PUT', `/api/day-conditions/${e(date)}`, req),
  createWeekOccurrences: (monday) => request('POST', `/api/weeks/${e(monday)}/occurrences`),
  getWeek: (monday) => request('GET', `/api/weeks/${e(monday)}`),
  createMonthOccurrences: (month) => request('POST', `/api/months/${e(month)}/occurrences`),
  getMonth: (month) => request('GET', `/api/months/${e(month)}`),
  createTask: (req) => request('POST', '/api/tasks', req),
  updateTask: (id, req) => request('PATCH', `/api/tasks/${id}`, req),
  deleteTask: (id) => request('DELETE', `/api/tasks/${id}`, undefined, { keepalive: true }),
  completeTask: (id) => request('POST', `/api/tasks/${id}/complete`),
  uncompleteTask: (id) => request('POST', `/api/tasks/${id}/uncomplete`),
  moveTask: (id, req) => request('POST', `/api/tasks/${id}/move`, req),
  getTaskMoves: (id) => request('GET', `/api/tasks/${id}/moves`),
  getMovesOfWeek: (monday) => request('GET', `/api/moves?week=${e(monday)}`),
  getRoutines: () => request('GET', '/api/routines'),
  createRoutine: (req) => request('POST', '/api/routines', req),
  updateRoutineName: (id, req) => request('PATCH', `/api/routines/${id}/name`, req),
  updateRoutineEnergyCost: (id, req) => request('PATCH', `/api/routines/${id}/energy-cost`, req),
  endRoutine: (id) => request('POST', `/api/routines/${id}/end`),
  getShareLinks: () => request('GET', '/api/share-links'),
  createShareLink: (req) => request('POST', '/api/share-links', req),
  updateShareLink: (id, req) => request('PATCH', `/api/share-links/${id}`, req),
  closeShareLink: (id) =>
    request('POST', `/api/share-links/${id}/close`, undefined, { keepalive: true }),
  deleteShareLink: (id) =>
    request('DELETE', `/api/share-links/${id}`, undefined, { keepalive: true }),
  deleteShareLinkWithComments: (id) =>
    request('DELETE', `/api/share-links/${id}/with-comments`, undefined, { keepalive: true }),
  addShareLinkRoutine: (id, routineId) =>
    request('PUT', `/api/share-links/${id}/routines/${routineId}`),
  removeShareLinkRoutine: (id, routineId) =>
    request('DELETE', `/api/share-links/${id}/routines/${routineId}`),
  getShareLinkComments: (id) => request('GET', `/api/share-links/${id}/comments`),
  deleteShareLinkComment: (commentId) =>
    request('DELETE', `/api/share-link-comments/${commentId}`, undefined, { keepalive: true }),
  getPublicShare: (token) => request('GET', `/api/public/share/${e(token)}`),
  createPublicComment: (token, req) =>
    request('POST', `/api/public/share/${e(token)}/comments`, req),
}
