import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppNav } from '../components/layout/AppNav'
import {
  advanceSimulation,
  createSimulation,
  pickChoice,
  type SimPhase,
} from '../domain/simulate'
import { useDialogueStore } from '../store/useDialogueStore'

export function SimulatePage() {
  const meta = useDialogueStore((s) => s.meta)
  const nodes = useDialogueStore((s) => s.nodes)
  const edges = useDialogueStore((s) => s.edges)
  const setMeta = useDialogueStore((s) => s.setMeta)
  const graphKey = useMemo(
    () => JSON.stringify({ meta, nodes, edges }),
    [meta, nodes, edges],
  )

  const [phase, setPhase] = useState<SimPhase>(() =>
    createSimulation(nodes, edges),
  )
  /** 進入選項時仍顯示上一句台詞（對齊影片：底框＋右上選項同時出現） */
  const [promptLine, setPromptLine] = useState('')

  useEffect(() => {
    const start = createSimulation(nodes, edges)
    setPhase(start)
    setPromptLine(start.type === 'message' ? start.text : '')
  }, [graphKey, nodes, edges])

  const speaker =
    meta.speakerName?.trim() ||
    meta.boothName?.replace(/攤位$/, '') ||
    'NPC'

  const restart = () => {
    const start = createSimulation(nodes, edges)
    setPhase(start)
    setPromptLine(start.type === 'message' ? start.text : '')
  }

  const onAdvance = () => {
    if (phase.type === 'message') {
      setPromptLine(phase.text)
    }
    if (phase.type === 'url') {
      window.open(phase.url, '_blank', 'noopener,noreferrer')
    }
    const next = advanceSimulation(phase, nodes, edges)
    setPhase(next)
  }

  const onPick = (choiceId: string) => {
    setPhase(pickChoice(phase, nodes, edges, choiceId))
  }

  const bottomText =
    phase.type === 'message'
      ? phase.text || '（空白台詞）'
      : phase.type === 'url'
        ? `請開啟連結：\n${phase.url}`
        : phase.type === 'choices'
          ? promptLine || '請選擇右上方的選項……'
          : phase.type === 'finished'
            ? phase.reason === 'empty'
              ? '目前沒有可模擬的流程，請先到編輯器建立台詞。'
              : '……'
            : ''

  const canClickMessage =
    phase.type === 'message' ||
    phase.type === 'url' ||
    (phase.type === 'finished' && phase.reason !== 'empty')

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
          <button type="button" onClick={restart}>
            重新開始
          </button>
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

          {phase.type === 'choices' && (
            <div className="rpg-choices" role="menu">
              {phase.options.map((opt) => (
                <button
                  key={opt.choiceId}
                  type="button"
                  role="menuitem"
                  className="rpg-choice"
                  onClick={() => onPick(opt.choiceId)}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            className={`rpg-message${canClickMessage ? '' : ' rpg-message--passive'}`}
            onClick={
              phase.type === 'finished' && phase.reason !== 'empty'
                ? restart
                : canClickMessage
                  ? onAdvance
                  : undefined
            }
            aria-label={canClickMessage ? '點擊繼續' : '對話內容'}
          >
            <div className="rpg-message__name">{speaker}</div>
            <div className="rpg-message__text">{bottomText}</div>
            {canClickMessage && (
              <span className="rpg-message__hint">
                {phase.type === 'finished' ? '再玩一次 ▼' : '▼'}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
