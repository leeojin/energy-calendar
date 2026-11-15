import type { TaskMoveHistoryResponse, TimeSlot } from '../api/types.ts'
import { addDays, mondayOf } from './dates.ts'
import { SLOT_LABEL } from './battery.ts'

export interface MoveItem {
  id: number
  time: string
  name: string
  from: { date: string; slot: TimeSlot }
  to: { date: string; slot: TimeSlot }
}
export interface MoveDay {
  date: string
  items: MoveItem[]
}

export function groupMovesByDay(list: readonly TaskMoveHistoryResponse[]): MoveDay[] {
  const sorted = [...list].sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
  )
  const days: MoveDay[] = []
  for (const m of sorted) {
    const date = m.createdAt.slice(0, 10)
    let day = days[days.length - 1]
    if (!day || day.date !== date) {
      day = { date, items: [] }
      days.push(day)
    }
    day.items.push({
      id: m.taskMoveHistoryId,
      time: m.createdAt.slice(11, 16),
      name: m.taskName,
      from: { date: m.fromDate, slot: m.fromTimeSlot },
      to: { date: m.toDate, slot: m.toTimeSlot },
    })
  }
  return days
}

export function earliestMovesMonday(today: string): string {
  return addDays(mondayOf(today), -28)
}
export function canGoPrevMoves(monday: string, today: string): boolean {
  return monday > earliestMovesMonday(today)
}

export function slotFilterLabel(slot: TimeSlot | null): string | null {
  return slot === null ? null : `${SLOT_LABEL[slot]} 할 일만 진하게 보여요`
}
