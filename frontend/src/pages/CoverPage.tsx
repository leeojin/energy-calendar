import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useApi } from '../api/ApiContext.tsx'
import { messageOf } from '../api/errors.ts'
import { ApiError } from '../api/port.ts'
import { useSession } from '../auth/SessionContext.tsx'
import { Notebook } from '../components/Notebook.tsx'
import { PasswordInput } from '../components/PasswordInput.tsx'

const STORY: ReadonlyArray<{
  title: string
  desc: string
  cells: readonly [number, number, number]
  cap: ReactNode
}> = [
  {
    title: '하루 에너지는 12칸',
    desc: '매일 같은 칸 수로 시작해요. 힘든 날은 줄이고, 쌩쌩한 날은 늘려요.',
    cells: [0, 0, 0],
    cap: '빈 칸 12개 = 오늘 쓸 수 있는 에너지',
  },
  {
    title: '할 일을 칸에 넣어요',
    desc: '할 일마다 몇 칸인지 정해서 넣어요. 다 하면 노랗게 칠해져요.',
    cells: [4, 5, 0],
    cap: (
      <>
        <i className="lg d"></i>했어요 <i className="lg p"></i>할 일 <i className="lg"></i>빈 칸
      </>
    ),
  },
  {
    title: '넘쳐도 괜찮아요',
    desc: '칸보다 많이 넣어도 돼요. 못 한 일은 다른 날로 옮겨요.',
    cells: [6, 6, 2],
    cap: (
      <>
        <i className="lg o"></i>2칸 넘쳤어요
      </>
    ),
  },
]

function Story({ page, setPage }: { page: number; setPage: (n: number) => void }) {
  const { title, desc, cells, cap } = STORY[page - 1]
  const [dn, pl, ov] = cells
  return (
    <div className="cover-wrap">
      <div className="story st2">
        <div className="pg">
          <span className="dots">
            {[1, 2, 3].map((n) => (
              <i key={n} className={n === page ? 'on' : ''}></i>
            ))}
          </span>
          {page} / 3
        </div>
        <h2>{title}</h2>
        <p>{desc}</p>
        <div className="art">
          <div className="sbatrow">
            <div className="sbat">
              {Array.from({ length: 12 }, (_, i) => (
                <i key={i} className={i < dn ? 'd' : i < dn + pl ? 'p' : ''}></i>
              ))}
            </div>
            <span className="sov">
              {Array.from({ length: ov }, (_, i) => (
                <i key={i} className="o"></i>
              ))}
            </span>
          </div>
          <p className="cap">{cap}</p>
        </div>
        <div className="foot">
          <button type="button" className="linkbtn" onClick={() => setPage(page - 1)}>
            ← 이전
          </button>
          {page < 3 ? (
            <button type="button" className="btn dark" onClick={() => setPage(page + 1)}>
              다음 →
            </button>
          ) : (
            <button type="button" className="btn dark" onClick={() => setPage(0)}>
              시작하기
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function CoverPage() {
  const api = useApi()
  const { onLoggedIn } = useSession()
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setErr('')
    try {
      onLoggedIn(await api.login({ username, password }))
    } catch (ex) {
      setErr(messageOf(ex instanceof ApiError ? ex.code : 'NETWORK_ERROR'))
    } finally {
      setBusy(false)
    }
  }

  if (page > 0) {
    return (
      <Notebook>
        <Story page={page} setPage={setPage} />
      </Notebook>
    )
  }
  return (
    <Notebook>
      <div className="cover-wrap">
        <form className="cover" onSubmit={(e) => void submit(e)}>
          <h1>
            에너지
            <br />
            캘린더
          </h1>
          <p className="tag1">남은 에너지를 보면서 할 일을 놓는 주간 캘린더</p>
          <div className="mini">
            <span className="mini-bat">
              <i></i>
              <i></i>
              <i></i>
            </span>
          </div>
          <div className="lines">
            <input
              placeholder="아이디"
              aria-label="아이디"
              maxLength={20}
              autoComplete="username"
              autoCapitalize="off"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <PasswordInput
              placeholder="비밀번호"
              aria-label="비밀번호"
              maxLength={72}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {err && <p className="suerr">{err}</p>}
          <div className="acts2">
            <button type="submit" className="btn dark" disabled={busy}>
              로그인
            </button>
            <span className="hint">처음이에요?</span>
            <Link className="linkbtn" to="/signup">
              회원가입
            </Link>
          </div>
          <p className="hint" style={{ marginTop: 12 }}>
            비밀번호를 잊으면 찾을 수 없어요.
          </p>
          <div className="foot">
            <button type="button" className="linkbtn" onClick={() => void navigate('/demo/week')}>
              둘러보기
            </button>
            <button type="button" className="linkbtn flip" onClick={() => setPage(1)}>
              소개 보기 →
            </button>
          </div>
        </form>
      </div>
    </Notebook>
  )
}
