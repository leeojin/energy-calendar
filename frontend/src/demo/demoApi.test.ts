import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/port.ts'
import type { ApiPort } from '../api/port.ts'
import { addDays, mondayOf } from '../lib/dates.ts'
import { createDemoApi, DemoOnlyError } from './demoApi.ts'

const NOW = new Date('2026-11-04T03:00:00Z')
const TODAY = '2026-11-04'
const MON = mondayOf(TODAY)

function make() {
  return createDemoApi(() => NOW)
}

async function code(p: Promise<unknown>): Promise<string> {
  try {
    await p
  } catch (e) {
    return (e as ApiError).code
  }
  return 'NO_ERROR'
}

afterEach(() => vi.unstubAllGlobals())

describe('demoApi', () => {
  it('주 읽기가 서버와 같은 모양이다', async () => {
    const api = make()
    const w = await api.getWeek(MON)
    expect(w.weekStart).toBe(MON)
    expect(w.weekEnd).toBe(addDays(MON, 6))
    expect(w.today).toBe(TODAY)
    expect(w.lockDate).toBe(addDays(MON, -7))
    expect(w.isThisWeek).toBe(true)
    expect(w.days).toHaveLength(7)
    expect(Array.isArray(w.leftoverTasks)).toBe(true)
    expect(Array.isArray(w.cheers)).toBe(true)
    const t = w.days.flatMap((d) => d.tasks)[0]
    expect(Object.keys(t).sort()).toEqual(
      [
        'taskId',
        'routineId',
        'name',
        'plannedDate',
        'occurrenceDate',
        'timeSlot',
        'energyCost',
        'status',
        'isVisible',
        'completedAt',
        'moveCount',
        'isLate',
        'isLocked',
      ].sort(),
    )
  })

  it('컨디션이 낮으면 하루 배터리가 절반이 된다', async () => {
    const api = make()
    await api.putDayCondition(TODAY, { conditionLevel: 'LOW' })
    const day = (await api.getWeek(MON)).days.find((d) => d.date === TODAY)!
    expect(day.energyBudget).toBe(12)
    expect(day.dayBudget).toBe(6)
    expect(day.remainingEnergy).toBe(day.dayBudget - day.usedEnergy)
    expect(day.overflowEnergy).toBe(Math.max(0, day.usedEnergy - 6))
    await api.putDayCondition(TODAY, { conditionLevel: 'GOOD' })
    const good = (await api.getWeek(MON)).days.find((d) => d.date === TODAY)!
    expect(good.dayBudget).toBe(14)
    await api.putDayCondition(TODAY, { conditionLevel: 'REST' })
    const rest = (await api.getWeek(MON)).days.find((d) => d.date === TODAY)!
    expect(rest.dayBudget).toBe(0)
  })

  it('매주 하는 일을 다른 주로 옮기면 거부한다', async () => {
    const api = make()
    const w = await api.getWeek(MON)
    const routineTask = w.days
      .flatMap((d) => d.tasks)
      .find((t) => t.routineId !== null && !t.isLocked && t.status === 'PLANNED')!
    expect(
      await code(
        api.moveTask(routineTask.taskId, { toDate: addDays(MON, 8), toTimeSlot: 'MORNING' }),
      ),
    ).toBe('ROUTINE_TASK_OTHER_WEEK')
  })

  it('잠금선 앞으로 옮기면 거부한다', async () => {
    const api = make()
    const w = await api.getWeek(MON)
    const once = w.days
      .flatMap((d) => d.tasks)
      .find((t) => t.routineId === null && t.status === 'PLANNED')!
    expect(
      await code(
        api.moveTask(once.taskId, { toDate: addDays(w.lockDate, -1), toTimeSlot: 'MORNING' }),
      ),
    ).toBe('DATE_LOCKED')
  })

  it('옮기면 옮긴 기록이 남고 같은 자리는 거부한다', async () => {
    const api = make()
    const w = await api.getWeek(MON)
    const once = w.days
      .flatMap((d) => d.tasks)
      .find((t) => t.routineId === null && t.status === 'PLANNED' && t.plannedDate >= TODAY)!
    expect(
      await code(
        api.moveTask(once.taskId, { toDate: once.plannedDate, toTimeSlot: once.timeSlot }),
      ),
    ).toBe('MOVE_SAME_PLACE')
    const to = addDays(once.plannedDate, 1)
    const moved = await api.moveTask(once.taskId, { toDate: to, toTimeSlot: 'EVENING' })
    expect(moved.plannedDate).toBe(to)
    expect(moved.moveCount).toBe(once.moveCount + 1)
    const hist = await api.getTaskMoves(once.taskId)
    expect(hist.at(-1)?.toDate).toBe(to)
    expect((await api.getMovesOfWeek(MON)).some((h) => h.taskId === once.taskId)).toBe(true)
  })

  it('앞날 할 일은 했어요를 누를 수 없다', async () => {
    const api = make()
    const w = await api.getWeek(MON)
    const future = w.days.flatMap((d) => d.tasks).find((t) => t.plannedDate > TODAY)!
    expect(await code(api.completeTask(future.taskId))).toBe('FUTURE_TASK_NOT_COMPLETABLE')
  })

  it('오늘 할 일은 했어요와 안 했어요를 오갈 수 있다', async () => {
    const api = make()
    const w = await api.getWeek(MON)
    const today = w.days.find((d) => d.date === TODAY)!.tasks.find((t) => t.status === 'PLANNED')!
    const done = await api.completeTask(today.taskId)
    expect(done.status).toBe('DONE')
    expect(done.completedAt).not.toBeNull()
    expect(await code(api.moveTask(today.taskId, { toDate: TODAY, toTimeSlot: 'EVENING' }))).toBe(
      'TASK_DONE_NOT_MOVABLE',
    )
    expect((await api.uncompleteTask(today.taskId)).status).toBe('PLANNED')
  })

  it('만들고 지우고 고친다', async () => {
    const api = make()
    const t = await api.createTask({
      name: '산책',
      plannedDate: TODAY,
      timeSlot: 'MORNING',
      energyCost: 3,
    })
    expect(t.isVisible).toBe(false)
    expect((await api.updateTask(t.taskId, { energyCost: 4 })).energyCost).toBe(4)
    await api.deleteTask(t.taskId)
    const w = await api.getWeek(MON)
    expect(w.days.flatMap((d) => d.tasks).some((x) => x.taskId === t.taskId)).toBe(false)
    expect(
      await code(
        api.createTask({
          name: '어제',
          plannedDate: addDays(TODAY, -1),
          timeSlot: 'MORNING',
          energyCost: 1,
        }),
      ),
    ).toBe('DATE_IN_PAST')
  })

  it('다시 시작하면 처음 데이터로 돌아온다', async () => {
    const api = make()
    const before = JSON.stringify(await api.getWeek(MON))
    const t = await api.createTask({
      name: '새것',
      plannedDate: TODAY,
      timeSlot: 'MORNING',
      energyCost: 2,
    })
    await api.putDayCondition(TODAY, { conditionLevel: 'REST' })
    await api.deleteTask(t.taskId)
    expect(JSON.stringify(await api.getWeek(MON))).not.toBe(before)
    api.reset()
    expect(JSON.stringify(await api.getWeek(MON))).toBe(before)
  })

  it('남과 이어지는 동작은 가입하면 할 수 있다는 표시값으로 거절한다', async () => {
    const api = make()
    const p = api.createShareLink({
      name: 'a',
      routineIds: [],
      isOneTimeVisible: false,
      expiry: 'NONE',
    })
    await expect(p).rejects.toBeInstanceOf(DemoOnlyError)
    expect(await code(api.createPublicComment('x', { nickname: 'a', body: 'b' }))).toBe('DEMO_ONLY')
    expect(
      await code(api.signup({ username: 'abcd', password: '12345678', turnstileToken: 't' })),
    ).toBe('DEMO_ONLY')
  })

  it('어떤 메서드도 fetch를 부르지 않는다', async () => {
    const boom = vi.fn(() => {
      throw new Error('fetch 금지')
    })
    vi.stubGlobal('fetch', boom)
    const api = make()
    const w = await api.getWeek(MON)
    const taskId = w.days.flatMap((d) => d.tasks)[0].taskId
    const calls: Array<() => Promise<unknown>> = [
      () => api.getHealth(),
      () => api.getMe(),
      () => api.getMonth('2026-11'),
      () => api.createMonthOccurrences('2026-11'),
      () => api.createWeekOccurrences(addDays(MON, 7)),
      () => api.getRoutines(),
      () => api.getShareLinks(),
      () => api.getShareLinkComments(1),
      () => api.getTaskMoves(taskId),
      () => api.updateNickname({ nickname: '별' }),
      () => api.updateEnergyBudget({ energyBudget: 10 }),
      () => api.endRoutine(1),
      () => api.closeShareLink(1),
      () => api.getPublicShare('x'),
      () => api.logout(),
      () => api.getDeleteSummary(),
      () => api.deleteAccount({ username: 'a', password: 'b' }),
      () => api.login({ username: 'a', password: 'b' }),
    ]
    for (const c of calls) await c().catch(() => undefined)
    expect(boom).not.toHaveBeenCalled()
    const keys: Array<keyof ApiPort> = [
      'getWeek',
      'moveTask',
      'completeTask',
      'createShareLink',
      'deleteShareLinkComment',
    ]
    for (const k of keys) expect(typeof api[k]).toBe('function')
  })

  it('월 읽기가 달 전체를 돌려준다', async () => {
    const api = make()
    const m = await api.getMonth('2026-11')
    expect(m.days).toHaveLength(30)
    expect(m.today).toBe(TODAY)
    expect(m.firstMonth <= '2026-11').toBe(true)
  })
})
