import LayoutClient from '../layout.client'
import configPromise from '@payload-config'
import { Puzzle } from 'lucide-react'
import Link from 'next/link'
import { getPayload } from 'payload'

import TemplateDetails from '@/components/templates/TemplateDetails'
import { Button } from '@/components/ui/button'

interface PageProps {
  params: Promise<{ organisation: string }>
}

const page = async ({ params }: PageProps) => {
  const syncParams = await params
  const payload = await getPayload({ config: configPromise })

  const { docs: templates, totalDocs } = await payload.find({
    collection: 'templates',
    pagination: false,
    sort: '-createdAt',
    where: {
      'tenant.slug': {
        equals: syncParams.organisation,
      },
    },
  })

  return (
    <LayoutClient>
      <section>
        <div className='flex w-full justify-between'>
          <h3 className='text-2xl font-semibold'>Templates</h3>
          <Link href={`/${syncParams.organisation}/templates/compose`}>
            <Button>Create Template</Button>
          </Link>
        </div>

        {totalDocs > 0 ? (
          <div className='mt-4 w-full space-y-4'>
            {templates?.map(template => (
              <TemplateDetails key={template.id} template={template} />
            ))}
          </div>
        ) : (
          <div className='flex-co flex h-[50vh] w-full flex-col items-center justify-center space-y-2'>
            <Puzzle
              strokeWidth={1}
              size={62}
              className='text-muted-foreground opacity-50'
            />
            <p className='text-muted-foreground'>No Templates founds</p>
          </div>
        )}
      </section>
    </LayoutClient>
  )
}

export default page
