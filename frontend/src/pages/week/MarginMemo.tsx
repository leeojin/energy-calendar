import type { ReactNode } from 'react'
import type { TaskResponse, WeekCheerResponse } from '../../api/types.ts'
import { SLOT_LABEL } from '../../lib/battery.ts'
import { dayName } from '../../components/DayRow.tsx'
import { CheerMemo } from './CheerMemo.tsx'

interface Props {
  isThisWeek: boolean
  leftoverTasks: TaskResponse[]
  cheers: WeekCheerResponse[]
  onRemoveCheer: (c: WeekCheerResponse) => void
  onCarry?: (task: TaskResponse) => void
  newPanel?: ReactNode
  onOpenNew?: () => void
  routineSlot?: ReactNode
}

export function MarginMemo({
  isThisWeek,
  leftoverTasks,
  cheers,
  onRemoveCheer,
  onCarry,
  newPanel,
  onOpenNew,
  routineSlot,
}: Props) {
  const showLeft = isThisWeek && leftoverTasks.length > 0
  return (
    <aside className="side side-r editor margin memomode">
      <div className="panel">
        {newPanel ?? (
          <section className="memo" data-slot="new">
            <button type="button" className="btn sm" onClick={onOpenNew}>
              + 새 할 일
            </button>
          </section>
        )}
        {routineSlot ?? (
          <section className="memo" data-slot="routines">
            <h4>매주</h4>
          </section>
        )}
        {showLeft ? (
          <section className="memo" data-slot="leftover">
            <h4>지난주에 남은 할 일 {leftoverTasks.length}개</h4>
            {leftoverTasks.map((t) => (
              <div className="mleft" key={t.taskId}>
                <span>
                  <b>{t.name}</b>
                  <small>
                    {dayName(t.plannedDate)} {SLOT_LABEL[t.timeSlot]} · {t.energyCost}칸
                  </small>
                </span>
                <button type="button" className="linkbtn" onClick={() => onCarry?.(t)}>
                  → 이번 주로
                </button>
              </div>
            ))}
          </section>
        ) : null}
        <CheerMemo cheers={cheers} onRemove={onRemoveCheer} />
      </div>
    </aside>
  )
}
