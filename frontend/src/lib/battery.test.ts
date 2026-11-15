import { describe, expect, it } from 'vitest'
import type { DayResponse, TaskResponse } from '../api/types.ts'
import {
  canPlaceHint,
  defaultSlot,
  emptyCircles,
  ghostCells,
  hidesName,
  miniBattery,
  monthGrid,
  shiftMonth,
  overflowOf,
  scaleCells,
  segments,
  slotMarks,
  withGhost,
  withoutTasks,
} from './battery.ts'

let nextId = 1
function task(p: Partial<TaskResponse>): TaskResponse {
  return {
    taskId: nextId++,
    routineId: null,
    name: '할 일',
    plannedDate: '2026-11-02',
    occurrenceDate: null,
    timeSlot: 'MORNING',
    energyCost: 1,
    status: 'PLANNED',
    isVisible: false,
    completedAt: null,
    moveCount: 0,
    isLate: false,
    isLocked: false,
    ...p,
  }
}

function day(budget: number, tasks: TaskResponse[], over?: Partial<DayResponse>): DayResponse {
  const used = tasks.reduce((a, t) => a + t.energyCost, 0)
  return {
    date: '2026-11-02',
    energyBudget: 12,
    conditionLevel: 'NORMAL',
    dayBudget: budget,
    usedEnergy: used,
    doneEnergy: 0,
    remainingEnergy: Math.max(0, budget - used),
    overflowEnergy: Math.max(0, used - budget),
    tasks,
    ...over,
  }
}

describe('scaleCells', () => {
  it('넘치지 않는 주는 가장 큰 배터리 길이', () => {
    expect(scaleCells([day(12, []), day(6, [])], 12)).toBe(12)
  })
  it('가장 큰 날이 쓴 양까지 늘어난다', () => {
    expect(scaleCells([day(12, [task({ energyCost: 9 }), task({ energyCost: 8 })])], 12)).toBe(17)
  })
  it('가장 큰 배터리의 2배(최소 20칸)까지만 늘어난다', () => {
    expect(scaleCells([day(12, [task({ energyCost: 40 })])], 12)).toBe(24)
    expect(scaleCells([day(6, [task({ energyCost: 40 })])], 6)).toBe(20)
  })
})

describe('segments', () => {
  it('오전 → 오후 → 저녁 순서로 놓고 시간대가 바뀌는 곳을 표시한다', () => {
    const d = day(12, [
      task({ name: '저녁', timeSlot: 'EVENING', energyCost: 2 }),
      task({ name: '오전', timeSlot: 'MORNING', energyCost: 3 }),
      task({ name: '오후', timeSlot: 'AFTERNOON', energyCost: 4 }),
    ])
    const s = segments(d, 12)
    expect(s.map((x) => x.task.name)).toEqual(['오전', '오후', '저녁'])
    expect(s.map((x) => x.start)).toEqual([0, 3, 7])
    expect(s.map((x) => x.slotStart)).toEqual([true, true, true])
    expect(slotMarks(d, 12)).toEqual([
      { slot: 'MORNING', start: 0 },
      { slot: 'AFTERNOON', start: 3 },
      { slot: 'EVENING', start: 7 },
    ])
  })
  it('같은 시간대 안에서는 표시를 한 번만 한다', () => {
    const s = segments(day(12, [task({ energyCost: 2 }), task({ energyCost: 2 })]), 12)
    expect(s.map((x) => x.slotStart)).toEqual([true, false])
  })
  it('예산 끝에 걸친 할 일은 하나로 두고 안과 넘침으로만 나눈다', () => {
    const d = day(12, [task({ energyCost: 10 }), task({ name: '걸침', energyCost: 5 })])
    const s = segments(d, 15)
    expect(s).toHaveLength(2)
    expect(s[1].task.name).toBe('걸침')
    expect(s[1].inside).toBe(2)
    expect(s[1].over).toBe(3)
    expect(s[1].inside + s[1].over).toBe(5)
  })
  it('예산 밖에서 시작한 할 일은 전부 넘침', () => {
    const s = segments(day(4, [task({ energyCost: 4 }), task({ energyCost: 3 })]), 12)
    expect(s[1]).toMatchObject({ inside: 0, over: 3 })
  })
  it('그리는 길이 너머의 할 일은 그리지 않는다', () => {
    const s = segments(day(4, [task({ energyCost: 6 }), task({ energyCost: 3 })]), 6)
    expect(s).toHaveLength(1)
  })
  it('했어요와 못 했어요를 구분한다', () => {
    const s = segments(day(12, [task({ status: 'DONE' }), task({ isLate: true }), task({})]), 12)
    expect(s.map((x) => [x.done, x.late])).toEqual([
      [true, false],
      [false, true],
      [false, false],
    ])
  })
})

