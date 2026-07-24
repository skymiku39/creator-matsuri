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
import type { ConnectPickerState } from './connectPickerTypes'
import { CONNECTION_ALLOWED } from '../domain/connectionRules'
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

function withExclusiveSelection(
  nodes: FlowNode[],
  selectedId: string | null,
): FlowNode[] {
  return nodes.map((n) => ({
    ...n,
    selected: Boolean(selectedId) && n.id === selectedId,
  }))
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
  const choiceA: FlowNode = {
    id: 'choice_1',
    type: 'choice',
    position: { x: 420, y: 200 },
    data: {
      kind: 'choice',
      title: '選項A',
      text: '新選項',
      note: '',
      isReturn: false,
    },
  }
  const choiceAMsg: FlowNode = {
    id: 'msg_3',
    type: 'message',
    position: { x: 420, y: 320 },
    data: {
      kind: 'message',
      title: '選項A內容',
      text: '「……」',
      note: '',
    },
  }
  const choiceE: FlowNode = {
    id: 'choice_2',
    type: 'choice',
    position: { x: 700, y: 200 },
    data: {
      kind: 'choice',
      title: '選項E',
      text: '等一下再過來',
      note: '',
      isReturn: true,
    },
  }
  const choiceEMsg: FlowNode = {
    id: 'msg_4',
    type: 'message',
    position: { x: 700, y: 320 },
    data: {
      kind: 'message',
      title: '選項E內容',
      text: '「好的，等等見。」',
      note: '',
    },
  }
  const endE: FlowNode = {
    id: 'end_1',
    type: 'end',
    position: { x: 700, y: 440 },
    data: {
      kind: 'end',
      title: '結束／返回',
      text: '',
      note: '',
    },
  }
  return {
    nodes: [m1, m2, menu, choiceA, choiceAMsg, choiceE, choiceEMsg, endE],
    edges: [
      { id: 'e_1', source: 'msg_1', target: 'msg_2' },
      { id: 'e_2', source: 'msg_2', target: 'menu_1' },
      {
        id: 'e_3',
        source: 'menu_1',
        target: 'choice_1',
        sourceHandle: 'opt-A',
      },
      { id: 'e_4', source: 'choice_1', target: 'msg_3' },
      {
        id: 'e_5',
        source: 'menu_1',
        target: 'choice_2',
        sourceHandle: 'opt-E',
      },
      { id: 'e_6', source: 'choice_2', target: 'msg_4' },
      { id: 'e_7', source: 'msg_4', target: 'end_1' },
    ],
  }
}

interface DialogueState {
  meta: BoothMeta
  nodes: FlowNode[]
  edges: Edge[]
  selectedId: string | null
  connectPicker: ConnectPickerState | null
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
  openConnectPicker: (state: ConnectPickerState) => void
  closeConnectPicker: () => void
  connectFromPicker: (targetId: string) => void
  createAndConnectFromPicker: (kind: DialogueNodeKind) => void
}

const initial = starterFlow()
syncIdCounterFromGraph(initial.nodes, initial.edges)

export const useDialogueStore = create<DialogueState>((set, get) => ({
  meta: defaultMeta,
  nodes: initial.nodes,
  edges: initial.edges,
  selectedId: null,
  connectPicker: null,

  setMeta: (patch) => {
    const current = get().meta
    const next = { ...current, ...patch }
    if (patch.boothId != null) {
      // 輸入中只留數字，不在此補零（失焦／匯出再 normalize）
      next.boothId = String(patch.boothId).replace(/\D/g, '')
      const prevAuto = `${normalizeBoothId(current.boothId || '01')}攤位`
      if (!patch.boothName && current.boothName === prevAuto && next.boothId) {
        next.boothName = `${normalizeBoothId(next.boothId)}攤位`
      }
    }
    set({ meta: next })
  },

  onNodesChange: (changes) => {
    const nodes = applyNodeChanges(changes, get().nodes) as FlowNode[]
    const selectedFromRf = nodes.find((n) => n.selected)?.id ?? null
    const selectedId = selectedFromRf
    set({ nodes, selectedId })
  },

  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),

  onConnect: (connection) => {
    const { nodes, edges } = get()
    const source = nodes.find((n) => n.id === connection.source)
    if (!source || !connection.target) return

    let nextEdges = edges
    if (source.data.kind === 'choiceMenu') {
      // 同一選項字母只能有一條出邊：取代舊連線
      nextEdges = edges.filter(
        (e) =>
          !(
            e.source === connection.source &&
            e.sourceHandle === connection.sourceHandle
          ),
      )
    } else {
      // 非選單：單出邊，新連線取代舊的
      nextEdges = edges.filter((e) => e.source !== connection.source)
    }

    set({
      edges: addEdge({ ...connection, id: nextId('e') }, nextEdges),
    })
  },

  select: (id) =>
    set({
      selectedId: id,
      nodes: withExclusiveSelection(get().nodes, id),
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
      selected: true,
    }
    set({
      nodes: withExclusiveSelection([...get().nodes, node], id),
      selectedId: id,
    })
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
      connectPicker: null,
    })
  },

  loadProject: (meta, nodes, edges) => {
    syncIdCounterFromGraph(nodes, edges)
    set({
      meta: { ...meta, boothId: normalizeBoothId(meta.boothId) },
      nodes,
      edges,
      selectedId: null,
      connectPicker: null,
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
      connectPicker: null,
    })
  },

  openConnectPicker: (state) => set({ connectPicker: state }),

  closeConnectPicker: () => set({ connectPicker: null }),

  connectFromPicker: (targetId) => {
    const picker = get().connectPicker
    if (!picker) return
    get().onConnect({
      source: picker.sourceId,
      target: targetId,
      sourceHandle: picker.sourceHandle,
      targetHandle: null,
    })
    set({ connectPicker: null })
  },

  createAndConnectFromPicker: (kind) => {
    const picker = get().connectPicker
    if (!picker) return
    if (!CONNECTION_ALLOWED[picker.sourceKind].includes(kind)) return

    const source = get().nodes.find((n) => n.id === picker.sourceId)
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
    const baseX = source?.position.x ?? 160
    const baseY = source?.position.y ?? 80
    const node: FlowNode = {
      id,
      type: kind,
      position: {
        x: baseX + (picker.sourceKind === 'choiceMenu' ? 280 : 0),
        y: baseY + (picker.sourceKind === 'choiceMenu' ? 0 : 140),
      },
      data: defaults[kind],
      selected: true,
    }

    set({
      nodes: withExclusiveSelection([...get().nodes, node], id),
      selectedId: id,
      connectPicker: null,
    })

    get().onConnect({
      source: picker.sourceId,
      target: id,
      sourceHandle: picker.sourceHandle,
      targetHandle: null,
    })
  },
}))
