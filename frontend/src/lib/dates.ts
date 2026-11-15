const DAY_MS = 86_400_000

function toUtcNoon(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12))
}

function fromUtc(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addDays(iso: string, days: number): string {
  return fromUtc(new Date(toUtcNoon(iso).getTime() + days * DAY_MS))
}

function weekdayIndex(iso: string): number {
  return (toUtcNoon(iso).getUTCDay() + 6) % 7
}

export function mondayOf(iso: string): string {
  return addDays(iso, -weekdayIndex(iso))
}

export interface WeekTitle {
  year: number
  month: number
  weekOfMonth: number
}

export function weekTitle(weekStart: string): WeekTitle {
  const thursday = addDays(mondayOf(weekStart), 3)
  const [year, month, day] = thursday.split('-').map(Number)
  return { year, month, weekOfMonth: Math.ceil(day / 7) }
}

export function weekRangeText(weekStart: string, weekEnd: string): string {
  const [y1, m1, d1] = weekStart.split('-').map(Number)
  const [y2, m2, d2] = weekEnd.split('-').map(Number)
  if (y1 !== y2) return `${y1}년 ${m1}월 ${d1}일 – ${y2}년 ${m2}월 ${d2}일`
  if (m1 !== m2) return `${y1}년 ${m1}월 ${d1}일 – ${m2}월 ${d2}일`
  return `${y1}년 ${m1}월 ${d1}일 – ${d2}일`
}

export function todayKst(now: Date = new Date()): string {
  return fromUtc(new Date(now.getTime() + 9 * 3_600_000))
}

export function isoWeekdays(mask: number): number[] {
  const result: number[] = []
  for (let i = 0; i < 7; i++) {
    if (mask & (1 << i)) result.push(i)
  }
  return result
}

export const DOW_NAMES = ['월', '화', '수', '목', '금', '토', '일'] as const

export function daysText(mask: number): string {
  const days = isoWeekdays(mask)
  if (days.length === 7) return '매일'
  if (days.length === 6 && !days.includes(6)) return '월–토'
  return days.map((i) => DOW_NAMES[i]).join('')
}

const OCCURRENCE_WEEKS = 8

export function occurrencePreview(
  mask: number,
  start: string,
  end: string | null,
  weekStart: string,
  today: string,
): string[] {
  if (weekStart > addDays(mondayOf(today), OCCURRENCE_WEEKS * 7)) return []
  const days = isoWeekdays(mask)
  return days
    .map((i) => addDays(weekStart, i))
    .filter((d) => d >= start && (end === null || d <= end) && d >= today)
}

const md = (iso: string) => {
  const [, m, d] = iso.split('-')
  return `${+m}/${+d}`
}

const dowOf = (iso: string) => DOW_NAMES[(new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7]

export function occurrenceSentence(
  mask: number,
  start: string,
  end: string | null,
  slotLabel: string,
  today: string,
): string {
  if (mask === 0) return '요일을 골라요.'
  const dates = occurrencePreview(mask, start, end, mondayOf(today), today)
  if (dates.length === 0) return '이번 주에는 안 나와요.'
  return `이번 주에는 ${dates.map((d) => `${dowOf(d)} ${md(d)}`).join(', ')} ${slotLabel}에 나와요.`
}

export function hourKst(now: Date = new Date()): number {
  return new Date(now.getTime() + 9 * 3_600_000).getUTCHours()
}
