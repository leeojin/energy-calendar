import { ApiError } from '../api/port.ts'
import type { ApiPort } from '../api/port.ts'
import type {
  ConditionLevel,
  DayResponse,
  IsoDate,
  LinkExpiry,
  MeResponse,
  RoutineResponse,
  ShareLinkResponse,
  TaskMoveHistoryResponse,
  TaskResponse,
  TimeSlot,
  WeekCheerResponse,
} from '../api/types.ts'
import { addDays, mondayOf, todayKst, weekTitle } from '../lib/dates.ts'
import { buildSeed, generateWeek } from './demoSeed.ts'
import type { DLink, DMove, DRoutine, DTask, DemoState } from './demoSeed.ts'

export class DemoOnlyError extends ApiError {
  constructor() {
    super(0, 'DEMO_ONLY')
  }
}

export type DemoApi = ApiPort & {
  reset(): void
  snapshot(): DemoState
  restore(snap: DemoState): void
}

const SLOT_ORDER: readonly TimeSlot[] = ['MORNING', 'AFTERNOON', 'EVENING']
const ISO = /^\d{4}-\d{2}-\d{2}$/
const YM = /^\d{4}-(0[1-9]|1[0-2])$/

function fail(status: number, code: ApiError['code']): never {
  throw new ApiError(status, code)
}

function checkName(name: string): string {
  const n = name.trim()
  if (n.length < 1 || n.length > 20) fail(400, 'VALIDATION_FAILED')
  return n
}
function checkCost(cost: number): void {
  if (!Number.isInteger(cost) || cost < 1 || cost > 10) fail(400, 'VALIDATION_FAILED')
}
function isMonday(iso: string): boolean {
  return ISO.test(iso) && mondayOf(iso) === iso
}
function dayBudgetOf(budget: number, level: ConditionLevel): number {
  switch (level) {
    case 'LOW':
      return Math.floor(budget / 2)
    case 'NORMAL':
      return budget
    case 'GOOD':
      return Math.floor((budget * 6) / 5)
    case 'REST':
      return 0
  }
}

