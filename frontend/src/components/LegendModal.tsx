export function LegendModal({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className="lg3">
      <button type="button" className="linkbtn" aria-expanded={open} onClick={onToggle}>
        보는 법
      </button>
      {open ? (
        <div className="lgpop">
          <b>에너지 보는 법</b>
          <div>
            <i className="done" />
            채운 칸 = 했어요
          </div>
          <div>
            <i />
            점선 칸 = 할 일
          </div>
          <div>
            <i className="over" />
            주황 칸 = 그날 에너지보다 많이 넣은 칸(넘침)
          </div>
          <div>
            <span className="mk">↻2</span>2번 옮긴 할 일
          </div>
          <div>
            <span className="mk">○</span>할 일을 만드는 동안 보이는 빈 칸
          </div>
          <button type="button" className="linkbtn" onClick={onToggle}>
            닫기
          </button>
        </div>
      ) : null}
    </div>
  )
}
