import type { TimeSlot } from '../api/types.ts'
import { SLOTS, SLOT_LABEL } from '../lib/battery.ts'

interface Props {
  value: TimeSlot | null
  onChange: (slot: TimeSlot | null) => void
}

export function SlotFilter({ value, onChange }: Props) {
  return (
    <span className="slotpick">
      <span className="lab">시간대</span>
      <button
        type="button"
        className={value === null ? 'on' : undefined}
        onClick={() => onChange(null)}
      >
        전체
      </button>
      {SLOTS.map((s) => (
        <button
          key={s}
          type="button"
          className={value === s ? 'on' : undefined}
          onClick={() => onChange(s)}
        >
          {SLOT_LABEL[s]}
        </button>
      ))}
    </span>
  )
}
