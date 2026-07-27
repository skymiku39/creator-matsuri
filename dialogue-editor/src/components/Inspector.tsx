import { useMemo, useState } from 'react'
import { useDialogueStore } from '../store/useDialogueStore'
import {
  canConnectKinds,
  KIND_LABEL,
} from '../domain/connectionRules'
import { CHOICE_LETTERS } from '../domain/types'
import {
  incomingEdges,
  nodeLabel,
  outgoingEdges,
} from '../domain/linearSegment'
import { CharacterManageModal } from './CharacterManageModal'
import { SpeakerFields } from './SpeakerFields'
import { SpeakerOverview } from './SpeakerOverview'

export function Inspector() {
  const [charsOpen, setCharsOpen] = useState(false)
  const selectedId = useDialogueStore((s) => s.selectedId)
  const nodes = useDialogueStore((s) => s.nodes)
  const edges = useDialogueStore((s) => s.edges)
  const updateNodeData = useDialogueStore((s) => s.updateNodeData)
  const setIncoming = useDialogueStore((s) => s.setIncoming)
  const setOutgoing = useDialogueStore((s) => s.setOutgoing)
  const node = nodes.find((n) => n.id === selectedId)

  const selectedSpeakableIds = useMemo(
    () =>
      nodes
        .filter(
          (n) =>
            n.selected &&
            (n.data.kind === 'message' || n.data.kind === 'url'),
        )
        .map((n) => n.id),
    [nodes],
  )

  const parentEdge = useMemo(() => {
    if (!node) return null
    return incomingEdges(node.id, edges)[0] ?? null
  }, [node, edges])

  const childEdges = useMemo(() => {
    if (!node) return []
    return outgoingEdges(node.id, edges)
  }, [node, edges])

  const prevCandidates = useMemo(() => {
    if (!node) return []
    return nodes.filter(
      (n) =>
        n.id !== node.id && canConnectKinds(n.data.kind, node.data.kind),
    )
  }, [node, nodes])

  const nextCandidates = useMemo(() => {
    if (!node) return []
    return nodes.filter(
      (n) =>
        n.id !== node.id && canConnectKinds(node.data.kind, n.data.kind),
    )
  }, [node, nodes])

  const openChars = () => setCharsOpen(true)

  if (!node) {
    return (
      <aside className="panel inspector">
        <h2>屬性</h2>
        <p className="panel-lead">選取畫布上的節點以編輯台詞與備註。</p>
        <SpeakerOverview onManageCharacters={openChars} />
        <p className="panel-hint">
          <kbd>Ctrl</kbd> 多選　
          <kbd>Shift</kbd> 同線兩點區間　
          <kbd>Ctrl</kbd>+<kbd>Z</kbd>/<kbd>Y</kbd> 復原重做
        </p>
        <CharacterManageModal
          open={charsOpen}
          onClose={() => setCharsOpen(false)}
        />
      </aside>
    )
  }

  const d = node.data
  const speakerTargets =
    selectedSpeakableIds.length > 0
      ? selectedSpeakableIds
      : d.kind === 'message' || d.kind === 'url'
        ? [node.id]
        : []

  const speakerData =
    nodes.find((n) => n.id === speakerTargets[0])?.data ?? d

  const applyIncoming = (parentId: string) => {
    const err = setIncoming(node.id, parentId || null)
    if (err) alert(err)
  }

  const applyOutgoing = (childId: string, handle?: string) => {
    const err = setOutgoing(node.id, childId || null, handle)
    if (err) alert(err)
  }

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
          <span>
            {d.kind === 'url'
              ? 'URL'
              : d.kind === 'choice'
                ? '選項文字'
                : '台詞 (zh_TW)'}
          </span>
          <textarea
            rows={d.kind === 'url' ? 2 : 5}
            value={d.text}
            onChange={(e) => updateNodeData(node.id, { text: e.target.value })}
          />
        </label>
      )}

      {speakerTargets.length > 0 && (
        <SpeakerFields
          targetIds={speakerTargets}
          data={speakerData}
          onManageCharacters={openChars}
        />
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

      <div className="link-editor">
        <h3>連線</h3>

        <label className="field">
          <span>上一個（前驅）</span>
          <select
            value={parentEdge?.source ?? ''}
            onChange={(e) => applyIncoming(e.target.value)}
          >
            <option value="">（無）</option>
            {prevCandidates.map((n) => (
              <option key={n.id} value={n.id}>
                [{KIND_LABEL[n.data.kind]}] {nodeLabel(n)}
              </option>
            ))}
          </select>
        </label>

        {d.kind === 'choiceMenu' ? (
          <div className="menu-outs">
            <span className="field-label">下一個（選項 A–F）</span>
            {CHOICE_LETTERS.map((letter) => {
              const handle = `opt-${letter}`
              const edge = childEdges.find((e) => e.sourceHandle === handle)
              const choiceCandidates = nodes.filter(
                (n) => n.id !== node.id && n.data.kind === 'choice',
              )
              return (
                <label key={letter} className="field field--compact">
                  <span>{letter}</span>
                  <select
                    value={edge?.target ?? ''}
                    onChange={(e) => applyOutgoing(e.target.value, handle)}
                  >
                    <option value="">（無）</option>
                    {choiceCandidates.map((n) => (
                      <option key={n.id} value={n.id}>
                        {nodeLabel(n)}
                      </option>
                    ))}
                  </select>
                </label>
              )
            })}
          </div>
        ) : d.kind !== 'end' ? (
          <label className="field">
            <span>下一個（後繼）</span>
            <select
              value={childEdges[0]?.target ?? ''}
              onChange={(e) => applyOutgoing(e.target.value)}
            >
              <option value="">（無）</option>
              {nextCandidates.map((n) => (
                <option key={n.id} value={n.id}>
                  [{KIND_LABEL[n.data.kind]}] {nodeLabel(n)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="panel-hint">結束節點沒有後繼。</p>
        )}
      </div>

      <p className="panel-hint">
        <kbd>Ctrl</kbd>+<kbd>Z</kbd> 復原　
        <kbd>Ctrl</kbd>+<kbd>Y</kbd>／
        <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> 重做
      </p>
      <CharacterManageModal
        open={charsOpen}
        onClose={() => setCharsOpen(false)}
      />
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
