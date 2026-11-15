import type {
  LinkExpiry,
  PublicTaskStatus,
  ShareLinkResponse,
  TaskResponse,
  WeekResponse,
} from '../api/types.ts'
import { addDays, mondayOf } from './dates.ts'

export type VisibleTask = Omit<TaskResponse, 'status'> & {
  status: TaskResponse['status'] | 'DELETED'
}

export interface PostcardItem {
  name: string
  status: PublicTaskStatus
}
export interface PostcardDay {
  date: string
  items: PostcardItem[]
}

export function isLinkOpen(
  link: Pick<ShareLinkResponse, 'status' | 'expireDate'>,
  today: string,
): boolean {
  return link.status === 'OPEN' && (link.expireDate === null || today <= link.expireDate)
}

export function isVisibleOnLink(
  task: VisibleTask,
  link: Pick<ShareLinkResponse, 'status' | 'expireDate' | 'routineIds' | 'isOneTimeVisible'>,
  today: string,
): boolean {
  if (!isLinkOpen(link, today)) return false
  if (mondayOf(task.plannedDate) !== mondayOf(today)) return false
  if (task.status === 'DELETED') return false
  if (task.routineId !== null) return link.routineIds.includes(task.routineId)
  return link.isOneTimeVisible && task.isVisible
}

function publicStatus(task: VisibleTask, today: string): PublicTaskStatus {
  if (task.status === 'DONE') return 'DONE'
  return task.plannedDate < today ? 'MISSED' : 'PLANNED'
}

export function postcardDays(
  week: Pick<WeekResponse, 'weekStart' | 'today' | 'days'>,
  link: Pick<ShareLinkResponse, 'status' | 'expireDate' | 'routineIds' | 'isOneTimeVisible'>,
): PostcardDay[] {
  if (week.weekStart !== mondayOf(week.today)) return []
  return week.days.map((d) => ({
    date: d.date,
    items: d.tasks
      .filter((t) => isVisibleOnLink(t, link, week.today))
      .map((t) => ({ name: t.name, status: publicStatus(t, week.today) })),
  }))
}

export function linkExpiryOf(expireDate: string | null, today: string): LinkExpiry {
  if (expireDate === null) return 'NONE'
  return expireDate <= addDays(mondayOf(today), 6) ? 'THIS_WEEK' : 'FOUR_WEEKS'
}

export function expiryDate(expiry: LinkExpiry, today: string): string | null {
  if (expiry === 'THIS_WEEK') return addDays(mondayOf(today), 6)
  if (expiry === 'FOUR_WEEKS') return addDays(mondayOf(today), 27)
  return null
}

export function daysLeft(expireDate: string, today: string): number {
  const ms = (iso: string) => Date.parse(`${iso}T00:00:00Z`)
  return Math.round((ms(expireDate) - ms(today)) / 86400000)
}
