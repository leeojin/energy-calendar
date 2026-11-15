import { describe, expect, it } from 'vitest'
import type { TaskMoveHistoryResponse } from '../api/types'
import { canGoPrevMoves, earliestMovesMonday, groupMovesByDay, slotFilterLabel } from './moves'

const mv = (id: number, createdAt: string): TaskMoveHistoryResponse => ({
  taskMoveHistoryId: id,
  taskId: id,
  taskName: `일${id}`,
  fromDate: '2026-11-02',
  fromTimeSlot: 'MORNING',
  toDate: '2026-11-03',
  toTimeSlot: 'EVENING',
  createdAt,
})

describe('moves', () => {
  it('옮긴 날짜별로 묶고 최근 것이 위에 온다', () => {
    const g = groupMovesByDay([
      mv(1, '2026-11-02T09:05:00'),
      mv(2, '2026-11-03T10:00:00'),
      mv(3, '2026-11-03T18:30:00'),
    ])
    expect(g.map((x) => x.date)).toEqual(['2026-11-03', '2026-11-02'])
    expect(g[0].items.map((x) => x.id)).toEqual([3, 2])
    expect(g[0].items[0].time).toBe('18:30')
  })

  it('비어 있으면 빈 목록', () => {
    expect(groupMovesByDay([])).toEqual([])
  })

  it('4주 전보다 앞으로는 갈 수 없다', () => {
    expect(earliestMovesMonday('2026-11-04')).toBe('2026-10-05')
    expect(canGoPrevMoves('2026-10-12', '2026-11-04')).toBe(true)
    expect(canGoPrevMoves('2026-10-05', '2026-11-04')).toBe(false)
  })

  it('시간대 안내 글', () => {
    expect(slotFilterLabel(null)).toBeNull()
    expect(slotFilterLabel('AFTERNOON')).toBe('오후 할 일만 진하게 보여요')
  })
})
