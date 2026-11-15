import { notifications } from '@mantine/notifications'
import { scheduleUndoable } from '../lib/undo.ts'
import type { Undoable } from '../lib/undo.ts'

const UNDO_MS = 6000

export function showUndoNotice(message: string, job: Undoable): void {
  const id = `undo-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const handle = scheduleUndoable(
    {
      run: job.run,
      onUndo: () => {
        notifications.hide(id)
        job.onUndo()
      },
    },
    UNDO_MS,
  )
  notifications.show({
    id,
    autoClose: UNDO_MS,
    withCloseButton: false,
    classNames: { root: 'undo-note' },
    message: (
      <div className="toast-row">
        <span>{message}</span>
        <button type="button" className="undo" onClick={handle.undo}>
          되돌리기
        </button>
      </div>
    ),
  })
}
