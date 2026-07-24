/** 獨立 id 工廠，避免 domain ↔ store 循環依賴 */
let idCounter = 1000

export function nextId(prefix: string) {
  idCounter += 1
  return `${prefix}_${idCounter}`
}

export function syncIdCounterFromGraph(
  nodes: { id: string }[],
  edges: { id: string }[],
) {
  let max = idCounter
  const consider = (id: string) => {
    const m = id.match(/_(\d+)$/)
    if (m) max = Math.max(max, Number(m[1]))
  }
  for (const n of nodes) consider(n.id)
  for (const e of edges) consider(e.id)
  idCounter = max
}

export function peekIdCounter() {
  return idCounter
}
