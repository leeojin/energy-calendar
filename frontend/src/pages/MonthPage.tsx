import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { useApi } from '../api/ApiContext.tsx'
import { messageOf } from '../api/errors.ts'
import { ApiError } from '../api/port.ts'
import type { DayResponse, MonthResponse, TaskResponse } from '../api/types.ts'
import { CONDITION_LABEL } from '../components/Battery.tsx'
import { dayName, Ring } from '../components/DayRow.tsx'
import { MiniBattery } from '../components/MiniBattery.tsx'
import { Notebook } from '../components/Notebook.tsx'
import { PageHead } from '../components/PageHead.tsx'
import { useDemoPath } from '../demo/useDemoPath.ts'
import { SLOT_LABEL, lastDayOf, monthGrid, shiftMonth } from '../lib/battery.ts'
import { addDays, DOW_NAMES, mondayOf, todayKst } from '../lib/dates.ts'
import { notifyError } from '../lib/notify.ts'

const YM = /^\d{4}-(0[1-9]|1[0-2])$/
const SHOWN = 5

export function MonthPage() {
  const { month: param } = useParams()
  const dp = useDemoPath()
  const thisMonth = todayKst().slice(0, 7)
  if (param !== undefined && !YM.test(param)) return <Navigate to={dp('/month')} replace />
  const ym = param ?? thisMonth
  return <MonthView key={ym} ym={ym} />
}

