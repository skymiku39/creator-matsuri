import { create } from 'zustand'
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react'
import type { BoothMeta, DialogueNodeData, DialogueNodeKind } from '../domain/types'
import type { FlowNode } from '../domain/exportCsv'
import { rowsToFlow } from '../domain/rowsToFlow'
import type { ParsedTemplate } from '../domain/importCsv'

let idCounter = 1
export function nextId(prefix: string) {
  idCounter += 1
  return `${prefix}_${idCounter}`
}

const defaultMeta: BoothMeta = {
  boothId: '01',
  boothName: '01攤位',
  locale: 'zh_TW',
}

function starterFlow(): { nodes: FlowNode[]; edges: Edge[] } {
  const m1: FlowNode = {
    id: 'msg_1',
    type: 'message',
    position: { x: 120, y: 60 },
    data: {
      kind: 'message',
      title: '開場01',
      text: '「你好啊~」',
      note: '',
    },
  }
  const m2: FlowNode = {
    id: 'msg_2',
    type: 'message',
    position: { x: 120, y: 180 },
    data: {
      kind: 'message',
      title: '開場02',
      text: '「那麼關於本次活動你想問什麼呢？」',
      note: '',
    },
  }
  const menu: FlowNode = {
    id: 'menu_1',
    type: 'choiceMenu',
    position: { x: 120, y: 300 },
    data: {
      kind: 'choiceMenu',
      title: '對話選項',
      text: '',
      note: '建議包含返回選項',
    },
  }
  const choice: FlowNode = {
    id: 'choice_1',
    type: 'choice',
    position: { x: 420, y: 300 },
    data: {
      kind: 'choice',
      title: '選項A',
      text: '新選項',
      note: '',
      isReturn: false,
    },
  }
  return {
    nodes: [m1, m2, menu, choice],
    edges: [
      { id: 'e_1', source: 'msg_1', target: 'msg_2' },
      { id: 'e_2', source: 'msg_2', target: 'menu_1' },
      { id: 'e_3', source: 'menu_1', target: 'choice_1', sourceHandle: 'opt-A' },
    ],
  }
}

interface DialogueState {
  meta: BoothMeta
  nodes: FlowNode[]
  edges: Edge[]
  selectedId: string | null
  setMeta: (patch: Partial<BoothMeta>) => void
  onNodesChange: (changes: NodeChange<FlowNode>[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  select: (id: string | null) => void
  updateNodeData: (id: string, patch: Partial<DialogueNodeData>) => void
  addNode: (kind: DialogueNodeKind) => void
  removeSelected: () => void
  loadFromParsed: (parsed: ParsedTemplate) => void
  loadProject: (meta: BoothMeta, nodes: FlowNode[], edges: Edge[]) => void
  resetStarter: () => void
}

const initial = starterFlow()

export const useDialogueStore = create<DialogueState>((set, get) => ({
  meta: defaultMeta,
  nodes: initial.nodes,
  edges: initial.edges,
  selectedId: null,

  setMeta: (patch) => set({ meta: { ...get().meta, ...patch } }),

  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) as FlowNode[] }),

  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),

  onConnect: (connection) =>
    set({ edges: addEdge({ ...connection, id: nextId('e') }, get().edges) }),

  select: (id) => set({ selectedId: id }),

  updateNodeData: (id, patch) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
    }),

  addNode: (kind) => {
    const defaults: Record<DialogueNodeKind, DialogueNodeData> = {
      message: {
        kind: 'message',
        title: '新對話',
        text: '「……」',
        note: '',
      },
      choiceMenu: {
        kind: 'choiceMenu',
        title: '對話選項',
        text: '',
        note: '建議包含返回選項',
      },
      choice: {
        kind: 'choice',
        title: '新選項',
        text: '選項文字',
        note: '',
        isReturn: false,
      },
      url: {
        kind: 'url',
        title: '超連結',
        text: 'https://',
        note: '此為超連結',
      },
      end: {
        kind: 'end',
        title: '結束／返回',
        text: '',
        note: '',
      },
    }
    const id = nextId(kind)
    const node: FlowNode = {
      id,
      type: kind,
      position: {
        x: 160 + Math.random() * 240,
        y: 80 + Math.random() * 280,
      },
      data: defaults[kind],
    }
    set({ nodes: [...get().nodes, node], selectedId: id })
  },

  removeSelected: () => {
    const id = get().selectedId
    if (!id) return
    set({
      nodes: get().nodes.filter((n) => n.id !== id),
      edges: get().edges.filter((e) => e.source !== id && e.target !== id),
      selectedId: null,
    })
  },

  loadFromParsed: (parsed) => {
    const { nodes, edges } = rowsToFlow(parsed)
    set({
      meta: {
        boothId: parsed.boothId,
        boothName: parsed.boothName,
        locale: parsed.locale,
      },
      nodes,
      edges,
      selectedId: null,
    })
  },

  loadProject: (meta, nodes, edges) =>
    set({ meta, nodes, edges, selectedId: null }),

  resetStarter: () => {
    const flow = starterFlow()
    set({
      meta: defaultMeta,
      nodes: flow.nodes,
      edges: flow.edges,
      selectedId: null,
    })
  },
}))
