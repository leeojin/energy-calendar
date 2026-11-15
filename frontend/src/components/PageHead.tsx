import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useIsDemo } from '../api/ApiContext.tsx'
import { useSession } from '../auth/SessionContext.tsx'

type View = 'week' | 'month' | 'share' | 'me'

interface Nav {
  onPrev: () => void
  onNext: () => void
  prevDisabled?: boolean
  nextDisabled?: boolean
  prevLabel: string
  nextLabel: string
  back?: { label: string; onClick: () => void }
}

interface Props {
  current?: View
  title: ReactNode
  context?: string
  nav?: Nav
  who?: ReactNode
  basePath?: string
}

const TABS: ReadonlyArray<[View, string]> = [
  ['week', '주간'],
  ['month', '월간'],
  ['share', '공유'],
  ['me', '내 정보'],
]

export function PageHead({ current, title, context, nav, who, basePath }: Props) {
  const { me } = useSession()
  const isDemo = useIsDemo()
  const base = basePath ?? (isDemo ? '/demo' : '')
  const tabs = TABS.filter(([k]) => k !== 'me' || (me && !isDemo))
  const who2 = who ?? (isDemo ? '예시 캘린더 · 새로고침하면 처음으로 돌아가요' : null)
  const line = [context, who2].filter(Boolean)
  const nick = me && !isDemo ? <span className="phname">{me.nickname}</span> : null
  const links = (cls: string) =>
    tabs.map(([k, label]) => (
      <Link
        key={k}
        to={k === 'me' ? '/me' : `${base}/${k}`}
        className={current === k ? `${cls} on` : cls}
        aria-current={current === k ? 'page' : undefined}
      >
        <span>{label}</span>
      </Link>
    ))
  return (
    <>
      <header className="ph">
        <div className={nick ? 'phtabrow' : 'phtabrow nonick'}>
          {nick}
          <nav className="phtabs" aria-label="화면 고르기">
            {links('phtab')}
          </nav>
        </div>
        <div className="phmain">
          {line.length > 0 ? (
            <div className="phwho">
              {line.map((x, i) => (
                <span key={i}>
                  {i > 0 ? ' · ' : null}
                  {x}
                </span>
              ))}
            </div>
          ) : null}
          <div className="pht">
            {nav ? (
              <button
                type="button"
                className="pharr"
                onClick={nav.onPrev}
                disabled={nav.prevDisabled}
                aria-label={nav.prevLabel}
              >
                ‹
              </button>
            ) : null}
            <h1>{title}</h1>
            {nav ? (
              <button
                type="button"
                className="pharr"
                onClick={nav.onNext}
                disabled={nav.nextDisabled}
                aria-label={nav.nextLabel}
              >
                ›
              </button>
            ) : null}
            {nav?.back ? (
              <button type="button" className="linkbtn phback" onClick={nav.back.onClick}>
                {nav.back.label}
              </button>
            ) : null}
          </div>
        </div>
      </header>
      <nav className="botbar" aria-label="화면 고르기">
        {links('bbtab')}
      </nav>
    </>
  )
}
