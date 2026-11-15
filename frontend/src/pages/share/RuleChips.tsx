import type { LinkExpiry, RoutineResponse } from '../../api/types.ts'
import { expiryDate } from '../../lib/visibility.ts'

const md = (iso: string) => {
  const [, m, d] = iso.split('-')
  return `${+m}/${+d}`
}

interface ChipsProps {
  routines: RoutineResponse[]
  selected: number[]
  once: boolean
  disabled?: boolean
  onRoutine: (routineId: number, on: boolean) => void
  onOnce: (on: boolean) => void
  onceNames: string[]
}

export function RuleChips({
  routines,
  selected,
  once,
  disabled,
  onRoutine,
  onOnce,
  onceNames,
}: ChipsProps) {
  return (
    <>
      <div className="choice">
        {routines.map((r) => {
          const on = selected.includes(r.routineId)
          return (
            <button
              key={r.routineId}
              type="button"
              className={on ? 'ch on' : 'ch'}
              aria-pressed={on}
              disabled={disabled}
              onClick={() => onRoutine(r.routineId, !on)}
            >
              {on ? '✓ ' : ''}
              {r.name}
              {r.status === 'ENDED' ? ' · 끝남' : ''}
            </button>
          )
        })}
        <button
          type="button"
          className={once ? 'ch once on' : 'ch once'}
          aria-pressed={once}
          disabled={disabled}
          onClick={() => onOnce(!once)}
        >
          {once ? '✓ ' : ''}이번만 할 일
        </button>
      </div>
      {once ? (
        <p className="hint onceline">
          {onceNames.length ? (
            <>
              이번 주 보이는 것: <b>{onceNames.join(' · ')}</b>
            </>
          ) : (
            '이번 주에 보여 줄 일이 없어요. 할 일을 눌러 [친구에게 보이기]를 켜요'
          )}
        </p>
      ) : null}
    </>
  )
}

interface ExpiryProps {
  value: LinkExpiry
  today: string
  disabled?: boolean
  onPick: (e: LinkExpiry) => void
}

const EXPIRY: ReadonlyArray<[LinkExpiry, string]> = [
  ['THIS_WEEK', '이번 주까지'],
  ['FOUR_WEEKS', '4주'],
  ['NONE', '계속'],
]

export function ExpiryChoice({ value, today, disabled, onPick }: ExpiryProps) {
  return (
    <div className="choice">
      {EXPIRY.map(([k, label]) => {
        const date = expiryDate(k, today)
        return (
          <button
            key={k}
            type="button"
            className={value === k ? 'ch on' : 'ch'}
            aria-pressed={value === k}
            disabled={disabled}
            onClick={() => onPick(k)}
          >
            {label}
            {date ? <small> {md(date)}</small> : null}
          </button>
        )
      })}
    </div>
  )
}