export function createDemoApi(clock: () => Date = () => new Date()): DemoApi {
  const todayOf = (): IsoDate => todayKst(clock())
  const nowIso = (): string => {
    const k = new Date(clock().getTime() + 9 * 3_600_000).toISOString()
    return k.slice(0, 19)
  }
  let s: DemoState = buildSeed(todayOf())

  const lockOf = (today: IsoDate): IsoDate => addDays(mondayOf(today), -7)
  const budgetOn = (date: IsoDate): number => {
    const ok = s.budgets.filter((b) => b.start <= date)
    const list = ok.length > 0 ? ok : [s.budgets[0]]
    return list.reduce((a, b) => (b.start >= a.start ? b : a)).budget
  }
  const currentBudget = (): number =>
    s.budgets.reduce((a, b) => (b.start >= a.start ? b : a)).budget
  const live = (): DTask[] => s.tasks.filter((t) => !t.deleted)
  const findTask = (id: number): DTask => {
    const t = s.tasks.find((x) => x.id === id && !x.deleted)
    if (!t) fail(404, 'TASK_NOT_FOUND')
    return t
  }
  const findRoutine = (id: number): DRoutine => {
    const r = s.routines.find((x) => x.id === id)
    if (!r) fail(404, 'ROUTINE_NOT_FOUND')
    return r
  }
  const findLink = (id: number): DLink => {
    const l = s.links.find((x) => x.id === id && x.status !== 'DELETED')
    if (!l) fail(404, 'SHARE_LINK_NOT_FOUND')
    return l
  }
  const moveCount = (id: number): number => s.moves.filter((m) => m.taskId === id).length

  function taskRes(t: DTask): TaskResponse {
    const today = todayOf()
    return {
      taskId: t.id,
      routineId: t.routineId,
      name: t.name,
      plannedDate: t.plannedDate,
      occurrenceDate: t.occurrenceDate,
      timeSlot: t.timeSlot,
      energyCost: t.cost,
      status: t.status,
      isVisible: t.visible,
      completedAt: t.completedAt,
      moveCount: moveCount(t.id),
      isLate: t.status === 'PLANNED' && t.plannedDate < today,
      isLocked: t.plannedDate < lockOf(today),
    }
  }

  function dayRes(date: IsoDate): DayResponse {
    const list = live()
      .filter((t) => t.plannedDate === date)
      .sort(
        (a, b) => SLOT_ORDER.indexOf(a.timeSlot) - SLOT_ORDER.indexOf(b.timeSlot) || a.id - b.id,
      )
    const budget = budgetOn(date)
    const level = s.cond[date] ?? 'NORMAL'
    const dayBudget = dayBudgetOf(budget, level)
    const used = list.reduce((a, t) => a + t.cost, 0)
    const done = list.filter((t) => t.status === 'DONE').reduce((a, t) => a + t.cost, 0)
    return {
      date,
      energyBudget: budget,
      conditionLevel: level,
      dayBudget,
      usedEnergy: used,
      doneEnergy: done,
      remainingEnergy: dayBudget - used,
      overflowEnergy: Math.max(0, used - dayBudget),
      tasks: list.map(taskRes),
    }
  }

  function routineRes(r: DRoutine): RoutineResponse {
    return {
      routineId: r.id,
      name: r.name,
      energyCost: r.cost,
      timeSlot: r.slot,
      weekdays: r.weekdays,
      startDate: r.startDate,
      endDate: r.endDate,
      status: r.status,
    }
  }

  function expireFor(expiry: LinkExpiry): IsoDate | null {
    const m = mondayOf(todayOf())
    if (expiry === 'THIS_WEEK') return addDays(m, 6)
    if (expiry === 'FOUR_WEEKS') return addDays(m, 27)
    return null
  }
  function linkRes(l: DLink): ShareLinkResponse {
    const today = todayOf()
    return {
      shareLinkId: l.id,
      name: l.name,
      token: l.token,
      status: l.status === 'CLOSED' ? 'CLOSED' : 'OPEN',
      isExpired: l.status === 'OPEN' && l.expireDate !== null && today > l.expireDate,
      expireDate: l.expireDate,
      isOneTimeVisible: l.oneTime,
      routineIds: [...l.routineIds],
      commentCount: s.comments.filter((c) => c.linkId === l.id).length,
      createdAt: l.createdAt,
      closedAt: l.closedAt,
    }
  }
  const isOpenNow = (l: DLink): boolean => {
    const r = linkRes(l)
    return l.status === 'OPEN' && !r.isExpired
  }

  function moveRes(m: DMove): TaskMoveHistoryResponse {
    const t = s.tasks.find((x) => x.id === m.taskId)
    return {
      taskMoveHistoryId: m.id,
      taskId: m.taskId,
      taskName: t?.name ?? '',
      fromDate: m.fromDate,
      fromTimeSlot: m.fromSlot,
      toDate: m.toDate,
      toTimeSlot: m.toSlot,
      createdAt: m.createdAt,
    }
  }

  const beyond = (monday: IsoDate): boolean => monday > addDays(mondayOf(todayOf()), 56)

  function occurrences(monday: IsoDate) {
    if (beyond(monday)) return { createdCount: 0, isBeyondRange: true }
    return { createdCount: generateWeek(s, monday, todayOf()), isBeyondRange: false }
  }

  function me(): MeResponse {
    return {
      username: 'example',
      nickname: s.nickname,
      createdDate: s.createdDate,
      energyBudget: currentBudget(),
      isRecentLogin: true,
    }
  }

  const demoOnly = (): Promise<never> => Promise.reject(new DemoOnlyError())

  const run = <T>(fn: () => T): Promise<T> => {
    try {
      return Promise.resolve(fn())
    } catch (e) {
      return Promise.reject(e instanceof Error ? e : new Error(String(e)))
    }
  }

  const api: DemoApi = {
    reset() {
      s = buildSeed(todayOf())
    },
    snapshot: () => structuredClone(s),
    restore(snap) {
      s = structuredClone(snap)
    },
    getHealth: () => Promise.resolve({ status: 'ok' as const }),
    signup: demoOnly,
    login: demoOnly,
    logout: () => Promise.resolve(),
    getMe: () => run(me),
    updateNickname: (req) =>
      run(() => {
        const n = req.nickname.trim()
        if (n.length < 1 || n.length > 20) fail(400, 'VALIDATION_FAILED')
        s.nickname = n
        return me()
      }),
    updatePassword: demoOnly,
    updateEnergyBudget: (req) =>
      run(() => {
        if (!Number.isInteger(req.energyBudget) || req.energyBudget < 1 || req.energyBudget > 30) {
          fail(400, 'VALIDATION_FAILED')
        }
        const today = todayOf()
        const row = s.budgets.find((b) => b.start === today)
        if (row) row.budget = req.energyBudget
        else s.budgets.push({ start: today, budget: req.energyBudget })
        return me()
      }),
    reauth: demoOnly,
    getDeleteSummary: demoOnly,
    deleteAccount: demoOnly,
    putDayCondition: (date, req) =>
      run(() => {
        if (!ISO.test(date)) fail(400, 'VALIDATION_FAILED')
        if (date < todayOf()) fail(400, 'DATE_IN_PAST')
        s.cond[date] = req.conditionLevel
        return { date, conditionLevel: req.conditionLevel }
      }),
    createWeekOccurrences: (monday) =>
      run(() => {
        if (!isMonday(monday)) fail(400, 'VALIDATION_FAILED')
        return occurrences(monday)
      }),
    getWeek: (monday) =>
      run(() => {
        if (!isMonday(monday)) fail(400, 'VALIDATION_FAILED')
        const today = todayOf()
        const thisMonday = mondayOf(today)
        const lockDate = lockOf(today)
        const cheers: WeekCheerResponse[] = s.comments
          .filter((c) => c.weekStart === monday)
          .map((c) => {
            const l = s.links.find((x) => x.id === c.linkId)
            return {
              shareLinkCommentId: c.id,
              shareLinkId: c.linkId,
              linkName: l?.name ?? '',
              linkStatus: l
                ? l.status === 'OPEN'
                  ? ('OPEN' as const)
                  : l.status
                : ('DELETED' as const),
              nickname: c.nickname,
              body: c.body,
              createdAt: c.createdAt,
            }
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        const leftover =
          monday === thisMonday
            ? live()
                .filter(
                  (t) =>
                    t.routineId === null &&
                    t.status === 'PLANNED' &&
                    t.plannedDate >= lockDate &&
                    t.plannedDate < thisMonday,
                )
                .sort((a, b) => a.plannedDate.localeCompare(b.plannedDate) || a.id - b.id)
                .map(taskRes)
            : []
        return {
          weekStart: monday,
          weekEnd: addDays(monday, 6),
          today,
          lockDate,
          title: weekTitle(monday),
          isThisWeek: monday === thisMonday,
          isBeyondRange: beyond(monday),
          currentEnergyBudget: currentBudget(),
          days: Array.from({ length: 7 }, (_, i) => dayRes(addDays(monday, i))),
          leftoverTasks: leftover,
          cheers,
        }
      }),
    createMonthOccurrences: (month) =>
      run(() => {
        if (!YM.test(month)) fail(400, 'VALIDATION_FAILED')
        const first = `${month}-01`
        let total = 0
        let allBeyond = true
        for (let m = mondayOf(first); m.slice(0, 7) <= month; m = addDays(m, 7)) {
          if (addDays(m, 6) < first) continue
          const r = occurrences(m)
          total += r.createdCount
          if (!r.isBeyondRange) allBeyond = false
        }
        return { createdCount: total, isBeyondRange: allBeyond }
      }),
    getMonth: (month) =>
      run(() => {
        if (!YM.test(month)) fail(400, 'VALIDATION_FAILED')
        const days: DayResponse[] = []
        for (let d = `${month}-01`; d.slice(0, 7) === month; d = addDays(d, 1)) days.push(dayRes(d))
        const today = todayOf()
        return {
          month,
          today,
          lockDate: lockOf(today),
          firstMonth: s.createdDate.slice(0, 7),
          days,
        }
      }),
    createTask: (req) =>
      run(() => {
        const name = checkName(req.name)
        checkCost(req.energyCost)
        if (!ISO.test(req.plannedDate) || !SLOT_ORDER.includes(req.timeSlot))
          fail(400, 'VALIDATION_FAILED')
        if (req.plannedDate < todayOf()) fail(400, 'DATE_IN_PAST')
        if (live().filter((t) => t.plannedDate === req.plannedDate).length >= 30)
          fail(429, 'TASK_DAY_LIMIT')
        const t: DTask = {
          id: s.seq.task++,
          routineId: null,
          name,
          plannedDate: req.plannedDate,
          occurrenceDate: null,
          timeSlot: req.timeSlot,
          cost: req.energyCost,
          status: 'PLANNED',
          visible: req.isVisible === true,
          completedAt: null,
          deleted: false,
        }
        s.tasks.push(t)
        return taskRes(t)
      }),
    updateTask: (taskId, req) =>
      run(() => {
        const t = findTask(taskId)
        if (req.name === undefined && req.energyCost === undefined && req.isVisible === undefined) {
          fail(400, 'VALIDATION_FAILED')
        }
        if (t.plannedDate < lockOf(todayOf())) fail(400, 'DATE_LOCKED')
        if (t.routineId !== null && (req.name !== undefined || req.isVisible !== undefined)) {
          fail(400, 'ROUTINE_TASK_FIELD_NOT_EDITABLE')
        }
        const name = req.name === undefined ? t.name : checkName(req.name)
        if (req.energyCost !== undefined) checkCost(req.energyCost)
        t.name = name
        if (req.energyCost !== undefined) t.cost = req.energyCost
        if (req.isVisible !== undefined) t.visible = req.isVisible
        return taskRes(t)
      }),
    deleteTask: (taskId) =>
      run(() => {
        const t = findTask(taskId)
        if (t.plannedDate < lockOf(todayOf())) fail(400, 'DATE_LOCKED')
        t.deleted = true
      }),
    completeTask: (taskId) =>
      run(() => {
        const t = findTask(taskId)
        const today = todayOf()
        if (t.plannedDate < lockOf(today)) fail(400, 'DATE_LOCKED')
        if (t.plannedDate > today) fail(400, 'FUTURE_TASK_NOT_COMPLETABLE')
        if (t.status !== 'DONE') {
          t.status = 'DONE'
          t.completedAt = nowIso()
        }
        return taskRes(t)
      }),
    uncompleteTask: (taskId) =>
      run(() => {
        const t = findTask(taskId)
        if (t.plannedDate < lockOf(todayOf())) fail(400, 'DATE_LOCKED')
        t.status = 'PLANNED'
        t.completedAt = null
        return taskRes(t)
      }),
    moveTask: (taskId, req) =>
      run(() => {
        const t = findTask(taskId)
        const lock = lockOf(todayOf())
        if (t.status === 'DONE') fail(400, 'TASK_DONE_NOT_MOVABLE')
        if (t.plannedDate < lock) fail(400, 'DATE_LOCKED')
        if (!ISO.test(req.toDate) || !SLOT_ORDER.includes(req.toTimeSlot))
          fail(400, 'VALIDATION_FAILED')
        if (req.toDate < lock) fail(400, 'DATE_LOCKED')
        if (
          t.routineId !== null &&
          mondayOf(req.toDate) !== mondayOf(t.occurrenceDate ?? t.plannedDate)
        ) {
          fail(400, 'ROUTINE_TASK_OTHER_WEEK')
        }
        if (req.toDate === t.plannedDate && req.toTimeSlot === t.timeSlot)
          fail(400, 'MOVE_SAME_PLACE')
        if (
          req.toDate !== t.plannedDate &&
          live().filter((x) => x.plannedDate === req.toDate).length >= 30
        ) {
          fail(429, 'TASK_DAY_LIMIT')
        }
        s.moves.push({
          id: s.seq.move++,
          taskId: t.id,
          fromDate: t.plannedDate,
          fromSlot: t.timeSlot,
          toDate: req.toDate,
          toSlot: req.toTimeSlot,
          createdAt: nowIso(),
        })
        t.plannedDate = req.toDate
        t.timeSlot = req.toTimeSlot
        return taskRes(t)
      }),
    getTaskMoves: (taskId) =>
      run(() => {
        findTask(taskId)
        return s.moves
          .filter((m) => m.taskId === taskId)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id)
          .map(moveRes)
      }),
    getMovesOfWeek: (monday) =>
      run(() => {
        if (!isMonday(monday)) fail(400, 'VALIDATION_FAILED')
        const end = addDays(monday, 7)
        return s.moves
          .filter((m) => {
            const d = m.createdAt.slice(0, 10)
            return d >= monday && d < end && s.tasks.some((t) => t.id === m.taskId && !t.deleted)
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
          .map(moveRes)
      }),
    getRoutines: () =>
      run(() =>
        [...s.routines]
          .sort(
            (a, b) => Number(a.status === 'ENDED') - Number(b.status === 'ENDED') || a.id - b.id,
          )
          .map(routineRes),
      ),
    createRoutine: (req) =>
      run(() => {
        const name = checkName(req.name)
        checkCost(req.energyCost)
        if (!Number.isInteger(req.weekdays) || req.weekdays < 1 || req.weekdays > 127)
          fail(400, 'VALIDATION_FAILED')
        if (req.startDate < todayOf()) fail(400, 'DATE_IN_PAST')
        if (req.endDate && req.endDate < req.startDate) fail(400, 'INVALID_DATE_RANGE')
        if (s.routines.filter((r) => r.status === 'ACTIVE').length >= 50)
          fail(429, 'ROUTINE_ACTIVE_LIMIT')
        const r: DRoutine = {
          id: s.seq.routine++,
          name,
          cost: req.energyCost,
          slot: req.timeSlot,
          weekdays: req.weekdays,
          startDate: req.startDate,
          endDate: req.endDate ?? null,
          status: 'ACTIVE',
        }
        s.routines.push(r)
        return routineRes(r)
      }),
    updateRoutineName: (routineId, req) =>
      run(() => {
        const r = findRoutine(routineId)
        if (r.status === 'ENDED') fail(400, 'ROUTINE_ENDED')
        r.name = checkName(req.name)
        for (const t of s.tasks) if (t.routineId === r.id) t.name = r.name
        return routineRes(r)
      }),
    updateRoutineEnergyCost: (routineId, req) =>
      run(() => {
        const r = findRoutine(routineId)
        if (r.status === 'ENDED') fail(400, 'ROUTINE_ENDED')
        checkCost(req.energyCost)
        r.cost = req.energyCost
        const today = todayOf()
        let n = 0
        for (const t of live()) {
          if (t.routineId === r.id && t.plannedDate >= today && t.status === 'PLANNED') {
            t.cost = r.cost
            n++
          }
        }
        return { routine: routineRes(r), updatedTaskCount: n }
      }),
    endRoutine: (routineId) =>
      run(() => {
        const r = findRoutine(routineId)
        if (r.status === 'ENDED') fail(400, 'ROUTINE_ENDED')
        const today = todayOf()
        r.status = 'ENDED'
        if (r.endDate === null || r.endDate > today) r.endDate = today
        let n = 0
        for (const t of live()) {
          if (t.routineId === r.id && t.plannedDate > today && t.status === 'PLANNED') {
            t.deleted = true
            n++
          }
        }
        return { routine: routineRes(r), deletedTaskCount: n }
      }),
    getShareLinks: () => run(() => s.links.filter((l) => l.status !== 'DELETED').map(linkRes)),
    createShareLink: demoOnly,
    updateShareLink: (id, req) =>
      run(() => {
        const l = findLink(id)
        if (req.isOneTimeVisible === undefined && req.expiry === undefined)
          fail(400, 'VALIDATION_FAILED')
        if (!isOpenNow(l)) fail(400, 'SHARE_LINK_NOT_OPEN')
        if (req.isOneTimeVisible !== undefined) l.oneTime = req.isOneTimeVisible
        if (req.expiry !== undefined) l.expireDate = expireFor(req.expiry)
        return linkRes(l)
      }),
    closeShareLink: (id) =>
      run(() => {
        const l = findLink(id)
        if (l.status !== 'OPEN') fail(400, 'SHARE_LINK_NOT_OPEN')
        l.status = 'CLOSED'
        l.closedAt = nowIso()
        return linkRes(l)
      }),
    deleteShareLink: (id) =>
      run(() => {
        const l = findLink(id)
        if (isOpenNow(l)) fail(400, 'SHARE_LINK_STILL_OPEN')
        l.status = 'DELETED'
        l.routineIds = []
      }),
    deleteShareLinkWithComments: (id) =>
      run(() => {
        const l = findLink(id)
        if (isOpenNow(l)) fail(400, 'SHARE_LINK_STILL_OPEN')
        s.comments = s.comments.filter((c) => c.linkId !== l.id)
        s.links = s.links.filter((x) => x.id !== l.id)
      }),
    addShareLinkRoutine: (id, routineId) =>
      run(() => {
        const l = findLink(id)
        findRoutine(routineId)
        if (!isOpenNow(l)) fail(400, 'SHARE_LINK_NOT_OPEN')
        if (!l.routineIds.includes(routineId)) l.routineIds.push(routineId)
      }),
    removeShareLinkRoutine: (id, routineId) =>
      run(() => {
        const l = findLink(id)
        if (!isOpenNow(l)) fail(400, 'SHARE_LINK_NOT_OPEN')
        l.routineIds = l.routineIds.filter((x) => x !== routineId)
      }),
    getShareLinkComments: (id) =>
      run(() => {
        findLink(id)
        return s.comments
          .filter((c) => c.linkId === id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((c) => ({
            shareLinkCommentId: c.id,
            nickname: c.nickname,
            body: c.body,
            createdAt: c.createdAt,
            weekStart: c.weekStart,
          }))
      }),
    deleteShareLinkComment: (commentId) =>
      run(() => {
        if (!s.comments.some((c) => c.id === commentId)) fail(404, 'COMMENT_NOT_FOUND')
        s.comments = s.comments.filter((c) => c.id !== commentId)
      }),
    getPublicShare: () => Promise.reject(new ApiError(404, 'SHARE_LINK_NOT_FOUND')),
    createPublicComment: demoOnly,
  }
  return api
}

export const demoApi: DemoApi = createDemoApi()
