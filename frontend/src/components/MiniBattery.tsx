import type { DayResponse } from '../api/types.ts'
import { miniBattery } from '../lib/battery.ts'

interface Props {
  day: DayResponse
  today: string
}

export function MiniBattery({ day, today }: Props) {
  const m = miniBattery(day, today)
  if (m.kind === 'rest') {
    return m.over > 0 ? (
      <>
        <span className="mmb rest" />
        <b className="mov">+{m.over}</b>
      </>
    ) : (
      <span className="mrest">충전 중</span>
    )
  }
  const cls = ['mmb', m.past ? 'off' : '', m.kind === 'bar' ? 'bar' : ''].filter(Boolean).join(' ')
  return (
    <>
      <span className={cls}>
        {m.kind === 'bar' ? (
          <>
            <i className="d" style={{ width: `${m.doneRatio * 100}%` }} />
            <i className="p" style={{ width: `${m.planRatio * 100}%` }} />
          </>
        ) : (
          Array.from({ length: m.budget }, (_, k) => (
            <i key={k} className={k < m.done ? 'd' : k < m.done + m.plan ? 'p' : undefined} />
          ))
        )}
      </span>
      {m.over > 0 ? <b className="mov">+{m.over}</b> : null}
    </>
  )
}
