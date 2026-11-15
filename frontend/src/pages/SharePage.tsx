import { notifications } from '@mantine/notifications'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { useApi } from '../api/ApiContext.tsx'
import { messageOf } from '../api/errors.ts'
import { ApiError } from '../api/port.ts'
import type {
  LinkExpiry,
  RoutineResponse,
  ShareLinkCommentResponse,
  ShareLinkResponse,
  WeekResponse,
} from '../api/types.ts'
import { Notebook } from '../components/Notebook.tsx'
import { PageHead } from '../components/PageHead.tsx'
import { showUndoNotice } from '../components/UndoNotice.tsx'
import { mondayOf, todayKst } from '../lib/dates.ts'
import { flushAll } from '../lib/undo.ts'
import { isLinkOpen } from '../lib/visibility.ts'
import { LinkSheet, linkState } from './share/LinkSheet.tsx'
import { NewLinkForm } from './share/NewLinkForm.tsx'
import { ShareIntro } from './share/ShareIntro.tsx'
import { notifyError } from '../lib/notify.ts'

const md = (iso: string) => {
  const [, m, d] = iso.split('-')
  return `${+m}/${+d}`
}

type Pick = number | 'new' | null

const addTo = <T,>(s: ReadonlySet<T>, v: T): Set<T> => new Set(s).add(v)
const removeFrom = <T,>(s: ReadonlySet<T>, v: T): Set<T> => {
  const n = new Set(s)
  n.delete(v)
  return n
}

