export interface Undoable {
  run: () => void
  onUndo: () => void
}

export interface UndoHandle {
  undo: () => void
}

const pending = new Set<() => void>()

export function scheduleUndoable(job: Undoable, ms = 6000): UndoHandle {
  let settled = false
  const cancelTimer = () => {
    clearTimeout(timer)
    pending.delete(discard)
  }
  const timer = setTimeout(() => {
    if (settled) return
    settled = true
    pending.delete(discard)
    job.run()
  }, ms)
  const discard = () => {
    settled = true
    clearTimeout(timer)
  }
  pending.add(discard)
  return {
    undo: () => {
      if (settled) return
      settled = true
      cancelTimer()
      job.onUndo()
    },
  }
}

export function flushAll(): void {
  for (const discard of [...pending]) discard()
  pending.clear()
}
