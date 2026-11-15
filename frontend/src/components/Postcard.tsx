import type { PostcardDay } from '../lib/visibility.ts'
import { addDays, DOW_NAMES } from '../lib/dates.ts'

interface Props {
  title: string
  weekStart: string
  today: string
  days: PostcardDay[]
}

const md = (iso: string) => {
  const [, m, d] = iso.split('-')
  return `${+m}/${+d}`
}

function dowIndex(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return (new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay() + 6) % 7
}

export function Postcard({ title, weekStart, today, days }: Props) {
  const end = addDays(weekStart, 6)
  return (
    <div className="pcard">
      <div className="pchead">
        <h2>{title}</h2>
        <span className="stamp">
          <span className="in">
            이번 주
            <b>
              {md(weekStart)}–{+end.slice(8)}
            </b>
          </span>
        </span>
        <span className="pmark">
          {+today.slice(5, 7)}.{today.slice(8)}
          <br />
          에너지
          <br />
          우체국
          <svg
            width="60"
            height="26"
            viewBox="0 0 60 26"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            aria-hidden="true"
          >
            <path d="M0 5 q7 -5 15 0 t15 0 t15 0 t15 0" />
            <path d="M0 13 q7 -5 15 0 t15 0 t15 0 t15 0" />
            <path d="M0 21 q7 -5 15 0 t15 0 t15 0 t15 0" />
          </svg>
        </span>
      </div>
      <div className="pcrows">
        {days.map((d) => {
          const label = (
            <>
              {DOW_NAMES[dowIndex(d.date)]}
              <small>{+d.date.slice(8)}</small>
            </>
          )
          return (
            <div key={d.date} className={d.date === today ? 'pcrow today' : 'pcrow'}>
              <b>
                {d.date === today ? (
                  <span className="rg">
                    {label}
                    <svg
                      className="ring"
                      viewBox="0 0 82 38"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M14 7 C 34 1, 70 2, 77 15 C 82 29, 52 37, 28 35 C 8 33, 1 23, 5 14 C 8 8, 16 5, 24 4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                  </span>
                ) : (
                  label
                )}
              </b>
              <span>
                {d.items.map((it, i) => (
                  <span
                    key={i}
                    className={`stk ${it.status === 'DONE' ? 'y' : it.status === 'MISSED' ? 'n' : 'f'}`}
                  >
                    {it.name}
                  </span>
                ))}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
