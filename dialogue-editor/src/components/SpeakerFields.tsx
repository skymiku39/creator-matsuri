import { resolveSpeakerName } from '../domain/speaker'
import type { DialogueNodeData } from '../domain/types'
import { useDialogueStore } from '../store/useDialogueStore'

type Props = {
  nodeId: string
  data: DialogueNodeData
}

/** 節點說話者：預設／人物設定／本句自訂 */
export function SpeakerFields({ nodeId, data }: Props) {
  const meta = useDialogueStore((s) => s.meta)
  const updateNodeData = useDialogueStore((s) => s.updateNodeData)
  const characters = meta.characters ?? []
  const defaultName = resolveSpeakerName(meta, null)

  const mode = data.speakerName?.trim()
    ? 'custom'
    : data.speakerId?.trim()
      ? 'roster'
      : 'default'

  const selectValue =
    mode === 'custom' ? '__custom__' : mode === 'roster' ? data.speakerId! : ''

  const onSelect = (value: string) => {
    if (value === '') {
      updateNodeData(nodeId, { speakerId: undefined, speakerName: undefined })
      return
    }
    if (value === '__custom__') {
      updateNodeData(nodeId, {
        speakerId: undefined,
        speakerName: data.speakerName?.trim() || defaultName,
      })
      return
    }
    updateNodeData(nodeId, { speakerId: value, speakerName: undefined })
  }

  return (
    <div className="speaker-fields">
      <label className="field">
        <span>說話者</span>
        <select value={selectValue} onChange={(e) => onSelect(e.target.value)}>
          <option value="">預設（{defaultName}）</option>
          {characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.note ? `｜${c.note}` : ''}
            </option>
          ))}
          <option value="__custom__">本句自訂…</option>
        </select>
      </label>
      {mode === 'custom' && (
        <label className="field">
          <span>自訂名稱</span>
          <input
            value={data.speakerName ?? ''}
            placeholder={defaultName}
            onChange={(e) =>
              updateNodeData(nodeId, {
                speakerName: e.target.value,
                speakerId: undefined,
              })
            }
          />
        </label>
      )}
      <p className="panel-hint">
        目前顯示：{resolveSpeakerName(meta, data)}
      </p>
    </div>
  )
}
