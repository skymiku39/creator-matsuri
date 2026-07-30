import { resolveSpeakerName } from '../domain/speaker'
import type { DialogueNodeData } from '../domain/types'
import { useDialogueStore } from '../store/useDialogueStore'

type Props = {
  /** 要套用說話者的節點（單選或多選對話／連結） */
  targetIds: string[]
  /** 用於顯示目前狀態的代表 data（通常是主選節點） */
  data: DialogueNodeData
  onManageCharacters: () => void
}

type Assignment =
  | { type: 'default' }
  | { type: 'roster'; id: string }
  | { type: 'custom' }

/** 一鍵晶片切換說話者；可一次套用到多選節點 */
export function SpeakerFields({
  targetIds,
  data,
  onManageCharacters,
}: Props) {
  const meta = useDialogueStore((s) => s.meta)
  const assignSpeaker = useDialogueStore((s) => s.assignSpeaker)
  const updateNodeData = useDialogueStore((s) => s.updateNodeData)
  const characters = meta.characters ?? []
  const defaultName = resolveSpeakerName(meta, null)
  const current = resolveSpeakerName(meta, data)

  const mode: Assignment = data.speakerName?.trim()
    ? { type: 'custom' }
    : data.speakerId?.trim()
      ? { type: 'roster', id: data.speakerId }
      : { type: 'default' }

  const apply = (next: Assignment) => {
    if (next.type === 'default') {
      assignSpeaker(targetIds, { speakerId: undefined, speakerName: undefined })
      return
    }
    if (next.type === 'roster') {
      assignSpeaker(targetIds, {
        speakerId: next.id,
        speakerName: undefined,
      })
      return
    }
    assignSpeaker(targetIds, {
      speakerId: undefined,
      speakerName: data.speakerName?.trim() || defaultName,
    })
  }

  const onCustomName = (value: string) => {
    for (const id of targetIds) {
      updateNodeData(id, { speakerId: undefined, speakerName: value })
    }
  }

  return (
    <div className="speaker-fields">
      <div className="speaker-fields__head">
        <span>說話者</span>
        <strong>{current}</strong>
        {targetIds.length > 1 && (
          <em className="speaker-fields__batch">
            套用到已選 {targetIds.length} 句
          </em>
        )}
      </div>

      <div className="speaker-chips" role="group" aria-label="切換說話者">
        <button
          type="button"
          className={`speaker-chip${mode.type === 'default' ? ' is-active' : ''}`}
          onClick={() => apply({ type: 'default' })}
          title={`使用預設：${defaultName}`}
        >
          預設
        </button>
        {characters.map((c, i) => (
          <button
            key={c.id}
            type="button"
            className={`speaker-chip tone-${i % 5}${
              mode.type === 'roster' && mode.id === c.id ? ' is-active' : ''
            }`}
            onClick={() => apply({ type: 'roster', id: c.id })}
            title={c.note || c.name}
          >
            {c.name || '未命名'}
          </button>
        ))}
        <button
          type="button"
          className={`speaker-chip speaker-chip--custom${
            mode.type === 'custom' ? ' is-active' : ''
          }`}
          onClick={() => apply({ type: 'custom' })}
        >
          自訂
        </button>
        <button
          type="button"
          className="speaker-chip speaker-chip--manage"
          onClick={onManageCharacters}
        >
          {characters.length === 0 ? '＋新增人物' : '管理人物'}
        </button>
      </div>

      {characters.length === 0 && (
        <p className="panel-hint speaker-fields__hint">
          還沒有人物。按「＋新增人物」建立店員／訪客等，之後點晶片就能切換發言。
          「預設」＝工具列／人物設定裡的預設說話者；「自訂」＝只改本句名稱。
        </p>
      )}
      {characters.length > 0 && mode.type === 'default' && (
        <p className="panel-hint speaker-fields__hint">
          目前用預設「{defaultName}」。點上方人物晶片可改成名單角色；改名請按「管理人物」。
        </p>
      )}

      {mode.type === 'custom' && (
        <label className="field">
          <span>自訂名稱</span>
          <input
            value={data.speakerName ?? ''}
            placeholder={defaultName}
            onChange={(e) => onCustomName(e.target.value)}
          />
        </label>
      )}
    </div>
  )
}
