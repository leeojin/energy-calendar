import { Link } from 'react-router'
import { useDemoPath } from '../../demo/useDemoPath.ts'
import type { WeekCheerResponse } from '../../api/types.ts'

interface Props {
  cheers: WeekCheerResponse[]
  onRemove: (c: WeekCheerResponse) => void
}

export function cheerSource(c: WeekCheerResponse): string {
  return c.linkStatus === 'DELETED' ? `지운 링크 · ${c.linkName}` : c.linkName
}

export function CheerMemo({ cheers, onRemove }: Props) {
  const dp = useDemoPath()
  return (
    <section className="memo" data-slot="cheers">
      <h4>응원 {cheers.length}</h4>
      {cheers.length === 0 ? <p className="sm">이 주에는 아직 없어요</p> : null}
      {cheers.map((c) => (
        <div className="mnote" key={c.shareLinkCommentId}>
          <button
            type="button"
            className="nx"
            aria-label="응원 지우기"
            title="지우기"
            onClick={() => onRemove(c)}
          >
            ×
          </button>
          <span>{c.body}</span>
          <small>
            {c.nickname} · {cheerSource(c)}
          </small>
        </div>
      ))}
      <Link className="linkbtn" to={dp('/share')}>
        공유 링크 보기
      </Link>
    </section>
  )
}
