import { useEffect, useRef, useState } from 'react'
import type {
  LinkExpiry,
  RoutineResponse,
  ShareLinkCommentResponse,
  ShareLinkResponse,
  WeekResponse,
} from '../../api/types.ts'
import { Postcard } from '../../components/Postcard.tsx'
import { daysLeft, isLinkOpen, linkExpiryOf, postcardDays } from '../../lib/visibility.ts'
import { CheerBoard } from './CheerBoard.tsx'
import { ExpiryChoice, RuleChips } from './RuleChips.tsx'

const md = (iso: string) => {
  const [, m, d] = iso.split('-')
  return `${+m}/${+d}`
}

export function linkState(link: ShareLinkResponse, today: string): '열림' | '닫힘' | '끝남' {
  if (link.status === 'CLOSED') return '닫힘'
  return isLinkOpen(link, today) ? '열림' : '끝남'
}

function expLine(link: ShareLinkResponse, today: string): string {
  if (link.expireDate === null) return '계속 열려 있어요'
  const n = daysLeft(link.expireDate, today)
  return n === 0 ? `오늘까지 (${md(link.expireDate)})` : `${n}일 남음 (${md(link.expireDate)}까지)`
}

interface Props {
  link: ShareLinkResponse
  routines: RoutineResponse[]
  week: WeekResponse | null
  today: string
  comments: ShareLinkCommentResponse[]
  busy: boolean
  onCopy: (link: ShareLinkResponse) => void
  onRoutine: (link: ShareLinkResponse, routineId: number, on: boolean) => void
  onOnce: (link: ShareLinkResponse, on: boolean) => void
  onExpiry: (link: ShareLinkResponse, e: LinkExpiry) => void
  onCloseLink: (link: ShareLinkResponse) => void
  onDelete: (link: ShareLinkResponse, withComments: boolean) => void
  onRemoveComment: (c: ShareLinkCommentResponse) => void
}

export function LinkSheet({
  link,
  routines,
  week,
  today,
  comments,
  busy,
  onCopy,
  onRoutine,
  onOnce,
  onExpiry,
  onCloseLink,
  onDelete,
  onRemoveComment,
}: Props) {
  const [menu, setMenu] = useState(false)
  const wrap = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!menu) return
    const onDown = (e: MouseEvent) => {
      if (e.target instanceof Node && wrap.current?.contains(e.target)) return
      setMenu(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menu])

  const state = linkState(link, today)
  const off = state !== '열림'
  const n = link.commentCount
  const url = `${window.location.origin}/s/${link.token}`
  const created = link.createdAt.slice(5, 10).replace('-', '/').replace(/^0/, '')

  const onceNames = week
    ? week.days
        .flatMap((d) => d.tasks.filter((t) => t.routineId === null && t.isVisible))
        .map((t) => t.name)
    : []

  const menuBody = off ? (
    <>
      <button type="button" onClick={() => onDelete(link, false)}>
        링크 지우기
        <small>목록에서 없어져요{n ? ` · 응원 ${n}개는 그 주 캘린더에 남아요` : ''}</small>
      </button>
      {n ? (
        <button type="button" onClick={() => onDelete(link, true)}>
          링크와 응원 모두 지우기
          <small>응원 {n}개도 함께 없어져요</small>
        </button>
      ) : null}
    </>
  ) : (
    <>
      <button type="button" onClick={() => onCloseLink(link)}>
        링크 닫기
        <small>친구가 더는 못 봐요. 응원은 남아요</small>
      </button>
      <button type="button" disabled>
        링크 지우기
        <small>링크를 닫으면 지울 수 있어요</small>
      </button>
    </>
  )

  const head = (
    <div className="hd sharehd">
      <p className="hint">
        {created}부터 · <span className={off ? 'pill' : 'pill dark'}>{state}</span>
        {off ? '' : ` · ${expLine(link, today)}`}
      </p>
      <div className="hd-r">
        <span className="morewrap" ref={wrap}>
          <button
            type="button"
            className="icon"
            aria-label="더 보기"
            aria-expanded={menu}
            onClick={() => setMenu((v) => !v)}
          >
            ⋯
          </button>
          {menu ? (
            <div className="moremenu wide" onClick={() => setMenu(false)} role="presentation">
              {menuBody}
            </div>
          ) : null}
        </span>
      </div>
    </div>
  )

  const urlBox = (
    <>
      {off ? null : (
        <p className="u2lab">
          친구에게 보낼 주소<span className="hint">복사해서 카톡이나 문자에 붙여 넣어요</span>
        </p>
      )}
      <div className={off ? 'u2 off' : 'u2'}>
        <input
          className="inp"
          readOnly
          value={url}
          aria-label="친구에게 보낼 주소"
          onClick={(e) => e.currentTarget.select()}
        />
        {off ? null : (
          <button type="button" className="btn y" onClick={() => onCopy(link)}>
            링크 복사
          </button>
        )}
      </div>
    </>
  )

  const received = (
    <CheerBoard comments={comments} today={today} off={off} onRemove={onRemoveComment} />
  )

  if (off) {
    const shown = [
      ...routines.filter((r) => link.routineIds.includes(r.routineId)).map((r) => r.name),
      ...(link.isOneTimeVisible ? ['이번만 할 일'] : []),
    ].join(', ')
    return (
      <>
        {head}
        {urlBox}
        <p className="hint">
          {state === '닫힘' ? '닫은 링크라' : '기간이 끝난 링크라'} 다시 열 수 없어요. 보여 주던 것:{' '}
          {shown || '없음'}
        </p>
        {received}
      </>
    )
  }

  return (
    <>
      {head}
      <div className="sgrid">
        <aside className="sprev">
          <p className="slab">
            친구가 보는 화면{' '}
            <a
              className="linkbtn"
              href={`/s/${link.token}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              새 창에서 크게 보기
            </a>
          </p>
          <div className="pcprev">
            {week ? (
              <Postcard
                title={link.name}
                weekStart={week.weekStart}
                today={week.today}
                days={postcardDays(week, link)}
              />
            ) : null}
          </div>
        </aside>
        <div className="smain">
          {urlBox}
          <div className="lrules">
            <span className="hint">보여 줄 것 · 눌러서 골라요</span>
            <RuleChips
              routines={routines}
              selected={link.routineIds}
              once={link.isOneTimeVisible}
              onceNames={onceNames}
              disabled={busy}
              onRoutine={(id, on) => onRoutine(link, id, on)}
              onOnce={(on) => onOnce(link, on)}
            />
          </div>
          <div className="lrules">
            <span className="hint">열어 둘 기간 · 눌러서 바꿔요</span>
            <ExpiryChoice
              value={linkExpiryOf(link.expireDate, today)}
              today={today}
              disabled={busy}
              onPick={(e) => onExpiry(link, e)}
            />
          </div>
          {received}
        </div>
      </div>
    </>
  )
}
