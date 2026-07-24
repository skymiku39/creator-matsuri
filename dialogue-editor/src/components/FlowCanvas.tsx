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
import { canConnectKinds } from '../domain/connectionRules'
import { ConnectPicker } from './ConnectPicker'
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

export function FlowCanvas() {
  const nodes = useDialogueStore((s) => s.nodes)
  const edges = useDialogueStore((s) => s.edges)
  const onNodesChange = useDialogueStore((s) => s.onNodesChange)
  const onEdgesChange = useDialogueStore((s) => s.onEdgesChange)
  const onConnect = useDialogueStore((s) => s.onConnect)

  const onSelectionChange = useCallback(
    ({ nodes: selected }: { nodes: { id: string }[] }) => {
      const id = selected[0]?.id ?? null
      useDialogueStore.setState({ selectedId: id })
    },
    [],
  )

  const isValidConnection = useCallback(
    (connection: Connection | { source: string | null; target: string | null }) => {
      if (!connection.source) return false
      if (!connection.target) return true

      const source = nodes.find((n) => n.id === connection.source)
      const target = nodes.find((n) => n.id === connection.target)
      if (!source || !target) return false
      if (source.id === target.id) return false
      return canConnectKinds(source.data.kind, target.data.kind)
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
      <ConnectPicker />
    </div>
  )
}
