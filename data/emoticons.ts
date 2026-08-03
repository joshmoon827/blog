import raw from './emoticons.json'

export type EmoticonItem = {
  id: number
  name: string
  label: string
  isAnimation: boolean
  thumb: string
  src: string
  thumbHeight: number
  insertWidth: number
}

export type EmoticonTabId = 'friends1' | 'niniz' | 'friends2' | 'face'

export type EmoticonAlign = 'alignLeft' | 'alignCenter' | 'alignRight'

export type EmoticonManifest = {
  version: number
  source: string
  sprite: string
  tabs: Array<{ id: EmoticonTabId; label: string }>
  packs: Record<EmoticonTabId, EmoticonItem[]>
}

export const EMOTICON_MANIFEST = raw as EmoticonManifest

export const EMOTICON_TABS = EMOTICON_MANIFEST.tabs

export function getEmoticonPack(tab: EmoticonTabId): EmoticonItem[] {
  return EMOTICON_MANIFEST.packs[tab] ?? []
}

/** Tistory keditor insert HTML for an emoticon (default center align). */
export function emoticonInsertHtml(
  item: EmoticonItem,
  tab: EmoticonTabId,
  align: EmoticonAlign = 'alignCenter',
): string {
  const src = item.src.replace(/"/g, '&quot;')
  const anim = item.isAnimation ? 'true' : 'false'
  return (
    `<figure contenteditable="false" data-ke-type="emoticon" data-ke-align="${align}" ` +
    `data-emoticon-type="${tab}" data-emoticon-name="${item.name}" ` +
    `data-emoticon-isanimation="${anim}" data-emoticon-src="${src}">` +
    `<img src="${src}" width="${item.insertWidth}" data-mce-resize="false" contenteditable="false" alt="${item.label.replace(/"/g, '&quot;')}" />` +
    `</figure>`
  )
}
