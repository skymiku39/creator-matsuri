import type { BoothMeta, CharacterDef, DialogueNodeData } from './types'

/** 正規化人物清單（去空名、補 id） */
export function normalizeCharacters(raw: unknown): CharacterDef[] {
  if (!Array.isArray(raw)) return []
  const out: CharacterDef[] = []
  const used = new Set<string>()
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const name = String(o.name ?? '').trim()
    if (!name) continue
    let id = String(o.id ?? '').trim() || `char_${out.length + 1}`
    if (used.has(id)) id = `${id}_${out.length + 1}`
    used.add(id)
    const note = String(o.note ?? '').trim()
    out.push(note ? { id, name, note } : { id, name })
  }
  return out
}

/** 產生不重複的人物 id */
export function nextCharacterId(characters: CharacterDef[]): string {
  let n = characters.length + 1
  const used = new Set(characters.map((c) => c.id))
  while (used.has(`char_${n}`)) n += 1
  return `char_${n}`
}

/**
 * 解析實際顯示的說話者名稱。
 * 優先序：節點自訂名稱 → 人物設定 → 攤位預設 → 攤位名推導 → fallback
 */
export function resolveSpeakerName(
  meta: Pick<BoothMeta, 'speakerName' | 'boothName' | 'characters'>,
  data?: Pick<DialogueNodeData, 'speakerId' | 'speakerName'> | null,
  fallback = 'NPC',
): string {
  const custom = data?.speakerName?.trim()
  if (custom) return custom

  const speakerId = data?.speakerId?.trim()
  if (speakerId) {
    const found = meta.characters?.find((c) => c.id === speakerId)
    const fromRoster = found?.name?.trim()
    if (fromRoster) return fromRoster
  }

  return (
    meta.speakerName?.trim() ||
    meta.boothName?.replace(/攤位$/, '').trim() ||
    fallback
  )
}

/** 節點是否覆寫了預設說話者 */
export function hasSpeakerOverride(
  data?: Pick<DialogueNodeData, 'speakerId' | 'speakerName'> | null,
): boolean {
  return Boolean(data?.speakerName?.trim() || data?.speakerId?.trim())
}
