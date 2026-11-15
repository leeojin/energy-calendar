import type { CSSProperties, ReactNode } from 'react'
import type { ConditionLevel, DayResponse, TaskResponse, TimeSlot } from '../api/types.ts'
import { GHOST_ID, hidesName, overflowOf, segments, slotMarks, SLOT_LABEL } from '../lib/battery.ts'

export const CONDITION_LABEL: Record<ConditionLevel, string> = {
  LOW: '저전력',
  NORMAL: '보통',
  GOOD: '쌩쌩',
  REST: '충전 중',
}

const CAP = 12

const at = (a: number, budget: number, n: number) =>
  `calc(${(a / n) * 100}% + ${a >= budget && a > 0 ? CAP : 0}px)`

interface Props {
  day: DayResponse
  cells: number
  past: boolean
  circles?: number
  selectedId?: number | null
  slotFilter?: TimeSlot | null
  onTaskClick?: (task: TaskResponse) => void
  onConditionClick?: () => void
  onEmptyClick?: () => void
  canDrag?: (task: TaskResponse) => boolean
  onDragStart?: (task: TaskResponse) => void
  onDragEnd?: () => void
}

export function Battery({
  day,
  cells: n,
  past,
  circles = 0,
  selectedId = null,
  slotFilter = null,
  onTaskClick,
  onConditionClick,
  onEmptyClick,
  canDrag,
  onDragStart,
  onDragEnd,
}: Props) {
  const budget = day.dayBudget
  const segs = segments(day, n)
  const over = overflowOf(day)
  const used = day.usedEnergy
  const canNew = !past && !!onEmptyClick
  const bodyProps = canNew ? { onClick: onEmptyClick, title: '눌러서 새 할 일을 만들어요' } : {}

  const body =
    budget === 0 ? (
      <div
        className={canNew ? 'body rest can' : 'body rest'}
        style={{ width: `calc(${(0.6 / n) * 100}% + 6px)` }}
        {...bodyProps}
      />
    ) : (
      <div
        className={canNew ? 'body can' : 'body'}
        style={{ width: `${(budget / n) * 100}%` }}
        {...bodyProps}
      >
        {Array.from({ length: budget }, (_, i) => (
          <i
            key={i}
            className={
              [
                canNew && i >= used ? 'free' : '',
                i >= budget - circles && circles > 0 ? 'empty' : '',
              ]
                .filter(Boolean)
                .join(' ') || undefined
            }
          />
        ))}
      </div>
    )

  const parts = segs.map((s) => {
    const cost = s.task.energyCost
    const cross = s.inside > 0 && s.over > 0
    const warm = s.inside === 0 && cost > 0
    const z = Math.min(n, Math.max(s.end, s.start + 0.4))
    const ovw = `calc(${((z - budget) / n) * 100}cqw + ${CAP / 2 - 3}px)`
    const style: CSSProperties = {
      left: `calc(${at(s.start, budget, n)} + 3px)`,
      width: `calc(${((z - s.start) / n) * 100}% + ${cross ? CAP : 0}px - 6px)`,
      ...(cross ? { paddingRight: ovw } : {}),
    }
    const isGhost = s.task.taskId === GHOST_ID
    const cls = [
      'seg',
      isGhost ? 'nfghost' : '',
      selectedId === s.task.taskId ? 'sel' : '',
      cost < 3 ? 'narrow' : '',
      hidesName(cost, n) ? 'tiny' : '',
      slotFilter !== null && s.task.timeSlot !== slotFilter ? 'dim' : '',
      s.done ? 'done' : '',
      s.late ? 'late' : '',
      warm ? 'over' : '',
      cross ? 'cross' : '',
    ]
      .filter(Boolean)
      .join(' ')
    const tip = `${s.task.name} · ${SLOT_LABEL[s.task.timeSlot]} · ${cost}칸${s.done ? ' · 했어요' : ''}${s.late ? ' · 못 했어요' : ''}`
    return (
      <button
        key={s.task.taskId}
        type="button"
        className={cls}
        style={style}
        title={tip}
        draggable={canDrag?.(s.task) ? true : undefined}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', String(s.task.taskId))
          e.dataTransfer.effectAllowed = 'move'
          onDragStart?.(s.task)
        }}
        onDragEnd={() => onDragEnd?.()}
        onClick={() => onTaskClick?.(s.task)}
      >
        {cross ? <i className="ovpart" style={{ width: ovw }} /> : null}
        <span className="nm">{s.task.name}</span>
        {s.task.moveCount > 0 ? (
          <span className="mvc" title={`${s.task.moveCount}번 옮겼어요`}>
            ↻{s.task.moveCount > 1 ? s.task.moveCount : ''}
          </span>
        ) : null}
      </button>
    )
  })

  const seps = past
    ? null
    : slotMarks(day, n)
        .slice(1)
        .map((m) => (
          <div key={m.slot} className="slotsep" style={{ left: at(m.start, budget, n) }} />
        ))

  const tail =
    !past && over > 0 ? (
      <span
        className="overtail"
        style={{ left: `calc(${at(Math.min(used, n), budget, n)} + 10px)` }}
      >
        +{over} 넘침
      </span>
    ) : null

  let label: ReactNode = null
  if (!past) {
    const left =
      budget === 0
        ? `calc(${(0.6 / n) * 100}% + 52px)`
        : `max(calc(${(budget / n) * 100}% - 10px), 64px)`
    const inner = (
      <>
        <b>{budget}</b>
        {CONDITION_LABEL[day.conditionLevel]}
      </>
    )
    label = (
      <button
        type="button"
        className="caselab"
        style={{ left }}
        title="그날 컨디션 바꾸기"
        onClick={onConditionClick}
      >
        {inner}
      </button>
    )
  }

  return (
    <div className="bat">
      {body}
      {parts}
      {seps}
      {tail}
      {label}
    </div>
  )
}

export function SlotNames({ day, cells: n }: { day: DayResponse; cells: number }) {
  const marks = slotMarks(day, n)
  if (marks.length === 0) return null
  return (
    <div className="slotnames">
      {marks.map((m) => (
        <span key={m.slot} style={{ left: `calc(${at(m.start, day.dayBudget, n)} + 4px)` }}>
          {SLOT_LABEL[m.slot]}
        </span>
      ))}
    </div>
  )
}
