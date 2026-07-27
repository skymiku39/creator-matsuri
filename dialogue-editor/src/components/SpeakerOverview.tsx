import { resolveSpeakerName } from '../domain/speaker'
import { useDialogueStore } from '../store/useDialogueStore'

type Props = {
  onManageCharacters: () => void
}

/** 未選節點時：快速預覽人物＋入口 */
export function SpeakerOverview({ onManageCharacters }: Props) {
  const meta = useDialogueStore((s) => s.meta)
  const characters = meta.characters ?? []
  const defaultName = resolveSpeakerName(meta, null)

  return (
    <div className="speaker-overview">
      <h3>多人發言</h3>
      <p className="panel-lead panel-lead--tight">
        預設：{defaultName}
        {characters.length > 0
          ? `　｜　已建立 ${characters.length} 位人物`
          : '　｜　尚未建立人物'}
      </p>
      <div className="speaker-chips">
        <span className="speaker-chip is-active">預設｜{defaultName}</span>
        {characters.map((c, i) => (
          <span key={c.id} className={`speaker-chip tone-${i % 5}`}>
            {c.name}
          </span>
        ))}
      </div>
      <button
        type="button"
        className="primary speaker-overview__btn"
        onClick={onManageCharacters}
      >
        {characters.length === 0 ? '建立人物名單' : '管理人物'}
      </button>
      <p className="panel-hint">
        選取對話節點後，點說話者晶片即可切換；多選可一次套用。
      </p>
    </div>
  )
}
