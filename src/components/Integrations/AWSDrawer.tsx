'use client'

import { Button } from '../ui/button'
import { Link } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { parseAsString, useQueryState } from 'nuqs'
import { useEffect } from 'react'

import { getCloudProvidersAccountsAction } from '@/actions/cloud'
import GithubIntegrationsLoading from '@/components/Integrations/GithubIntegrationsLoading'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { isDemoEnvironment } from '@/lib/constants'
import { integrationsList } from '@/lib/integrationList'

import CloudProvidersList from './CloudProvidersList'
import AWSAccountForm from './aws/AWSAccountForm'

const AWSDrawer = () => {
  const [activeSlide, setActiveSlide] = useQueryState(
    'active',
    parseAsString.withDefault(''),
  )

  const { execute, isPending, result } = useAction(
    getCloudProvidersAccountsAction,
  )

  const integration = integrationsList.find(
    integration => integration.slug === 'aws',
  )

  useEffect(() => {
    if (activeSlide === 'aws' && !result?.data) {
      execute({ type: 'aws' })
    }
  }, [activeSlide, result.data])

  const icon = integration ? (
    <div className='mb-2 flex size-14 items-center justify-center rounded-md border'>
      <div className='relative'>
        <integration.icon className='size-8 blur-lg saturate-200' />
        <integration.icon className='absolute inset-0 size-8' />
      </div>
    </div>
  ) : null

  return (
    <Sheet
      open={activeSlide === 'aws'}
      onOpenChange={state => {
        setActiveSlide(state ? 'aws' : '')
      }}>
      <SheetContent className='flex w-full flex-col justify-between sm:max-w-lg'>
        <SheetHeader className='text-left'>
          <SheetTitle className='flex w-full items-center gap-3 text-base'>
            {icon} Integration Settings
          </SheetTitle>

          <p className='pt-4 font-semibold'>{integration?.label}</p>
          <SheetDescription className='!mt-0'>
            {integration?.description}
          </SheetDescription>
        </SheetHeader>

        {isPending && <GithubIntegrationsLoading />}

        {!isPending && result.data && (
          <ScrollArea className='flex-grow'>
            <CloudProvidersList accounts={result.data} refetch={execute} />
          </ScrollArea>
        )}

        <SheetFooter>
          <AWSAccountForm refetch={execute}>
            <Button disabled={isDemoEnvironment}>
              <Link />
              Connect account
            </Button>
          </AWSAccountForm>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export default AWSDrawer
