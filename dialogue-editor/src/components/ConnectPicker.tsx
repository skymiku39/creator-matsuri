import { useEffect, useMemo, useRef } from 'react'
import {
  CONNECTION_ALLOWED,
  KIND_LABEL,
  listConnectCandidates,
} from '../domain/connectionRules'
import type { DialogueNodeKind } from '../domain/types'
import { useDialogueStore } from '../store/useDialogueStore'

export function ConnectPicker() {
  const picker = useDialogueStore((s) => s.connectPicker)
  const nodes = useDialogueStore((s) => s.nodes)
  const closeConnectPicker = useDialogueStore((s) => s.closeConnectPicker)
  const connectFromPicker = useDialogueStore((s) => s.connectFromPicker)
  const createAndConnectFromPicker = useDialogueStore(
    (s) => s.createAndConnectFromPicker,
  )
  const panelRef = useRef<HTMLDivElement>(null)

  const candidates = useMemo(() => {
    if (!picker) return []
    return listConnectCandidates(picker.sourceKind, picker.sourceId, nodes)
  }, [picker, nodes])

  const allowedKinds = picker
    ? CONNECTION_ALLOWED[picker.sourceKind]
    : ([] as DialogueNodeKind[])

  useEffect(() => {
    if (!picker) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeConnectPicker()
    }
    const onDown = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as HTMLElement)) {
        closeConnectPicker()
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
    }
  }, [picker, closeConnectPicker])

  if (!picker) return null

  const left = Math.min(picker.clientX, window.innerWidth - 280)
  const top = Math.min(picker.clientY, window.innerHeight - 320)

  return (
    <div
      ref={panelRef}
      className="connect-picker"
      style={{ left, top }}
      role="dialog"
      aria-label="可連接的節點"
    >
      <header className="connect-picker__head">
        <strong>可以接到誰？</strong>
        <button
          type="button"
          className="connect-picker__close"
          onClick={closeConnectPicker}
          aria-label="關閉"
        >
          ×
        </button>
      </header>
      <p className="connect-picker__lead">
        從此
        {picker.sourceHandle ? `（${picker.sourceHandle.replace('opt-', '選項 ')}）` : ''}
        可連接下列類型
      </p>

      <section className="connect-picker__section">
        <h3>新增並連接</h3>
        <div className="connect-picker__kinds">
          {allowedKinds.map((kind) => (
            <button
              key={kind}
              type="button"
              className="connect-picker__kind"
              onClick={() => createAndConnectFromPicker(kind)}
            >
              + {KIND_LABEL[kind]}
            </button>
          ))}
          {allowedKinds.length === 0 && (
            <p className="connect-picker__empty">此節點無法再往下連接</p>
          )}
        </div>
      </section>

      <section className="connect-picker__section">
        <h3>畫布上現有節點</h3>
        {candidates.length === 0 ? (
          <p className="connect-picker__empty">目前沒有可接的現有節點</p>
        ) : (
          <ul className="connect-picker__list">
            {candidates.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => connectFromPicker(c.id)}
                >
                  <span className="kind">{KIND_LABEL[c.kind]}</span>
                  <span className="label">{c.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
