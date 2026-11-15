import type {
  ConditionLevel,
  IsoDate,
  IsoDateTime,
  RoutineStatus,
  ShareLinkStatus,
  TaskStatus,
  TimeSlot,
} from '../api/types.ts'
import { addDays, mondayOf } from '../lib/dates.ts'

export interface DTask {
  id: number
  routineId: number | null
  name: string
  plannedDate: IsoDate
  occurrenceDate: IsoDate | null
  timeSlot: TimeSlot
  cost: number
  status: TaskStatus
  visible: boolean
  completedAt: IsoDateTime | null
  deleted: boolean
}
export interface DRoutine {
  id: number
  name: string
  cost: number
  slot: TimeSlot
  weekdays: number
  startDate: IsoDate
  endDate: IsoDate | null
  status: RoutineStatus
}
export interface DMove {
  id: number
  taskId: number
  fromDate: IsoDate
  fromSlot: TimeSlot
  toDate: IsoDate
  toSlot: TimeSlot
  createdAt: IsoDateTime
}
export interface DLink {
  id: number
  name: string
  token: string
  status: ShareLinkStatus | 'DELETED'
  expireDate: IsoDate | null
  oneTime: boolean
  routineIds: number[]
  createdAt: IsoDateTime
  closedAt: IsoDateTime | null
}
export interface DComment {
  id: number
  linkId: number
  nickname: string
  body: string
  createdAt: IsoDateTime
  weekStart: IsoDate
}
export interface DemoState {
  nickname: string
  createdDate: IsoDate
  budgets: Array<{ start: IsoDate; budget: number }>
  cond: Record<IsoDate, ConditionLevel>
  tasks: DTask[]
  routines: DRoutine[]
  moves: DMove[]
  links: DLink[]
  comments: DComment[]
  generated: Set<string>
  seq: { task: number; routine: number; move: number; link: number; comment: number }
}

const WEEKDAY_BITS = [1, 2, 4, 8, 16, 32, 64]

export function generateWeek(s: DemoState, monday: IsoDate, from: IsoDate | null): number {
  let created = 0
  for (const r of s.routines) {
    if (r.status !== 'ACTIVE') continue
    for (let i = 0; i < 7; i++) {
      if ((r.weekdays & WEEKDAY_BITS[i]) === 0) continue
      const date = addDays(monday, i)
      if (date < r.startDate || (r.endDate !== null && date > r.endDate)) continue
      if (from !== null && date < from) continue
      const key = `${r.id}:${date}`
      if (s.generated.has(key)) continue
      s.generated.add(key)
      s.tasks.push({
        id: s.seq.task++,
        routineId: r.id,
        name: r.name,
        plannedDate: date,
        occurrenceDate: date,
        timeSlot: r.slot,
        cost: r.cost,
        status: 'PLANNED',
        visible: false,
        completedAt: null,
        deleted: false,
      })
      created++
    }
  }
  return created
}

interface Once {
  day: number
  name: string
  slot: TimeSlot
  cost: number
  visible?: boolean
  miss?: boolean
  done?: boolean
  movedFrom?: Array<{ day: number; slot: TimeSlot; at: string }>
}

const ONCE: Once[] = [
  { day: -12, name: '친구 만나기', slot: 'EVENING', cost: 5, visible: true },
  { day: -10, name: '건강검진', slot: 'MORNING', cost: 5 },
  { day: -9, name: '마트 장보기', slot: 'AFTERNOON', cost: 2 },
  { day: -6, name: '빨래', slot: 'AFTERNOON', cost: 2 },
  {
    day: -2,
    name: '이불 빨래',
    slot: 'MORNING',
    cost: 3,
    movedFrom: [{ day: -5, slot: 'MORNING', at: '22:05:00' }],
  },
  { day: -2, name: '방 청소', slot: 'AFTERNOON', cost: 4 },
  { day: -3, name: '보험금 청구', slot: 'MORNING', cost: 2, miss: true },
  { day: 0, name: '주간 회의', slot: 'MORNING', cost: 3, done: true },
  {
    day: 1,
    name: '장보기',
    slot: 'EVENING',
    cost: 2,
    movedFrom: [{ day: 0, slot: 'EVENING', at: '20:41:00' }],
  },
  {
    day: 2,
    name: '보고서 초안',
    slot: 'AFTERNOON',
    cost: 4,
    movedFrom: [
      { day: 0, slot: 'AFTERNOON', at: '18:30:00' },
      { day: 1, slot: 'AFTERNOON', at: '19:05:00' },
    ],
  },
  { day: 3, name: '치과', slot: 'AFTERNOON', cost: 3 },
  { day: 4, name: '보고서 마감', slot: 'AFTERNOON', cost: 6 },
  { day: 4, name: '가족 저녁', slot: 'EVENING', cost: 3, visible: true },
  { day: 5, name: '정기 진료', slot: 'MORNING', cost: 4 },
  { day: 11, name: '발표', slot: 'AFTERNOON', cost: 5, visible: true },
  { day: 11, name: '팀 회식', slot: 'EVENING', cost: 4 },
  { day: 12, name: '반찬 만들기', slot: 'AFTERNOON', cost: 3 },
  { day: 18, name: '혈액 검사', slot: 'MORNING', cost: 4 },
  { day: 26, name: '이사', slot: 'MORNING', cost: 8, visible: true },
]

