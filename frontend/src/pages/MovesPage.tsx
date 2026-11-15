import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { useApi } from '../api/ApiContext.tsx'
import { messageOf } from '../api/errors.ts'
import { ApiError } from '../api/port.ts'
import type { TaskMoveHistoryResponse } from '../api/types.ts'
import { dayName } from '../components/DayRow.tsx'
import { Notebook } from '../components/Notebook.tsx'
import { PageHead } from '../components/PageHead.tsx'
import { useDemoPath } from '../demo/useDemoPath.ts'
import { SLOT_LABEL } from '../lib/battery.ts'
import { addDays, mondayOf, todayKst } from '../lib/dates.ts'
import { canGoPrevMoves, earliestMovesMonday, groupMovesByDay } from '../lib/moves.ts'
import { notifyError } from '../lib/notify.ts'

const ISO = /^\d{4}-\d{2}-\d{2}$/
const DOW = ['일', '월', '화', '수', '목', '금', '토']
const md = (iso: string) => `${+iso.slice(5, 7)}/${+iso.slice(8)}`

function dateHead(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${m}월 ${d}일 ${DOW[new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()]}`
}

export function MovesPage() {
  const { monday: param } = useParams()
  const dp = useDemoPath()
  const today = todayKst()
  const thisMonday = mondayOf(today)
  const earliest = earliestMovesMonday(today)
  const wanted = param && ISO.test(param) ? mondayOf(param) : thisMonday
  const monday = wanted > thisMonday ? thisMonday : wanted < earliest ? earliest : wanted
  if (param !== undefined && param !== monday)
    return <Navigate to={dp(`/moves/${monday}`)} replace />
  return <MovesView key={monday} monday={monday} today={today} thisMonday={thisMonday} />
}

function MovesView({
  monday,
  today,
  thisMonday,
}: {
  monday: string
  today: string
  thisMonday: string
}) {
  const api = useApi()
  const navigate = useNavigate()
  const dp = useDemoPath()
  const [list, setList] = useState<TaskMoveHistoryResponse[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    api
      .getMovesOfWeek(monday)
      .then((r) => {
        if (alive) setList(r)
      })
      .catch((e: unknown) => {
        if (!alive) return
        setFailed(true)
        if (e instanceof ApiError && e.code !== 'AUTH_REQUIRED') {
          notifyError(messageOf(e.code))
        }
      })
    return () => {
      alive = false
    }
  }, [api, monday, tick])

  const days = useMemo(() => (list ? groupMovesByDay(list) : []), [list])
  const go = (m: string) => void navigate(dp(`/moves/${m}`))
  const label =
    monday === thisMonday ? '이번 주' : monday === addDays(thisMonday, -7) ? '지난주' : '지난 기록'

  return (
    <Notebook>
      <PageHead title="옮긴 기록" />
      <div className="logbook">
        <div className="lghead">
          <div>
            <Link className="linkbtn" to={dp('/week')}>
              ← 이번 주로
            </Link>
          </div>
          <div className="lgnav">
            <button
              type="button"
              className="icon"
              aria-label="이전 주"
              disabled={!canGoPrevMoves(monday, today)}
              onClick={() => go(addDays(monday, -7))}
            >
              ‹
            </button>
            <span>
              {label} · {md(monday)} – {md(addDays(monday, 6))}
            </span>
            <button
              type="button"
              className="icon"
              aria-label="다음 주"
              disabled={monday >= thisMonday}
              onClick={() => go(addDays(monday, 7))}
            >
              ›
            </button>
          </div>
          <span className="lock">기록은 고칠 수 없어요 · 4주 뒤에 사라져요</span>
        </div>
        {failed ? (
          <p className="hint">
            불러오지 못했어요.{' '}
            <button
              type="button"
              className="linkbtn"
              onClick={() => {
                setFailed(false)
                setTick((n) => n + 1)
              }}
            >
              다시 해 보기
            </button>
          </p>
        ) : list === null ? null : days.length === 0 ? (
          <p className="lgempty">이 주에는 옮긴 할 일이 없어요</p>
        ) : (
          days.map((d) => (
            <div key={d.date}>
              <div className="lgday">{dateHead(d.date)}</div>
              {d.items.map((m) => (
                <div key={m.id} className="lgrow">
                  <span className="lgt">{m.time}</span>
                  <b>{m.name}</b>
                  <span>
                    {dayName(m.from.date)} {SLOT_LABEL[m.from.slot]}
                  </span>
                  <span className="lga"></span>
                  <span>
                    {dayName(m.to.date)} {SLOT_LABEL[m.to.slot]}
                  </span>
                </div>
              ))}
            </div>
          ))
        )}
        <p className="hint" style={{ marginTop: 18 }}>
          옮긴 기록은 나만 볼 수 있어요.
        </p>
      </div>
    </Notebook>
  )
}
