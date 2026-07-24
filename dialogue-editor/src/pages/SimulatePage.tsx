import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppNav } from '../components/layout/AppNav'
import { SimChoiceOverlay } from '../components/sim/SimChoiceOverlay'
import {
  advanceSimulation,
  createSimulation,
  pickChoice,
  type SimPhase,
} from '../domain/simulate'
import { useDialogueStore } from '../store/useDialogueStore'

type Session = 'idle' | 'active' | 'ended'

export function SimulatePage() {
  const meta = useDialogueStore((s) => s.meta)
  const nodes = useDialogueStore((s) => s.nodes)
  const edges = useDialogueStore((s) => s.edges)
  const setMeta = useDialogueStore((s) => s.setMeta)
  const graphKey = useMemo(
    () => JSON.stringify({ nodes, edges, boothId: meta.boothId }),
    [meta.boothId, nodes, edges],
  )

  const [session, setSession] = useState<Session>('idle')
  const [phase, setPhase] = useState<SimPhase | null>(null)
  /** 進入選項時仍顯示上一句台詞 */
  const [promptLine, setPromptLine] = useState('')
  const [endReason, setEndReason] = useState<'end' | 'aborted' | 'empty'>(
    'end',
  )

  // 流程變更時回到待機，避免編輯中途誤觸
  useEffect(() => {
    setSession('idle')
    setPhase(null)
    setPromptLine('')
    setEndReason('end')
  }, [graphKey])

  const speaker =
    meta.speakerName?.trim() ||
    meta.boothName?.replace(/攤位$/, '') ||
    'NPC'

  const boothLabel = meta.boothName || `${meta.boothId}攤位`

  const startDialogue = () => {
    const start = createSimulation(nodes, edges)
    if (start.type === 'finished') {
      setEndReason(start.reason === 'empty' ? 'empty' : 'end')
      setSession('ended')
      setPhase(start)
      return
    }
    setPromptLine(start.type === 'message' ? start.text : '')
    setPhase(start)
    setSession('active')
  }

  const endDialogue = (reason: 'end' | 'aborted' = 'aborted') => {
    setEndReason(reason)
    setSession('ended')
    setPhase({ type: 'finished', reason: reason === 'aborted' ? 'end' : reason })
  }

  const backToIdle = () => {
    setSession('idle')
    setPhase(null)
    setPromptLine('')
  }

  const onAdvance = () => {
    if (!phase) return
    if (phase.type === 'message') {
      setPromptLine(phase.text)
    }
    if (phase.type === 'url') {
      window.open(phase.url, '_blank', 'noopener,noreferrer')
    }
    const next = advanceSimulation(phase, nodes, edges)
    if (next.type === 'finished') {
      setEndReason(next.reason === 'empty' ? 'empty' : 'end')
      setSession('ended')
      setPhase(next)
      return
    }
    setPhase(next)
  }

  const onPick = (choiceId: string) => {
    if (!phase) return
    const next = pickChoice(phase, nodes, edges, choiceId)
    if (next.type === 'finished') {
      setEndReason(next.reason === 'empty' ? 'empty' : 'end')
      setSession('ended')
      setPhase(next)
      return
    }
    setPhase(next)
  }

  const bottomText =
    !phase
      ? ''
      : phase.type === 'message'
        ? phase.text || '（空白台詞）'
        : phase.type === 'url'
          ? `請開啟連結：\n${phase.url}`
          : phase.type === 'choices'
            ? promptLine || '請選擇右上方的選項……'
            : ''

  const canClickMessage =
    session === 'active' &&
    phase != null &&
    (phase.type === 'message' || phase.type === 'url')

  return (
    <div className="page-shell sim-page">
      <div className="top-bar">
        <AppNav />
        <div className="top-bar__actions">
          <label className="sim-speaker-edit">
            <span>說話者</span>
            <input
              value={meta.speakerName ?? ''}
              placeholder="Mirai"
              onChange={(e) => setMeta({ speakerName: e.target.value })}
            />
          </label>
          {session === 'active' && (
            <button
              type="button"
              className="sim-end-btn"
              onClick={() => endDialogue('aborted')}
            >
              結束對話
            </button>
          )}
          <Link to="/">回編輯器</Link>
        </div>
      </div>

      <div className="rpg-viewport-wrap">
        <div
          className="rpg-viewport"
          style={{ backgroundImage: 'url(/sim/festival-bg.jpg)' }}
          role="application"
          aria-label="對話模擬畫面"
        >
          <div className="rpg-vignette" aria-hidden />

          {/* 待機：明確開始 */}
          {session === 'idle' && (
            <div className="rpg-gate">
              <p className="rpg-gate__place">{boothLabel}</p>
              <p className="rpg-gate__hint">靠近攤位，開始與店員對話</p>
              <button
                type="button"
                className="rpg-gate__start"
                onClick={startDialogue}
              >
                開始對話
              </button>
            </div>
          )}

          {/* 進行中：選項（Shift 多選拖曳位置會寫入 meta） */}
          {session === 'active' && phase?.type === 'choices' && (
            <SimChoiceOverlay
              options={phase.options}
              layouts={meta.simChoiceLayouts ?? []}
              onLayoutsChange={(simChoiceLayouts) => setMeta({ simChoiceLayouts })}
              onPick={onPick}
            />
          )}

          {/* 進行中：訊息框 */}
          {session === 'active' && phase && (
            <button
              type="button"
              className={`rpg-message${canClickMessage ? '' : ' rpg-message--passive'}`}
              onClick={canClickMessage ? onAdvance : undefined}
              aria-label={canClickMessage ? '點擊繼續' : '對話內容'}
            >
              <div className="rpg-message__name">{speaker}</div>
              <div className="rpg-message__text">{bottomText}</div>
              {canClickMessage && (
                <span className="rpg-message__hint">▼</span>
              )}
            </button>
          )}

          {/* 結束：明確結束狀態 */}
          {session === 'ended' && (
            <div className="rpg-gate rpg-gate--ended">
              <p className="rpg-gate__place">對話結束</p>
              <p className="rpg-gate__hint">
                {endReason === 'empty'
                  ? '目前沒有可模擬的流程，請先到編輯器建立台詞。'
                  : endReason === 'aborted'
                    ? '你已結束這次對話。'
                    : '這次對話已完整結束。'}
              </p>
              <div className="rpg-gate__actions">
                {endReason !== 'empty' && (
                  <button
                    type="button"
                    className="rpg-gate__start"
                    onClick={startDialogue}
                  >
                    開始新對話
                  </button>
                )}
                <button
                  type="button"
                  className="rpg-gate__secondary"
                  onClick={backToIdle}
                >
                  回到待機
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
