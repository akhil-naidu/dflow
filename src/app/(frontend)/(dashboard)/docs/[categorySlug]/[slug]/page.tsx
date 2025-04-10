import { MDXContent } from '@content-collections/mdx/react'
import {
  allDeployments,
  allEnvironmentVariables,
  allGettingStarteds,
  allIntroductions,
  allProjects,
  allServices,
} from 'content-collections'

// Combine all collections
const allDocs = [
  ...allGettingStarteds,
  ...allIntroductions,
  ...allProjects,
  ...allServices,
  ...allEnvironmentVariables,
  ...allDeployments,
]

interface PageProps {
  params: Promise<{
    categorySlug: string
    slug: string
  }>
}

export default async function DocPage({ params }: PageProps) {
  const { categorySlug, slug } = await params
  const doc = allDocs.find(
    d => d.categorySlug === categorySlug && d.slug === slug,
  ) // Find matching doc in all collections
  if (!doc) {
    return <p className='text-gray-500'>Document not found.</p>
  }

  return (
    <article className='prose prose-purple prose-invert md:prose-lg prose-img:mx-auto prose-img:aspect-video prose-img:w-full prose-img:rounded-md prose-img:object-contain'>
      {/* <h1 className='text-2xl font-semibold'>{doc.title}</h1> */}
      <MDXContent code={doc.mdx} />
    </article>
  )
}
