import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushAll, scheduleUndoable } from './undo.ts'

describe('scheduleUndoable', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    flushAll()
    vi.useRealTimers()
  })

  it('6초 전에 되돌리면 run은 불리지 않고 onUndo만 불린다', () => {
    const run = vi.fn()
    const onUndo = vi.fn()
    const h = scheduleUndoable({ run, onUndo }, 6000)
    vi.advanceTimersByTime(5999)
    h.undo()
    vi.advanceTimersByTime(10000)
    expect(run).not.toHaveBeenCalled()
    expect(onUndo).toHaveBeenCalledTimes(1)
  })

  it('6초가 지나면 run이 한 번 불린다', () => {
    const run = vi.fn()
    const onUndo = vi.fn()
    scheduleUndoable({ run, onUndo }, 6000)
    vi.advanceTimersByTime(6000)
    vi.advanceTimersByTime(10000)
    expect(run).toHaveBeenCalledTimes(1)
    expect(onUndo).not.toHaveBeenCalled()
  })

  it('run이 끝난 뒤의 undo는 아무 일도 하지 않는다', () => {
    const run = vi.fn()
    const onUndo = vi.fn()
    const h = scheduleUndoable({ run, onUndo }, 6000)
    vi.advanceTimersByTime(6000)
    h.undo()
    expect(onUndo).not.toHaveBeenCalled()
  })

  it('flushAll은 아무것도 보내지 않고 버린다', () => {
    const run = vi.fn()
    const onUndo = vi.fn()
    scheduleUndoable({ run, onUndo }, 6000)
    flushAll()
    vi.advanceTimersByTime(10000)
    expect(run).not.toHaveBeenCalled()
    expect(onUndo).not.toHaveBeenCalled()
  })

  it('두 개가 따로 돈다', () => {
    const a = { run: vi.fn(), onUndo: vi.fn() }
    const b = { run: vi.fn(), onUndo: vi.fn() }
    const ha = scheduleUndoable(a, 6000)
    scheduleUndoable(b, 6000)
    ha.undo()
    vi.advanceTimersByTime(6000)
    expect(a.run).not.toHaveBeenCalled()
    expect(a.onUndo).toHaveBeenCalledTimes(1)
    expect(b.run).toHaveBeenCalledTimes(1)
    expect(b.onUndo).not.toHaveBeenCalled()
  })
})
