import { describe, expect, it } from 'vitest'
import { firstTaskBoxOpen, slotAt } from './firstRun.ts'

describe('firstRun', () => {
  it('지금 시간대를 고른다', () => {
    expect(slotAt(0)).toBe('MORNING')
    expect(slotAt(11)).toBe('MORNING')
    expect(slotAt(12)).toBe('AFTERNOON')
    expect(slotAt(17)).toBe('AFTERNOON')
    expect(slotAt(18)).toBe('EVENING')
    expect(slotAt(23)).toBe('EVENING')
  })

  it('가입하고 사흘 동안 오늘이 비어 있을 때만 입력칸을 둔다', () => {
    expect(firstTaskBoxOpen('2026-11-05', '2026-11-05', 0, 12)).toBe(true)
    expect(firstTaskBoxOpen('2026-11-05', '2026-11-07', 0, 12)).toBe(true)
    expect(firstTaskBoxOpen('2026-11-05', '2026-11-08', 0, 12)).toBe(false)
    expect(firstTaskBoxOpen('2026-11-05', '2026-11-05', 1, 12)).toBe(false)
  })

  it('충전 중인 날에는 입력칸을 두지 않는다', () => {
    expect(firstTaskBoxOpen('2026-11-05', '2026-11-05', 0, 0)).toBe(false)
  })
})
