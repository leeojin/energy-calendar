import { useState, type ReactNode } from 'react'
import type { ConditionLevel, DayResponse, TaskResponse } from '../api/types.ts'
import { SLOTS, SLOT_LABEL } from '../lib/battery.ts'
import { Battery, SlotNames } from './Battery.tsx'
import { ConditionPicker } from './ConditionPicker.tsx'
import { DropZones, MoveZones } from './MoveZones.tsx'
import type { TimeSlot } from '../api/types.ts'

const DOW = ['월', '화', '수', '목', '금', '토', '일']

export function dayIndex(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return (new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay() + 6) % 7
}
const md = (iso: string) => {
  const [, m, d] = iso.split('-')
  return `${+m}/${+d}`
}
export const dayName = (iso: string) => `${DOW[dayIndex(iso)]} ${md(iso)}`

export function Ring() {
  return (
    <>
      <svg className="ring" viewBox="0 0 82 38" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M14 7 C 34 1, 70 2, 77 15 C 82 29, 52 37, 28 35 C 8 33, 1 23, 5 14 C 8 8, 16 5, 24 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="hand">오늘</span>
    </>
  )
}

interface Props {
  day: DayResponse
  today: string
  cells: number
  guided?: boolean
  condOpen: boolean
  onCondOpen: () => void
  onCondClose: () => void
  onCondPick: (level: ConditionLevel) => void
  onTaskClick?: (task: TaskResponse) => void
  onEmptyClick?: (date: string) => void
  circles?: number
  selectedTaskId?: number | null
  slotFilter?: TimeSlot | null
  pickable?: boolean
  picked?: boolean
  onPick?: (date: string) => void
  popover?: (pos: { left: number; arrow: number }) => ReactNode
  moving?: TaskResponse | null
  canPlace?: boolean
  pickedDay?: boolean
  onPickDay?: (date: string) => void
  onDropTo?: (date: string, slot: TimeSlot) => void
  dragging?: TaskResponse | null
  canDrag?: (task: TaskResponse) => boolean
  onDragStart?: (task: TaskResponse) => void
  onDragEnd?: () => void
}

export function DayRow({
  day,
  today,
  cells,
  guided = false,
  condOpen,
  onCondOpen,
  onCondClose,
  onCondPick,
  onTaskClick,
  onEmptyClick,
  circles = 0,
  selectedTaskId = null,
  slotFilter = null,
  pickable = false,
  picked = false,
  onPick,
  popover,
  moving = null,
  canPlace = true,
  pickedDay = false,
  onPickDay,
  onDropTo,
  dragging = null,
  canDrag,
  onDragStart,
  onDragEnd,
}: Props) {
  const [hot, setHot] = useState<TimeSlot | null>(null)
  const [anchor, setAnchor] = useState({ left: 0, arrow: 40 })
  const past = day.date < today
  const isToday = day.date === today
  const canPick = pickable && !past
  const mv = moving !== null && canPlace
  const cls = [
    'row',
    isToday ? 'today' : '',
    guided ? 'frrow' : '',
    past ? 'c' : '',
    picked ? 'pk' : '',
    mv ? 'mv' : '',
    mv && pickedDay ? 'hov' : '',
    moving !== null && !canPlace ? 'dim' : '',
    'nonum',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div
      className={cls}
      style={{ position: 'relative', cursor: canPick ? 'pointer' : undefined }}
      onClick={canPick ? () => onPick?.(day.date) : undefined}
    >
      <div className="day">
        <b>
          {DOW[dayIndex(day.date)]}
          <span>{md(day.date)}</span>
          {isToday ? <Ring /> : null}
        </b>
      </div>
      <div
        className="mid"
        style={{ position: 'relative' }}
        onClickCapture={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - r.left
          const left = Math.max(0, Math.min(x - 40, r.width - 340))
          setAnchor({ left, arrow: Math.max(14, Math.min(x - left, 300)) })
        }}
      >
        <Battery
          day={day}
          cells={cells}
          past={past}
          circles={circles}
          selectedId={selectedTaskId}
          slotFilter={slotFilter}
          onTaskClick={canPick || moving ? undefined : onTaskClick}
          canDrag={moving ? undefined : canDrag}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onConditionClick={onCondOpen}
          onEmptyClick={!canPick && onEmptyClick ? () => onEmptyClick(day.date) : undefined}
        />
        {past ? null : <SlotNames day={day} cells={cells} />}
        {past ? null : <SlotList day={day} />}
        {popover ? popover(anchor) : null}
        {moving && canPlace && onPickDay && onDropTo ? (
          <MoveZones day={day} task={moving} onPickDay={onPickDay} onDrop={onDropTo} />
        ) : null}
        {dragging && canPlace && onDropTo ? (
          <DropZones day={day} task={dragging} hot={hot} onHot={setHot} onDrop={onDropTo} />
        ) : null}
        {condOpen && !past ? (
          <ConditionPicker
            day={day}
            dayName={dayName(day.date)}
            onPick={onCondPick}
            onClose={onCondClose}
          />
        ) : null}
      </div>
    </div>
  )
}

function SlotList({ day }: { day: DayResponse }) {
  const lines = SLOTS.map((s) => {
    const list = day.tasks.filter((t) => t.timeSlot === s)
    if (list.length === 0) return null
    const sum = list.reduce((a, t) => a + t.energyCost, 0)
    return (
      <div key={s}>
        <b>
          {SLOT_LABEL[s]} {sum}
        </b>
        {list.map((t, i) => (
          <span key={t.taskId} className={t.status === 'DONE' ? 'dn' : t.isLate ? 'lt' : undefined}>
            {i > 0 ? ', ' : ''}
            {t.name}
          </span>
        ))}
      </div>
    )
  })
  if (lines.every((l) => l === null)) return null
  return <div className="slotlist">{lines}</div>
}