function MonthView({ ym }: { ym: string }) {
  const api = useApi()
  const navigate = useNavigate()
  const dp = useDemoPath()
  const [data, setData] = useState<MonthResponse | null>(null)
  const [failed, setFailed] = useState(false)
  const [tick, setTick] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [more, setMore] = useState(false)

  useEffect(() => {
    let alive = true
    api
      .createMonthOccurrences(ym)
      .catch(() => undefined)
      .then(() => api.getMonth(ym))
      .then((m) => {
        if (alive) setData(m)
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
  }, [api, ym, tick])

  const [yy, mm] = ym.split('-').map(Number)
  const title = `${yy}년 ${mm}월`

  if (!data) {
    return (
      <Notebook wide>
        <PageHead current="month" title={title} />
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
        ) : null}
      </Notebook>
    )
  }

  const { today } = data
  const nowMonth = today.slice(0, 7)
  const first = `${ym}-01`
  const last = lastDayOf(ym)
  const byDate = new Map<string, DayResponse>(data.days.map((d) => [d.date, d]))
  const sel =
    picked && picked.slice(0, 7) === ym
      ? picked
      : ym === nowMonth
        ? today
        : ym < nowMonth
          ? last
          : first
  const selDay = byDate.get(sel) ?? null

  const items: Array<{ date: string; task: TaskResponse; first: boolean; over: number }> = []
  for (let d = ym === nowMonth ? today : first; d <= last; d = addDays(d, 1)) {
    const day = byDate.get(d)
    if (!day) continue
    const list = day.tasks.filter((t) => t.routineId === null)
    const over = day.usedEnergy - day.dayBudget
    list.forEach((task, k) =>
      items.push({
        date: d,
        task,
        first: k === 0,
        over: k === list.length - 1 && over > 0 && day.dayBudget > 0 ? over : 0,
      }),
    )
  }
  const shown = more ? items : items.slice(0, SHOWN)
  const bigTitle = ym < nowMonth ? `${mm}월의 이번만 할 일` : '이달 이번만 할 일'

  const goMonth = (m: string) => void navigate(dp(`/month/${m}`))

  return (
    <Notebook wide>
      <PageHead
        current="month"
        title={title}
        nav={{
          onPrev: () => goMonth(shiftMonth(ym, -1)),
          onNext: () => goMonth(shiftMonth(ym, 1)),
          prevDisabled: ym <= data.firstMonth,
          prevLabel: '지난달',
          nextLabel: '다음 달',
          back:
            ym === nowMonth ? undefined : { label: '이번 달로', onClick: () => goMonth(nowMonth) },
        }}
      />
      <div className="grid3 noleft nopanel monthnb">
        <section className="main-col">
          <div className="panel">
            <div className="hd phsub">
              <span className="eyebrow">그날 에너지 칸 · 노랑은 한 일, 점선은 할 일</span>
            </div>
            <div className="mgrid2">
              {DOW_NAMES.map((x) => (
                <div key={x} className="mh2">
                  {x}
                </div>
              ))}
              {monthGrid(ym).map((d) => {
                const out = d.slice(0, 7) !== ym
                const day = out ? undefined : byDate.get(d)
                const big = day
                  ? day.tasks
                      .filter((t) => t.routineId === null)
                      .map((t) => t.name)
                      .join(' · ')
                  : ''
                return (
                  <button
                    key={d}
                    type="button"
                    className={['mc2', out ? 'out' : '', d === sel ? 'sel' : '']
                      .filter(Boolean)
                      .join(' ')}
                    aria-label={dayName(d)}
                    onClick={() => setPicked(d)}
                  >
                    <b>
                      {d === today ? (
                        <span className="rg">
                          {+d.slice(8)}
                          <Ring />
                        </span>
                      ) : (
                        +d.slice(8)
                      )}
                    </b>
                    {big ? <span className="mev">{big}</span> : null}
                    {day ? (
                      <span className="mbat">
                        <MiniBattery day={day} today={today} />
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>
        </section>
        <aside className="side side-r editor margin memomode">
          <div className="panel">
            {selDay ? (
              <PickedDay
                day={selDay}
                today={today}
                prev={(k) => byDate.get(addDays(selDay.date, -k))}
                onWeek={() => void navigate(dp(`/week/${mondayOf(selDay.date)}`))}
                onAdd={() =>
                  void navigate(dp(`/week/${mondayOf(selDay.date)}`), {
                    state: { newDate: selDay.date },
                  })
                }
              />
            ) : null}
            <section className="memo">
              <h4>
                {bigTitle} <small>{items.length}개</small>
                {items.length > SHOWN ? (
                  <button type="button" className="linkbtn" onClick={() => setMore((v) => !v)}>
                    {more ? '접기' : '더 보기'}
                  </button>
                ) : null}
              </h4>
              {shown.length === 0 ? (
                <p className="sm">
                  {ym < nowMonth ? '이번만 할 일이 없었어요' : '남은 이번만 할 일이 없어요'}
                </p>
              ) : (
                shown.map(({ date, task, first: isFirst, over }) => (
                  <button
                    key={task.taskId}
                    type="button"
                    className={`mline mbig${date === sel ? ' on' : ''}`}
                    onClick={() => setPicked(date)}
                  >
                    <span className="dd">
                      {isFirst ? (
                        <>
                          {+date.slice(8)}{' '}
                          <small>
                            {DOW_NAMES[(new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7]}
                          </small>
                        </>
                      ) : null}
                    </span>
                    <span>
                      {task.status === 'DONE' ? '✓ ' : ''}
                      {task.name}
                    </span>
                    <span className={over ? 'r warm' : 'r'}>
                      {SLOT_LABEL[task.timeSlot]} {task.energyCost}칸
                      {over ? ` · +${over} 넘침` : ''}
                    </span>
                  </button>
                ))
              )}
            </section>
          </div>
        </aside>
      </div>
    </Notebook>
  )
}

interface PickedProps {
  day: DayResponse
  today: string
  prev: (k: number) => DayResponse | undefined
  onWeek: () => void
  onAdd: () => void
}

function PickedDay({ day, today, prev, onWeek, onAdd }: PickedProps) {
  const b = day.dayBudget
  let hint = ''
  if (day.tasks.some((t) => t.isLate)) {
    for (let k = 1; k <= 3; k++) {
      const p = prev(k)
      if (p && p.dayBudget > 0 && p.usedEnergy > p.dayBudget) {
        hint = `${dayName(p.date)}에 ${p.usedEnergy - p.dayBudget}칸 넘쳤어요`
        break
      }
    }
  }
  return (
    <section className="memo">
      <h4>
        {dayName(day.date)}
        {day.date === today ? ' · 오늘' : ''}{' '}
        <small>
          {CONDITION_LABEL[day.conditionLevel]} {b}칸
          {day.usedEnergy > b && b > 0 ? (
            <>
              {' · '}
              <b className="warm">+{day.usedEnergy - b} 넘침</b>
            </>
          ) : null}
        </small>
        <button type="button" className="linkbtn" onClick={onWeek}>
          주 보기 →
        </button>
      </h4>
      {day.tasks.length === 0 ? (
        <p className="sm">{b === 0 ? '충전 중인 날이에요' : '이날은 비어 있어요'}</p>
      ) : (
        day.tasks.map((t) => {
          const ok = t.status === 'DONE'
          return (
            <div key={t.taskId} className={`mline mrow${ok ? ' ok' : ''}`}>
              <span>
                {ok ? '✓ ' : ''}
                {t.name}
              </span>
              <small>
                {SLOT_LABEL[t.timeSlot]} · {t.energyCost}칸
              </small>
              <span className="r">{ok ? '했어요' : t.isLate ? '못 했어요' : ''}</span>
            </div>
          )
        })
      )}
      {hint ? <p className="sm">{hint}</p> : null}
      {day.date >= today ? (
        <button type="button" className="mline add" onClick={onAdd}>
          + 이날 할 일
        </button>
      ) : null}
    </section>
  )
}
