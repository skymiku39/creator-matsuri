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
  const graphKey = useMemo(
    () => JSON.stringify({ meta, nodes, edges }),
    [meta, nodes, edges],
  )

  const [phase, setPhase] = useState<SimPhase>(() =>
    createSimulation(nodes, edges),
  )
  const [log, setLog] = useState<string[]>([])

  // 編輯器變更時同步重置模擬（同一份 store／localStorage）
  useEffect(() => {
    setPhase(createSimulation(nodes, edges))
    setLog([])
  }, [graphKey, nodes, edges])

  const restart = () => {
    setPhase(createSimulation(nodes, edges))
    setLog([])
  }

  const onAdvance = () => {
    if (phase.type === 'message') {
      setLog((prev) => [...prev, phase.text])
    } else if (phase.type === 'url') {
      setLog((prev) => [...prev, `（連結）${phase.url}`])
    }
    setPhase(advanceSimulation(phase, nodes, edges))
  }

  const onPick = (choiceId: string, text: string) => {
    setLog((prev) => [...prev, `▶ ${text}`])
    setPhase(pickChoice(phase, nodes, edges, choiceId))
  }

  return (
    <div className="page-shell">
      <div className="top-bar">
        <AppNav />
        <div className="top-bar__actions">
          <button type="button" onClick={restart}>
            重新開始
          </button>
          <Link to="/">回編輯器</Link>
        </div>
      </div>

      <main className="page-main simulate">
        <header className="sim-header">
          <p className="eyebrow">對話模擬</p>
          <h1>{meta.boothName || `${meta.boothId}攤位`}</h1>
          <p className="sim-sync">
            與編輯器即時同步（共用瀏覽器存檔）。在編輯器改台詞後，此頁會自動重載流程。
          </p>
        </header>

        <div className="sim-stage">
          <div className="sim-window">
            {phase.type === 'message' && (
              <>
                <p className="sim-bubble">{phase.text || '（空白台詞）'}</p>
                {phase.note ? <p className="sim-note">備註：{phase.note}</p> : null}
                <button type="button" className="sim-primary" onClick={onAdvance}>
                  下一句
                </button>
              </>
            )}

            {phase.type === 'choices' && (
              <>
                <p className="sim-prompt">請選擇：</p>
                <div className="sim-choices">
                  {phase.options.map((opt) => (
                    <button
                      key={opt.choiceId}
                      type="button"
                      onClick={() => onPick(opt.choiceId, opt.text)}
                    >
                      <span className="letter">{opt.letter}</span>
                      {opt.text}
                      {opt.isReturn ? <em>返回</em> : null}
                    </button>
                  ))}
                </div>
              </>
            )}

            {phase.type === 'url' && (
              <>
                <p className="sim-bubble">開啟連結</p>
                <a
                  className="sim-url"
                  href={phase.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {phase.url}
                </a>
                <button type="button" className="sim-primary" onClick={onAdvance}>
                  繼續
                </button>
              </>
            )}

            {phase.type === 'finished' && (
              <>
                <p className="sim-bubble">
                  {phase.reason === 'empty'
                    ? '目前沒有可模擬的流程，請先到編輯器建立台詞。'
                    : '對話結束。'}
                </p>
                <button type="button" className="sim-primary" onClick={restart}>
                  再玩一次
                </button>
              </>
            )}
          </div>

          <aside className="sim-log">
            <h2>對話紀錄</h2>
            {log.length === 0 ? (
              <p className="muted">尚未開始</p>
            ) : (
              <ol>
                {log.map((line, i) => (
                  <li key={`${i}-${line.slice(0, 12)}`}>{line}</li>
                ))}
              </ol>
            )}
          </aside>
        </div>
      </main>
    </div>
  )
}