describe('overflowOf', () => {
  it('서버가 준 넘침 값을 그대로 쓴다', () => {
    expect(overflowOf(day(12, [task({ energyCost: 3 })], { overflowEnergy: 7 }))).toBe(7)
  })
})

describe('hidesName', () => {
  it('배터리 길이의 5% 미만이면 이름을 숨긴다', () => {
    expect(hidesName(1, 40)).toBe(true)
    expect(hidesName(2, 40)).toBe(false)
    expect(hidesName(1, 12)).toBe(false)
  })
})

describe('충전 중인 날', () => {
  it('배터리가 0칸이면 모든 할 일이 넘침', () => {
    const d = day(0, [task({ energyCost: 2 })])
    expect(segments(d, 20)[0]).toMatchObject({ inside: 0, over: 2 })
    expect(overflowOf(d)).toBe(2)
  })
  it('할 일이 없으면 아무것도 그리지 않는다', () => {
    expect(segments(day(0, []), 20)).toEqual([])
  })
})

describe('ghostCells · withGhost (만드는 중 점선 미리보기)', () => {
  const ghost = { date: '2026-11-02', name: '새 할 일', cost: 5, timeSlot: 'MORNING' as const }
  it('그 날짜에만 칸 수가 들어간다', () => {
    expect(ghostCells('2026-11-02', ghost)).toBe(5)
    expect(ghostCells('2026-11-03', ghost)).toBe(0)
    expect(ghostCells('2026-11-02', null)).toBe(0)
  })
  it('배터리 길이 계산에 미리보기 칸이 더해진다', () => {
    const d = day(12, [task({ energyCost: 10 })])
    expect(scaleCells([d], 12)).toBe(12)
    expect(scaleCells([d], 12, ghost)).toBe(15)
  })
  it('미리보기는 같은 날 맨 뒤 시간대 순서에 끼어들고 쓴 칸·넘침이 늘어난다', () => {
    const d = withGhost(day(12, [task({ energyCost: 10 })]), ghost)
    expect(d.usedEnergy).toBe(15)
    expect(d.overflowEnergy).toBe(3)
    expect(d.tasks[d.tasks.length - 1].taskId).toBeLessThan(0)
  })
  it('다른 날이거나 미리보기가 없으면 그대로', () => {
    const d = day(12, [])
    expect(withGhost(d, null)).toBe(d)
    expect(withGhost(d, { ...ghost, date: '2026-11-09' })).toBe(d)
  })
})

describe('emptyCircles', () => {
  const d = day(12, [task({ energyCost: 5 })])
  it('오늘부터의 날에만, 만들기 칸이 열려 있을 때만 빈 칸 수를 준다', () => {
    expect(emptyCircles(d, '2026-11-02', true)).toBe(7)
    expect(emptyCircles(d, '2026-11-02', false)).toBe(0)
    expect(emptyCircles(d, '2026-11-03', true)).toBe(0)
  })
  it('넘친 날은 0', () => {
    expect(emptyCircles(day(4, [task({ energyCost: 6 })]), '2026-11-02', true)).toBe(0)
  })
})

describe('defaultSlot', () => {
  it('빈 날은 오전', () => {
    expect(defaultSlot(day(12, []))).toBe('MORNING')
  })
  it('그날 마지막 할 일의 시간대', () => {
    const d = day(12, [
      task({ timeSlot: 'EVENING' }),
      task({ timeSlot: 'MORNING' }),
      task({ timeSlot: 'AFTERNOON' }),
    ])
    expect(defaultSlot(d)).toBe('EVENING')
    expect(defaultSlot(day(12, [task({ timeSlot: 'AFTERNOON' })]))).toBe('AFTERNOON')
  })
})

