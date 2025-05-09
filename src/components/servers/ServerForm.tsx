'use client'

import { ComingSoonBadge } from '../ComingSoonBadge'
import { ArrowRight, ChevronLeft, Server } from 'lucide-react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { parseAsString, useQueryState } from 'nuqs'
import React, { useEffect, useId, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cloudProvidersList } from '@/lib/integrationList'
import { SecurityGroup, SshKey } from '@/payload-types'
import { ServerType } from '@/payload-types-overrides'

import AttachCustomServerForm from './AttachCustomServerForm'
import CreateEC2InstanceForm from './CreateEC2InstanceForm'

interface ServerSelectionFormProps {
  setType: (type: string) => void
  type: string
  isOnboarding: boolean
}

interface ServerFormContentProps {
  type: string
  sshKeys: SshKey[]
  securityGroups?: SecurityGroup[]
  server?: ServerType
  formType?: 'create' | 'update'
  onBack: () => void
  isOnboarding: boolean
}

interface ServerFormProps {
  sshKeys: SshKey[]
  securityGroups?: SecurityGroup[]
  server?: ServerType
  formType?: 'create' | 'update'
}

const ServerSelectionForm: React.FC<ServerSelectionFormProps> = ({
  setType,
  type,
  isOnboarding,
}) => {
  const id = useId()
  const [selectedOption, setSelectedOption] = useState<string>('manual')

  const handleContinue = () => {
    setType(selectedOption)
  }

  return (
    <div className='space-y-8'>
      {!isOnboarding && (
        <div>
          <h2 className='text-2xl font-semibold'>Choose a Deployment Option</h2>
          <p className='mt-1 text-muted-foreground'>
            Select a cloud provider or add server details manually
          </p>
        </div>
      )}

      <div className='space-y-6'>
        {/* Cloud Providers Section */}
        <Card className='border shadow-sm'>
          <CardHeader className='pb-0'>
            <CardTitle className='text-lg font-medium'>
              Cloud Providers
            </CardTitle>
          </CardHeader>
          <CardContent className='p-6'>
            <RadioGroup
              className='grid grid-cols-1 gap-6 md:grid-cols-2'
              value={selectedOption}
              onValueChange={setSelectedOption}>
              {cloudProvidersList.map(provider => {
                const { label, Icon, live, slug } = provider

                return (
                  <ComingSoonBadge
                    position='top-right'
                    hideBadge={live}
                    key={slug}>
                    <div
                      className={`relative flex w-full items-start rounded-md border ${
                        selectedOption === slug
                          ? 'border-2 border-primary'
                          : 'border-input'
                      } p-4 transition-all duration-200 ${
                        !live
                          ? 'cursor-not-allowed opacity-60'
                          : 'cursor-pointer hover:border-primary/50'
                      }`}>
                      <RadioGroupItem
                        value={slug}
                        id={`${id}-${slug}`}
                        disabled={!live}
                        className='order-1 after:absolute after:inset-0'
                      />
                      <div className='flex grow items-center gap-4'>
                        <div className='flex h-10 w-10 items-center justify-center rounded-full bg-secondary'>
                          {Icon && <Icon className='h-5 w-5' />}
                        </div>
                        <div>
                          <Label
                            htmlFor={`${id}-${slug}`}
                            className='cursor-pointer font-medium'>
                            {label}
                          </Label>
                        </div>
                      </div>
                    </div>
                  </ComingSoonBadge>
                )
              })}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Manual Configuration Section */}
        <Card className='border shadow-sm'>
          <CardHeader className='pb-0'>
            <CardTitle className='text-lg font-medium'>
              Manual Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className='p-6'>
            <RadioGroup
              className='grid grid-cols-1'
              value={selectedOption}
              onValueChange={setSelectedOption}>
              <div
                className={`relative flex w-full items-start rounded-md border ${
                  selectedOption === 'manual'
                    ? 'border-2 border-primary'
                    : 'border-input'
                } cursor-pointer p-4 transition-all duration-200 hover:border-primary/50`}>
                <RadioGroupItem
                  value='manual'
                  id={`${id}-manual`}
                  className='order-1 after:absolute after:inset-0'
                />
                <div className='flex grow items-center gap-4'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-full bg-secondary'>
                    <Server className='h-5 w-5' />
                  </div>
                  <div>
                    <Label
                      htmlFor={`${id}-manual`}
                      className='cursor-pointer font-medium'>
                      Manual Setup
                    </Label>
                    <p className='text-sm text-muted-foreground'>
                      Bring your own server details
                    </p>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Button
          className='w-full'
          size='lg'
          disabled={!selectedOption}
          onClick={handleContinue}>
          {selectedOption === 'manual'
            ? 'Continue with Manual Setup'
            : `Continue with ${cloudProvidersList.find(p => p.slug === selectedOption)?.label || 'Selected Provider'}`}
          <ArrowRight className='ml-2 h-4 w-4' />
        </Button>
      </div>
    </div>
  )
}

const ServerFormContent: React.FC<ServerFormContentProps> = ({
  type,
  sshKeys,
  securityGroups,
  server,
  formType,
  onBack,
  isOnboarding,
}) => {
  const router = useRouter()

  const { organisation } = useParams()

  if (!type) return null

  const providerName =
    type === 'manual'
      ? 'Manual Server Configuration'
      : `Configure ${cloudProvidersList.find(p => p.slug === type)?.label} Server`

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-2'>
        <Button
          variant='ghost'
          size='icon'
          onClick={onBack}
          className='h-8 w-8'>
          <ChevronLeft className='h-5 w-5' />
        </Button>
        <h2 className='text-xl font-semibold'>{providerName}</h2>
      </div>

      <Card className='border shadow-sm'>
        <CardContent className='p-6'>
          {type === 'aws' ? (
            <CreateEC2InstanceForm
              sshKeys={sshKeys}
              securityGroups={securityGroups}
              formType={formType}
              onSuccess={() => {
                if (isOnboarding) {
                  router.push('/onboarding/dokku-install')
                } else {
                  router.push(`/${organisation}/servers`)
                }
              }}
            />
          ) : (
            <AttachCustomServerForm
              sshKeys={sshKeys}
              server={server}
              formType={formType}
              onSuccess={() => {
                if (isOnboarding) {
                  router.push('/onboarding/dokku-install')
                } else {
                  router.push(`/${organisation}/servers`)
                }
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const ServerForm: React.FC<ServerFormProps> = ({
  sshKeys,
  securityGroups,
  server,
  formType,
}) => {
  const [type, setType] = useQueryState('type', parseAsString.withDefault(''))

  const pathName = usePathname()
  const isOnboarding = pathName.includes('onboarding')

  useEffect(() => {
    return () => {
      setType('')
    }
  }, [])

  const handleResetType = () => {
    setType('')
  }

  return (
    <div className='mx-auto w-full'>
      {!type ? (
        <ServerSelectionForm
          setType={setType}
          type={type}
          isOnboarding={isOnboarding}
        />
      ) : (
        <ServerFormContent
          type={type}
          sshKeys={sshKeys}
          securityGroups={securityGroups}
          server={server}
          formType={formType}
          onBack={handleResetType}
          isOnboarding={isOnboarding}
        />
      )}
    </div>
  )
}

export default ServerForm
