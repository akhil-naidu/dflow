'use client'

import LayoutClient from '../layout.client'
import {
  allDeployments,
  allEnvironmentVariables,
  allGettingStarteds,
  allIntroductions,
  allProjects,
  allServices,
} from 'content-collections'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Doc =
  | (typeof allGettingStarteds)[number]
  | (typeof allProjects)[number]
  | (typeof allEnvironmentVariables)[number]
  | (typeof allDeployments)[number]
  | (typeof allServices)[number]
  | (typeof allIntroductions)[number] // Type for a single doc
type GroupedDocs = Record<string, Doc[]> // Object where keys are categories

// Combine all collections
const allDocs: Doc[] = [
  ...allGettingStarteds,
  ...allIntroductions,
  ...allProjects,
  ...allServices,
  ...allEnvironmentVariables,
  ...allDeployments,
]

// Group by category and sort categories & documents
const groupedDocs: GroupedDocs = allDocs.reduce<GroupedDocs>((acc, doc) => {
  if (!acc[doc.category]) {
    acc[doc.category] = []
  }
  acc[doc.category].push(doc)
  return acc
}, {})

// Sort categories by categoryOrder
const sortedCategories = Object.entries(groupedDocs)
  .sort(
    (a, b) => (a[1][0].categoryOrder ?? 999) - (b[1][0].categoryOrder ?? 999),
  ) // Default to 999 if missing
  .map(([category, docs]) => ({
    category,
    docs: docs.sort((a, b) => (a.order ?? 999) - (b.order ?? 999)), // Sort docs within category
  }))

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() // Get current URL path
  return (
    <LayoutClient>
      <section className='flex h-full w-full'>
        {/* Sidebar */}
        <aside className='sticky left-0 top-[170px] h-screen w-64 border-r p-4'>
          <nav>
            {sortedCategories.map(({ category, docs }) => {
              return (
                <div key={category} className='mb-4'>
                  <h2 className='text-lg font-semibold'>{category}</h2>
                  <ul className='ml-2'>
                    {docs.map(doc => {
                      return (
                        <li key={doc.slug} className='py-1'>
                          <Link
                            href={`/docs/${doc.categorySlug}/${doc.slug}`}
                            className={`block text-muted-foreground hover:underline ${
                              pathname ===
                              `/docs/${doc.categorySlug}/${doc.slug}`
                                ? 'font-semibold text-primary'
                                : 'text-muted-foreground'
                            }`}>
                            {doc.title}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </nav>
        </aside>

        {/* Right Side Content */}
        <div className='h-full flex-1 p-6'>{children}</div>
      </section>
    </LayoutClient>
  )
}
