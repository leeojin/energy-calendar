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
    pending.delete(run)
  }
  const run = () => {
    if (settled) return
    settled = true
    cancelTimer()
    job.run()
  }
  const timer = setTimeout(run, ms)
  pending.add(run)
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
  for (const run of [...pending]) run()
}
