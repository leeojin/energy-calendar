import type { TimeSlot } from '../../api/types.ts'
import { dayName } from '../../components/DayRow.tsx'
import { SLOTS, SLOT_LABEL } from '../../lib/battery.ts'
import { DOW_NAMES, occurrenceSentence } from '../../lib/dates.ts'
import { cutToCodePoints } from '../../lib/text.ts'

export interface NewTaskDraft {
  type: 'once' | 'routine'
  name: string
  cost: number
  date: string
  timeSlot: TimeSlot
  isVisible: boolean
  weekdays: number
  start: string
  end: string | null
  pickTarget: 'start' | 'end'
}

interface Props {
  today: string
  draft: NewTaskDraft
  error: string
  busy: boolean
  onChange: (d: NewTaskDraft) => void
  onMake: () => void
  onClose: () => void
}

export function NewTaskPanel({ today, draft: d, error, busy, onChange, onMake, onClose }: Props) {
  return (
    <section className="memo" data-slot="new">
      <h4>
        새 할 일{' '}
        <button type="button" className="linkbtn" onClick={onClose}>
          닫기
        </button>
      </h4>
      <div className="rfm nfm">
        <div className="k">반복</div>
        <div className="v">
          {(['once', 'routine'] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={d.type === t ? 'nch on' : 'nch'}
              aria-pressed={d.type === t}
              onClick={() => onChange({ ...d, type: t })}
            >
              {t === 'once' ? '이번만' : '매주'}
            </button>
          ))}
        </div>
        <div className="k">
          <label htmlFor="nt-name">이름</label>
        </div>
        <div className="v">
          <input
            id="nt-name"
            className="nm"
            maxLength={20}
            placeholder={d.type === 'once' ? '예: 치과' : '예: 약 먹기'}
            value={d.name}
            autoComplete="off"
            onChange={(e) => onChange({ ...d, name: cutToCodePoints(e.target.value, 20) })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault()
                onMake()
              }
            }}
          />
        </div>
        <div className="k">몇 칸</div>
        <div className="v">
          <span className="costpick sm">
            <span className="costbat">
              {Array.from({ length: 10 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  className={i < d.cost ? 'f' : undefined}
                  aria-label={`${i + 1}칸`}
                  onClick={() => onChange({ ...d, cost: i + 1 })}
                />
              ))}
            </span>
          </span>
          <b>{d.cost}칸</b>
          <span className="mini-steps">
            <button
              type="button"
              className="btn icon sm"
              disabled={d.cost <= 1}
              aria-label="한 칸 줄이기"
              onClick={() => onChange({ ...d, cost: d.cost - 1 })}
            >
              −
            </button>
            <button
              type="button"
              className="btn icon sm"
              disabled={d.cost >= 10}
              aria-label="한 칸 늘리기"
              onClick={() => onChange({ ...d, cost: d.cost + 1 })}
            >
              +
            </button>
          </span>
        </div>
        {d.type === 'once' ? (
          <>
            <div className="k">언제</div>
            <div className="v tall">
              <span>
                <b>{dayName(d.date)}</b> ·{' '}
                {SLOTS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={d.timeSlot === s ? 'nch on' : 'nch'}
                    aria-pressed={d.timeSlot === s}
                    onClick={() => onChange({ ...d, timeSlot: s })}
                  >
                    {SLOT_LABEL[s]}
                  </button>
                ))}
              </span>
              <span className="hint">날짜를 눌러 골라요</span>
            </div>
            <div className="k">친구에게</div>
            <div className="v">
              {d.isVisible ? '보여요' : '나만 봐요'}
              <button
                type="button"
                className="linkbtn"
                onClick={() => onChange({ ...d, isVisible: !d.isVisible })}
              >
                {d.isVisible ? '숨기기' : '보이기'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="k">시간</div>
            <div className="v">
              {SLOTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={d.timeSlot === s ? 'nch on' : 'nch'}
                  aria-pressed={d.timeSlot === s}
                  onClick={() => onChange({ ...d, timeSlot: s })}
                >
                  {SLOT_LABEL[s]}
                </button>
              ))}
            </div>
            <div className="k">요일</div>
            <div className="v">
              {DOW_NAMES.map((n, i) => {
                const on = (d.weekdays & (1 << i)) !== 0
                return (
                  <button
                    key={n}
                    type="button"
                    className={on ? 'nch d on' : 'nch d'}
                    aria-pressed={on}
                    onClick={() => onChange({ ...d, weekdays: d.weekdays ^ (1 << i) })}
                  >
                    {n}
                  </button>
                )
              })}
              <button
                type="button"
                className="linkbtn"
                onClick={() => onChange({ ...d, weekdays: 127 })}
              >
                매일
              </button>
            </div>
            <div className="k">언제부터</div>
            <div className="v tall">
              <span>
                <button
                  type="button"
                  className={d.pickTarget === 'start' ? 'nch on' : 'nch'}
                  aria-pressed={d.pickTarget === 'start'}
                  onClick={() => onChange({ ...d, pickTarget: 'start' })}
                >
                  {dayName(d.start)}
                </button>
                <span className="hint">부터</span>
              </span>
              {d.pickTarget === 'start' ? <span className="hint">날짜를 눌러 골라요</span> : null}
            </div>
            <div className="k">언제까지</div>
            <div className="v tall">
              {d.end === null ? (
                <span>
                  계속{' '}
                  <button
                    type="button"
                    className="linkbtn"
                    onClick={() =>
                      onChange({ ...d, end: d.start > today ? d.start : today, pickTarget: 'end' })
                    }
                  >
                    날짜 정하기
                  </button>
                </span>
              ) : (
                <span>
                  <button
                    type="button"
                    className={d.pickTarget === 'end' ? 'nch on' : 'nch'}
                    aria-pressed={d.pickTarget === 'end'}
                    onClick={() => onChange({ ...d, pickTarget: 'end' })}
                  >
                    {dayName(d.end)}
                  </button>
                  <span className="hint">까지</span>
                  <button
                    type="button"
                    className="linkbtn"
                    onClick={() => onChange({ ...d, end: null, pickTarget: 'start' })}
                  >
                    날짜 지우기
                  </button>
                </span>
              )}
              {d.end !== null && d.pickTarget === 'end' ? (
                <span className="hint">날짜를 눌러 골라요</span>
              ) : null}
            </div>
            <div className="k">친구에게</div>
            <div className="v tall">
              <span>나만 봐요</span>
              <span className="hint">보여 줄 링크는 공유 화면에서 골라요</span>
            </div>
          </>
        )}
        <div className="k" />
        <div className="v">
          <button type="button" className="btn dark sm" disabled={busy} onClick={onMake}>
            만들기
          </button>
        </div>
      </div>
      {d.type === 'routine' ? (
        <p className="hint nprev">
          {occurrenceSentence(d.weekdays, d.start, d.end, SLOT_LABEL[d.timeSlot], today)}
        </p>
      ) : null}
      {error ? <div className="err">{error}</div> : null}
    </section>
  )
}
