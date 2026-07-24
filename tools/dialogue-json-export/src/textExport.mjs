/**
 * 將編輯器專案 JSON 轉成可讀純文字（依流程走訪，含分支）。
 */

const KIND_LABEL = {
  message: '對話',
  choiceMenu: '選單',
  choice: '選項',
  url: '連結',
  end: '結束',
}

function nodeText(n) {
  const d = n.data ?? {}
  const title = String(d.title ?? '').trim()
  const text = String(d.text ?? '').trim()
  const note = String(d.note ?? '').trim()
  return { title, text, note, kind: d.kind ?? n.type ?? 'message' }
}

function childrenOf(id, edges) {
  return edges
    .filter((e) => e.source === id)
    .sort((a, b) =>
      String(a.sourceHandle ?? a.id).localeCompare(String(b.sourceHandle ?? b.id)),
    )
}

/**
 * @param {{ meta: object, nodes: object[], edges: object[] }} project
 * @returns {string}
 */
export function projectToPlainText(project) {
  const { meta, nodes, edges } = project
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const targets = new Set(edges.map((e) => e.target))
  const roots = nodes.filter((n) => !targets.has(n.id))

  const lines = []
  lines.push(`# ${meta.boothName || meta.boothId || '未命名攤位'}`)
  lines.push(`攤位編號：${meta.boothId ?? ''}`)
  if (meta.speakerName) lines.push(`說話者：${meta.speakerName}`)
  lines.push(`語系：${meta.locale ?? 'zh_TW'}`)
  lines.push('')
  lines.push('---')
  lines.push('')

  const visited = new Set()

  function walk(nodeId, depth, prefix) {
    if (!nodeId || visited.has(nodeId)) {
      if (nodeId && visited.has(nodeId)) {
        lines.push(`${prefix}（↩ 回到已出現的節點 ${nodeId}）`)
      }
      return
    }
    visited.add(nodeId)
    const node = byId.get(nodeId)
    if (!node) return

    const { title, text, note, kind } = nodeText(node)
    const pad = prefix
    const label = KIND_LABEL[kind] ?? kind
    const head = title || text || nodeId
    lines.push(`${pad}【${label}】${head}`)
    if (text && text !== title) {
      lines.push(`${pad}  ${text}`)
    }
    if (note) {
      lines.push(`${pad}  〔備註〕${note}`)
    }

    const outs = childrenOf(nodeId, edges)
    if (outs.length === 0) {
      lines.push(`${pad}  → （無後續）`)
      lines.push('')
      return
    }

    if (kind === 'choiceMenu' || outs.length > 1) {
      lines.push('')
      outs.forEach((e, i) => {
        const letter =
          e.sourceHandle?.match(/^opt-([A-F])$/i)?.[1]?.toUpperCase() ??
          e.label ??
          String.fromCharCode(65 + i)
        const child = byId.get(e.target)
        const childLabel = child
          ? nodeText(child).text || nodeText(child).title || e.target
          : e.target
        lines.push(`${pad}  ├─ 分支 ${letter}：${childLabel}`)
        walk(e.target, depth + 1, `${pad}  │   `)
      })
      lines.push('')
      return
    }

    lines.push('')
    walk(outs[0].target, depth + 1, pad)
  }

  if (roots.length === 0 && nodes.length > 0) {
    walk(nodes[0].id, 0, '')
  } else {
    for (const r of roots) {
      walk(r.id, 0, '')
    }
  }

  // 未走到的孤立節點
  const orphans = nodes.filter((n) => !visited.has(n.id))
  if (orphans.length > 0) {
    lines.push('---')
    lines.push('')
    lines.push('## 未連上主幹的節點')
    lines.push('')
    for (const n of orphans) {
      const { title, text, kind } = nodeText(n)
      lines.push(`- 【${KIND_LABEL[kind] ?? kind}】${title || text || n.id}`)
      if (text && text !== title) lines.push(`  ${text}`)
    }
  }

  return lines.join('\n').trimEnd() + '\n'
}
