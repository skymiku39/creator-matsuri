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
  const select = useDialogueStore((s) => s.select)

  const onSelectionChange = useCallback(
    ({ nodes: selected }: { nodes: { id: string }[] }) => {
      select(selected[0]?.id ?? null)
    },
    [select],
  )

  const isValidConnection = useCallback(
    (connection: Connection | { source: string | null; target: string | null }) => {
      const source = nodes.find((n) => n.id === connection.source)
      const target = nodes.find((n) => n.id === connection.target)
      if (!source || !target) return false
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
        proOptions={proOptions}
        deleteKeyCode={['Backspace', 'Delete']}
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
