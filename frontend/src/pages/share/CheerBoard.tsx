import type { ShareLinkCommentResponse } from '../../api/types.ts'
import { addDays, mondayOf } from '../../lib/dates.ts'

interface Props {
  comments: ShareLinkCommentResponse[]
  today: string
  off: boolean
  onRemove: (c: ShareLinkCommentResponse) => void
}

const md = (iso: string) => {
  const [, m, d] = iso.split('-')
  return `${+m}/${+d}`
}

function weekLabel(weekStart: string, thisMonday: string): string {
  if (weekStart === thisMonday) return '이번 주'
  if (weekStart === addDays(thisMonday, -7)) return '지난주'
  return '지난 기록'
}

export function CheerBoard({ comments, today, off, onRemove }: Props) {
  const thisMonday = mondayOf(today)
  const weeks = [...new Set(comments.map((c) => c.weekStart))].sort().reverse()
  return (
    <>
      <p className="slab" style={{ marginTop: 18 }}>
        받은 응원 {comments.length}
        {comments.length ? ' · ×를 누르면 지워져요' : ''}
      </p>
      {comments.length === 0 ? (
        <div className="empty">
          {off ? '받은 응원이 없어요.' : '아직 받은 응원이 없어요. 링크를 친구에게 보내 봐요.'}
        </div>
      ) : (
        weeks.map((w) => (
          <div key={w}>
            <p className="cwk">
              {weekLabel(w, thisMonday)} · {md(w)} – {md(addDays(w, 6))}
            </p>
            <div className="cork">
              {comments
                .filter((c) => c.weekStart === w)
                .map((c) => (
                  <div className="note" key={c.shareLinkCommentId}>
                    <button
                      type="button"
                      className="nx"
                      aria-label="응원 지우기"
                      title="지우기"
                      onClick={() => onRemove(c)}
                    >
                      ×
                    </button>
                    {c.body}
                    <small>
                      {c.nickname} · {c.createdAt.slice(0, 10)}
                    </small>
                  </div>
                ))}
            </div>
          </div>
        ))
      )}
    </>
  )
}
