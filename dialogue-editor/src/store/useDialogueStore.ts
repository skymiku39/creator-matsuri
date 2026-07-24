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
import {
  normalizeBoothId,
  type BoothMeta,
  type DialogueNodeData,
  type DialogueNodeKind,
} from '../domain/types'
import type { FlowNode } from '../domain/exportCsv'
import { rowsToFlow } from '../domain/rowsToFlow'
import type { ParsedTemplate } from '../domain/importCsv'

/** 避免與 starter / 匯入產生的 id 撞名 */
let idCounter = 1000

export function nextId(prefix: string) {
  idCounter += 1
  return `${prefix}_${idCounter}`
}

/** 依現有圖上的數字後綴抬高 counter，避免載入後撞名 */
export function syncIdCounterFromGraph(nodes: FlowNode[], edges: Edge[]) {
  let max = idCounter
  const consider = (id: string) => {
    const m = id.match(/_(\d+)$/)
    if (m) max = Math.max(max, Number(m[1]))
  }
  for (const n of nodes) consider(n.id)
  for (const e of edges) consider(e.id)
  idCounter = max
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
syncIdCounterFromGraph(initial.nodes, initial.edges)

export const useDialogueStore = create<DialogueState>((set, get) => ({
  meta: defaultMeta,
  nodes: initial.nodes,
  edges: initial.edges,
  selectedId: null,

  setMeta: (patch) => {
    const current = get().meta
    const next = { ...current, ...patch }
    if (patch.boothId != null) {
      next.boothId = normalizeBoothId(patch.boothId)
      const autoName = `${normalizeBoothId(current.boothId)}攤位`
      if (!patch.boothName && current.boothName === autoName) {
        next.boothName = `${next.boothId}攤位`
      }
    }
    set({ meta: next })
  },

  onNodesChange: (changes) => {
    const nodes = applyNodeChanges(changes, get().nodes) as FlowNode[]
    const selectedId = get().selectedId
    const stillThere =
      selectedId && nodes.some((n) => n.id === selectedId) ? selectedId : null
    set({ nodes, selectedId: stillThere })
  },

  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),

  onConnect: (connection) =>
    set({ edges: addEdge({ ...connection, id: nextId('e') }, get().edges) }),

  select: (id) =>
    set({
      selectedId: id,
      nodes: get().nodes.map((n) => ({ ...n, selected: Boolean(id) && n.id === id })),
    }),

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
    syncIdCounterFromGraph(nodes, edges)
    set({
      meta: {
        boothId: normalizeBoothId(parsed.boothId),
        boothName: parsed.boothName,
        locale: parsed.locale,
      },
      nodes,
      edges,
      selectedId: null,
    })
  },

  loadProject: (meta, nodes, edges) => {
    syncIdCounterFromGraph(nodes, edges)
    set({
      meta: { ...meta, boothId: normalizeBoothId(meta.boothId) },
      nodes,
      edges,
      selectedId: null,
    })
  },

  resetStarter: () => {
    const flow = starterFlow()
    syncIdCounterFromGraph(flow.nodes, flow.edges)
    set({
      meta: defaultMeta,
      nodes: flow.nodes,
      edges: flow.edges,
      selectedId: null,
    })
  },
}))
