import { useDialogueStore } from '../store/useDialogueStore'
import type { DialogueNodeKind } from '../domain/types'

const TOOLS: { kind: DialogueNodeKind; label: string; hint: string }[] = [
  { kind: 'message', label: '對話', hint: 'Show Text' },
  { kind: 'choiceMenu', label: '選單', hint: 'Show Choices' },
  { kind: 'choice', label: '選項', hint: '分支入口' },
  { kind: 'url', label: '連結', hint: '開啟 URL' },
  { kind: 'end', label: '結束', hint: '返回／離開' },
]

export function Toolbox() {
  const addNode = useDialogueStore((s) => s.addNode)
  const removeSelected = useDialogueStore((s) => s.removeSelected)
  const selectedId = useDialogueStore((s) => s.selectedId)

  return (
    <aside className="panel toolbox">
      <h2>節點</h2>
      <p className="panel-lead">拖放前先點選加入，再連線組成流程。</p>
      <div className="tool-grid">
        {TOOLS.map((t) => (
          <button
            key={t.kind}
            type="button"
            className="tool-btn"
            onClick={() => addNode(t.kind)}
          >
            <span>{t.label}</span>
            <small>{t.hint}</small>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="danger-btn"
        disabled={!selectedId}
        onClick={removeSelected}
      >
        刪除選取節點
      </button>
    </aside>
  )
}
