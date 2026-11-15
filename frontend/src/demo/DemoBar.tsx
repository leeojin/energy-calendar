import { notifications } from '@mantine/notifications'
import { Link, useNavigate } from 'react-router'
import { demoApi } from './demoApi.ts'

export const FROM_DEMO_KEY = 'ec.fromDemo'

export function DemoBar({ onReset }: { onReset: () => void }) {
  const navigate = useNavigate()

  const reset = () => {
    const before = demoApi.snapshot()
    demoApi.reset()
    onReset()
    const id = `demo-reset-${Date.now()}`
    notifications.show({
      id,
      autoClose: 6000,
      withCloseButton: false,
      classNames: { root: 'undo-note' },
      message: (
        <div className="toast-row">
          <span>처음 예시로 돌아왔어요</span>
          <button
            type="button"
            className="undo"
            onClick={() => {
              demoApi.restore(before)
              notifications.hide(id)
              onReset()
            }}
          >
            되돌리기
          </button>
        </div>
      ),
    })
  }

  const signup = () => {
    sessionStorage.setItem(FROM_DEMO_KEY, '1')
    void navigate('/signup')
  }

  return (
    <div className="guestbar">
      <Link to="/" className="linkbtn guesthome">
        ← 홈으로
      </Link>
      <div className="guestinfo">
        <b>예시 캘린더</b>
        <span>만져 봐도 저장되지 않아요.</span>
      </div>
      <div className="guestactions">
        <button type="button" className="btn ghost sm" onClick={reset}>
          예시 초기화
        </button>
        <button type="button" className="btn dark sm" onClick={signup}>
          회원가입하고 시작하기
        </button>
      </div>
    </div>
  )
}
