import type { DayResponse, TaskResponse, TimeSlot } from '../api/types.ts'
import { SLOTS, SLOT_LABEL } from '../lib/battery.ts'
import { dayName } from './DayRow.tsx'

interface Props {
  day: DayResponse
  task: TaskResponse
  onPickDay: (date: string) => void
  onDrop: (date: string, slot: TimeSlot) => void
}

export function MoveZones({ day, task, onPickDay, onDrop }: Props) {
  const after =
    day.dayBudget - day.usedEnergy - (task.plannedDate === day.date ? 0 : task.energyCost)
  const result = after < 0 ? `+${-after} 넘침` : `${after}칸 남음`
  const zones = SLOTS.filter((s) => !(task.plannedDate === day.date && task.timeSlot === s))
  return (
    <>
      <button
        type="button"
        className="rowpick"
        aria-label={`${dayName(day.date)}에 놓기`}
        onClick={() => onPickDay(day.date)}
      />
      <div className="mz" title={`놓으면 ${result}`}>
        {zones.map((s) => (
          <button
            key={s}
            type="button"
            className={after < 0 ? 'mzs warn' : 'mzs'}
            onClick={() => onDrop(day.date, s)}
          >
            {SLOT_LABEL[s]}에 놓기<small>{result}</small>
          </button>
        ))}
      </div>
    </>
  )
}

interface DragProps {
  day: DayResponse
  task: TaskResponse
  hot: TimeSlot | null
  onHot: (slot: TimeSlot | null) => void
  onDrop: (date: string, slot: TimeSlot) => void
}

export function DropZones({ day, task, hot, onHot, onDrop }: DragProps) {
  return (
    <div className="dz" style={{ display: 'flex' }}>
      {SLOTS.map((s) => (
        <div
          key={s}
          className={hot === s ? 'dzs hot' : 'dzs'}
          onDragOver={(e) => {
            e.preventDefault()
            onHot(s)
          }}
          onDragLeave={() => onHot(null)}
          onDrop={(e) => {
            e.preventDefault()
            onHot(null)
            if (task.plannedDate === day.date && task.timeSlot === s) return
            onDrop(day.date, s)
          }}
        >
          {SLOT_LABEL[s]}에 놓기
        </div>
      ))}
    </div>
  )
}
