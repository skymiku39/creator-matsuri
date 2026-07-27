import {
  nextCharacterId,
  resolveSpeakerName,
} from '../domain/speaker'
import type { CharacterDef } from '../domain/types'
import { useDialogueStore } from '../store/useDialogueStore'

/** 編輯專案層人物設定表 */
export function CharacterRoster() {
  const meta = useDialogueStore((s) => s.meta)
  const setMeta = useDialogueStore((s) => s.setMeta)
  const characters = meta.characters ?? []

  const setCharacters = (next: CharacterDef[]) => {
    setMeta({ characters: next })
  }

  const addCharacter = () => {
    const id = nextCharacterId(characters)
    setCharacters([...characters, { id, name: `人物${characters.length + 1}` }])
  }

  const updateCharacter = (id: string, patch: Partial<CharacterDef>) => {
    setCharacters(
      characters.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    )
  }

  const removeCharacter = (id: string) => {
    setCharacters(characters.filter((c) => c.id !== id))
  }

  const defaultLabel = resolveSpeakerName(meta, null)

  return (
    <div className="character-roster">
      <h3>人物設定</h3>
      <p className="panel-lead panel-lead--tight">
        預設說話者：{defaultLabel}
        。對話節點可改引用下方人物。
      </p>

      <label className="field">
        <span>預設說話者</span>
        <input
          value={meta.speakerName ?? ''}
          placeholder="例：攤位店員"
          onChange={(e) => setMeta({ speakerName: e.target.value })}
        />
      </label>

      <ul className="character-list">
        {characters.map((c) => (
          <li key={c.id} className="character-list__item">
            <input
              className="character-list__name"
              value={c.name}
              aria-label="人物名稱"
              onChange={(e) => updateCharacter(c.id, { name: e.target.value })}
            />
            <input
              className="character-list__note"
              value={c.note ?? ''}
              placeholder="人設備註（選填）"
              aria-label="人物備註"
              onChange={(e) =>
                updateCharacter(c.id, {
                  note: e.target.value.trim() ? e.target.value : undefined,
                })
              }
            />
            <button
              type="button"
              className="character-list__remove"
              onClick={() => removeCharacter(c.id)}
            >
              刪除
            </button>
          </li>
        ))}
      </ul>

      <button type="button" className="ghost-btn" onClick={addCharacter}>
        新增人物
      </button>
    </div>
  )
}
