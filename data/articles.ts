export interface Article {
  slug: string
  title: string
  description: string
  image: string
}

export const articles: Article[] = [
  {
    slug: 'familiar-vs-novel',
    title: 'Familiar vs Novel',
    description: "A look into when it's acceptable and perhaps even advantageous to design for novelty.",
    image: '/images/familiar-vs-novel.jpg',
  },
  {
    slug: 'onboarding-for-active-users',
    title: 'Onboarding for Active Users',
    description:
      'Onboarding should be designed with active users in mind, making guidance accessible throughout the product experience.',
    image: '/images/onboarding.jpg',
  },
  {
    slug: 'teslers-law',
    title: "Tesler's Law",
    description: 'For any system there is a certain amount of complexity that cannot be reduced.',
    image: '/images/teslers-law.jpg',
  },
  {
    slug: 'ux-psychology-google-search',
    title: 'UX Psychology: Google Search',
    description: 'A closer look at the ubiquitous search utility.',
    image: '/images/ux-psychology-google.jpg',
  },
  {
    slug: 'peak-end-rule',
    title: 'Peak-End Rule',
    description: 'Why designers should pay close attention to the key peak moments during an experience.',
    image: '/images/peak-end-rule.jpg',
  },
  {
    slug: 'the-psychology-of-design',
    title: 'The Psychology of Design',
    description:
      'A look at how designers can leverage psychology to build more intuitive, human-centered products and experiences.',
    image: '/images/psychology-of-design.jpg',
  },
  {
    slug: 'designing-with-occams-razor',
    title: "Designing with Occam's Razor",
    description: 'How a classic problem-solving principle can help improve our designs.',
    image: '/images/occams-razor.jpg',
  },
  {
    slug: 'design-principles-for-reducing-cognitive-load',
    title: 'Design Principles for Reducing Cognitive Load',
    description: 'A look at both the causes and ways to reduce extraneous mental processing for the user.',
    image: '/images/cognitive-load.jpg',
  },
]

export function getArticleBySlug(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug)
}