describe('withoutTasks (지우는 중 먼저 감추기)', () => {
  it('감춘 할 일만큼 쓴 칸과 넘침이 줄어든다', () => {
    const a = task({ energyCost: 8 })
    const b = task({ energyCost: 6 })
    const d = withoutTasks(day(12, [a, b]), new Set([b.taskId]))
    expect(d.tasks).toEqual([a])
    expect(d.usedEnergy).toBe(8)
    expect(d.overflowEnergy).toBe(0)
  })
  it('감출 것이 없으면 그대로', () => {
    const d = day(12, [task({})])
    expect(withoutTasks(d, new Set())).toBe(d)
  })
})

describe('canPlaceHint (놓을 수 없는 날은 미리 숨김)', () => {
  const lock = '2026-10-26'
  const today = '2026-11-04'
  it('잠금선 앞 날은 못 놓는다', () => {
    expect(canPlaceHint(task({}), '2026-10-25', lock, today)).toBe(false)
    expect(canPlaceHint(task({}), '2026-10-26', lock, today)).toBe(true)
  })
  it('지난주(잠금선 뒤)의 날에도 놓을 수 있다', () => {
    expect(canPlaceHint(task({}), '2026-11-01', lock, today)).toBe(true)
  })
  it('매주 하는 일은 같은 주에만', () => {
    const r = task({ routineId: 3, plannedDate: '2026-11-04' })
    expect(canPlaceHint(r, '2026-11-02', lock, today)).toBe(true)
    expect(canPlaceHint(r, '2026-11-09', lock, today)).toBe(false)
    expect(canPlaceHint(r, '2026-11-01', lock, today)).toBe(false)
  })
  it('이번만 할 일은 다른 주로 갈 수 있다', () => {
    expect(canPlaceHint(task({ plannedDate: '2026-10-28' }), '2026-11-05', lock, today)).toBe(true)
  })
  it('했어요는 못 옮긴다', () => {
    expect(canPlaceHint(task({ status: 'DONE' }), '2026-11-05', lock, today)).toBe(false)
  })
})

describe('miniBattery (월 화면 작은 배터리)', () => {
  const today = '2026-11-04'
  const mk = (date: string, budget: number, tasks: TaskResponse[], doneEnergy = 0) =>
    day(budget, tasks, { date, doneEnergy })
  it('12칸 이하는 칸을 하나씩: 한 것 · 할 것', () => {
    const m = miniBattery(
      mk('2026-11-05', 6, [task({ energyCost: 2 }), task({ energyCost: 3 })], 2),
      today,
    )
    expect(m).toMatchObject({ kind: 'cells', budget: 6, done: 2, plan: 3, over: 0, past: false })
  })
  it('12칸이 넘으면 이어진 막대에 비율로', () => {
    const m = miniBattery(mk('2026-11-05', 16, [task({ energyCost: 8 })], 4), today)
    expect(m.kind).toBe('bar')
    expect(m.doneRatio).toBeCloseTo(4 / 16)
    expect(m.planRatio).toBeCloseTo(4 / 16)
  })
  it('넘치면 +N', () => {
    const m = miniBattery(mk('2026-11-05', 4, [task({ energyCost: 7 })]), today)
    expect(m.over).toBe(3)
    expect(m.plan).toBe(4)
  })
  it('지난 날은 할 칸이 없고 틀이 옅다', () => {
    const m = miniBattery(mk('2026-11-02', 6, [task({ energyCost: 3 })], 1), today)
    expect(m).toMatchObject({ past: true, done: 1, plan: 0 })
  })
  it('충전 중인 날', () => {
    expect(miniBattery(mk('2026-11-05', 0, []), today).kind).toBe('rest')
    expect(miniBattery(mk('2026-11-05', 0, [task({ energyCost: 2 })]), today).over).toBe(2)
  })
})

describe('달 계산', () => {
  it('shiftMonth', () => {
    expect(shiftMonth('2026-11', 1)).toBe('2026-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
  })
  it('monthGrid: 월요일 시작 7의 배수', () => {
    const g = monthGrid('2026-11')
    expect(g[0]).toBe('2026-10-26')
    expect(g.length % 7).toBe(0)
    expect(g).toContain('2026-11-30')
    expect(g[g.length - 1]).toBe('2026-12-06')
  })
})
