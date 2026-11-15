import { notifications } from '@mantine/notifications'
import { useState, type FormEvent } from 'react'
import { useApi } from '../api/ApiContext.tsx'
import { messageOf } from '../api/errors.ts'
import { ApiError } from '../api/port.ts'
import type { AccountDeleteSummaryResponse, ConditionLevel } from '../api/types.ts'
import { useSession } from '../auth/SessionContext.tsx'
import { CONDITION_LABEL } from '../components/Battery.tsx'
import { budgetFor } from '../components/ConditionPicker.tsx'
import { Notebook } from '../components/Notebook.tsx'
import { PageHead } from '../components/PageHead.tsx'
import { PasswordInput } from '../components/PasswordInput.tsx'
import { isAllowedText, passwordHint } from '../lib/text.ts'
import { notifyError } from '../lib/notify.ts'

const LEVELS: ConditionLevel[] = ['LOW', 'NORMAL', 'GOOD', 'REST']

function sinceLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${y}년 ${m}월 ${d}일에 가입했어요`
}

export function AccountPage() {
  const api = useApi()
  const { me, setMe, onLoggedOut } = useSession()
  const [saving, setSaving] = useState(false)
  const [nickOpen, setNickOpen] = useState(false)
  const [nick, setNick] = useState('')
  const [nickErr, setNickErr] = useState('')
  const [nickBusy, setNickBusy] = useState(false)
  const [nickAsk, setNickAsk] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [newPw2, setNewPw2] = useState('')
  const [pwErr, setPwErr] = useState<{ cur?: string; next?: string; again?: string }>({})
  const [pwBusy, setPwBusy] = useState(false)
  const [byeOpen, setByeOpen] = useState(false)
  const [forceLogin, setForceLogin] = useState(false)
  const [reUser, setReUser] = useState('')
  const [rePw, setRePw] = useState('')
  const [reErr, setReErr] = useState('')
  const [byeBusy, setByeBusy] = useState(false)
  const [byeSum, setByeSum] = useState<AccountDeleteSummaryResponse | null>(null)
  const [byeAgree, setByeAgree] = useState(false)
  const [byeUser, setByeUser] = useState('')
  const [byePw, setByePw] = useState('')
  const [byeErr, setByeErr] = useState('')
  // 자동 완성 방지를 위해 포커스 시 readonly 해제
  const [byeIdOn, setByeIdOn] = useState(false)
  const [byePwOn, setByePwOn] = useState(false)
  if (!me) return null

  const needLogin = forceLogin || !me.isRecentLogin
  const budget = me.energyBudget

  async function change(next: number) {
    if (next < 1 || next > 30 || saving) return
    setSaving(true)
    try {
      setMe(await api.updateEnergyBudget({ energyBudget: next }))
    } catch (e) {
      notifyError(messageOf(e instanceof ApiError ? e.code : 'NETWORK_ERROR'))
    } finally {
      setSaving(false)
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault()
    if (pwBusy) return
    const failed = passwordHint(newPw).find((h) => !h.ok)
    if (failed) {
      setPwErr({ next: `새 비밀번호: ${failed.text}` })
      return
    }
    if (newPw !== newPw2) {
      setPwErr({ again: '새 비밀번호가 서로 달라요.' })
      return
    }
    setPwBusy(true)
    setPwErr({})
    try {
      await api.updatePassword({ currentPassword: curPw, newPassword: newPw })
      setCurPw('')
      setNewPw('')
      setNewPw2('')
      setPwOpen(false)
      setForceLogin(true)
      notifications.show({
        message: '비밀번호를 바꿨어요. 다른 기기에서는 다시 로그인해요',
      })
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'NETWORK_ERROR'
      const msg = messageOf(code)
      if (code === 'REAUTH_REQUIRED') {
        setForceLogin(true)
        setPwErr({})
      } else if (code === 'INVALID_CREDENTIALS') setPwErr({ cur: '지금 비밀번호가 맞지 않아요.' })
      else if (code === 'VALIDATION_FAILED') setPwErr({ next: msg })
      else setPwErr({ again: msg })
    } finally {
      setPwBusy(false)
    }
  }

  async function doReauth(e: FormEvent) {
    e.preventDefault()
    if (byeBusy) return
    setByeBusy(true)
    setReErr('')
    try {
      setMe(await api.reauth({ username: reUser, password: rePw }))
      setForceLogin(false)
      setRePw('')
    } catch (err) {
      setReErr(messageOf(err instanceof ApiError ? err.code : 'NETWORK_ERROR'))
    } finally {
      setByeBusy(false)
    }
  }

  function openBye() {
    setByeOpen(true)
    setByeSum(null)
    setByeAgree(false)
    setByeUser('')
    setByePw('')
    setByeErr('')
    setByeIdOn(false)
    setByePwOn(false)
    api
      .getDeleteSummary()
      .then(setByeSum)
      .catch(() => undefined)
  }

  async function doDelete(e: FormEvent) {
    e.preventDefault()
    if (byeBusy || !byeAgree) return
    setByeBusy(true)
    setByeErr('')
    try {
      await api.deleteAccount({ username: byeUser, password: byePw })
      notifications.show({ message: '탈퇴했어요. 그동안 고마웠어요' })
      onLoggedOut()
    } catch (err) {
      setByeErr(messageOf(err instanceof ApiError ? err.code : 'NETWORK_ERROR'))
    } finally {
      setByeBusy(false)
    }
  }

  function askNickname(e: FormEvent) {
    e.preventDefault()
    if (!isAllowedText(nick, 20)) {
      setNickErr(messageOf('VALIDATION_FAILED'))
      return
    }
    setNickErr('')
    setNickAsk(true)
  }

  async function saveNickname() {
    if (nickBusy) return
    setNickBusy(true)
    try {
      setMe(await api.updateNickname({ nickname: nick.trim() }))
      setNickOpen(false)
      setNickAsk(false)
      notifications.show({ message: '닉네임을 바꿨어요' })
    } catch (err) {
      setNickErr(messageOf(err instanceof ApiError ? err.code : 'NETWORK_ERROR'))
    } finally {
      setNickBusy(false)
    }
  }

  function reauthForm(prefix: string, hint: string) {
    return (
      <form className="accform" onSubmit={(e) => void doReauth(e)}>
        <p className="hint">{hint}</p>
        <div className="field">
          <label htmlFor={`${prefix}-id`}>아이디</label>
          <input
            id={`${prefix}-id`}
            className="inp"
            maxLength={20}
            autoComplete="username"
            autoCapitalize="off"
            spellCheck={false}
            value={reUser}
            onChange={(e) => setReUser(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor={`${prefix}-pw`}>비밀번호</label>
          <PasswordInput
            id={`${prefix}-pw`}
            className="inp"
            maxLength={72}
            autoComplete="current-password"
            value={rePw}
            onChange={(e) => setRePw(e.target.value)}
          />
        </div>
        {reErr && <div className="err">{reErr}</div>}
        <button type="submit" className="btn dark" disabled={byeBusy}>
          다시 로그인
        </button>
      </form>
    )
  }

  async function logout() {
    try {
      await api.logout()
    } catch {
      // 로그아웃 실패 무시
    }
    onLoggedOut()
  }

  return (
    <Notebook wide>
      <PageHead current="me" title="내 정보" />
      <div className="accwrap">
        <div className="acccard">
          <div className="acchead">
            <small>내 아이디</small>
            <b>{me.username}</b>
            <span className="hint">{sinceLabel(me.createdDate)}</span>
          </div>
          <p className="olab">평소 에너지</p>
          <div className="accbat">
            {Array.from({ length: budget }, (_, i) => (
              <i key={i} />
            ))}
          </div>
          <div className="accrow">
            <div>
              <b>평소 에너지 {budget}칸</b>
              <p className="hint">오늘부터 바뀌어요. 지난날은 그대로예요.</p>
              <p className="hint">
                {LEVELS.map((l) => `${CONDITION_LABEL[l]} ${budgetFor(l, budget)}칸`).join(' · ')}
              </p>
            </div>
            <span className="accstep">
              <button
                type="button"
                className="btn icon"
                aria-label="평소 에너지 줄이기"
                disabled={budget <= 1 || saving}
                onClick={() => void change(budget - 1)}
              >
                −
              </button>
              <b>{budget}</b>
              <button
                type="button"
                className="btn icon"
                aria-label="평소 에너지 늘리기"
                disabled={budget >= 30 || saving}
                onClick={() => void change(budget + 1)}
              >
                +
              </button>
            </span>
          </div>
        </div>
        <div className="panel accacc">
          <div className="ln">
            닉네임 <b>{me.nickname}</b>
            <button
              type="button"
              className="btn sm"
              aria-expanded={nickOpen}
              onClick={() => {
                setNick(me.nickname)
                setNickErr('')
                setNickAsk(false)
                setNickOpen((v) => !v)
              }}
            >
              {nickOpen ? '접기' : '바꾸기'}
            </button>
          </div>
          {nickOpen && (
            <form className="accform" onSubmit={askNickname}>
              <div className="field">
                <label htmlFor="nick-new">새 닉네임</label>
                <input
                  id="nick-new"
                  className="inp"
                  maxLength={20}
                  value={nick}
                  readOnly={nickAsk}
                  onChange={(e) => setNick(e.target.value)}
                />
                {nickErr && <div className="err">{nickErr}</div>}
              </div>
              {nickAsk ? (
                <div className="askrow" role="group" aria-label="닉네임 바꾸기 확인">
                  <p>
                    <b>{nick.trim()}</b> 이대로 바꿀까요?
                  </p>
                  <button
                    type="button"
                    className="btn dark"
                    disabled={nickBusy}
                    onClick={() => void saveNickname()}
                  >
                    네, 바꿀게요
                  </button>
                  <button type="button" className="linkbtn" onClick={() => setNickAsk(false)}>
                    취소
                  </button>
                </div>
              ) : (
                <button type="submit" className="btn dark">
                  닉네임 바꾸기
                </button>
              )}
            </form>
          )}
          <div className="ln">
            비밀번호
            <button
              type="button"
              className="btn sm"
              onClick={() => setPwOpen((v) => !v)}
              aria-expanded={pwOpen}
            >
              {pwOpen ? '접기' : '바꾸기'}
            </button>
          </div>
          {pwOpen && needLogin && reauthForm('pre', '비밀번호를 바꾸려면 한 번 더 로그인해요.')}
          {pwOpen && !needLogin && (
            <form className="accform" onSubmit={(e) => void changePassword(e)}>
              <div className="field">
                <label htmlFor="pw-cur">지금 비밀번호</label>
                <PasswordInput
                  id="pw-cur"
                  className="inp"
                  maxLength={72}
                  autoComplete="current-password"
                  value={curPw}
                  onChange={(e) => setCurPw(e.target.value)}
                />
                {pwErr.cur && <div className="err">{pwErr.cur}</div>}
              </div>
              <div className="field">
                <label htmlFor="pw-new">새 비밀번호</label>
                <PasswordInput
                  id="pw-new"
                  className="inp"
                  maxLength={16}
                  autoComplete="new-password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                />
                {pwErr.next && <div className="err">{pwErr.next}</div>}
              </div>
              <div className="field">
                <label htmlFor="pw-new2">새 비밀번호 한 번 더</label>
                <PasswordInput
                  id="pw-new2"
                  className="inp"
                  maxLength={16}
                  autoComplete="new-password"
                  value={newPw2}
                  onChange={(e) => setNewPw2(e.target.value)}
                />
                {pwErr.again && <div className="err">{pwErr.again}</div>}
              </div>
              <p className="hint">새 비밀번호를 잊으면 찾을 수 없어요.</p>
              <button type="submit" className="btn dark" disabled={pwBusy}>
                비밀번호 바꾸기
              </button>
            </form>
          )}
          <div className="ln">
            로그아웃
            <span className="hint">모든 기기에서 로그아웃돼요</span>
            <button type="button" className="btn sm" onClick={() => void logout()}>
              로그아웃
            </button>
          </div>
        </div>
        <div className="accbye">
          {!byeOpen ? (
            <button type="button" className="linkbtn" onClick={openBye}>
              회원 탈퇴
            </button>
          ) : (
            <div className="panel accform" style={{ margin: '0 auto', textAlign: 'left' }}>
              <p>
                <b>회원 탈퇴</b>
              </p>
              <p className="byesum">
                {byeSum ? (
                  <>
                    할 일 <b>{byeSum.taskCount}개</b>, 공유 링크 <b>{byeSum.shareLinkCount}개</b>,
                    받은 응원 <b>{byeSum.commentCount}개</b>가 모두 지워져요.
                  </>
                ) : (
                  '할 일, 공유 링크, 받은 응원이 모두 지워져요.'
                )}
              </p>
              <p className="hint">옮긴 기록, 매주 하는 일, 컨디션도 함께 지워져요.</p>
              <form autoComplete="off" onSubmit={(e) => void doDelete(e)}>
                <label className="byeagree">
                  <input
                    type="checkbox"
                    checked={byeAgree}
                    onChange={(e) => setByeAgree(e.target.checked)}
                  />
                  지운 기록은 다시 찾을 수 없다는 걸 알았어요
                </label>
                <div className="field">
                  <label htmlFor="bye-id">아이디</label>
                  <input
                    id="bye-id"
                    name="bye-confirm-id"
                    className="inp"
                    maxLength={20}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    readOnly={!byeIdOn}
                    onPointerDown={() => setByeIdOn(true)}
                    onFocus={() => setByeIdOn(true)}
                    data-1p-ignore
                    data-lpignore="true"
                    data-bwignore
                    data-form-type="other"
                    value={byeUser}
                    onChange={(e) => setByeUser(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="bye-pw">비밀번호</label>
                  <PasswordInput
                    id="bye-pw"
                    name="bye-confirm-pw"
                    className="inp"
                    maxLength={72}
                    autoComplete="new-password"
                    readOnly={!byePwOn}
                    onPointerDown={() => setByePwOn(true)}
                    onFocus={() => setByePwOn(true)}
                    data-1p-ignore
                    data-lpignore="true"
                    data-bwignore
                    data-form-type="other"
                    value={byePw}
                    onChange={(e) => setByePw(e.target.value)}
                  />
                </div>
                {byeErr && <div className="err">{byeErr}</div>}
                <button
                  type="submit"
                  className="btn dark byego"
                  disabled={byeBusy || !byeAgree || byeUser === '' || byePw === ''}
                >
                  모두 지우고 탈퇴
                </button>
              </form>
              <button type="button" className="linkbtn" onClick={() => setByeOpen(false)}>
                취소
              </button>
            </div>
          )}
        </div>
      </div>
    </Notebook>
  )
}
