import { useState } from 'react'
import { Postcard } from '../../components/Postcard.tsx'
import { addDays, mondayOf } from '../../lib/dates.ts'
import type { PostcardDay } from '../../lib/visibility.ts'

const SAMPLE = [
  '아침 산책',
  '도서관 공부',
  '요가 30분',
  '장보기',
  '영어 학원',
  '방 청소',
  '푹 쉬기',
]

function sampleDays(today: string): PostcardDay[] {
  const monday = mondayOf(today)
  return SAMPLE.map((name, i) => {
    const date = addDays(monday, i)
    const status = date >= today ? 'PLANNED' : i === 2 ? 'MISSED' : 'DONE'
    return { date, items: [{ name, status }] }
  })
}

function md(iso: string): string {
  return `${+iso.slice(5, 7)}/${+iso.slice(8)}`
}

export function ShareIntro({ today }: { today: string }) {
  const [open, setOpen] = useState(false)
  const host = typeof window === 'undefined' ? '' : window.location.host
  return (
    <div className="shintro">
      <ol className="shsteps">
        <li>링크 만들기</li>
        <li>링크를 복사해 카톡·문자·DM으로 보내기</li>
        <li>친구가 링크를 열면 내 한 주가 보이고, 응원을 남겨요</li>
      </ol>
      <button
        type="button"
        className="linkbtn"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? '예시 닫기' : '예시 보기'}
      </button>
      {open ? (
        <div className="shex">
          <div className="shexcol">
            <p className="slab">이렇게 보내요</p>
            <div className="chatex" aria-label="대화창에 링크를 보낸 예시">
              <span className="who">나</span>
              <div className="bub mine">
                이번 주 나 응원해 줘!
                <span className="lk">{host}/s/…</span>
              </div>
              <span className="who">친구</span>
              <div className="bub">오 링크 열어 볼게!</div>
            </div>
            <p className="hint">카톡·문자·DM 어디든 이렇게 링크를 보내면 돼요.</p>
          </div>
          <div className="shexcol">
            <p className="slab">친구에게는 이렇게 보여요</p>
            <div className="pcprev">
              <Postcard
                title="이번 주 응원해 줘"
                weekStart={mondayOf(today)}
                today={today}
                days={sampleDays(today)}
              />
            </div>
            <p className="slab slab2">친구가 남긴 응원 쪽지</p>
            <div className="mnote">
              <span>주말엔 푹 쉬어! 이번 주도 화이팅</span>
              <small>친구 · {md(today)}</small>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
