export type HairStyle =
  | 'none'
  | 'short'
  | 'tuft'
  | 'fluffy'
  | 'spiky'
  | 'side'
  | 'bowl'
  | 'pigtails'
  | 'messy'
  | 'slick'
  | 'beanie'
  | 'tiny-tuft'
  | 'ears'

export type EyeStyle =
  | 'round'
  | 'sleepy'
  | 'angry'
  | 'sparkle'
  | 'closed'
  | 'wide'
  | 'dot'
  | 'wink'
  | 'heart'

export type BrowStyle = 'none' | 'angry' | 'sad' | 'raised' | 'flat' | 'curious'

export type MouthStyle =
  | 'smile'
  | 'frown'
  | 'flat'
  | 'open'
  | 'wavy'
  | 'tiny'
  | 'grin'
  | 'o'
  | 'tongue'

export type ExtraStyle =
  | 'none'
  | 'tears'
  | 'blush'
  | 'steam'
  | 'rain'
  | 'stars'
  | 'zzz'
  | 'coffee'
  | 'sparkles'
  | 'cloud'
  | 'moon'
  | 'sun'
  | 'hearts'
  | 'sweat'
  | 'scarf'
  | 'glasses'
  | 'snack'
  | 'wind'
  | 'drool'

export type FaceSpec = {
  skin: string
  hair: string
  accent: string
  hairStyle: HairStyle
  eyes: EyeStyle
  brows: BrowStyle
  mouth: MouthStyle
  extra: ExtraStyle
  scale?: number
}

export const DEFAULT_FACE: FaceSpec = {
  skin: '#f4d7b8',
  hair: '#5a3d2b',
  accent: '#e8a0b8',
  hairStyle: 'ears',
  eyes: 'round',
  brows: 'none',
  mouth: 'smile',
  extra: 'none',
}

