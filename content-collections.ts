import { defineCollection, defineConfig } from '@content-collections/core'
import { compileMDX } from '@content-collections/mdx'

const introduction = defineCollection({
  name: 'introduction',
  directory: 'src/docs/introduction',
  include: '**/*.md',
  schema: z => ({
    title: z.string(),
    category: z.string(),
    order: z.number(),
    categoryOrder: z.number(),
  }),
  transform: async (document, context) => {
    const mdx = await compileMDX(context, document)
    return {
      ...document,
      mdx,
      slug: document.title.toLowerCase().replace(/ /g, '-'),
      categorySlug: document.category.toLowerCase().replace(/ /g, '-'),
    }
  },
})

const servers = defineCollection({
  name: 'servers',
  directory: 'src/docs/servers',
  include: '**/*.md',
  schema: z => ({
    title: z.string(),
    category: z.string(),
    order: z.number(),
    categoryOrder: z.number(),
  }),
  transform: async (document, context) => {
    const mdx = await compileMDX(context, document)
    return {
      ...document,
      mdx,
      slug: document.title.toLowerCase().replace(/ /g, '-'),
      categorySlug: document.category.toLowerCase().replace(/ /g, '-'),
    }
  },
})

const onboarding = defineCollection({
  name: 'onboarding',
  directory: 'src/docs/onboarding',
  include: '**/*.md',
  schema: z => ({
    title: z.string(),
    category: z.string(),
    order: z.number(),
    categoryOrder: z.number(),
  }),
  transform: async (document, context) => {
    const mdx = await compileMDX(context, document)
    return {
      ...document,
      mdx,
      slug: document.title.toLowerCase().replace(/ /g, '-'),
      categorySlug: document.category.toLowerCase().replace(/ /g, '-'),
    }
  },
})

const services = defineCollection({
  name: 'services',
  directory: 'src/docs/services',
  include: '**/*.md',
  schema: z => ({
    title: z.string(),
    category: z.string(),
    order: z.number(),
    categoryOrder: z.number(),
  }),
  transform: async (document, context) => {
    const mdx = await compileMDX(context, document)
    return {
      ...document,
      mdx,
      slug: document.title.toLowerCase().replace(/ /g, '-'),
      categorySlug: document.category.toLowerCase().replace(/ /g, '-'),
    }
  },
})

export default defineConfig({
  collections: [introduction, servers, onboarding, services],
})
