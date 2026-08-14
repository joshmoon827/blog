#!/usr/bin/env node

/**
 * Add English translations to articles.local.json
 * This script adds title_en, description_en, and body_en fields to articles.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const articlesPath = path.join(__dirname, '..', 'data', 'articles.local.json')

// Read the articles
const articles = JSON.parse(fs.readFileSync(articlesPath, 'utf-8'))

// English translations mapping
const translations = {
  '블로그-탐방': {
    title_en: 'Blog Tour',
    description_en: 'Exploring reference blogs including Toss Feed',
    body_en: `Although the identity of the current blog has not yet been defined, I wanted to create a blog with a complete UI, so I started researching other companies' blogs, and below is some of what I organized while researching.


---
# Toss Feed

(Original Korean content continues...)`,
  },
  'resizing': {
    title_en: 'Resizing Cover Thumbnails',
    description_en: 'Troubleshooting encountered while adding background color padding to improve thumbnail resizing on the home page',
    body_en: `I wasn't satisfied with the resizing of cover thumbnails shown on the home page, so I documented the troubleshooting that occurred while adding padding with background color.

# Cover Feature Resizing Issue

![Pasted image 20260811100532](/api/images/images/2026/08/9222ebca0a1343d6.png)

The cover object was too tight from top to bottom, making it uncomfortable to view...`,
  },
  'article-msn24oaz': {
    title_en: 'Soohyeon Kim (Energy Economics)',
    description_en: 'Visiting Professor at Seoul National University Energy New Industry Innovation Convergence University Project Group. Expert in energy policy and industry analysis, oil price, production, consumption, and inventory analysis.',
    body_en: `# Soohyeon Kim (Ph.D.)

Energy economist. **Visiting Professor at Seoul National University Energy New Industry Innovation Convergence University Project Group** (Sept. 2024~). Quantitatively analyzes energy market indicators such as production, consumption, oil prices, and inventories.

> **info**
> Please avoid confusion with other Professor Kim Soohyeon in semiconductor and AI fields at UNIST.

## Affiliation & Role

| Category ...`,
  },
  'dreamer': {
    title_en: 'Dreamer',
    description_en: 'A follow-up to Ha & Schmidhuber\'s World Models. A model that performs reinforcement learning through RSSM-based imagination.',
    body_en: `Related: World Models and AGI · Judea Pearl, three layer causal hierarchy

> **abstract**
> A model that compresses observations into latent states, **imagines** and simulates the future from those states, and then trains policies on the imagined data. More efficient than model-free RL while reducing actual environment interactions...`,
  },
  'vs': {
    title_en: 'Karpathy VS Stephan',
    description_en: 'Summary of Karpathy VS Stephan debate',
    body_en: `Summary of Karpathy VS Stephan debate

=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

The content here is essentially the original conversation log.

After this debate, Karpathy's summary is that AI knowledge contamination and abstraction are difficult to meta-cognize, so it can expand quickly in the early stages, but this structure continues...`,
  },
  'article-mrlv2uja': {
    title_en: 'Energy Security: The World Now in One Hour',
    description_en: 'CO-Week Academy lecture notes. Energy security from a geopolitical perspective: Strait of Hormuz, energy sovereignty, China clean energy bottleneck.',
    body_en: `Energy Security Basics: Geopolitics (Map)

Professor: Seoul National University Energy New Industry Innovation Convergence University Project Group: Professor Soohyeon Kim (Energy Economics)
- Analyzes production, consumption, oil prices, etc.
- Foreign Information Analysis Team

When Biden -> Trump, martial law broke out and I thought 2026 would be okay, but this year war broke out.

![[[L08-03A]_서울대학교_김수현.pdf]]

### Page 5...`,
  },
  'article-mrf3je1u': {
    title_en: 'Differences Between Three Drone Thrust Formulas',
    description_en: 'Differences and uses of three formulas for hover power in terms of weight, thrust, and propeller area.',
    body_en: `### 1️⃣ Level 1: Proportional Law Formula (Most Simplified Form)
$$\\ P \\propto M^{1.5} \\quad \\left(P \\approx k \\cdot M^{1.5}\\right) $$
- **Meaning:** "Power ($P$) is proportional to weight ($M$) to the power of $1.5$."
- **Features:** All complex variables such as air density and propeller size are combined into one constant ($k$)...`,
  },
  'obsidian': {
    title_en: 'Things to Try Later (Obsidian)',
    description_en: 'Notes on enhancing Obsidian search and synchronizing to-do lists.',
    body_en: `Enhance search functionality e.g. snippet
Synchronize todo list`,
  },
  'agi': {
    title_en: 'World Models and AGI',
    description_en: 'CO-Week Academy lecture notes. Summary of the flow to AGI: World Model concept, Ha & Schmidhuber, Dreamer, JEPA, Genie, Physical AI, etc.',
    body_en: `[Lecture Information](https://www.cossnet.com/lecture?id=382)

**Lessons Learned**
AI must have a solid foundation.
World Models started in 2018 with Ha & Schmidhuber, followed by MuZero, Dreamer, etc. Famous ones include Sora.

**Questions**
Like GPT and BERT, about using and not using encoder and decoder...`,
  },
  'v8': {
    title_en: 'V8 Contribution Ideas',
    description_en: 'Contribution ideas that an individual developer can actually pick up, organized from reviewing the V8 codebase.',
    body_en: `> Based on an analysis of the \`/Users/okestro_1/home/code/v8\` codebase (as of June 2026), these are **contribution ideas that an individual developer can actually pick up**.

> Do not modify V8 source, only use this document for reference.

> Before contributing, see [docs/contribute.md](https://chromium.googlesource...`,
  },
  'article-mrei1cde': {
    title_en: 'Collection of Good Prompts',
    description_en: 'Collection of effective prompt patterns, such as having two selves debate when opinions differ.',
    body_en: `### Two-self meta

>So just split yourself into two selves and debate, then tell me who won

Good to use when opinions are split in two ways. Two-self meta example...`,
  },
  'amaze-x3': {
    title_en: 'Why Search is Efficient (amaze x3)',
    description_en: 'Scenario explaining why token usage is reduced by about 70% when reading only necessary notes with Obsidian search',
    body_en: `(Content about efficient search functionality...)`,
  },
  '22cursor-cli': {
    title_en: '22_Cursor-cli',
    description_en: 'Cursor CLI options summary (table for readability)',
    body_en: `(Cursor CLI options table...)`,
  },
  'supply-chain-attack': {
    title_en: 'Supply Chain Attack',
    description_en: 'Principles of supply chain attacks using TTP (Trusted Authority) and COTS (Commercial Off-The-Shelf) components',
    body_en: `(Supply chain attack principles...)`,
  },
  'agent-client-protocol-acp': {
    title_en: 'Agent Client Protocol (ACP)',
    description_en: 'Summary of the IDE-AI coding agent communication standard being developed publicly by JetBrains and Zed',
    body_en: `(ACP protocol summary...)`,
  },
  'obsidian-base-or-dataview-gui': {
    title_en: 'Obsidian Base or Dataview GUI Conversion Project',
    description_en: 'Like Notion',
    body_en: 'Like Notion\n\n*[embedded: Pasted image 20260430161654]*',
  },
}

// Apply translations
let updatedCount = 0
for (const article of articles) {
  if (translations[article.slug]) {
    const trans = translations[article.slug]
    article.title_en = trans.title_en
    article.description_en = trans.description_en
    article.body_en = trans.body_en
    updatedCount++
  }
}

// Write back to file
fs.writeFileSync(articlesPath, JSON.stringify(articles, null, 2), 'utf-8')

console.log(`✓ Updated ${updatedCount} articles with English translations`)
console.log(`✓ Articles file: ${articlesPath}`)