/** One distinct face recipe per nickname id. */
export const JENYANG_FACE_SPECS: Record<string, FaceSpec> = {
  simsim: {
    skin: '#ead7c0',
    hair: '#6b5344',
    accent: '#9aa3ad',
    hairStyle: 'bowl',
    eyes: 'dot',
    brows: 'flat',
    mouth: 'flat',
    extra: 'none',
  },
  angry: {
    skin: '#f0c4b4',
    hair: '#3d2a22',
    accent: '#e24b4b',
    hairStyle: 'spiky',
    eyes: 'angry',
    brows: 'angry',
    mouth: 'frown',
    extra: 'steam',
  },
  sad: {
    skin: '#d7e0ef',
    hair: '#4a5a78',
    accent: '#6b8ecf',
    hairStyle: 'side',
    eyes: 'round',
    brows: 'sad',
    mouth: 'frown',
    extra: 'tears',
  },
  bald: {
    skin: '#f3c9a3',
    hair: '#d4a07a',
    accent: '#c9845a',
    hairStyle: 'none',
    eyes: 'round',
    brows: 'raised',
    mouth: 'tiny',
    extra: 'none',
  },
  sleepy: {
    skin: '#f0d4c4',
    hair: '#7a5a48',
    accent: '#8b7cc9',
    hairStyle: 'messy',
    eyes: 'sleepy',
    brows: 'flat',
    mouth: 'wavy',
    extra: 'zzz',
  },
  hungry: {
    skin: '#f5d2b8',
    hair: '#5c4030',
    accent: '#e07a3d',
    hairStyle: 'tuft',
    eyes: 'wide',
    brows: 'raised',
    mouth: 'open',
    extra: 'drool',
  },
  drowsy: {
    skin: '#e8d5e8',
    hair: '#6a5478',
    accent: '#b08cc8',
    hairStyle: 'messy',
    eyes: 'sleepy',
    brows: 'none',
    mouth: 'o',
    extra: 'none',
  },
  chilly: {
    skin: '#d5e8f4',
    hair: '#3d5a72',
    accent: '#6aa8d8',
    hairStyle: 'beanie',
    eyes: 'round',
    brows: 'sad',
    mouth: 'wavy',
    extra: 'scarf',
  },
  shy: {
    skin: '#f6d0c8',
    hair: '#8a5a68',
    accent: '#e89aaa',
    hairStyle: 'bowl',
    eyes: 'dot',
    brows: 'none',
    mouth: 'tiny',
    extra: 'blush',
  },
  proud: {
    skin: '#f2dcc0',
    hair: '#2c2c35',
    accent: '#e8c14a',
    hairStyle: 'slick',
    eyes: 'closed',
    brows: 'raised',
    mouth: 'grin',
    extra: 'none',
  },
  tiny: {
    skin: '#f6e0cc',
    hair: '#c48a6a',
    accent: '#f0a8c0',
    hairStyle: 'tiny-tuft',
    eyes: 'round',
    brows: 'none',
    mouth: 'smile',
    extra: 'none',
    scale: 0.62,
  },
  giant: {
    skin: '#e8c8a8',
    hair: '#4a3028',
    accent: '#d07050',
    hairStyle: 'short',
    eyes: 'wide',
    brows: 'flat',
    mouth: 'grin',
    extra: 'none',
    scale: 1.28,
  },
  sparkling: {
    skin: '#fff1d6',
    hair: '#c9a227',
    accent: '#f0d060',
    hairStyle: 'fluffy',
    eyes: 'sparkle',
    brows: 'raised',
    mouth: 'smile',
    extra: 'sparkles',
  },
  rainy: {
    skin: '#c8d8e8',
    hair: '#3a4a5c',
    accent: '#5a88b8',
    hairStyle: 'side',
    eyes: 'sleepy',
    brows: 'sad',
    mouth: 'flat',
    extra: 'rain',
  },
  midnight: {
    skin: '#3a3a58',
    hair: '#1a1a2e',
    accent: '#8a9ad8',
    hairStyle: 'slick',
    eyes: 'sparkle',
    brows: 'none',
    mouth: 'tiny',
    extra: 'moon',
  },
  coffee: {
    skin: '#e8cbb0',
    hair: '#3c2418',
    accent: '#6b3e2a',
    hairStyle: 'tuft',
    eyes: 'wide',
    brows: 'curious',
    mouth: 'o',
    extra: 'coffee',
  },
  happy: {
    skin: '#f8dcb0',
    hair: '#e8b04a',
    accent: '#f0c050',
    hairStyle: 'fluffy',
    eyes: 'closed',
    brows: 'none',
    mouth: 'grin',
    extra: 'none',
  },
  excited: {
    skin: '#f6d0a8',
    hair: '#e07040',
    accent: '#f09050',
    hairStyle: 'spiky',
    eyes: 'wide',
    brows: 'raised',
    mouth: 'open',
    extra: 'sparkles',
  },
  flustered: {
    skin: '#f2c0b8',
    hair: '#8a4050',
    accent: '#e07080',
    hairStyle: 'messy',
    eyes: 'wide',
    brows: 'raised',
    mouth: 'o',
    extra: 'sweat',
  },
  curious: {
    skin: '#f0dcc8',
    hair: '#5a4838',
    accent: '#70b0d0',
    hairStyle: 'tuft',
    eyes: 'wide',
    brows: 'curious',
    mouth: 'tiny',
    extra: 'none',
  },
  tired: {
    skin: '#d8d0c8',
    hair: '#5a5854',
    accent: '#9a9088',
    hairStyle: 'messy',
    eyes: 'sleepy',
    brows: 'sad',
    mouth: 'wavy',
    extra: 'zzz',
  },
  fluttering: {
    skin: '#f8d4dc',
    hair: '#c07090',
    accent: '#e890b0',
    hairStyle: 'pigtails',
    eyes: 'heart',
    brows: 'none',
    mouth: 'smile',
    extra: 'hearts',
  },
  laidback: {
    skin: '#e8dcc8',
    hair: '#6a7a58',
    accent: '#88a868',
    hairStyle: 'beanie',
    eyes: 'closed',
    brows: 'none',
    mouth: 'smile',
    extra: 'none',
  },
  quirky: {
    skin: '#e0f0d8',
    hair: '#48a070',
    accent: '#70d090',
    hairStyle: 'tiny-tuft',
    eyes: 'wink',
    brows: 'curious',
    mouth: 'tongue',
    extra: 'none',
  },
  cozy: {
    skin: '#f4e0c8',
    hair: '#c48858',
    accent: '#e0a070',
    hairStyle: 'fluffy',
    eyes: 'sleepy',
    brows: 'none',
    mouth: 'smile',
    extra: 'scarf',
  },
  dreaming: {
    skin: '#d8d8f4',
    hair: '#6868b0',
    accent: '#9898e0',
    hairStyle: 'fluffy',
    eyes: 'closed',
    brows: 'none',
    mouth: 'tiny',
    extra: 'stars',
  },
  sleeper: {
    skin: '#e8d8e8',
    hair: '#8870a0',
    accent: '#b098c8',
    hairStyle: 'messy',
    eyes: 'closed',
    brows: 'none',
    mouth: 'wavy',
    extra: 'zzz',
  },
  sunny: {
    skin: '#ffe8b8',
    hair: '#f0c040',
    accent: '#f8d060',
    hairStyle: 'spiky',
    eyes: 'closed',
    brows: 'none',
    mouth: 'grin',
    extra: 'sun',
  },
  gloomy: {
    skin: '#c8d0d8',
    hair: '#4a5460',
    accent: '#708090',
    hairStyle: 'bowl',
    eyes: 'dot',
    brows: 'sad',
    mouth: 'frown',
    extra: 'cloud',
  },
  buzzing: {
    skin: '#ffe0c0',
    hair: '#e85070',
    accent: '#f07090',
    hairStyle: 'spiky',
    eyes: 'sparkle',
    brows: 'raised',
    mouth: 'grin',
    extra: 'sparkles',
  },
  full: {
    skin: '#f0d8b8',
    hair: '#8a6048',
    accent: '#d09060',
    hairStyle: 'short',
    eyes: 'closed',
    brows: 'none',
    mouth: 'smile',
    extra: 'none',
  },
  thirsty: {
    skin: '#e8d0c0',
    hair: '#704838',
    accent: '#48a0d0',
    hairStyle: 'tuft',
    eyes: 'wide',
    brows: 'sad',
    mouth: 'open',
    extra: 'sweat',
  },
  smiling: {
    skin: '#f6dcc0',
    hair: '#c07048',
    accent: '#e89868',
    hairStyle: 'short',
    eyes: 'closed',
    brows: 'none',
    mouth: 'grin',
    extra: 'blush',
  },
  frowning: {
    skin: '#e8c8b8',
    hair: '#503830',
    accent: '#c06050',
    hairStyle: 'short',
    eyes: 'angry',
    brows: 'angry',
    mouth: 'frown',
    extra: 'none',
  },
  nodding: {
    skin: '#ead4c4',
    hair: '#6a5040',
    accent: '#a088c0',
    hairStyle: 'bowl',
    eyes: 'sleepy',
    brows: 'flat',
    mouth: 'o',
    extra: 'zzz',
  },
  shivering: {
    skin: '#d0e4f0',
    hair: '#406080',
    accent: '#70a8d0',
    hairStyle: 'beanie',
    eyes: 'wide',
    brows: 'sad',
    mouth: 'wavy',
    extra: 'scarf',
  },
  starryeyed: {
    skin: '#f0e8ff',
    hair: '#504878',
    accent: '#c8b0f0',
    hairStyle: 'fluffy',
    eyes: 'sparkle',
    brows: 'raised',
    mouth: 'o',
    extra: 'stars',
  },
  cloudy: {
    skin: '#d8dde4',
    hair: '#6a7380',
    accent: '#98a0ac',
    hairStyle: 'bowl',
    eyes: 'sleepy',
    brows: 'flat',
    mouth: 'flat',
    extra: 'cloud',
  },
  windy: {
    skin: '#d8ece8',
    hair: '#3a8878',
    accent: '#68c0b0',
    hairStyle: 'messy',
    eyes: 'wink',
    brows: 'raised',
    mouth: 'smile',
    extra: 'wind',
  },
  warm: {
    skin: '#f8d0b0',
    hair: '#c05030',
    accent: '#e07048',
    hairStyle: 'fluffy',
    eyes: 'closed',
    brows: 'none',
    mouth: 'smile',
    extra: 'sun',
  },
  cool: {
    skin: '#c8ece8',
    hair: '#208078',
    accent: '#40c0b8',
    hairStyle: 'slick',
    eyes: 'round',
    brows: 'none',
    mouth: 'tiny',
    extra: 'glasses',
  },
  blushing: {
    skin: '#f8c8c8',
    hair: '#b04860',
    accent: '#f08098',
    hairStyle: 'pigtails',
    eyes: 'dot',
    brows: 'none',
    mouth: 'tiny',
    extra: 'blush',
  },
  nyang: {
    skin: '#f4d4b8',
    hair: '#e8a060',
    accent: '#f0b878',
    hairStyle: 'ears',
    eyes: 'round',
    brows: 'none',
    mouth: 'wavy',
    extra: 'none',
  },
  round: {
    skin: '#f8e0c8',
    hair: '#d0a078',
    accent: '#e8c098',
    hairStyle: 'bowl',
    eyes: 'round',
    brows: 'none',
    mouth: 'smile',
    extra: 'none',
    scale: 1.08,
  },
  fluffy: {
    skin: '#f0e4d4',
    hair: '#e8d0b0',
    accent: '#f4e4c8',
    hairStyle: 'fluffy',
    eyes: 'round',
    brows: 'none',
    mouth: 'smile',
    extra: 'none',
  },
  starlight: {
    skin: '#2a2a48',
    hair: '#1a1a30',
    accent: '#f0e080',
    hairStyle: 'spiky',
    eyes: 'sparkle',
    brows: 'none',
    mouth: 'smile',
    extra: 'stars',
  },
  moonlight: {
    skin: '#3a4868',
    hair: '#c8d4e8',
    accent: '#e8f0ff',
    hairStyle: 'side',
    eyes: 'round',
    brows: 'none',
    mouth: 'tiny',
    extra: 'moon',
  },
  morning: {
    skin: '#ffe8cc',
    hair: '#f0a848',
    accent: '#ffc870',
    hairStyle: 'tuft',
    eyes: 'round',
    brows: 'raised',
    mouth: 'smile',
    extra: 'sun',
  },
  'drowsy-afternoon': {
    skin: '#f0d8c0',
    hair: '#a07050',
    accent: '#d0a070',
    hairStyle: 'messy',
    eyes: 'sleepy',
    brows: 'flat',
    mouth: 'wavy',
    extra: 'zzz',
  },
  snackish: {
    skin: '#f4d8b8',
    hair: '#8a5038',
    accent: '#e09050',
    hairStyle: 'tuft',
    eyes: 'wide',
    brows: 'curious',
    mouth: 'open',
    extra: 'snack',
  },
}
