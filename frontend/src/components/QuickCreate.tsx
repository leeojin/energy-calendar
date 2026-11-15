import { useEffect, useRef } from 'react'
import type { TimeSlot } from '../api/types.ts'
import { SLOTS, SLOT_LABEL } from '../lib/battery.ts'

export interface QuickForm {
  date: string
  name: string
  cost: number
  timeSlot: TimeSlot
}

interface Props {
  form: QuickForm
  dayName: string
  leftAfter: number
  left: number
  arrow: number
  error: string
  busy: boolean
  onChange: (f: QuickForm) => void
  onMake: () => void
  onMore: () => void
  onCancel: () => void
}

const NAME_MAX = 20

export function QuickCreate({
  form,
  dayName,
  leftAfter,
  left,
  arrow,
  error,
  busy,
  onChange,
  onMake,
  onMore,
  onCancel,
}: Props) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  return (
    <div
      className="pop"
      style={{ top: 'calc(100% + 6px)', left, ['--ax' as string]: `${arrow}px` }}
      role="dialog"
      aria-label="새 할 일"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="info">
        <b>{dayName} · 새 할 일</b>
        <span>
          남는 칸 {leftAfter < 0 ? 0 : leftAfter}
          {leftAfter < 0 ? ` · +${-leftAfter} 넘침` : ''}
        </span>
      </div>
      <input
        ref={ref}
        className="inp nfin"
        maxLength={NAME_MAX}
        placeholder="이름 (예: 세탁소 가기)"
        value={form.name}
        autoComplete="off"
        onChange={(e) => onChange({ ...form, name: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault()
            onMake()
          }
          if (e.key === 'Escape') onCancel()
        }}
      />
      <div className="nfcost">
        {Array.from({ length: 10 }, (_, i) => (
          <button
            key={i}
            type="button"
            className={i < form.cost ? 'f' : undefined}
            aria-label={`${i + 1}칸`}
            onClick={() => onChange({ ...form, cost: i + 1 })}
          />
        ))}
        <b>{form.cost}</b>
      </div>
      <div className="acts">
        {SLOTS.map((s) => (
          <button
            key={s}
            type="button"
            className={form.timeSlot === s ? 'opt on' : 'opt'}
            onClick={() => onChange({ ...form, timeSlot: s })}
          >
            {SLOT_LABEL[s]}
          </button>
        ))}
      </div>
      {error ? <div className="err">{error}</div> : null}
      <div className="acts">
        <button type="button" className="btn dark sm" disabled={busy} onClick={onMake}>
          만들기 ⏎
        </button>
        <button type="button" className="btn sm" onClick={onMore}>
          자세히
        </button>
        <button type="button" className="btn sm ghost" onClick={onCancel}>
          취소
        </button>
      </div>
    </div>
  )
}
