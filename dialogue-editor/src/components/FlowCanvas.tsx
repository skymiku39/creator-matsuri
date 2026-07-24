import { useCallback, useMemo } from 'react'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Connection,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useDialogueStore } from '../store/useDialogueStore'
import type { DialogueNodeKind } from '../domain/types'
import {
  ChoiceMenuNode,
  ChoiceNode,
  EndNode,
  MessageNode,
  UrlNode,
} from './nodes/DialogueNodes'

const nodeTypes: NodeTypes = {
  message: MessageNode,
  choiceMenu: ChoiceMenuNode,
  choice: ChoiceNode,
  url: UrlNode,
  end: EndNode,
}

const ALLOWED: Record<DialogueNodeKind, DialogueNodeKind[]> = {
  message: ['message', 'choiceMenu', 'url', 'end'],
  choiceMenu: ['choice'],
  choice: ['message', 'url', 'end'],
  url: ['message', 'url', 'end'],
  end: [],
}

export function FlowCanvas() {
  const nodes = useDialogueStore((s) => s.nodes)
  const edges = useDialogueStore((s) => s.edges)
  const onNodesChange = useDialogueStore((s) => s.onNodesChange)
  const onEdgesChange = useDialogueStore((s) => s.onEdgesChange)
  const onConnect = useDialogueStore((s) => s.onConnect)
  const onSelectionChange = useCallback(
    ({ nodes: selected }: { nodes: { id: string }[] }) => {
      // 只同步 selectedId，不要重寫 nodes（否則會打斷拖曳／連線）
      const id = selected[0]?.id ?? null
      useDialogueStore.setState({ selectedId: id })
    },
    [],
  )

  const isValidConnection = useCallback(
    (connection: Connection | { source: string | null; target: string | null }) => {
      // 拖線過程中尚未碰到目標時 target 為 null，必須允許，否則「拉不出線」
      if (!connection.source) return false
      if (!connection.target) return true

      const source = nodes.find((n) => n.id === connection.source)
      const target = nodes.find((n) => n.id === connection.target)
      if (!source || !target) return false
      if (source.id === target.id) return false
      const sk = source.data.kind
      const tk = target.data.kind
      return ALLOWED[sk]?.includes(tk) ?? false
    },
    [nodes],
  )

  const proOptions = useMemo(() => ({ hideAttribution: true }), [])

  return (
    <div className="canvas-wrap">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable
        nodesConnectable
        elementsSelectable
        proOptions={proOptions}
        deleteKeyCode={['Backspace', 'Delete']}
        connectionRadius={28}
      >
        <Background gap={22} size={1} color="rgba(40, 52, 48, 0.12)" />
        <Controls />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => {
            switch (n.type) {
              case 'message':
                return '#2f6f5e'
              case 'choiceMenu':
                return '#b45309'
              case 'choice':
                return '#1d4e89'
              case 'url':
                return '#9a3412'
              case 'end':
                return '#57534e'
              default:
                return '#78716c'
            }
          }}
        />
      </ReactFlow>
    </div>
  )
}
