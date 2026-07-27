import { describe, expect, it } from 'vitest'
import {
  hasSpeakerOverride,
  nextCharacterId,
  normalizeCharacters,
  resolveSpeakerName,
} from './speaker'

describe('resolveSpeakerName', () => {
  const meta = {
    boothName: '01攤位',
    speakerName: '預設店員',
    characters: [
      { id: 'char_1', name: 'Mirai' },
      { id: 'char_2', name: '訪客', note: '玩家' },
    ],
  }

  it('預設使用 meta.speakerName', () => {
    expect(resolveSpeakerName(meta, null)).toBe('預設店員')
  })

  it('可依 speakerId 引用人物設定', () => {
    expect(resolveSpeakerName(meta, { speakerId: 'char_1' })).toBe('Mirai')
  })

  it('本句自訂名稱優先於人物與預設', () => {
    expect(
      resolveSpeakerName(meta, {
        speakerId: 'char_1',
        speakerName: '臨時NPC',
      }),
    ).toBe('臨時NPC')
  })

  it('找不到人物時回退預設', () => {
    expect(resolveSpeakerName(meta, { speakerId: 'missing' })).toBe('預設店員')
  })
})

describe('normalizeCharacters / nextCharacterId', () => {
  it('略過空名稱並補 id', () => {
    expect(
      normalizeCharacters([
        { name: 'A' },
        { id: 'x', name: '  ' },
        { id: 'x', name: 'B' },
        { id: 'x', name: 'C' },
      ]),
    ).toEqual([
      { id: 'char_1', name: 'A' },
      { id: 'x', name: 'B' },
      { id: 'x_3', name: 'C' },
    ])
  })

  it('產生不重複 id', () => {
    expect(nextCharacterId([{ id: 'char_1', name: 'A' }])).toBe('char_2')
  })
})

describe('hasSpeakerOverride', () => {
  it('偵測覆寫', () => {
    expect(hasSpeakerOverride({})).toBe(false)
    expect(hasSpeakerOverride({ speakerId: 'char_1' })).toBe(true)
    expect(hasSpeakerOverride({ speakerName: 'X' })).toBe(true)
  })
})
