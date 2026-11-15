import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { useApi } from '../api/ApiContext.tsx'
import { messageOf } from '../api/errors.ts'
import { ApiError } from '../api/port.ts'
import type { PublicShareResponse } from '../api/types.ts'
import { Postcard } from '../components/Postcard.tsx'
import { cheerIdeas } from '../lib/cheerIdeas.ts'
import { loadNickname, newNickname, saveNickname } from '../lib/nickname.ts'
import { cpLength, cutToCodePoints } from '../lib/text.ts'

const md = (iso: string) => {
  const [, m, d] = iso.split('-')
  return `${+m}/${+d}`
}

const MAX = 30

function Gone() {
  return (
    <div className="pubwrap">
      <div className="phone">
        <div className="gone">
          <b>열 수 없는 링크예요</b>
          <p className="hint">보낸 친구에게 새 링크를 달라고 해 봐요.</p>
        </div>
      </div>
    </div>
  )
}

export function PublicSharePage() {
  const api = useApi()
  const { token = '' } = useParams()
  const [data, setData] = useState<PublicShareResponse | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'gone' | 'failed'>('loading')
  const [body, setBody] = useState('')
  const [nick, setNick] = useState(() => loadNickname(window.localStorage))
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [posted, setPosted] = useState(false)

  const load = useCallback(() => {
    api
      .getPublicShare(token)
      .then((r) => {
        setData(r)
        setState('ok')
      })
      .catch((e: unknown) => {
        setState(e instanceof ApiError && e.status === 404 ? 'gone' : 'failed')
      })
  }, [api, token])

  useEffect(() => {
    load()
  }, [load])

  const days = useMemo(
    () => (data ? data.days.map((d) => ({ date: d.date, items: d.tasks })) : []),
    [data],
  )
  const ideas = useMemo(() => (data ? cheerIdeas(days, data.today) : []), [data, days])

  if (state === 'gone') return <Gone />
  if (state === 'failed') {
    return (
      <div className="pubwrap">
        <div className="phone">
          <div className="gone">
            <b>{messageOf('NETWORK_ERROR')}</b>
            <p>
              <button type="button" className="linkbtn" onClick={load}>
                다시 해 보기
              </button>
            </p>
          </div>
        </div>
      </div>
    )
  }
  if (!data) return <div className="pubwrap" aria-busy="true" />

  const send = async () => {
    const text = body.trim()
    if (!text) {
      setErr('쪽지가 비어 있어요. 한마디 써 봐요.')
      return
    }
    setBusy(true)
    setErr('')
    try {
      const name = nick.trim() || newNickname()
      const made = await api.createPublicComment(token, { nickname: name, body: text })
      saveNickname(window.localStorage, name)
      setData({ ...data, comments: [made, ...data.comments] })
      setBody('')
      const next = newNickname()
      setNick(next)
      saveNickname(window.localStorage, next)
      setPosted(true)
    } catch (e) {
      setErr(messageOf(e instanceof ApiError ? e.code : 'NETWORK_ERROR'))
    } finally {
      setBusy(false)
    }
  }

  const reroll = () => {
    const next = newNickname()
    setNick(next)
    saveNickname(window.localStorage, next)
  }

  return (
    <div className="pubwrap">
      <div className="phone postcard">
        <Postcard title={data.name} weekStart={data.weekStart} today={data.today} days={days} />
        <div className="reply">
          <h3>응원 쪽지 남기기</h3>
          <p className="csub">아래 말을 고르거나 직접 써요</p>
          <div className="cideas">
            {ideas.map((x) => (
              <button
                type="button"
                key={x}
                className={body === x ? 'on' : ''}
                onClick={() => {
                  setBody(x)
                  setErr('')
                  setPosted(false)
                }}
              >
                {x}
              </button>
            ))}
          </div>
          <div className="cnote">
            <span className="ccnt">
              <span>{cpLength(body)}</span>/{MAX}
            </span>
            <textarea
              rows={2}
              placeholder="여기에 써요"
              aria-label="응원 쪽지"
              value={body}
              onChange={(e) => {
                setBody(cutToCodePoints(e.target.value, MAX))
                setErr('')
                setPosted(false)
              }}
            />
            <div className="csig">
              <span>
                —{' '}
                <input
                  value={nick}
                  aria-label="쪽지에 적힐 이름"
                  onChange={(e) => setNick(cutToCodePoints(e.target.value, 10))}
                />
              </span>
              <button type="button" className="linkbtn" onClick={reroll}>
                이름 바꾸기
              </button>
            </div>
          </div>
          {err && <div className="err">{err}</div>}
          {posted && !err && <p className="hint">쪽지를 붙였어요</p>}
          <div className="cacts">
            <span className="hint">쪽지를 붙이면 바로 아래에 보여요</span>
            <button type="button" className="btn dark" disabled={busy} onClick={() => void send()}>
              쪽지 붙이기
            </button>
          </div>
          {data.comments.length > 0 && (
            <>
              <p className="clab">받은 응원 {data.comments.length}</p>
              {data.comments.map((c, i) => (
                <div className="mnote" key={`${c.createdAt}-${i}`}>
                  <span>{c.body}</span>
                  <small>
                    {c.nickname} · {md(c.createdAt.slice(0, 10))}
                  </small>
                </div>
              ))}
            </>
          )}
        </div>
        {data.expireDate && (
          <p className="hint" style={{ textAlign: 'center', marginTop: 14 }}>
            이 링크는 {md(data.expireDate)}까지 열려요
          </p>
        )}
      </div>
    </div>
  )
}
