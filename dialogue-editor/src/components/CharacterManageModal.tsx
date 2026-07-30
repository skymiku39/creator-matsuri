import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  nextCharacterId,
  resolveSpeakerName,
} from '../domain/speaker'
import type { CharacterDef } from '../domain/types'
import { useBackdropDismiss } from '../hooks/useBackdropDismiss'
import { useDialogueStore } from '../store/useDialogueStore'

type Props = {
  open: boolean
  onClose: () => void
}

/** 獨立人物管理面板：新增／改名／刪除，供多人發言切換 */
export function CharacterManageModal({ open, onClose }: Props) {
  const meta = useDialogueStore((s) => s.meta)
  const setMeta = useDialogueStore((s) => s.setMeta)
  const removeCharacter = useDialogueStore((s) => s.removeCharacter)
  const characters = meta.characters ?? []
  const defaultLabel = resolveSpeakerName(meta, null)
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const backdrop = useBackdropDismiss({ open, onClose })

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [open])

  if (!open) return null

  const setCharacters = (next: CharacterDef[]) => {
    setMeta({ characters: next })
  }

  const addCharacter = () => {
    const id = nextCharacterId(characters)
    setCharacters([
      ...characters,
      { id, name: `人物${characters.length + 1}` },
    ])
  }

  const updateCharacter = (id: string, patch: Partial<CharacterDef>) => {
    setCharacters(
      characters.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    )
  }

  return createPortal(
    <div
      className="modal-backdrop"
      role="presentation"
      onPointerDown={backdrop.onPointerDown}
      onClick={backdrop.onClick}
    >
      <div
        className="modal-card character-modal"
        role="dialog"
        aria-modal
        aria-labelledby="character-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-card__head">
          <h2 id="character-modal-title">人物設定</h2>
          <button type="button" className="ghost-btn" onClick={onClose}>
            完成
          </button>
        </header>

        <p className="panel-lead">
          在此新增與改名角色；變更會立刻套用，按「完成」或 Esc
          即可關閉（點背景空白處也可關，拖曳選取文字不會誤關）。
          編輯台詞時點說話者晶片即可切換；未指定人物時使用預設「
          {defaultLabel}」。
        </p>

        <label className="field">
          <span>預設說話者（未指定人物時）</span>
          <input
            ref={firstFieldRef}
            value={meta.speakerName ?? ''}
            placeholder="例：攤位店員"
            onChange={(e) => setMeta({ speakerName: e.target.value })}
          />
        </label>

        <ul className="character-list">
          {characters.length === 0 && (
            <li className="character-list__empty">
              尚未新增人物。例如：店員、訪客、旁白。
            </li>
          )}
          {characters.map((c, i) => (
            <li key={c.id} className="character-list__item">
              <span
                className={`speaker-chip-swatch tone-${i % 5}`}
                aria-hidden
              />
              <div className="character-list__fields">
                <input
                  className="character-list__name"
                  value={c.name}
                  aria-label="人物名稱"
                  placeholder="名稱（勿留空）"
                  onChange={(e) =>
                    updateCharacter(c.id, { name: e.target.value })
                  }
                />
                <input
                  className="character-list__note"
                  value={c.note ?? ''}
                  placeholder="人設備註（選填）"
                  aria-label="人物備註"
                  onChange={(e) =>
                    updateCharacter(c.id, { note: e.target.value })
                  }
                />
              </div>
              <button
                type="button"
                className="character-list__remove"
                onClick={() => {
                  if (
                    confirm(
                      '刪除此人物？已引用的台詞會改回預設說話者。',
                    )
                  ) {
                    removeCharacter(c.id)
                  }
                }}
              >
                刪除
              </button>
            </li>
          ))}
        </ul>

        <div className="modal-card__actions">
          <button type="button" className="primary" onClick={addCharacter}>
            新增人物
          </button>
          <button type="button" onClick={onClose}>
            完成
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
