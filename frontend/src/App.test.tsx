// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { MemoryRouter, useNavigate } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'
import { scheduleUndoable } from './lib/undo.ts'

let root: Root
let container: HTMLDivElement

function Harness() {
  const navigate = useNavigate()
  return (
    <>
      <button onClick={() => void navigate('/another-page')}>이동</button>
      <App />
    </>
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  act(() => {
    root.render(
      <MemoryRouter initialEntries={['/test-page']}>
        <Harness />
      </MemoryRouter>,
    )
  })
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('화면을 떠날 때의 삭제', () => {
  it('앱 내부 이동 시 대기 중인 작업을 즉시 실행한다', () => {
    const run = vi.fn()
    scheduleUndoable({ run, onUndo: vi.fn() })
    act(() => container.querySelector('button')!.click())
    expect(run).toHaveBeenCalledTimes(1)
    act(() => vi.advanceTimersByTime(6000))
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('새로고침과 탭 닫기의 pagehide에서도 실행한다', () => {
    const run = vi.fn()
    scheduleUndoable({ run, onUndo: vi.fn() })
    act(() => window.dispatchEvent(new Event('pagehide')))
    expect(run).toHaveBeenCalledTimes(1)
    act(() => vi.advanceTimersByTime(6000))
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('되돌린 작업은 화면 이동과 pagehide에서 실행하지 않는다', () => {
    const run = vi.fn()
    const handle = scheduleUndoable({ run, onUndo: vi.fn() })
    handle.undo()
    act(() => container.querySelector('button')!.click())
    act(() => window.dispatchEvent(new Event('pagehide')))
    expect(run).not.toHaveBeenCalled()
  })
})
