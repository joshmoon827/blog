export type QuickInsertCategory = {
  name: string
  items: QuickInsertItem[]
}

export type QuickInsertItem = {
  id: string
  label: string
  title: string
  subtitle: string
  keywords?: string[]
}

export const QUICK_INSERT_MENU: QuickInsertCategory[] = [
  {
    name: '제목',
    items: [
      {
        id: 'atx-heading 2',
        label: 'H2',
        title: '제목 2',
        subtitle: '## 제목',
        keywords: ['heading', 'header', 'h2', '제목'],
      },
      {
        id: 'atx-heading 3',
        label: 'H3',
        title: '제목 3',
        subtitle: '### 제목',
        keywords: ['heading', 'header', 'h3', '제목'],
      },
      {
        id: 'atx-heading 4',
        label: 'H4',
        title: '제목 4',
        subtitle: '#### 제목',
        keywords: ['heading', 'header', 'h4', '제목'],
      },
    ],
  },
  {
    name: '블록',
    items: [
      {
        id: 'block-quote',
        label: '❝',
        title: '인용',
        subtitle: '> 인용문',
        keywords: ['quote', 'blockquote', '인용'],
      },
      {
        id: 'code-block',
        label: '</>',
        title: '코드 블록',
        subtitle: '``` 코드 ```',
        keywords: ['code', '코드'],
      },
      {
        id: 'thematic-break',
        label: '—',
        title: '구분선',
        subtitle: '---',
        keywords: ['hr', 'line', 'horizontal', '구분선'],
      },
      {
        id: 'table',
        label: '⊞',
        title: '표',
        subtitle: '| 열 | 열 |',
        keywords: ['table', '표'],
      },
      {
        id: 'image',
        label: '🖼',
        title: '이미지',
        subtitle: '![설명](url)',
        keywords: ['image', 'img', 'picture', '이미지'],
      },
      {
        id: 'math-block',
        label: '∑',
        title: '수식',
        subtitle: '$$ E = mc^2 $$',
        keywords: ['math', 'latex', 'katex', '수식', 'tex', 'formula'],
      },
    ],
  },
  {
    name: '목록',
    items: [
      {
        id: 'bullet-list',
        label: '•',
        title: '글머리 목록',
        subtitle: '- 항목',
        keywords: ['bullet', 'ul', 'list', '목록'],
      },
      {
        id: 'order-list',
        label: '1.',
        title: '번호 목록',
        subtitle: '1. 항목',
        keywords: ['ordered', 'ol', 'number', '목록'],
      },
      {
        id: 'task-list',
        label: '☑',
        title: '할 일 목록',
        subtitle: '- [ ] 항목',
        keywords: ['task', 'todo', 'checkbox', '할일'],
      },
    ],
  },
]

export const ALL_QUICK_INSERT_ITEMS: QuickInsertItem[] = QUICK_INSERT_MENU.flatMap(
  (cat) => cat.items,
)

export function filterQuickInsertItems(query: string): QuickInsertCategory[] {
  const q = query.trim().toLowerCase()
  if (!q) return QUICK_INSERT_MENU

  const filtered: QuickInsertCategory[] = []
  for (const cat of QUICK_INSERT_MENU) {
    const items = cat.items.filter((item) => {
      const haystack = [
        item.title,
        item.subtitle,
        item.id,
        ...(item.keywords ?? []),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
    if (items.length) filtered.push({ name: cat.name, items })
  }
  return filtered
}
