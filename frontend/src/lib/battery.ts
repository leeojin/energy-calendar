import { addDays, mondayOf } from './dates.ts'
import type { DayResponse, TaskResponse, TimeSlot } from '../api/types.ts'

export const SLOTS: readonly TimeSlot[] = ['MORNING', 'AFTERNOON', 'EVENING']
export const SLOT_LABEL: Record<TimeSlot, string> = {
  MORNING: '오전',
  AFTERNOON: '오후',
  EVENING: '저녁',
}

export interface Ghost {
  date: string
  name: string
  cost: number
  timeSlot: TimeSlot
}

export const GHOST_ID = -1

export function ghostCells(date: string, ghost: Ghost | null): number {
  return ghost && ghost.date === date ? ghost.cost : 0
}

export function withGhost(day: DayResponse, ghost: Ghost | null): DayResponse {
  if (!ghost || ghost.date !== day.date) return day
  const fake: TaskResponse = {
    taskId: GHOST_ID,
    routineId: null,
    name: ghost.name,
    plannedDate: ghost.date,
    occurrenceDate: null,
    timeSlot: ghost.timeSlot,
    energyCost: ghost.cost,
    status: 'PLANNED',
    isVisible: false,
    completedAt: null,
    moveCount: 0,
    isLate: false,
    isLocked: false,
  }
  const used = day.usedEnergy + ghost.cost
  return {
    ...day,
    tasks: [...day.tasks, fake],
    usedEnergy: used,
    overflowEnergy: Math.max(0, used - day.dayBudget),
  }
}

export function emptyCircles(day: DayResponse, today: string, making: boolean): number {
  if (!making || day.date < today) return 0
  return Math.max(0, day.dayBudget - day.usedEnergy)
}

export function defaultSlot(day: DayResponse): TimeSlot {
  const list = ordered(day)
  return list.length > 0 ? list[list.length - 1].timeSlot : 'MORNING'
}

export function scaleCells(
  days: readonly DayResponse[],
  baseBudget = 0,
  ghost: Ghost | null = null,
): number {
  const maxB = Math.max(baseBudget, ...days.map((d) => d.dayBudget))
  const need = Math.max(maxB, ...days.map((d) => d.usedEnergy + ghostCells(d.date, ghost)))
  return Math.min(need, Math.max(20, 2 * maxB))
}

export interface Segment {
  task: TaskResponse
  start: number
  end: number
  inside: number
  over: number
  done: boolean
  late: boolean
  slotStart: boolean
}

function ordered(day: DayResponse): TaskResponse[] {
  return day.tasks
    .map((t, i) => ({ t, i }))
    .sort((a, b) => SLOTS.indexOf(a.t.timeSlot) - SLOTS.indexOf(b.t.timeSlot) || a.i - b.i)
    .map((x) => x.t)
}

export function segments(day: DayResponse, cells: number): Segment[] {
  const budget = day.dayBudget
  const out: Segment[] = []
  let pos = 0
  let prevSlot: TimeSlot | null = null
  for (const task of ordered(day)) {
    const start = pos
    const end = pos + task.energyCost
    pos = end
    const slotStart = task.timeSlot !== prevSlot
    prevSlot = task.timeSlot
    if (start >= cells) continue
    const inside = Math.max(0, Math.min(end, budget) - start)
    const over = Math.max(0, end - Math.max(start, budget))
    out.push({
      task,
      start,
      end,
      inside,
      over,
      done: task.status === 'DONE',
      late: task.isLate,
      slotStart,
    })
  }
  return out
}

export function slotMarks(
  day: DayResponse,
  cells: number,
): Array<{ slot: TimeSlot; start: number }> {
  return segments(day, cells)
    .filter((s) => s.slotStart)
    .map((s) => ({ slot: s.task.timeSlot, start: s.start }))
}

export function overflowOf(day: DayResponse): number {
  return day.overflowEnergy
}

export function hidesName(cost: number, cells: number): boolean {
  return cells > 0 && cost / cells < 0.05
}

export function withoutTasks(day: DayResponse, hidden: ReadonlySet<number>): DayResponse {
  if (hidden.size === 0 || !day.tasks.some((t) => hidden.has(t.taskId))) return day
  const tasks = day.tasks.filter((t) => !hidden.has(t.taskId))
  const used = tasks.reduce((a, t) => a + t.energyCost, 0)
  return { ...day, tasks, usedEnergy: used, overflowEnergy: Math.max(0, used - day.dayBudget) }
}

export function canPlaceHint(
  task: TaskResponse,
  targetDate: string,
  lockDate: string,
  today: string,
): boolean {
  void today
  if (task.status === 'DONE') return false
  if (targetDate < lockDate) return false
  if (task.routineId !== null && mondayOf(task.plannedDate) !== mondayOf(targetDate)) return false
  return true
}

export interface MiniBattery {
  kind: 'rest' | 'cells' | 'bar'
  budget: number
  done: number
  plan: number
  over: number
  past: boolean
  doneRatio: number
  planRatio: number
}

export function miniBattery(day: DayResponse, today: string): MiniBattery {
  const b = day.dayBudget
  const past = day.date < today
  const done = Math.min(day.doneEnergy, b)
  const plan = past ? 0 : Math.max(0, Math.min(day.usedEnergy, b) - done)
  const over = Math.max(0, day.usedEnergy - b)
  const kind = b === 0 ? 'rest' : b > 12 ? 'bar' : 'cells'
  return {
    kind,
    budget: b,
    done,
    plan,
    over,
    past,
    doneRatio: b > 0 ? done / b : 0,
    planRatio: b > 0 ? plan / b : 0,
  }
}

export function shiftMonth(ym: string, k: number): string {
  const [y, m] = ym.split('-').map(Number)
  const idx = y * 12 + (m - 1) + k
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`
}

export function lastDayOf(ym: string): string {
  return addDays(`${shiftMonth(ym, 1)}-01`, -1)
}

export function monthGrid(ym: string): string[] {
  const start = mondayOf(`${ym}-01`)
  const end = addDays(mondayOf(lastDayOf(ym)), 6)
  const out: string[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d)
  return out
}
