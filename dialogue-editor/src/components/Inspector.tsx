import { useDialogueStore } from '../store/useDialogueStore'

export function Inspector() {
  const selectedId = useDialogueStore((s) => s.selectedId)
  const nodes = useDialogueStore((s) => s.nodes)
  const updateNodeData = useDialogueStore((s) => s.updateNodeData)
  const node = nodes.find((n) => n.id === selectedId)

  if (!node) {
    return (
      <aside className="panel inspector">
        <h2>屬性</h2>
        <p className="panel-lead">選取畫布上的節點以編輯台詞與備註。</p>
      </aside>
    )
  }

  const d = node.data

  return (
    <aside className="panel inspector">
      <h2>屬性</h2>
      <p className="kind-tag">{labelOf(d.kind)}</p>

      <label className="field">
        <span>標題／說明</span>
        <input
          value={d.title}
          onChange={(e) => updateNodeData(node.id, { title: e.target.value })}
        />
      </label>

      {d.kind !== 'choiceMenu' && d.kind !== 'end' && (
        <label className="field">
          <span>{d.kind === 'url' ? 'URL' : d.kind === 'choice' ? '選項文字' : '台詞 (zh_TW)'}</span>
          <textarea
            rows={d.kind === 'url' ? 2 : 5}
            value={d.text}
            onChange={(e) => updateNodeData(node.id, { text: e.target.value })}
          />
        </label>
      )}

      <label className="field">
        <span>備註</span>
        <textarea
          rows={3}
          value={d.note}
          placeholder="例：頭上要顯示「問號」氣泡"
          onChange={(e) => updateNodeData(node.id, { note: e.target.value })}
        />
      </label>

      {d.kind === 'choice' && (
        <label className="check-field">
          <input
            type="checkbox"
            checked={Boolean(d.isReturn)}
            onChange={(e) =>
              updateNodeData(node.id, { isReturn: e.target.checked })
            }
          />
          <span>標記為返回／離開選項</span>
        </label>
      )}
    </aside>
  )
}

function labelOf(kind: string) {
  switch (kind) {
    case 'message':
      return '對話訊息'
    case 'choiceMenu':
      return '選項選單'
    case 'choice':
      return '選項分支'
    case 'url':
      return '超連結'
    case 'end':
      return '結束'
    default:
      return kind
  }
}
