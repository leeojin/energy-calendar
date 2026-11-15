import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import type { ConditionLevel, DayResponse } from '../../api/types.ts'
import { CONDITION_LABEL } from '../../components/Battery.tsx'
import { budgetFor } from '../../components/ConditionPicker.tsx'
import { cutToCodePoints } from '../../lib/text.ts'

export type GuideStep = 'condition' | 'task' | 'done' | 'end'

const LEVELS: ConditionLevel[] = ['LOW', 'NORMAL', 'GOOD']
const COSTS = [
  { cost: 1, label: '조금' },
  { cost: 2, label: '보통' },
  { cost: 3, label: '많이' },
]
const NUM: Record<GuideStep, number> = { condition: 1, task: 2, done: 3, end: 3 }

function useTodayOnTop(step: GuideStep | null) {
  useEffect(() => {
    if (!window.matchMedia('(max-width: 900px)').matches) return
    const row = document.querySelector('.row.today')
    if (row) window.scrollTo(0, row.getBoundingClientRect().top + window.scrollY - 10)
  }, [step])
}

interface GuideProps {
  step: GuideStep
  day: DayResponse
  completed: boolean
  busy: boolean
  error: string
  onCondition: (level: ConditionLevel) => void
  onDraft: (name: string, cost: number) => void
  onNext: () => void
  onPlace: (name: string, cost: number) => void
  onDone: () => void
  onLater: () => void
  onSkip: () => void
  onFinish: () => void
}

export function FirstRunGuide(p: GuideProps) {
  const { step, day } = p
  const [name, setName] = useState('')
  const [cost, setCost] = useState(2)
  useTodayOnTop(step)
  const change = (n: string, c: number) => {
    setName(n)
    setCost(c)
    p.onDraft(n, c)
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    p.onPlace(name, cost)
  }
  const head =
    step === 'end' ? null : (
      <div className="frtop">
        <span className="frdots" aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <i key={n} className={n <= NUM[step] ? 'on' : undefined} />
          ))}
        </span>
        <span className="frcnt">{NUM[step]}/3</span>
        <button type="button" className="linkbtn frskip" onClick={p.onSkip}>
          건너뛰기
        </button>
      </div>
    )

  if (step === 'condition') {
    return (
      <div className="fr">
        {head}
        <h3>오늘 컨디션은 어때요?</h3>
        <p className="frsub">고르면 오늘 쓸 수 있는 칸이 바뀌어요.</p>
        <div className="frchs">
          {LEVELS.map((c) => (
            <button
              key={c}
              type="button"
              className={day.conditionLevel === c ? 'frch on' : 'frch'}
              aria-pressed={day.conditionLevel === c}
              disabled={p.busy}
              onClick={() => p.onCondition(c)}
            >
              {CONDITION_LABEL[c]}
              <small>{budgetFor(c, day.energyBudget)}칸</small>
            </button>
          ))}
        </div>
        <div className="fracts">
          <button type="button" className="frgo" onClick={p.onNext}>
            다음
          </button>
        </div>
      </div>
    )
  }
  if (step === 'task') {
    return (
      <form className="fr" onSubmit={submit}>
        {head}
        <h3>오늘 할 일 하나만 적어 볼까요?</h3>
        <input
          className="frinp"
          aria-label="할 일 이름"
          placeholder="예: 약 먹기"
          autoFocus
          value={name}
          onChange={(e) => change(cutToCodePoints(e.target.value, 20), cost)}
        />
        <p className="frlb">힘이 얼마나 들어요?</p>
        <div className="frchs">
          {COSTS.map((c) => (
            <button
              key={c.cost}
              type="button"
              className={cost === c.cost ? 'frch on' : 'frch'}
              aria-pressed={cost === c.cost}
              onClick={() => change(name, c.cost)}
            >
              {c.label}
              <small>{c.cost}칸</small>
            </button>
          ))}
        </div>
        {p.error ? <p className="err">{p.error}</p> : null}
        <div className="fracts">
          <button type="submit" className="frgo" disabled={p.busy || name.trim() === ''}>
            넣기
          </button>
        </div>
      </form>
    )
  }
  if (step === 'done') {
    return (
      <div className="fr">
        {head}
        <h3>오늘에 들어갔어요</h3>
        <p className="frsub">점선은 아직 안 한 일이에요. 벌써 했다면 눌러 봐요.</p>
        <div className="fracts">
          <button type="button" className="frgo" disabled={p.busy} onClick={p.onDone}>
            했어요
          </button>
          <button type="button" className="frsoft" disabled={p.busy} onClick={p.onLater}>
            아직 안 했어요
          </button>
        </div>
      </div>
    )
  }
  const left = day.dayBudget - day.usedEnergy
  return (
    <div className="fr">
      <h3>{p.completed ? '노랗게 칠해졌어요' : '이제 시작이에요'}</h3>
      <p className="frsub">
        {left > 0 ? `오늘 ${left}칸 남았어요. ` : ''}다른 날도 칸을 눌러 넣으면 돼요.
      </p>
      <div className="fracts">
        <button type="button" className="frgo" onClick={p.onFinish}>
          시작하기
        </button>
      </div>
    </div>
  )
}

interface BoxProps {
  busy: boolean
  error: string
  onDraft: (name: string, cost: number) => void
  onPlace: (name: string, cost: number) => Promise<boolean>
}

export function FirstTaskBox({ busy, error, onDraft, onPlace }: BoxProps) {
  const [name, setName] = useState('')
  const [cost, setCost] = useState(2)
  useTodayOnTop(null)
  const change = (n: string, c: number) => {
    setName(n)
    setCost(c)
    onDraft(n, c)
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    void onPlace(name, cost)
  }
  return (
    <form className="fr" onSubmit={submit}>
      <div className="frinline">
        <input
          className="frinp"
          aria-label="할 일 이름"
          placeholder="오늘 할 일 하나만 적어 볼까요?"
          value={name}
          onChange={(e) => change(cutToCodePoints(e.target.value, 20), cost)}
        />
        {COSTS.map((c) => (
          <button
            key={c.cost}
            type="button"
            className={cost === c.cost ? 'frch on' : 'frch'}
            aria-pressed={cost === c.cost}
            onClick={() => change(name, c.cost)}
          >
            {c.cost}칸
          </button>
        ))}
        <button type="submit" className="frgo" disabled={busy || name.trim() === ''}>
          넣기
        </button>
      </div>
      {error ? <p className="err">{error}</p> : null}
      <p className="frsub">
        <Link className="linkbtn" to="/demo/week">
          예시 먼저 보기
        </Link>
      </p>
    </form>
  )
}
