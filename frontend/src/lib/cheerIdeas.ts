import { DOW_NAMES } from './dates.ts'
import type { PostcardDay } from './visibility.ts'

function dowIndex(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return (new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay() + 6) % 7
}

export function cheerIdeas(days: PostcardDay[], today: string): string[] {
  const dayWord = (d: string) => (d === today ? '오늘' : `${DOW_NAMES[dowIndex(d)]}요일`)
  const out: string[] = []

  const doneDay = days
    .filter((d) => d.date <= today && d.items.some((i) => i.status === 'DONE'))
    .pop()
  if (doneDay) {
    const done = doneDay.items.filter((i) => i.status === 'DONE')
    const all = done.length >= 2 && done.length === doneDay.items.length
    out.push(
      all
        ? `${dayWord(doneDay.date)} ${done.length === 2 ? '둘 다' : '다'} 했네 👏`
        : `${dayWord(doneDay.date)} ${done[0].name} 했네 👏`,
    )
  }
  const todo = days.find((d) => d.date === today)?.items.find((i) => i.status === 'PLANNED')
  if (todo) out.push(`오늘 ${todo.name} 화이팅`)
  const next = days.find((d) => d.date > today && d.items.length)
  if (next) out.push(`${dayWord(next.date)} ${next.items[next.items.length - 1].name} 힘내`)
  const rest = days.filter((d) => d.date > today && d.items.length === 0)
  if (rest.length) {
    const weekend = rest.length >= 2 && rest.slice(-2).every((d) => dowIndex(d.date) >= 5)
    out.push(weekend ? '주말엔 푹 쉬어' : `${dayWord(rest[0].date)}엔 푹 쉬어`)
  }
  return [...new Set([...out, '잘하고 있어 👏', '이번 주도 화이팅'])]
    .filter((x) => [...x].length <= 30)
    .slice(0, 4)
}
