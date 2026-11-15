import { useState } from 'react'
import { messageOf } from '../../api/errors.ts'
import { ApiError } from '../../api/port.ts'
import type { LinkExpiry, RoutineResponse, ShareLinkResponse } from '../../api/types.ts'
import { useApi } from '../../api/ApiContext.tsx'
import { cutToCodePoints, isAllowedText } from '../../lib/text.ts'
import { ExpiryChoice, RuleChips } from './RuleChips.tsx'

interface Props {
  routines: RoutineResponse[]
  today: string
  onceNames: string[]
  canCancel: boolean
  onCreated: (link: ShareLinkResponse) => void
  onCancel: () => void
}

export function NewLinkForm({ routines, today, onceNames, canCancel, onCreated, onCancel }: Props) {
  const api = useApi()
  const [name, setName] = useState('')
  const [picked, setPicked] = useState<number[]>([])
  const [once, setOnce] = useState(false)
  const [expiry, setExpiry] = useState<LinkExpiry>('NONE')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (name.trim() === '') {
      setError('링크 이름을 적어요.')
      return
    }
    if (!isAllowedText(name, 20)) {
      setError(messageOf('VALIDATION_FAILED'))
      return
    }
    setError('')
    setBusy(true)
    try {
      const made = await api.createShareLink({
        name: name.trim(),
        routineIds: picked,
        isOneTimeVisible: once,
        expiry,
      })
      onCreated(made)
    } catch (e) {
      if (e instanceof ApiError && e.code !== 'AUTH_REQUIRED') setError(messageOf(e.code))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="hd">
        <h2>새 공유 링크</h2>
      </div>
      <div className="field">
        <label htmlFor="ltitle">
          이름 <span className="hint">20글자까지 · 친구 화면 맨 위에 보여요</span>
        </label>
        <input
          id="ltitle"
          className="inp"
          placeholder="예: 운동 습관 봐줘"
          value={name}
          onChange={(e) => setName(cutToCodePoints(e.target.value, 20))}
        />
      </div>
      <div className="field">
        <div className="lab">
          보여 줄 것<small>이 링크를 받은 친구에게만 보여요</small>
        </div>
        <RuleChips
          routines={routines}
          selected={picked}
          once={once}
          onceNames={onceNames}
          onRoutine={(id, on) => setPicked((p) => (on ? [...p, id] : p.filter((x) => x !== id)))}
          onOnce={setOnce}
        />
      </div>
      <div className="field">
        <div className="lab">
          열어 둘 기간<small>기간이 끝나기 전에는 바꿀 수 있어요</small>
        </div>
        <ExpiryChoice value={expiry} today={today} onPick={setExpiry} />
      </div>
      <p className="hint" style={{ marginTop: 8 }}>
        [이번만 할 일]을 고르면 그중 [친구에게 보이기]를 켠 일이 보여요.
        <br />내 아이디, 컨디션, 옮긴 기록은 친구에게 안 보여요.
      </p>
      {error ? <div className="err">{error}</div> : null}
      <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
        <button type="button" className="btn dark" disabled={busy} onClick={() => void submit()}>
          링크 만들기
        </button>
        {canCancel ? (
          <button type="button" className="btn ghost" onClick={onCancel}>
            취소
          </button>
        ) : null}
      </div>
    </>
  )
}
