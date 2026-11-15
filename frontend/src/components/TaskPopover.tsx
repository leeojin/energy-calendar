import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useDemoPath } from '../demo/useDemoPath.ts'
import { useApi } from '../api/ApiContext.tsx'
import type { ShareLinkResponse, TaskMoveHistoryResponse, TaskResponse } from '../api/types.ts'
import { SLOT_LABEL } from '../lib/battery.ts'
import { mondayOf } from '../lib/dates.ts'
import { cutToCodePoints, isAllowedText } from '../lib/text.ts'
import { dayName } from './DayRow.tsx'

interface Props {
  task: TaskResponse
  links?: ShareLinkResponse[]
  today: string
  left: number
  arrow: number
  busy: boolean
  onClose: () => void
  onComplete: (t: TaskResponse) => void
  onUncomplete: (t: TaskResponse) => void
  onCost: (t: TaskResponse, cost: number) => void
  onRoutineCost?: (t: TaskResponse, cost: number) => void
  onEditRoutine?: (t: TaskResponse) => void
  onRename: (t: TaskResponse, name: string) => void
  onVisible: (t: TaskResponse, visible: boolean) => void
  onDelete: (t: TaskResponse) => void
  onMove?: (t: TaskResponse) => void
  toThisWeek?: boolean
  routineStaysInWeek?: boolean
}

