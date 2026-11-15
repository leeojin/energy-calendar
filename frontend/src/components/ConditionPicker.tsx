import type { ConditionLevel, DayResponse } from '../api/types.ts'
import { CONDITION_LABEL } from './Battery.tsx'

const LEVELS: ConditionLevel[] = ['LOW', 'NORMAL', 'GOOD', 'REST']

export function budgetFor(level: ConditionLevel, base: number): number {
  switch (level) {
    case 'LOW':
      return Math.floor(base * 0.5)
    case 'NORMAL':
      return base
    case 'GOOD':
      return Math.floor(base * 1.2)
    case 'REST':
      return 0
  }
}

interface Props {
  day: DayResponse
  dayName: string
  onPick: (level: ConditionLevel) => void
  onClose: () => void
}

export function ConditionPicker({ day, dayName, onPick, onClose }: Props) {
  return (
    <div
      className="pop"
      style={{ top: 'calc(100% + 6px)', left: 0 }}
      role="dialog"
      aria-label="컨디션 고르기"
    >
      <div className="info">
        <b>{dayName} 컨디션</b>
        <span>그날 에너지만 바뀌고 할 일은 그대로예요.</span>
      </div>
      <div className="acts">
        {LEVELS.map((c) => (
          <button
            key={c}
            type="button"
            className={day.conditionLevel === c ? 'opt on' : 'opt'}
            onClick={() => onPick(c)}
          >
            {CONDITION_LABEL[c]}
            <small>{budgetFor(c, day.energyBudget)}</small>
          </button>
        ))}
      </div>
      <div className="acts">
        <button type="button" className="linkbtn" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  )
}
