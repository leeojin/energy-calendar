import type { TimeSlot } from '../api/types.ts'
import { addDays } from './dates.ts'

const KEY = 'ec.firstRun'

export const startFirstRun = () => sessionStorage.setItem(KEY, '1')
export const endFirstRun = () => sessionStorage.removeItem(KEY)
export const inFirstRun = () => sessionStorage.getItem(KEY) !== null

export function slotAt(hour: number): TimeSlot {
  if (hour < 12) return 'MORNING'
  return hour < 18 ? 'AFTERNOON' : 'EVENING'
}

export function firstTaskBoxOpen(
  createdDate: string,
  today: string,
  todayTasks: number,
  dayBudget: number,
): boolean {
  return todayTasks === 0 && dayBudget > 0 && today <= addDays(createdDate, 2)
}