export function TaskPopover(p: Props) {
  const { task: t, today } = p
  const dp = useDemoPath()
  const api = useApi()
  const [more, setMore] = useState(false)
  const [moves, setMoves] = useState<TaskMoveHistoryResponse[] | null>(null)
  const [name, setName] = useState(t.name)
  const routine = t.routineId !== null
  const seeing = (p.links ?? []).filter(
    (l) => l.status === 'OPEN' && !l.isExpired && l.isOneTimeVisible,
  )
  const [pending, setPending] = useState<number | null>(null)
  const shownCost = pending ?? t.energyCost
  const stepCost = (next: number) => {
    if (routine) setPending(next === t.energyCost ? null : next)
    else p.onCost(t, next)
  }

  useEffect(() => {
    if (!more || moves !== null) return
    let alive = true
    api
      .getTaskMoves(t.taskId)
      .then((m) => {
        if (alive) setMoves(m)
      })
      .catch(() => {
        if (alive) setMoves([])
      })
    return () => {
      alive = false
    }
  }, [api, more, moves, t.taskId])

  const shell = (inner: React.ReactNode) => (
    <div
      className="pop"
      style={{ top: 'calc(100% + 6px)', left: p.left, ['--ax' as string]: `${p.arrow}px` }}
      role="dialog"
      aria-label="할 일"
      onClick={(e) => e.stopPropagation()}
    >
      {inner}
    </div>
  )

  const head = (
    <div className="info">
      <b>{t.name}</b>
      <span>
        {dayName(t.plannedDate)} {SLOT_LABEL[t.timeSlot]} · {t.energyCost}칸 ·{' '}
        {routine ? '매주' : '이번만'}
        {!routine ? (t.isVisible ? ' · 친구에게 보여요' : ' · 나만 봐요') : ''}
        {t.isLate ? ' · 못 했어요' : ''}
      </span>
    </div>
  )

  if (t.isLocked) {
    return shell(
      <>
        {head}
        <div className="note">지난 기록 (고칠 수 없어요)</div>
        <div className="acts">
          <button type="button" className="btn sm ghost" onClick={p.onClose}>
            닫기
          </button>
        </div>
      </>,
    )
  }

  const done = t.status === 'DONE'
  const future = t.plannedDate > today
  const canMove = !done
  const note =
    routine && p.routineStaysInWeek && !done
      ? '매주 하는 일이라 같은 주 안에서만 옮길 수 있어요.'
      : t.moveCount >= 2 && !done
        ? `${t.moveCount}번 옮겼어요. 칸을 줄이거나 지워도 괜찮아요.`
        : future && !done
          ? routine && mondayOf(t.plannedDate) !== mondayOf(today)
            ? '아직 오지 않은 날이에요. 그날이 되면 [했어요]가 나와요.'
            : '미리 했다면 오늘로 옮겨요. 그러면 [했어요]가 나와요.'
          : done
            ? '이미 한 일이라 옮길 수 없어요. 옮기려면 [안 했어요]를 눌러요.'
            : ''
  const commitName = () => {
    const next = name.trim()
    if (next === t.name || !isAllowedText(next, 20)) {
      setName(t.name)
      return
    }
    p.onRename(t, next)
  }

  return shell(
    <>
      {head}
      {note ? <div className="note">{note}</div> : null}
      {!routine ? (
        <input
          className="inp nfin"
          aria-label="이름"
          maxLength={20}
          value={name}
          autoComplete="off"
          onChange={(e) => setName(cutToCodePoints(e.target.value, 20))}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault()
              commitName()
            }
          }}
        />
      ) : null}
      <div className="costrow">
        <span>몇 칸</span>
        <button
          type="button"
          className="btn icon sm"
          disabled={p.busy || shownCost <= 1}
          aria-label="한 칸 줄이기"
          onClick={() => stepCost(shownCost - 1)}
        >
          −
        </button>
        <b>{shownCost}칸</b>
        <button
          type="button"
          className="btn icon sm"
          disabled={p.busy || shownCost >= 10}
          aria-label="한 칸 늘리기"
          onClick={() => stepCost(shownCost + 1)}
        >
          +
        </button>
      </div>
      {routine && pending !== null ? (
        <div className="acts">
          <button
            type="button"
            className="btn sm"
            disabled={p.busy}
            onClick={() => {
              p.onCost(t, pending)
              setPending(null)
            }}
          >
            이날만
          </button>
          <button
            type="button"
            className="btn dark sm"
            disabled={p.busy || !p.onRoutineCost}
            onClick={() => {
              p.onRoutineCost?.(t, pending)
              setPending(null)
            }}
          >
            앞으로 모두
          </button>
          <button type="button" className="btn sm ghost" onClick={() => setPending(null)}>
            취소
          </button>
        </div>
      ) : null}
      {!routine ? (
        <div className="pubrow">
          <button
            type="button"
            className={t.isVisible ? 'switch sm on' : 'switch sm'}
            aria-pressed={t.isVisible}
            onClick={() => p.onVisible(t, !t.isVisible)}
          >
            <i />
            친구에게 보이기
          </button>
          {t.isVisible ? (
            seeing.length > 0 ? (
              <span className="hint">보이는 링크: {seeing.map((l) => l.name).join(', ')}</span>
            ) : (
              <span className="hint">
                이 일을 보여 주는 링크가 아직 없어요 · <Link to={dp('/share')}>공유 링크로</Link>
              </span>
            )
          ) : null}
        </div>
      ) : null}
      <div className="acts">
        {!future ? (
          done ? (
            <button
              type="button"
              className="btn"
              disabled={p.busy}
              onClick={() => p.onUncomplete(t)}
            >
              안 했어요
            </button>
          ) : (
            <button
              type="button"
              className="btn dark lg"
              disabled={p.busy}
              onClick={() => p.onComplete(t)}
            >
              ✓ 했어요
            </button>
          )
        ) : null}
        {canMove ? (
          <button type="button" className="btn" disabled={!p.onMove} onClick={() => p.onMove?.(t)}>
            {p.toThisWeek ? '이번 주로 옮기기' : '옮기기'}
          </button>
        ) : null}
        <button
          type="button"
          className={more ? 'dots on' : 'dots'}
          aria-label="더 보기"
          onClick={() => setMore((v) => !v)}
        >
          ⋯
        </button>
      </div>
      {more ? (
        <div className="more">
          {moves === null ? (
            <div className="hist">옮긴 기록을 불러오는 중이에요</div>
          ) : moves.length === 0 ? (
            <div className="hist">옮긴 기록이 없어요</div>
          ) : (
            <div className="hist">
              옮긴 기록{' '}
              {moves
                .map(
                  (m) =>
                    `${dayName(m.fromDate)} ${SLOT_LABEL[m.fromTimeSlot]} → ${dayName(m.toDate)} ${SLOT_LABEL[m.toTimeSlot]}`,
                )
                .join(' · ')}
            </div>
          )}
          {routine && p.onEditRoutine ? (
            <button type="button" className="linkbtn" onClick={() => p.onEditRoutine?.(t)}>
              매주 하는 일 바꾸기
            </button>
          ) : null}
          <button type="button" className="warn" onClick={() => p.onDelete(t)}>
            {routine ? '이날만 지우기' : '이 할 일 지우기'}
          </button>
        </div>
      ) : null}
    </>,
  )
}