export function SharePage() {
  const api = useApi()
  const { shareLinkId } = useParams()
  const [links, setLinks] = useState<ShareLinkResponse[] | null>(null)
  const [routines, setRoutines] = useState<RoutineResponse[]>([])
  const [week, setWeek] = useState<WeekResponse | null>(null)
  const [comments, setComments] = useState<ShareLinkCommentResponse[]>([])
  const [failed, setFailed] = useState(false)
  const [tick, setTick] = useState(0)
  const [busy, setBusy] = useState(false)
  const [picked, setPicked] = useState<Pick>(
    shareLinkId && /^\d+$/.test(shareLinkId) ? Number(shareLinkId) : null,
  )
  const [closedOpen, setClosedOpen] = useState(false)
  const [closing, setClosing] = useState<ReadonlySet<number>>(new Set())
  const [gone, setGone] = useState<ReadonlySet<number>>(new Set())
  const [hiddenNotes, setHiddenNotes] = useState<ReadonlySet<number>>(new Set())

  const fail = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.code !== 'AUTH_REQUIRED') {
      notifyError(messageOf(e.code))
    }
  }, [])

  useEffect(() => () => flushAll(), [])

  const reloadLinks = useCallback(async () => {
    setLinks(await api.getShareLinks())
  }, [api])

  useEffect(() => {
    let alive = true
    const monday = mondayOf(todayKst())
    Promise.all([api.getShareLinks(), api.getRoutines()])
      .then(([l, r]) => {
        if (!alive) return
        setLinks(l)
        setRoutines(r)
      })
      .catch((e: unknown) => {
        if (!alive) return
        setFailed(true)
        fail(e)
      })
    api
      .createWeekOccurrences(monday)
      .catch(() => undefined)
      .then(() => api.getWeek(monday))
      .then((w) => {
        if (alive) setWeek(w)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [api, fail, tick])

  const today = week?.today ?? todayKst()

  const shown = useMemo(
    () =>
      (links ?? [])
        .filter((l) => !gone.has(l.shareLinkId))
        .map((l) => (closing.has(l.shareLinkId) ? { ...l, status: 'CLOSED' as const } : l)),
    [links, gone, closing],
  )
  const open = shown.filter((l) => isLinkOpen(l, today))
  const selected: ShareLinkResponse | 'new' | null =
    picked === 'new' || shown.length === 0
      ? 'new'
      : (shown.find((l) => l.shareLinkId === picked) ?? open[0] ?? shown[0])
  const selectedId = selected !== 'new' && selected !== null ? selected.shareLinkId : null

  useEffect(() => {
    if (selectedId === null) return
    let alive = true
    api
      .getShareLinkComments(selectedId)
      .then((c) => {
        if (alive) setComments(c)
      })
      .catch(() => {
        if (alive) setComments([])
      })
    return () => {
      alive = false
    }
  }, [api, selectedId, tick])

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
      await reloadLinks()
    } catch (e) {
      fail(e)
    } finally {
      setBusy(false)
    }
  }

  const copy = (l: ShareLinkResponse) => {
    const url = `${window.location.origin}/s/${l.token}`
    navigator.clipboard
      ?.writeText(url)
      .then(() =>
        notifications.show({ message: '복사했어요. 카톡·문자 대화창에 붙여 넣어 보내요' }),
      )
      .catch(() => notifyError('복사하지 못했어요. 주소 칸을 눌러 직접 복사해요.'))
  }

  const toggleRoutine = (l: ShareLinkResponse, routineId: number, on: boolean) =>
    void act(() =>
      on
        ? api.addShareLinkRoutine(l.shareLinkId, routineId)
        : api.removeShareLinkRoutine(l.shareLinkId, routineId),
    )
  const toggleOnce = (l: ShareLinkResponse, on: boolean) =>
    void act(() => api.updateShareLink(l.shareLinkId, { isOneTimeVisible: on }))
  const setExpiry = (l: ShareLinkResponse, expiry: LinkExpiry) =>
    void act(() => api.updateShareLink(l.shareLinkId, { expiry }))

  const closeLink = (l: ShareLinkResponse) => {
    const id = l.shareLinkId
    setClosing((s) => addTo(s, id))
    const settle = () => setClosing((s) => removeFrom(s, id))
    showUndoNotice(`${l.name}: 링크를 닫았어요. 친구가 더는 못 봐요`, {
      run: () => {
        api.closeShareLink(id).then(reloadLinks).catch(fail).finally(settle)
      },
      onUndo: settle,
    })
  }

  const deleteLink = (l: ShareLinkResponse, withComments: boolean) => {
    const id = l.shareLinkId
    setGone((s) => addTo(s, id))
    const settle = () => setGone((s) => removeFrom(s, id))
    const n = l.commentCount
    const message = withComments
      ? `${l.name}: 링크와 응원 ${n}개를 지웠어요`
      : n > 0
        ? `${l.name}: 링크를 지웠어요. 응원 ${n}개는 그 주 캘린더에 남아요`
        : `${l.name}: 링크를 지웠어요`
    showUndoNotice(message, {
      run: () => {
        const call = withComments ? api.deleteShareLinkWithComments(id) : api.deleteShareLink(id)
        call.then(reloadLinks).catch(fail).finally(settle)
      },
      onUndo: settle,
    })
  }

  const removeNote = (c: ShareLinkCommentResponse) => {
    const id = c.shareLinkCommentId
    setHiddenNotes((s) => addTo(s, id))
    const settle = () => setHiddenNotes((s) => removeFrom(s, id))
    showUndoNotice('응원을 지웠어요', {
      run: () => {
        api
          .deleteShareLinkComment(id)
          .then(() => {
            setComments((cs) => cs.filter((x) => x.shareLinkCommentId !== id))
            return reloadLinks()
          })
          .catch(fail)
          .finally(settle)
      },
      onUndo: settle,
    })
  }

  const onceNames = week
    ? week.days
        .flatMap((d) => d.tasks.filter((t) => t.routineId === null && t.isVisible))
        .map((t) => t.name)
    : []

  if (links === null) {
    return (
      <Notebook wide>
        <PageHead current="share" title="공유" />
        {failed ? (
          <p className="hint">
            불러오지 못했어요.{' '}
            <button
              type="button"
              className="linkbtn"
              onClick={() => {
                setFailed(false)
                setTick((n) => n + 1)
              }}
            >
              다시 해 보기
            </button>
          </p>
        ) : null}
      </Notebook>
    )
  }

  const sel = selected === 'new' ? null : selected
  const closedLinks = shown.filter((l) => !isLinkOpen(l, today) && l !== sel)
  const fold = closedLinks.length >= 4
  const tabLinks = shown.filter((l) => !fold || isLinkOpen(l, today) || l === sel)
  const tab = (l: ShareLinkResponse) => {
    const off = !isLinkOpen(l, today)
    return (
      <button
        key={l.shareLinkId}
        type="button"
        className={`stab${l === sel ? ' on' : ''}${off ? ' off' : ''}`}
        onClick={() => setPicked(l.shareLinkId)}
      >
        <span className="stt">{l.name}</span>
        {off ? (
          <small>{linkState(l, today)}</small>
        ) : l.expireDate ? (
          <small>~{md(l.expireDate)}</small>
        ) : null}
        <em>{l.commentCount}</em>
      </button>
    )
  }

  return (
    <Notebook wide>
      <PageHead current="share" title="공유" />
      <ShareIntro today={today} />
      <div className="sharelay tabs">
        <nav className="stabs" aria-label="공유 링크">
          {tabLinks.map(tab)}
          {fold ? (
            <button
              type="button"
              className={`stab off more${closedOpen ? ' open' : ''}`}
              aria-expanded={closedOpen}
              onClick={() => setClosedOpen((v) => !v)}
            >
              닫힌 링크<em>{closedLinks.length}</em> {closedOpen ? '▴' : '▾'}
            </button>
          ) : null}
          <button
            type="button"
            className={`stab add${selected === 'new' ? ' on' : ''}`}
            onClick={() => setPicked('new')}
          >
            + 새 링크
          </button>
          {fold && closedOpen ? (
            <div className="closedlist">
              {closedLinks.map((l) => (
                <button
                  key={l.shareLinkId}
                  type="button"
                  className="linkbtn"
                  onClick={() => setPicked(l.shareLinkId)}
                >
                  {l.name}{' '}
                  <small>
                    {linkState(l, today)} · 응원 {l.commentCount}
                  </small>
                </button>
              ))}
            </div>
          ) : null}
        </nav>
        <section className="ssheet sdetail">
          {sel === null ? (
            <NewLinkForm
              routines={routines}
              today={today}
              onceNames={onceNames}
              canCancel={shown.length > 0}
              onCreated={(made) => {
                notifications.show({ message: `${made.name}: 링크를 만들었어요` })
                setPicked(made.shareLinkId)
                void reloadLinks().catch(fail)
              }}
              onCancel={() => setPicked(null)}
            />
          ) : (
            <LinkSheet
              key={sel.shareLinkId}
              link={sel}
              routines={routines}
              week={week}
              today={today}
              comments={comments.filter((c) => !hiddenNotes.has(c.shareLinkCommentId))}
              busy={busy}
              onCopy={copy}
              onRoutine={toggleRoutine}
              onOnce={toggleOnce}
              onExpiry={setExpiry}
              onCloseLink={closeLink}
              onDelete={deleteLink}
              onRemoveComment={removeNote}
            />
          )}
        </section>
      </div>
    </Notebook>
  )
}
