'use client'

import {
  allIntroductions,
  allOnboardings,
  allServers,
  allServices,
} from 'content-collections'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'

import { isDemoEnvironment } from '@/lib/constants'

type Doc =
  | (typeof allServers)[number]
  | (typeof allIntroductions)[number]
  | (typeof allOnboardings)[number]
  | (typeof allServices)[number]

type GroupedDocs = Record<string, Doc[]>
// console.log({ allOnboardings })
const allDocs: Doc[] = [
  ...allIntroductions,
  ...allServers,
  ...allOnboardings,
  ...allServices,
]

const groupedDocs: GroupedDocs = allDocs.reduce<GroupedDocs>((acc, doc) => {
  if (!acc[doc.category]) {
    acc[doc.category] = []
  }
  acc[doc.category].push(doc)
  return acc
}, {})

const sortedCategories = Object.entries(groupedDocs)
  .sort(
    (a, b) => (a[1][0].categoryOrder ?? 999) - (b[1][0].categoryOrder ?? 999),
  )
  .map(([category, docs]) => ({
    category,
    docs: docs.sort((a, b) => (a.order ?? 999) - (b.order ?? 999)),
  }))

const DocsSidebar = () => {
  const pathname = usePathname()
  const params = useParams()
  return (
    <aside
      className={`sticky left-0 ${
        isDemoEnvironment ? 'top-[170px]' : 'top-[120px]'
      } h-screen w-64 border-r p-4`}>
      <nav>
        {sortedCategories.map(({ category, docs }) => (
          <div key={category} className='mb-4'>
            <h2 className='text-lg font-semibold'>{category}</h2>
            <ul className='ml-2'>
              {docs.map(doc => (
                <li key={doc.slug} className='py-1'>
                  <Link
                    href={`/${params.organisation}/docs/${doc.categorySlug}/${doc.slug}`}
                    className={`block hover:underline ${
                      pathname === `/docs/${doc.categorySlug}/${doc.slug}`
                        ? 'font-semibold text-primary'
                        : 'text-muted-foreground'
                    }`}>
                    {doc.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}

export default DocsSidebar
