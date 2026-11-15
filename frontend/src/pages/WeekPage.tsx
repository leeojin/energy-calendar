import { notifications } from '@mantine/notifications'
import { Fragment, useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router'
import { useApi } from '../api/ApiContext.tsx'
import { messageOf } from '../api/errors.ts'
import { ApiError } from '../api/port.ts'
import type {
  ConditionLevel,
  RoutineResponse,
  ShareLinkResponse,
  TaskResponse,
  TimeSlot,
  WeekCheerResponse,
  WeekResponse,
} from '../api/types.ts'
import { useSession } from '../auth/SessionContext.tsx'
import { DayRow, dayName } from '../components/DayRow.tsx'
import { SlotFilter } from '../components/SlotFilter.tsx'
import { QuickCreate } from '../components/QuickCreate.tsx'
import type { QuickForm } from '../components/QuickCreate.tsx'
import { TaskPopover } from '../components/TaskPopover.tsx'
import { showUndoNotice } from '../components/UndoNotice.tsx'
import { LegendModal } from '../components/LegendModal.tsx'
import { Notebook } from '../components/Notebook.tsx'
import { PageHead } from '../components/PageHead.tsx'
import { useDemoPath } from '../demo/useDemoPath.ts'
import { useIsDemo } from '../api/ApiContext.tsx'
import { addDays, hourKst, mondayOf, todayKst, weekRangeText } from '../lib/dates.ts'
import {
  canPlaceHint,
  defaultSlot,
  emptyCircles,
  scaleCells,
  SLOT_LABEL,
  withGhost,
  withoutTasks,
} from '../lib/battery.ts'
import type { Ghost } from '../lib/battery.ts'
import { endFirstRun, firstTaskBoxOpen, inFirstRun, slotAt } from '../lib/firstRun.ts'
import { slotFilterLabel } from '../lib/moves.ts'
import { flushAll } from '../lib/undo.ts'
import { isAllowedText } from '../lib/text.ts'
import { FirstRunGuide, FirstTaskBox } from './week/FirstRunGuide.tsx'
import type { GuideStep } from './week/FirstRunGuide.tsx'
import { NewTaskPanel } from './week/NewTaskPanel.tsx'
import type { NewTaskDraft } from './week/NewTaskPanel.tsx'
import { MarginMemo } from './week/MarginMemo.tsx'
import { RoutineMemo } from './week/RoutineMemo.tsx'
import { notifyError } from '../lib/notify.ts'

const NTH = ['첫째', '둘째', '셋째', '넷째', '다섯째']
const ISO = /^\d{4}-\d{2}-\d{2}$/

function weekLabel(week: WeekResponse): string {
  const { weekStart, today } = week
  if (week.isThisWeek) return '이번 주'
  if (weekStart === addDays(mondayOf(today), -7)) return '지난주'
  if (weekStart === addDays(mondayOf(today), 7)) return '다음 주'
  return weekStart < today ? '지난 기록' : '다가올 주'
}

function pickDate(d: NewTaskDraft, date: string): NewTaskDraft {
  if (d.type === 'once') return { ...d, date }
  if (d.pickTarget === 'end' && d.end !== null) {
    return date < d.start ? { ...d, start: date, end: date } : { ...d, end: date }
  }
  return { ...d, start: date, end: d.end !== null && d.end < date ? date : d.end }
}

export function WeekPage() {
  const { monday: param } = useParams()
  const dp = useDemoPath()
  const location = useLocation()
  const [draft, setDraft] = useState<NewTaskDraft | null>(() => {
    const date = (location.state as { newDate?: unknown } | null)?.newDate
    if (typeof date !== 'string' || !ISO.test(date)) return null
    return {
      type: 'once',
      name: '',
      cost: 2,
      date,
      timeSlot: 'MORNING',
      isVisible: false,
      weekdays: 0,
      start: date,
      end: null,
      pickTarget: 'start',
    }
  })
  const [moving, setMoving] = useState<TaskResponse | null>(null)
  const [slotFilter, setSlotFilter] = useState<TimeSlot | null>(null)
  useEffect(() => {
    if (!moving) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoving(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [moving])
  const monday = param && ISO.test(param) ? mondayOf(param) : mondayOf(todayKst())
  if (param !== undefined && param !== monday)
    return <Navigate to={dp(`/week/${monday}`)} replace />
  return (
    <WeekView
      key={monday}
      monday={monday}
      draft={draft}
      setDraft={setDraft}
      moving={moving}
      setMoving={setMoving}
      slotFilter={slotFilter}
      setSlotFilter={setSlotFilter}
    />
  )
}

interface ViewProps {
  monday: string
  draft: NewTaskDraft | null
  setDraft: (d: NewTaskDraft | null) => void
  moving: TaskResponse | null
  setMoving: (t: TaskResponse | null) => void
  slotFilter: TimeSlot | null
  setSlotFilter: (s: TimeSlot | null) => void
}

function WeekView({
  monday,
  draft,
  setDraft,
  moving,
  setMoving,
  slotFilter,
  setSlotFilter,
}: ViewProps) {
  const api = useApi()
  const { me } = useSession()
  const navigate = useNavigate()
  const dp = useDemoPath()
  const isDemo = useIsDemo()
  const [week, setWeek] = useState<WeekResponse | null>(null)
  const [failed, setFailed] = useState(false)
  const [legend, setLegend] = useState(false)
  const [condDate, setCondDate] = useState<string | null>(null)

  const [tick, setTick] = useState(0)
  const [quick, setQuick] = useState<QuickForm | null>(null)
  const [selTask, setSelTask] = useState<number | null>(null)
  const [hidden, setHidden] = useState<ReadonlySet<number>>(new Set())
  const [hiddenCheers, setHiddenCheers] = useState<ReadonlySet<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const [quickErr, setQuickErr] = useState('')
  const [draftErr, setDraftErr] = useState('')
  const [pickDay, setPickDay] = useState<string | null>(null)
  const [dragging, setDragging] = useState<TaskResponse | null>(null)
  const [routines, setRoutines] = useState<RoutineResponse[]>([])
  const [links, setLinks] = useState<ShareLinkResponse[]>([])
  const [openRoutine, setOpenRoutine] = useState<number | null>(null)
  const [guide, setGuide] = useState<GuideStep | null>(() =>
    !isDemo && inFirstRun() ? 'condition' : null,
  )
  const [firstDraft, setFirstDraft] = useState<{ name: string; cost: number } | null>(null)
  const [firstTask, setFirstTask] = useState<TaskResponse | null>(null)
  const [firstCompleted, setFirstCompleted] = useState(false)
  const [firstErr, setFirstErr] = useState('')

  const closeGuide = useCallback(() => {
    endFirstRun()
    setGuide(null)
    setFirstDraft(null)
    setFirstErr('')
  }, [])

  const reloadRoutines = useCallback(async () => {
    try {
      const [r, l] = await Promise.all([api.getRoutines(), api.getShareLinks()])
      setRoutines(r)
      setLinks(l)
    } catch {
      // 조회 실패 무시
    }
  }, [api])
  useEffect(() => {
    let alive = true
    Promise.all([api.getRoutines(), api.getShareLinks()])
      .then(([r, l]) => {
        if (!alive) return
        setRoutines(r)
        setLinks(l)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [api, tick])

  useEffect(() => () => flushAll(), [])

  useEffect(() => {
    if (!quick && selTask === null) return
    const onDown = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest('.pop')) return
      setQuick(null)
      setSelTask(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [quick, selTask])

  useEffect(() => {
    let alive = true
    api
      .createWeekOccurrences(monday)
      .catch(() => undefined)
      .then(() => api.getWeek(monday))
      .then((w) => {
        if (!alive) return
        setWeek(w)
        if (w.days.some((d) => d.date === w.today && d.tasks.length > 0)) closeGuide()
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
  }, [api, monday, tick, closeGuide])

  const fail = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.code !== 'AUTH_REQUIRED') {
      notifyError(messageOf(e.code))
    }
  }, [])

  const reload = useCallback(async () => {
    setWeek(await api.getWeek(monday))
  }, [api, monday])

  const act = async (fn: () => Promise<unknown>): Promise<boolean> => {
    setBusy(true)
    try {
      await fn()
      await reload()
      return true
    } catch (e) {
      fail(e)
      return false
    } finally {
      setBusy(false)
    }
  }

  const go = (m: string) => void navigate(dp(`/week/${m}`))

  const makeRoutine = async (d: NewTaskDraft): Promise<boolean> => {
    const ok = await act(async () => {
      await api.createRoutine({
        name: d.name.trim(),
        energyCost: d.cost,
        timeSlot: d.timeSlot,
        weekdays: d.weekdays,
        startDate: d.start,
        endDate: d.end,
      })
      await api.createWeekOccurrences(monday).catch(() => undefined)
      notifications.show({ message: `${d.name.trim()}: 매주 하는 일을 만들었어요` })
    })
    await reloadRoutines()
    return ok
  }

  const makeTask = async (f: {
    name: string
    cost: number
    date: string
    timeSlot: QuickForm['timeSlot']
    isVisible: boolean
  }): Promise<boolean> =>
    act(async () => {
      await api.createTask({
        name: f.name.trim(),
        plannedDate: f.date,
        timeSlot: f.timeSlot,
        energyCost: f.cost,
        isVisible: f.isVisible,
      })
      notifications.show({
        message: `${f.name.trim()}: ${dayName(f.date)} ${SLOT_LABEL[f.timeSlot]}에 만들었어요`,
      })
    })

  const nameError = (name: string): string =>
    name.trim() === ''
      ? '이름을 적어요.'
      : isAllowedText(name, 20)
        ? ''
        : messageOf('VALIDATION_FAILED')

  const submitQuick = async () => {
    if (!quick) return
    const msg = nameError(quick.name)
    if (msg) {
      setQuickErr(msg)
      return
    }
    setQuickErr('')
    if (await makeTask({ ...quick, isVisible: false })) setQuick(null)
  }

  const submitDraft = async () => {
    if (!draft) return
    const msg = nameError(draft.name)
    if (msg) {
      setDraftErr(msg)
      return
    }
    if (draft.type === 'routine') {
      if (draft.weekdays === 0) {
        setDraftErr('요일을 골라요.')
        return
      }
      setDraftErr('')
      if (await makeRoutine(draft)) setDraft({ ...draft, name: '' })
      return
    }
    setDraftErr('')
    if (await makeTask(draft)) setDraft({ ...draft, name: '' })
  }

  const placeFirst = async (name: string, cost: number): Promise<TaskResponse | null> => {
    const msg = nameError(name)
    setFirstErr(msg)
    if (msg || !week) return null
    let made: TaskResponse | null = null
    await act(async () => {
      made = await api.createTask({
        name: name.trim(),
        plannedDate: week.today,
        timeSlot: slotAt(hourKst()),
        energyCost: cost,
        isVisible: false,
      })
    })
    if (made) setFirstDraft(null)
    return made
  }

  const openDraft = (type: NewTaskDraft['type'] = 'once') => {
    if (!week) return
    setMoving(null)
    const date = week.today > week.weekStart ? week.today : week.weekStart
    const day = week.days.find((d) => d.date === date)
    setQuick(null)
    setSelTask(null)
    setDraftErr('')
    setDraft({
      type,
      name: '',
      cost: 2,
      date,
      timeSlot: day ? defaultSlot(day) : 'MORNING',
      isVisible: false,
      weekdays: 0,
      start: date,
      end: null,
      pickTarget: 'start',
    })
  }

  const quickMore = () => {
    if (!quick) return
    setDraftErr('')
    setDraft({
      ...quick,
      type: 'once',
      isVisible: false,
      weekdays: 0,
      start: quick.date,
      end: null,
      pickTarget: 'start',
    })
    setQuick(null)
  }

  const removeTask = (t: TaskResponse) => {
    setSelTask(null)
    setHidden((h) => new Set(h).add(t.taskId))
    const unhide = () =>
      setHidden((h) => {
        const n = new Set(h)
        n.delete(t.taskId)
        return n
      })
    showUndoNotice(t.routineId !== null ? `${t.name}: 이날만 지웠어요` : `${t.name}: 지웠어요`, {
      run: () => {
        api.deleteTask(t.taskId).then(reload).catch(fail).finally(unhide)
      },
      onUndo: unhide,
    })
  }

  const removeCheer = (c: WeekCheerResponse) => {
    const id = c.shareLinkCommentId
    setHiddenCheers((h) => new Set(h).add(id))
    const unhide = () =>
      setHiddenCheers((h) => {
        const n = new Set(h)
        n.delete(id)
        return n
      })
    showUndoNotice('응원을 지웠어요', {
      run: () => {
        api.deleteShareLinkComment(id).then(reload).catch(fail).finally(unhide)
      },
      onUndo: unhide,
    })
  }

  const startMove = (t: TaskResponse) => {
    setSelTask(null)
    setQuick(null)
    setDraft(null)
    setPickDay(null)
    setMoving(t)
  }

  const dropTask = async (t: TaskResponse, date: string, slot: TimeSlot) => {
    setBusy(true)
    setDragging(null)
    try {
      await api.moveTask(t.taskId, { toDate: date, toTimeSlot: slot })
      setMoving(null)
      setPickDay(null)
      notifications.show({ message: `${t.name}: ${dayName(date)} ${SLOT_LABEL[slot]}에 옮겼어요` })
    } catch (e) {
      fail(e)
    } finally {
      setBusy(false)
    }
    try {
      await reload()
    } catch (e) {
      fail(e)
    }
  }

  const pickCondition = async (date: string, level: ConditionLevel) => {
    setCondDate(null)
    try {
      await api.putDayCondition(date, { conditionLevel: level })
      setWeek(await api.getWeek(monday))
    } catch (e) {
      if (e instanceof ApiError && e.code !== 'AUTH_REQUIRED') {
        notifyError(messageOf(e.code))
      }
    }
  }

  if (!week) {
    return (
      <Notebook wide>
        <PageHead current="week" title="이번 주" />
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

  const ghost: Ghost | null = quick
    ? {
        date: quick.date,
        name: quick.name || '새 할 일',
        cost: quick.cost,
        timeSlot: quick.timeSlot,
      }
    : draft && draft.type === 'once' && draft.date >= week.today
      ? { ...draft, name: draft.name || '새 할 일' }
      : firstDraft && firstDraft.name.trim() !== ''
        ? { ...firstDraft, date: week.today, timeSlot: slotAt(hourKst()) }
        : null
  const visibleDays = week.days.map((d) => withoutTasks(d, hidden))
  const cells = scaleCells(visibleDays, week.currentEnergyBudget, ghost)
  const selected =
    selTask === null
      ? null
      : (week.days.flatMap((d) => d.tasks).find((t) => t.taskId === selTask) ?? null)
  const title = `${week.title.month}월 ${NTH[week.title.weekOfMonth - 1] ?? ''} 주`
  const ended = week.weekEnd < week.today
  const locked = week.weekEnd < week.lockDate
  const thisMonday = mondayOf(week.today)
  const movable = (t: TaskResponse) => t.status !== 'DONE' && !t.isLocked
  const guiding = guide !== null && week.isThisWeek
  const showBox = (d: { date: string; tasks: unknown[]; dayBudget: number }) =>
    !isDemo &&
    me !== null &&
    !guiding &&
    week.isThisWeek &&
    d.date === week.today &&
    draft === null &&
    moving === null &&
    firstTaskBoxOpen(me.createdDate, week.today, d.tasks.length, d.dayBudget)

  return (
    <Notebook wide>
      <PageHead
        current="week"
        title={title}
        context={weekRangeText(week.weekStart, week.weekEnd)}
        nav={{
          onPrev: () => go(addDays(week.weekStart, -7)),
          onNext: () => go(addDays(week.weekStart, 7)),
          prevLabel: '이전 주',
          nextLabel: '다음 주',
          back: week.isThisWeek
            ? undefined
            : { label: '이번 주로', onClick: () => go(mondayOf(week.today)) },
        }}
      />
      <div className={guiding ? 'grid3 noleft editing frmode' : 'grid3 noleft editing'}>
        <section className="main-col">
          {moving ? (
            <div className="movepill">
              <span>
                <b>{moving.name}</b> 옮기는 중 · 날과 시간을 골라요
                {moving.routineId !== null
                  ? ' (같은 주 안에서만 옮길 수 있어요)'
                  : ' (다른 주는 ‹ › 를 눌러요)'}
              </span>
              <button type="button" className="btn sm" onClick={() => setMoving(null)}>
                취소
              </button>
            </div>
          ) : null}
          {ended ? (
            <div className="panel pastnote">
              <b>{locked ? '지난 기록이에요.' : '지난주예요.'}</b>{' '}
              {locked ? '고칠 수 없어요.' : '아직 고칠 수 있어요.'}
            </div>
          ) : null}
          <div className="panel">
            <div className="hd phsub">
              <div className="eyebrow">
                {weekLabel(week)} ·{' '}
                {isDemo ? (
                  <span>평소 에너지 {me?.energyBudget ?? week.currentEnergyBudget}칸</span>
                ) : (
                  <Link className="linkbtn" to="/me" title="내 정보에서 바꿔요">
                    평소 에너지 {me?.energyBudget ?? week.currentEnergyBudget}칸
                  </Link>
                )}
              </div>
              <SlotFilter value={slotFilter} onChange={setSlotFilter} />
            </div>
            {slotFilterLabel(slotFilter) ? (
              <p className="slotnow">
                <b>{slotFilterLabel(slotFilter)}</b> ·{' '}
                <button type="button" className="linkbtn" onClick={() => setSlotFilter(null)}>
                  전체 보기
                </button>
              </p>
            ) : null}
            <LegendModal open={legend} onToggle={() => setLegend((v) => !v)} />
            {week.isBeyondRange ? (
              <p className="hint">8주 뒤까지만 미리 볼 수 있어요</p>
            ) : (
              visibleDays.map((d) => (
                <Fragment key={d.date}>
                  <DayRow
                    guided={d.date === week.today && (guiding || showBox(d))}
                    day={withGhost(d, ghost)}
                    today={week.today}
                    cells={cells}
                    condOpen={condDate === d.date}
                    onCondOpen={() => setCondDate((cur) => (cur === d.date ? null : d.date))}
                    onCondClose={() => setCondDate(null)}
                    onCondPick={(level) => void pickCondition(d.date, level)}
                    circles={emptyCircles(withGhost(d, ghost), week.today, draft !== null)}
                    selectedTaskId={selTask}
                    slotFilter={slotFilter}
                    moving={moving}
                    canPlace={
                      moving || dragging
                        ? canPlaceHint((moving ?? dragging)!, d.date, week.lockDate, week.today)
                        : true
                    }
                    pickedDay={pickDay === d.date}
                    onPickDay={(date) => setPickDay((cur) => (cur === date ? null : date))}
                    onDropTo={(date, slot) => {
                      const t = moving ?? dragging
                      if (t) void dropTask(t, date, slot)
                    }}
                    dragging={dragging}
                    canDrag={(t) => movable(t) && draft === null && !busy}
                    onDragStart={(t) => {
                      setSelTask(null)
                      setQuick(null)
                      setDragging(t)
                    }}
                    onDragEnd={() => setDragging(null)}
                    pickable={draft !== null}
                    picked={
                      draft?.type === 'routine'
                        ? draft.pickTarget === 'end'
                          ? draft.end === d.date
                          : draft.start === d.date
                        : draft?.date === d.date
                    }
                    onPick={(date) => draft && setDraft(pickDate(draft, date))}
                    onEmptyClick={(date) => {
                      if (moving) return
                      setSelTask(null)
                      setQuickErr('')
                      setQuick({ date, name: '', cost: 2, timeSlot: defaultSlot(d) })
                    }}
                    onTaskClick={(t) => {
                      setQuick(null)
                      setSelTask(t.taskId)
                    }}
                    popover={(pos) =>
                      quick && quick.date === d.date ? (
                        <QuickCreate
                          form={quick}
                          dayName={dayName(d.date)}
                          leftAfter={d.dayBudget - d.usedEnergy - quick.cost}
                          left={pos.left}
                          arrow={pos.arrow}
                          error={quickErr}
                          busy={busy}
                          onChange={setQuick}
                          onMake={() => void submitQuick()}
                          onMore={quickMore}
                          onCancel={() => setQuick(null)}
                        />
                      ) : selected && selected.plannedDate === d.date ? (
                        <TaskPopover
                          key={selected.taskId}
                          task={selected}
                          links={links}
                          today={week.today}
                          left={pos.left}
                          arrow={pos.arrow}
                          busy={busy}
                          toThisWeek={
                            selected.routineId === null &&
                            mondayOf(selected.plannedDate) < thisMonday
                          }
                          routineStaysInWeek={mondayOf(selected.plannedDate) < thisMonday}
                          onMove={(t) => {
                            startMove(t)
                            if (t.routineId === null && mondayOf(t.plannedDate) < thisMonday) {
                              go(thisMonday)
                            }
                          }}
                          onClose={() => setSelTask(null)}
                          onComplete={(t) =>
                            void act(async () => {
                              await api.completeTask(t.taskId)
                              setSelTask(null)
                              notifications.show({ message: `${t.name} 했어요 ✓` })
                            })
                          }
                          onUncomplete={(t) =>
                            void act(async () => {
                              await api.uncompleteTask(t.taskId)
                              setSelTask(null)
                              notifications.show({ message: `${t.name}: 안 한 걸로 되돌렸어요` })
                            })
                          }
                          onCost={(t, cost) =>
                            void act(() => api.updateTask(t.taskId, { energyCost: cost }))
                          }
                          onRoutineCost={(t, cost) =>
                            void act(async () => {
                              await api.updateRoutineEnergyCost(t.routineId!, { energyCost: cost })
                              setSelTask(null)
                              notifications.show({
                                message: `${t.name}: 오늘부터 ${cost}칸이에요`,
                              })
                              await reloadRoutines()
                            })
                          }
                          onEditRoutine={(t) => {
                            setSelTask(null)
                            setOpenRoutine(t.routineId)
                            setTimeout(
                              () =>
                                document
                                  .getElementById(`rule-${t.routineId}`)
                                  ?.scrollIntoView({ block: 'nearest' }),
                              0,
                            )
                          }}
                          onRename={(t, name) => void act(() => api.updateTask(t.taskId, { name }))}
                          onVisible={(t, isVisible) =>
                            void act(() => api.updateTask(t.taskId, { isVisible }))
                          }
                          onDelete={removeTask}
                        />
                      ) : null
                    }
                  />
                  {guiding && guide && d.date === week.today ? (
                    <FirstRunGuide
                      step={guide}
                      day={d}
                      completed={firstCompleted}
                      busy={busy}
                      error={firstErr}
                      onCondition={(level) => void pickCondition(d.date, level)}
                      onDraft={(name, cost) => setFirstDraft({ name, cost })}
                      onNext={() => setGuide('task')}
                      onPlace={(name, cost) =>
                        void placeFirst(name, cost).then((t) => {
                          if (!t) return
                          setFirstTask(t)
                          setGuide('done')
                        })
                      }
                      onDone={() =>
                        void act(async () => {
                          if (firstTask) await api.completeTask(firstTask.taskId)
                          setFirstCompleted(true)
                          setGuide('end')
                        })
                      }
                      onLater={() => setGuide('end')}
                      onSkip={closeGuide}
                      onFinish={closeGuide}
                    />
                  ) : showBox(d) ? (
                    <FirstTaskBox
                      busy={busy}
                      error={firstErr}
                      onDraft={(name, cost) => setFirstDraft({ name, cost })}
                      onPlace={async (name, cost) => (await placeFirst(name, cost)) !== null}
                    />
                  ) : null}
                </Fragment>
              ))
            )}
          </div>
          <p className="hint">
            <Link className="linkbtn" to={dp('/moves')}>
              옮긴 기록
            </Link>
          </p>
        </section>
        <MarginMemo
          isThisWeek={week.isThisWeek}
          leftoverTasks={week.leftoverTasks}
          cheers={week.cheers.filter((c) => !hiddenCheers.has(c.shareLinkCommentId))}
          onRemoveCheer={removeCheer}
          onOpenNew={() => openDraft('once')}
          routineSlot={
            <RoutineMemo
              routines={routines}
              links={links}
              openId={openRoutine}
              busy={busy}
              onOpen={setOpenRoutine}
              onNew={() => openDraft('routine')}
              onRename={(r, name) =>
                void act(async () => {
                  await api.updateRoutineName(r.routineId, { name })
                  notifications.show({ message: `${name}: 이름을 바꿨어요` })
                  await reloadRoutines()
                })
              }
              onCost={(r, cost) =>
                void act(async () => {
                  await api.updateRoutineEnergyCost(r.routineId, { energyCost: cost })
                  notifications.show({
                    message: `${r.name}: 오늘부터 ${cost}칸이에요`,
                  })
                  await reloadRoutines()
                })
              }
              onEnd={(r) =>
                void act(async () => {
                  const res = await api.endRoutine(r.routineId)
                  setOpenRoutine(null)
                  notifications.show({
                    message:
                      res.deletedTaskCount > 0
                        ? `${r.name}: 내일부터 안 나와요. 앞으로 할 일 ${res.deletedTaskCount}개도 지웠어요`
                        : `${r.name}: 내일부터 안 나와요`,
                  })
                  await reloadRoutines()
                })
              }
            />
          }
          onCarry={startMove}
          newPanel={
            draft ? (
              <NewTaskPanel
                today={week.today}
                draft={draft}
                error={draftErr}
                busy={busy}
                onChange={setDraft}
                onMake={() => void submitDraft()}
                onClose={() => setDraft(null)}
              />
            ) : undefined
          }
        />
      </div>
    </Notebook>
  )
}
