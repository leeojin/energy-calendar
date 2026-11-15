import { useState } from 'react'
import { Link } from 'react-router'
import { useDemoPath } from '../../demo/useDemoPath.ts'
import type { RoutineResponse, ShareLinkResponse } from '../../api/types.ts'
import { SLOT_LABEL } from '../../lib/battery.ts'
import { daysText } from '../../lib/dates.ts'
import { cutToCodePoints, isAllowedText } from '../../lib/text.ts'

interface Props {
  routines: RoutineResponse[]
  links: ShareLinkResponse[]
  openId: number | null
  busy: boolean
  onOpen: (routineId: number | null) => void
  onRename: (r: RoutineResponse, name: string) => void
  onCost: (r: RoutineResponse, cost: number) => void
  onEnd: (r: RoutineResponse) => void
  onNew: () => void
}

const md = (iso: string) => {
  const [, m, d] = iso.split('-')
  return `${+m}/${+d}`
}

const metaOf = (r: RoutineResponse) =>
  `${daysText(r.weekdays)} · ${SLOT_LABEL[r.timeSlot]} · ${r.energyCost}칸${r.endDate ? ` · ${md(r.endDate)}까지` : ''}`

export function RoutineMemo({
  routines,
  links,
  openId,
  busy,
  onOpen,
  onRename,
  onCost,
  onEnd,
  onNew,
}: Props) {
  const dp = useDemoPath()
  const active = routines.filter((r) => r.status === 'ACTIVE')
  const ended = routines.filter((r) => r.status === 'ENDED')
  const [names, setNames] = useState<Record<number, string>>({})

  const card = (r: RoutineResponse) => {
    const name = names[r.routineId] ?? r.name
    const mine = links.filter(
      (l) => l.status === 'OPEN' && !l.isExpired && l.routineIds.includes(r.routineId),
    )
    const save = () => {
      const next = name.trim()
      if (next === r.name || !isAllowedText(next, 20)) {
        setNames((n) => ({ ...n, [r.routineId]: r.name }))
        return
      }
      onRename(r, next)
    }
    return (
      <div className="red">
        <div className="rfm">
          <div className="k">
            <label htmlFor={`rn-${r.routineId}`}>이름</label>
          </div>
          <div className="v">
            <input
              id={`rn-${r.routineId}`}
              className="nm"
              maxLength={20}
              autoComplete="off"
              value={name}
              onChange={(e) =>
                setNames((n) => ({ ...n, [r.routineId]: cutToCodePoints(e.target.value, 20) }))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  save()
                }
              }}
            />
          </div>
          <div className="k">몇 칸</div>
          <div className="v">
            <span className="rstep">
              <button
                type="button"
                className="btn icon sm"
                disabled={busy || r.energyCost <= 1}
                aria-label="한 칸 줄이기"
                onClick={() => onCost(r, r.energyCost - 1)}
              >
                −
              </button>
              <b>{r.energyCost}칸</b>
              <button
                type="button"
                className="btn icon sm"
                disabled={busy || r.energyCost >= 10}
                aria-label="한 칸 늘리기"
                onClick={() => onCost(r, r.energyCost + 1)}
              >
                +
              </button>
            </span>
            <span className="hint">오늘부터</span>
          </div>
          <div className="k">친구에게</div>
          <div className="v">
            <span className="sm">
              {mine.length > 0 ? (
                <>
                  <b>{mine.map((l) => l.name).join(', ')}</b> 링크에서 보여요
                </>
              ) : (
                '나만 봐요'
              )}
            </span>
            <Link className="linkbtn" to={dp('/share')}>
              바꾸기
            </Link>
          </div>
          <div className="k">요일 · 시간</div>
          <div className="v tall">
            <span>
              {daysText(r.weekdays)} {SLOT_LABEL[r.timeSlot]}
            </span>
            <span className="hint">바꾸려면 [이제 그만하기]를 누르고 새로 만들어요</span>
          </div>
          <div className="k" />
          <div className="v">
            <button type="button" className="btn dark sm" disabled={busy} onClick={save}>
              저장
            </button>
          </div>
        </div>
        <div className="rend">
          <button type="button" className="linkbtn" disabled={busy} onClick={() => onEnd(r)}>
            이제 그만하기
          </button>
          <p className="hint">내일부터 안 나와요. 지난 기록은 남아요.</p>
        </div>
      </div>
    )
  }

  return (
    <section className="memo" data-slot="routines">
      <h4>매주</h4>
      {active.length === 0 ? <p className="sm">아직 없어요</p> : null}
      {active.map((r) => {
        const on = openId === r.routineId
        return (
          <div key={r.routineId}>
            <button
              type="button"
              id={`rule-${r.routineId}`}
              className={on ? 'mline on' : 'mline'}
              aria-expanded={on}
              onClick={() => onOpen(on ? null : r.routineId)}
            >
              {r.name}
              <small>{metaOf(r)}</small>
            </button>
            {on ? card(r) : null}
          </div>
        )
      })}
      <button type="button" className="mline add" onClick={onNew}>
        + 매주 하는 일
      </button>
      {ended.length > 0 ? (
        <>
          <p className="rlab">끝난 일</p>
          <div className="rsheet">
            {ended.map((r) => (
              <div className="rl off" key={r.routineId}>
                <span className="w">
                  <b>{r.name}</b>
                  <span>
                    {daysText(r.weekdays)} {SLOT_LABEL[r.timeSlot]}
                    {r.endDate ? ` · ${md(r.endDate)}에 끝났어요` : ''}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </section>
  )
}
