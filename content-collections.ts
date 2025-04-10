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

const gettingStarted = defineCollection({
  name: 'gettingStarted',
  directory: 'src/docs/getting-started',
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

const projects = defineCollection({
  name: 'projects',
  directory: 'src/docs/projects',
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

const environmentVariables = defineCollection({
  name: 'environmentVariables',
  directory: 'src/docs/environment-variables',
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

const deployments = defineCollection({
  name: 'deployments',
  directory: 'src/docs/deployments',
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
  collections: [
    introduction,
    gettingStarted,
    projects,
    services,
    environmentVariables,
    deployments,
  ],
})
