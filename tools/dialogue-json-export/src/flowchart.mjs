/**
 * 以 Graphviz（WASM）排版，splines 曲線避免邊重疊覆蓋，輸出 SVG／PNG。
 */

const KIND_STYLE = {
  message: { fill: '#d8f3e8', stroke: '#2f6f5e', shape: 'box' },
  choiceMenu: { fill: '#ffedd5', stroke: '#b45309', shape: 'box' },
  choice: { fill: '#dbeafe', stroke: '#1d4e89', shape: 'box' },
  url: { fill: '#ffedd5', stroke: '#9a3412', shape: 'box' },
  end: { fill: '#e7e5e4', stroke: '#57534e', shape: 'oval' },
}

function escLabel(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
}

function truncate(s, max = 36) {
  const t = String(s).trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function nodeLabel(n) {
  const d = n.data ?? {}
  const kind = d.kind ?? n.type ?? 'message'
  const title = String(d.title ?? '').trim()
  const text = String(d.text ?? '').trim()
  const kindZh =
    {
      message: '對話',
      choiceMenu: '選單',
      choice: '選項',
      url: '連結',
      end: '結束',
    }[kind] ?? kind

  if (kind === 'choiceMenu') {
    return `${kindZh}\\n${truncate(title || '對話選項', 28)}`
  }
  if (kind === 'end') {
    return `${kindZh}\\n${truncate(title || '結束', 28)}`
  }
  const body = text || title || n.id
  if (title && text && title !== text) {
    return `${kindZh}｜${truncate(title, 16)}\\n${truncate(text, 32)}`
  }
  return `${kindZh}\\n${truncate(body, 36)}`
}

function safeId(id) {
  return `n_${String(id).replace(/[^a-zA-Z0-9_]/g, '_')}`
}

/**
 * @param {{ meta: object, nodes: object[], edges: object[] }} project
 * @returns {string} DOT source
 */
export function projectToDot(project) {
  const { meta, nodes, edges } = project
  const title = escLabel(meta.boothName || `攤位${meta.boothId || ''}`)

  const lines = []
  lines.push('digraph DialogueFlow {')
  lines.push('  graph [')
  lines.push('    rankdir=TB')
  lines.push('    splines=true')
  lines.push('    overlap=false')
  lines.push('    nodesep=0.55')
  lines.push('    ranksep=0.75')
  lines.push('    bgcolor="white"')
  lines.push(`    label="${title}"`)
  lines.push('    labelloc=t')
  lines.push('    fontname="Microsoft JhengHei, Noto Sans TC, sans-serif"')
  lines.push('    fontsize=16')
  lines.push('  ];')
  lines.push('  node [')
  lines.push('    fontname="Microsoft JhengHei, Noto Sans TC, sans-serif"')
  lines.push('    fontsize=11')
  lines.push('    style="filled,rounded"')
  lines.push('    margin="0.18,0.12"')
  lines.push('  ];')
  lines.push('  edge [')
  lines.push('    fontname="Microsoft JhengHei, Noto Sans TC, sans-serif"')
  lines.push('    fontsize=10')
  lines.push('    color="#57534e"')
  lines.push('    arrowsize=0.7')
  lines.push('  ];')
  lines.push('')

  for (const n of nodes) {
    const d = n.data ?? {}
    const kind = d.kind ?? n.type ?? 'message'
    const style = KIND_STYLE[kind] ?? KIND_STYLE.message
    const id = safeId(n.id)
    const label = escLabel(nodeLabel(n))
    lines.push(
      `  ${id} [label="${label}", shape=${style.shape}, fillcolor="${style.fill}", color="${style.stroke}"];`,
    )
  }

  lines.push('')

  for (const e of edges) {
    const src = safeId(e.source)
    const tgt = safeId(e.target)
    const letter =
      e.sourceHandle?.match(/^opt-([A-F])$/i)?.[1]?.toUpperCase() ??
      (typeof e.label === 'string' ? e.label : '')
    if (letter) {
      lines.push(
        `  ${src} -> ${tgt} [label="${escLabel(letter)}", fontsize=11, fontcolor="#1d4e89"];`,
      )
    } else {
      lines.push(`  ${src} -> ${tgt};`)
    }
  }

  lines.push('}')
  return lines.join('\n')
}

/**
 * @param {string} dot
 * @returns {Promise<{ svg: string, png: Buffer }>}
 */
export async function renderDot(dot) {
  const { instance } = await import('@viz-js/viz')
  const viz = await instance()
  const svg = viz.renderString(dot, {
    format: 'svg',
    engine: 'dot',
  })

  const sharp = (await import('sharp')).default
  const png = await sharp(Buffer.from(svg)).png().toBuffer()
  return { svg, png }
}
