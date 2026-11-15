import { notifications } from '@mantine/notifications'
import { FROM_DEMO_KEY } from '../demo/DemoBar.tsx'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { useApi } from '../api/ApiContext.tsx'
import { messageOf } from '../api/errors.ts'
import { ApiError } from '../api/port.ts'
import { useSession } from '../auth/SessionContext.tsx'
import { Notebook } from '../components/Notebook.tsx'
import { PasswordInput } from '../components/PasswordInput.tsx'
import { startFirstRun } from '../lib/firstRun.ts'
import { cpLength, passwordHint, usernameHint } from '../lib/text.ts'
import type { Hint } from '../lib/text.ts'
import { renderTurnstile, resetTurnstile } from '../lib/turnstile.ts'

function Checks({ hints, typed }: { hints: Hint[]; typed: boolean }) {
  return (
    <ul className="suchk">
      {hints.map((h) => (
        <li key={h.text} className={typed ? (h.ok ? 'ok' : 'no') : ''}>
          {typed && h.ok ? '✓ ' : ''}
          {h.text}
        </li>
      ))}
    </ul>
  )
}

export function SignupPage() {
  const api = useApi()
  const { onLoggedIn } = useSession()
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [token, setToken] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = box.current
    if (!el) return
    let cleanup: (() => void) | undefined
    let gone = false
    renderTurnstile(el, setToken)
      .then((c) => {
        if (gone) c()
        else cleanup = c
      })
      .catch(() => setErr(messageOf('CAPTCHA_FAILED')))
    return () => {
      gone = true
      cleanup?.()
    }
  }, [])

  const idHints = usernameHint(id)
  const pwHints = passwordHint(pw)
  const same = pw2 === pw
  const ready = idHints.every((h) => h.ok) && pwHints.every((h) => h.ok) && same && token !== ''

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    if (!ready) {
      setErr(token === '' ? messageOf('CAPTCHA_FAILED') : messageOf('VALIDATION_FAILED'))
      return
    }
    setBusy(true)
    setErr('')
    try {
      const me = await api.signup({ username: id, password: pw, turnstileToken: token })
      const fromDemo = sessionStorage.getItem(FROM_DEMO_KEY) !== null
      sessionStorage.removeItem(FROM_DEMO_KEY)
      notifications.show({
        message: fromDemo
          ? '가입했어요! 예시는 가져오지 않고 새로 시작해요'
          : '새 캘린더를 만들었어요',
      })
      startFirstRun()
      onLoggedIn(me)
    } catch (ex) {
      setErr(messageOf(ex instanceof ApiError ? ex.code : 'NETWORK_ERROR'))
      setToken('')
      void resetTurnstile()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Notebook>
      <div className="cover-wrap">
        <form className="cover inner signup" onSubmit={(e) => void submit(e)}>
          <h2>회원가입</h2>
          <p className="tag1">아이디와 비밀번호만 정하면 바로 쓸 수 있어요.</p>
          <div className="sufield">
            <label htmlFor="suid">아이디</label>
            <input
              id="suid"
              value={id}
              maxLength={20}
              autoComplete="username"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="예: sujin12"
              onChange={(e) => setId(e.target.value)}
            />
            <Checks hints={idHints} typed={id.length > 0} />
          </div>
          <div className="sufield">
            <label htmlFor="supw">비밀번호</label>
            <PasswordInput
              id="supw"
              value={pw}
              maxLength={16}
              autoComplete="new-password"
              onChange={(e) => setPw(e.target.value)}
            />
            <Checks hints={pwHints} typed={pw.length > 0} />
          </div>
          <div className="sufield">
            <label htmlFor="supw2">비밀번호 확인</label>
            <PasswordInput
              id="supw2"
              value={pw2}
              maxLength={16}
              autoComplete="new-password"
              onChange={(e) => setPw2(e.target.value)}
            />
            <Checks
              hints={[
                {
                  text: cpLength(pw2) > 0 && same ? '똑같아요' : '위 비밀번호를 똑같이 적어요',
                  ok: same,
                },
              ]}
              typed={pw2.length > 0}
            />
          </div>
          <div ref={box} />
          {err && <p className="suerr">{err}</p>}
          <div className="acts2">
            <button type="submit" className="btn dark" disabled={busy}>
              가입하기
            </button>
          </div>
          <p className="hint" style={{ marginTop: 12 }}>
            비밀번호를 잊으면 찾을 수 없어요. 꼭 기억해 둬요.
          </p>
          <div className="foot">
            <Link className="linkbtn" to="/">
              ← 처음 화면
            </Link>
            <span className="hint">
              아이디가 있나요?{' '}
              <Link className="linkbtn" to="/">
                로그인
              </Link>
            </span>
          </div>
        </form>
      </div>
    </Notebook>
  )
}