export function buildSeed(today: IsoDate): DemoState {
  const M = mondayOf(today)
  const at = (day: number, time: string): IsoDateTime => {
    const d = addDays(M, day)
    return `${d > today ? today : d}T${time}`
  }
  const s: DemoState = {
    nickname: '예시',
    createdDate: addDays(M, -35),
    budgets: [{ start: addDays(M, -35), budget: 12 }],
    cond: {},
    tasks: [],
    routines: [],
    moves: [],
    links: [],
    comments: [],
    generated: new Set(),
    seq: { task: 1, routine: 1, move: 1, link: 1, comment: 1 },
  }
  const routine = (
    name: string,
    cost: number,
    slot: TimeSlot,
    weekdays: number,
    start: IsoDate,
    end: IsoDate | null,
  ) =>
    s.routines.push({
      id: s.seq.routine++,
      name,
      cost,
      slot,
      weekdays,
      startDate: start,
      endDate: end,
      status: 'ACTIVE',
    })
  routine('약 먹기', 1, 'MORNING', 63, addDays(M, -35), null)
  routine('산책 15분', 2, 'AFTERNOON', 21, addDays(M, -35), null)
  routine('스트레칭', 1, 'EVENING', 19, addDays(M, -35), null)
  routine('물리치료', 3, 'EVENING', 8, M, addDays(M, 28))
  for (const w of [-21, -14, -7, 0, 7, 14]) generateWeek(s, addDays(M, w), null)

  for (const t of s.tasks) {
    if (t.plannedDate < today && t.id % 6 !== 0) {
      t.status = 'DONE'
      t.completedAt = `${t.plannedDate}T20:00:00`
    }
  }
  const todayMorning = s.tasks.find((t) => t.plannedDate === today && t.timeSlot === 'MORNING')
  if (todayMorning) {
    todayMorning.status = 'DONE'
    todayMorning.completedAt = `${today}T08:00:00`
  }

  for (const o of ONCE) {
    const date = addDays(M, o.day)
    const done = o.done === true || (!o.miss && date < today)
    const task: DTask = {
      id: s.seq.task++,
      routineId: null,
      name: o.name,
      plannedDate: date,
      occurrenceDate: null,
      timeSlot: o.slot,
      cost: o.cost,
      status: done ? 'DONE' : 'PLANNED',
      visible: o.visible === true,
      completedAt: done ? `${date <= today ? date : today}T19:00:00` : null,
      deleted: false,
    }
    s.tasks.push(task)
    let prev = {
      date: addDays(M, o.movedFrom?.[0]?.day ?? o.day),
      slot: o.movedFrom?.[0]?.slot ?? o.slot,
    }
    const steps = o.movedFrom ?? []
    steps.forEach((m, i) => {
      const next = steps[i + 1]
      const to = next ? { date: addDays(M, next.day), slot: next.slot } : { date, slot: o.slot }
      s.moves.push({
        id: s.seq.move++,
        taskId: task.id,
        fromDate: prev.date,
        fromSlot: prev.slot,
        toDate: to.date,
        toSlot: to.slot,
        createdAt: at(m.day, m.at),
      })
      prev = to
    })
  }

  s.cond[addDays(M, -1)] = 'REST'
  s.cond[addDays(M, -5)] = 'LOW'
  s.cond[addDays(M, 1)] = 'LOW'
  s.cond[addDays(M, 3)] = 'GOOD'
  s.cond[addDays(M, 6)] = 'REST'
  s.cond[addDays(M, 13)] = 'REST'

  s.links.push(
    {
      id: s.seq.link++,
      name: '운동 습관 봐줘',
      token: 'demo-example-link-1',
      status: 'OPEN',
      expireDate: null,
      oneTime: false,
      routineIds: [2, 3, 4],
      createdAt: `${addDays(M, -4)}T10:00:00`,
      closedAt: null,
    },
    {
      id: s.seq.link++,
      name: '약 챙기기 인증',
      token: 'demo-example-link-2',
      status: 'CLOSED',
      expireDate: null,
      oneTime: false,
      routineIds: [1],
      createdAt: `${addDays(M, -14)}T10:00:00`,
      closedAt: `${addDays(M, -3)}T10:00:00`,
    },
  )
  const cheer = (
    linkId: number,
    nickname: string,
    body: string,
    day: number,
    time: string,
    week: number,
  ) =>
    s.comments.push({
      id: s.seq.comment++,
      linkId,
      nickname,
      body,
      createdAt: at(day, time),
      weekStart: addDays(M, week),
    })
  cheer(1, '용감한 다람쥐', '금요일 너무 빡세다 ㅋㅋ', 1, '23:10:00', 0)
  cheer(1, '배고픈 펭귄', '물리치료 첫날 힘내', 1, '12:02:00', 0)
  cheer(1, '졸린 수달', '스트레칭 화이팅!!', 0, '21:47:00', 0)
  cheer(1, '씩씩한 판다', '토요일 방 청소 대단해', -2, '20:15:00', -7)
  cheer(2, '수줍은 부엉이', '이번 주도 약 꼬박꼬박!', -7, '08:40:00', -7)
  cheer(2, '느긋한 오리', '오늘도 약 잘 챙겼네', -12, '09:13:00', -14)
  return s
}
