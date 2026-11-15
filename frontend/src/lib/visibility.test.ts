import { describe, expect, it } from 'vitest'
import type { DayResponse, ShareLinkResponse, TaskResponse, WeekResponse } from '../api/types.ts'
import { isLinkOpen, isVisibleOnLink, linkExpiryOf, postcardDays } from './visibility.ts'

const TODAY = '2026-11-04'

function task(over: Partial<TaskResponse>): TaskResponse {
  return {
    taskId: 1,
    routineId: null,
    name: '할 일',
    plannedDate: TODAY,
    occurrenceDate: null,
    timeSlot: 'MORNING',
    energyCost: 2,
    status: 'PLANNED',
    isVisible: false,
    completedAt: null,
    moveCount: 0,
    isLate: false,
    isLocked: false,
    ...over,
  }
}

function link(over: Partial<ShareLinkResponse>): ShareLinkResponse {
  return {
    shareLinkId: 1,
    name: '링크',
    token: 't',
    status: 'OPEN',
    isExpired: false,
    expireDate: null,
    isOneTimeVisible: false,
    routineIds: [],
    commentCount: 0,
    createdAt: '2026-11-01T10:00:00',
    closedAt: null,
    ...over,
  }
}

const walk = task({ taskId: 1, routineId: 10, name: '산책' })
const medicine = task({ taskId: 2, routineId: 11, name: '약 먹기' })
const dinner = task({ taskId: 3, name: '가족 저녁', isVisible: true })
const dentist = task({ taskId: 4, name: '치과', isVisible: false })
const exercise = link({ shareLinkId: 1, name: '운동', routineIds: [10], isOneTimeVisible: false })
const family = link({ shareLinkId: 2, name: '가족', routineIds: [], isOneTimeVisible: true })

describe('isVisibleOnLink', () => {
  it('예시 표 8칸', () => {
    expect(isVisibleOnLink(walk, exercise, TODAY)).toBe(true)
    expect(isVisibleOnLink(walk, family, TODAY)).toBe(false)
    expect(isVisibleOnLink(medicine, exercise, TODAY)).toBe(false)
    expect(isVisibleOnLink(medicine, family, TODAY)).toBe(false)
    expect(isVisibleOnLink(dinner, exercise, TODAY)).toBe(false)
    expect(isVisibleOnLink(dinner, family, TODAY)).toBe(true)
    expect(isVisibleOnLink(dentist, exercise, TODAY)).toBe(false)
    expect(isVisibleOnLink(dentist, family, TODAY)).toBe(false)
  })

  it('지운 할 일은 안 보인다', () => {
    expect(isVisibleOnLink({ ...walk, status: 'DELETED' }, exercise, TODAY)).toBe(false)
  })

  it('지난주 할 일은 안 보인다', () => {
    expect(isVisibleOnLink({ ...walk, plannedDate: '2026-11-01' }, exercise, TODAY)).toBe(false)
  })

  it('닫힌 링크와 만료된 링크에서는 안 보인다', () => {
    expect(isVisibleOnLink(walk, { ...exercise, status: 'CLOSED' }, TODAY)).toBe(false)
    expect(isVisibleOnLink(walk, { ...exercise, expireDate: '2026-11-03' }, TODAY)).toBe(false)
  })

  it('만료일 당일까지는 열려 있다', () => {
    expect(isLinkOpen({ ...exercise, expireDate: TODAY }, TODAY)).toBe(true)
    expect(isLinkOpen({ ...exercise, expireDate: '2026-11-03' }, TODAY)).toBe(false)
  })
})

describe('linkExpiryOf', () => {
  it('만료일로 고른 기간을 찾는다', () => {
    expect(linkExpiryOf(null, TODAY)).toBe('NONE')
    expect(linkExpiryOf('2026-11-08', TODAY)).toBe('THIS_WEEK')
    expect(linkExpiryOf('2026-11-29', TODAY)).toBe('FOUR_WEEKS')
  })
})

describe('postcardDays', () => {
  const day = (date: string, tasks: TaskResponse[]): DayResponse => ({
    date,
    energyBudget: 12,
    conditionLevel: 'NORMAL',
    dayBudget: 12,
    usedEnergy: 0,
    doneEnergy: 0,
    remainingEnergy: 12,
    overflowEnergy: 0,
    tasks,
  })
  const week = {
    weekStart: '2026-11-02',
    weekEnd: '2026-11-08',
    today: TODAY,
    days: [
      day('2026-11-02', [
        { ...walk, plannedDate: '2026-11-02', status: 'DONE' },
        { ...medicine, plannedDate: '2026-11-02' },
      ]),
      day('2026-11-03', [{ ...walk, taskId: 5, plannedDate: '2026-11-03' }]),
      day('2026-11-04', [{ ...walk, taskId: 6, plannedDate: '2026-11-04' }, dinner, dentist]),
      day('2026-11-05', []),
      day('2026-11-06', []),
      day('2026-11-07', []),
      day('2026-11-08', []),
    ],
  } as unknown as WeekResponse

  it('요일마다 보이는 것만 상태와 함께 모은다', () => {
    const days = postcardDays(week, exercise)
    expect(days).toHaveLength(7)
    expect(days[0].items).toEqual([{ name: '산책', status: 'DONE' }])
    expect(days[1].items).toEqual([{ name: '산책', status: 'MISSED' }])
    expect(days[2].items).toEqual([{ name: '산책', status: 'PLANNED' }])
  })

  it('이번만 할 일 칩이 켜진 링크에는 친구에게 보이기를 켠 것만 나온다', () => {
    const days = postcardDays(week, family)
    expect(days[2].items).toEqual([{ name: '가족 저녁', status: 'PLANNED' }])
    expect(days[0].items).toEqual([])
  })

  it('닫힌 링크는 아무것도 보이지 않는다', () => {
    expect(
      postcardDays(week, { ...exercise, status: 'CLOSED' }).every((d) => !d.items.length),
    ).toBe(true)
  })

  it('이번 주가 아닌 주를 주면 아무것도 보이지 않는다', () => {
    const other = { ...week, weekStart: '2026-10-26', today: TODAY } as WeekResponse
    expect(postcardDays(other, exercise)).toEqual([])
  })
})
