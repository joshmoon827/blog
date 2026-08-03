import type { Muya } from '@muyajs/core'

import { insertTextAtMuyaCursor } from '@/lib/muya/insertText'
import { coerceMuyaText } from '@/lib/muya/muyaPatches'
import {
  getParagraphContentBlock,
  type ParagraphContentBlock,
} from '@/lib/muya/quickInsertUtils'

type BlockState = Record<string, unknown>

type ParentBlock = ParagraphContentBlock['parent'] & {
  insertAfter: (block: ParentBlock, ref?: ParentBlock) => ParentBlock
}

type BlockFactory = {
  create: (muya: Muya, state: BlockState) => ParentBlock
}

type ScrollPageCtor = {
  loadBlock: (name: string) => BlockFactory | undefined
}

const BLOCK_TEMPLATES: Record<string, BlockState> = {
  paragraph: { name: 'paragraph', text: '' },
  'thematic-break': { name: 'thematic-break', text: '---' },
  'atx-heading': { name: 'atx-heading', meta: { level: 1 }, text: '# ' },
  table: {
    name: 'table',
    children: [
      {
        name: 'table.row',
        children: [
          { name: 'table.cell', meta: { align: 'none' }, text: '' },
          { name: 'table.cell', meta: { align: 'none' }, text: '' },
        ],
      },
      {
        name: 'table.row',
        children: [
          { name: 'table.cell', meta: { align: 'none' }, text: '' },
          { name: 'table.cell', meta: { align: 'none' }, text: '' },
        ],
      },
    ],
  },
  'code-block': {
    name: 'code-block',
    meta: { type: 'fenced', lang: '' },
    text: '',
  },
  'block-quote': {
    name: 'block-quote',
    children: [{ name: 'paragraph', text: '' }],
  },
  'order-list': {
    name: 'order-list',
    meta: { start: 1, loose: true, delimiter: '.' },
    children: [
      {
        name: 'list-item',
        children: [{ name: 'paragraph', text: '' }],
      },
    ],
  },
  'bullet-list': {
    name: 'bullet-list',
    meta: { marker: '-', loose: false },
    children: [
      {
        name: 'list-item',
        children: [{ name: 'paragraph', text: '' }],
      },
    ],
  },
  'task-list': {
    name: 'task-list',
    meta: { marker: '-', loose: false },
    children: [
      {
        name: 'task-list-item',
        meta: { checked: false },
        children: [{ name: 'paragraph', text: '' }],
      },
    ],
  },
  'math-block': {
    name: 'math-block',
    text: 'E = mc^2',
    meta: { mathStyle: '' },
  },
}

function cloneState<T>(state: T): T {
  return structuredClone(state)
}

function getBlockLoader(muya: Muya): ScrollPageCtor {
  const scrollPage = muya.editor.scrollPage
  if (!scrollPage) throw new Error('Muya scroll page is not ready')
  return scrollPage.constructor as unknown as ScrollPageCtor
}

function createBlock(muya: Muya, label: string, text = ''): ParentBlock | null {
  const loader = getBlockLoader(muya)
  const { preferLooseListItem, bulletListMarker, orderListDelimiter } = muya.options

  let state: BlockState | null = null
  let blockType = label

  switch (label) {
    case 'paragraph':
    case 'thematic-break':
    case 'table':
    case 'code-block':
    case 'block-quote':
    case 'math-block':
      state = cloneState(BLOCK_TEMPLATES[label])
      if (label === 'paragraph') state.text = text
      if (label === 'block-quote') {
        const children = state.children as BlockState[]
        children[0].text = text
      }
      if (label === 'math-block' && text) {
        state.text = text
      }
      break
    case 'atx-heading 1':
    case 'atx-heading 2':
    case 'atx-heading 3':
    case 'atx-heading 4':
    case 'atx-heading 5':
    case 'atx-heading 6': {
      const level = Number(label.split(' ')[1])
      state = cloneState(BLOCK_TEMPLATES['atx-heading'])
      state.meta = { level }
      state.text = `${'#'.repeat(level)} ${text}`
      blockType = 'atx-heading'
      break
    }
    case 'order-list':
      state = cloneState(BLOCK_TEMPLATES['order-list'])
      state.meta = {
        start: 1,
        loose: preferLooseListItem,
        delimiter: orderListDelimiter,
      }
      if (text) {
        const children = state.children as BlockState[]
        const listItem = children[0].children as BlockState[]
        listItem[0].text = text
      }
      break
    case 'bullet-list':
    case 'task-list':
      state = cloneState(BLOCK_TEMPLATES[label])
      state.meta = { marker: bulletListMarker, loose: preferLooseListItem }
      if (text) {
        const children = state.children as BlockState[]
        const listItem = children[0].children as BlockState[]
        listItem[0].text = text
      }
      break
    default:
      return null
  }

  const factory = loader.loadBlock(blockType)
  if (!factory) return null
  return factory.create(muya, state) as ParentBlock
}

function focusContentBlock(block: ParentBlock | null, label: string): void {
  if (!block) return
  const content = block.firstContentInDescendant()
  if (!content) return
  const text = coerceMuyaText(content.text)
  if (label === 'math-block') {
    content.setCursor(0, text.length, true)
    return
  }
  content.setCursor(text.length, text.length, true)
}

/**
 * Replace the current paragraph block with the selected quick-insert block.
 * Mirrors Muya's replaceBlockByLabel without using ParagraphQuickInsertMenu.
 */
export function applyQuickInsert(muya: Muya, label: string): string | null {
  if (label === 'image') {
    const content = getParagraphContentBlock(muya)
    if (content) {
      const text = coerceMuyaText(content.text)
      if (/^[/、]\S*$/.test(text)) {
        content.text = ''
        content.setCursor(0, 0, false)
        content.update()
      }
    }
    return insertTextAtMuyaCursor(muya, '![image]()')
  }

  const content = getParagraphContentBlock(muya)
  if (!content?.parent) return null

  const parent = content.parent as ParentBlock
  const remainingText = coerceMuyaText(content.text).replace(/^[/、]\S*/, '')

  const newBlock = createBlock(muya, label, remainingText)
  if (!newBlock) return null

  parent.replaceWith(newBlock)

  if (label === 'thematic-break') {
    const paragraph = createBlock(muya, 'paragraph', '')
    if (paragraph) {
      newBlock.insertAfter(paragraph, newBlock)
      const next = paragraph.firstContentInDescendant()
      next?.setCursor(0, 0, true)
    }
  } else {
    focusContentBlock(newBlock, label)
  }

  return muya.getMarkdown()
}
