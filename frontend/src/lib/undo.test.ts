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

  it('화면을 떠나면 6초를 기다리지 않고 대기 작업을 실행한다', () => {
    const run = vi.fn()
    const onUndo = vi.fn()
    scheduleUndoable({ run, onUndo }, 6000)
    vi.advanceTimersByTime(1000)
    flushAll()
    expect(run).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(10000)
    expect(run).toHaveBeenCalledTimes(1)
    expect(onUndo).not.toHaveBeenCalled()
  })

  it('이동과 화면 종료 처리가 겹쳐도 한 번만 실행한다', () => {
    const run = vi.fn()
    const onUndo = vi.fn()
    const handle = scheduleUndoable({ run, onUndo }, 6000)
    flushAll()
    flushAll()
    handle.undo()
    vi.advanceTimersByTime(6000)
    expect(run).toHaveBeenCalledTimes(1)
    expect(onUndo).not.toHaveBeenCalled()
  })

  it('이미 되돌린 작업은 화면을 떠나도 실행하지 않는다', () => {
    const run = vi.fn()
    const onUndo = vi.fn()
    const handle = scheduleUndoable({ run, onUndo }, 6000)
    handle.undo()
    flushAll()
    vi.advanceTimersByTime(6000)
    expect(run).not.toHaveBeenCalled()
    expect(onUndo).toHaveBeenCalledTimes(1)
  })

  it('여러 작업 중 되돌리지 않은 작업만 모두 실행한다', () => {
    const runs = [vi.fn(), vi.fn(), vi.fn()]
    const handles = runs.map((run) => scheduleUndoable({ run, onUndo: vi.fn() }, 6000))
    handles[1].undo()
    flushAll()
    vi.advanceTimersByTime(10000)
    expect(runs[0]).toHaveBeenCalledTimes(1)
    expect(runs[1]).not.toHaveBeenCalled()
    expect(runs[2]).toHaveBeenCalledTimes(1)
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
