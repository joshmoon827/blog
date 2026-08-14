#!/usr/bin/env node

/**
 * Add English translations to articles.local.json
 * This script adds title_en, description_en, and body_en fields to articles.
 * 
 * IMPORTANT: Only add body_en when a COMPLETE translation is available.
 * Never add stub/placeholder English bodies.
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
// NOTE: body_en should only be included when it's a COMPLETE, faithful translation
// If translation is incomplete or not available, omit body_en (UI will fall back to Korean)
const translations = {
  'obsidian': {
    title_en: 'Things to Try Later (Obsidian)',
    description_en: 'Notes on enhancing Obsidian search and synchronizing to-do lists.',
    body_en: `Enhance search functionality e.g. snippet
Synchronize todo list`,
  },
  'obsidian-base-or-dataview-gui': {
    title_en: 'Obsidian Base or Dataview GUI Conversion Project',
    description_en: 'Like Notion',
    body_en: 'Like Notion\n\n*[embedded: Pasted image 20260430161654]*',
  },
  // For articles below, only title_en and description_en are provided
  // Body translations are omitted to ensure UI falls back to Korean for body content
  '블로그-탐방': {
    title_en: 'Blog Tour',
    description_en: 'Exploring reference blogs including Toss Feed',
  },
  'resizing': {
    title_en: 'Resizing Cover Thumbnails',
    description_en: 'Troubleshooting encountered while adding background color padding to improve thumbnail resizing on the home page',
  },
  'article-msn24oaz': {
    title_en: 'Soohyeon Kim (Energy Economics)',
    description_en: 'Visiting Professor at Seoul National University Energy New Industry Innovation Convergence University Project Group. Expert in energy policy and industry analysis, oil price, production, consumption, and inventory analysis.',
  },
  'dreamer': {
    title_en: 'Dreamer',
    description_en: 'A follow-up to Ha & Schmidhuber\'s World Models. A model that performs reinforcement learning through RSSM-based imagination.',
  },
  'vs': {
    title_en: 'Karpathy VS Stephan',
    description_en: 'Summary of Karpathy VS Stephan debate',
  },
  'article-mrlv2uja': {
    title_en: 'Energy Security: The World Now in One Hour',
    description_en: 'CO-Week Academy lecture notes. Energy security from a geopolitical perspective: Strait of Hormuz, energy sovereignty, China clean energy bottleneck.',
  },
  'article-mrf3je1u': {
    title_en: 'Differences Between Three Drone Thrust Formulas',
    description_en: 'Differences and uses of three formulas for hover power in terms of weight, thrust, and propeller area.',
  },
  'agi': {
    title_en: 'World Models and AGI',
    description_en: 'CO-Week Academy lecture notes. Summary of the flow to AGI: World Model concept, Ha & Schmidhuber, Dreamer, JEPA, Genie, Physical AI, etc.',
  },
  'v8': {
    title_en: 'V8 Contribution Ideas',
    description_en: 'Contribution ideas that an individual developer can actually pick up, organized from reviewing the V8 codebase.',
  },
  'article-mrei1cde': {
    title_en: 'Collection of Good Prompts',
    description_en: 'Collection of effective prompt patterns, such as having two selves debate when opinions differ.',
  },
  'amaze-x3': {
    title_en: 'Why Search is Efficient (amaze x3)',
    description_en: 'Scenario explaining why token usage is reduced by about 70% when reading only necessary notes with Obsidian search',
  },
  '22cursor-cli': {
    title_en: '22_Cursor-cli',
    description_en: 'Cursor CLI options summary (table for readability)',
  },
  'supply-chain-attack': {
    title_en: 'Supply Chain Attack',
    description_en: 'Principles of supply chain attacks using TTP (Trusted Authority) and COTS (Commercial Off-The-Shelf) components',
  },
  'agent-client-protocol-acp': {
    title_en: 'Agent Client Protocol (ACP)',
    description_en: 'Summary of the IDE-AI coding agent communication standard being developed publicly by JetBrains and Zed',
  },
}

// Apply translations
let updatedCount = 0
let bodiesAdded = 0
for (const article of articles) {
  if (translations[article.slug]) {
    const trans = translations[article.slug]
    article.title_en = trans.title_en
    article.description_en = trans.description_en
    
    // Only set body_en if a complete translation is provided
    if (trans.body_en) {
      article.body_en = trans.body_en
      bodiesAdded++
    } else {
      // Remove any existing stub body_en
      delete article.body_en
    }
    
    updatedCount++
  }
}

// Write back to file
fs.writeFileSync(articlesPath, JSON.stringify(articles, null, 2), 'utf-8')

console.log(`✓ Updated ${updatedCount} articles with English translations`)
console.log(`✓ Complete body translations: ${bodiesAdded}`)
console.log(`✓ Title/description only: ${updatedCount - bodiesAdded}`)
console.log(`✓ Articles file: ${articlesPath}`)
