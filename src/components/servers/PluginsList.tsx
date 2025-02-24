'use client'

import { PluginListType, pluginList } from '../plugins'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Switch } from '../ui/switch'
import { Download, LucideIcon, Plug2, RefreshCcw, Trash2 } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useParams } from 'next/navigation'
import { JSX, SVGProps } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  installPluginAction,
  syncPluginAction,
  togglePluginStatusAction,
} from '@/actions/plugin'
import { supportedPluginsSchema } from '@/actions/plugin/validator'
import {
  Letsencrypt,
  MariaDB,
  MongoDB,
  MySQL,
  PostgreSQL,
  RabbitMQ,
  Redis,
} from '@/components/icons'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ServerType } from '@/payload-types-overrides'

const groupBy = ({
  items,
  key,
}: {
  items: PluginListType[]
  key: keyof PluginListType
}) =>
  items.reduce(
    (result, item) => ({
      ...result,
      [item[key] as string]: [...(result[item[key] as string] || []), item],
    }),
    {} as Record<string, PluginListType[]>,
  )

const iconMapping: {
  [key in z.infer<typeof supportedPluginsSchema>]:
    | LucideIcon
    | ((props: SVGProps<SVGSVGElement>) => JSX.Element)
} = {
  postgres: PostgreSQL,
  rabbitmq: RabbitMQ,
  letsencrypt: Letsencrypt,
  mariadb: MariaDB,
  mongo: MongoDB,
  redis: Redis,
  mysql: MySQL,
}

const PluginCard = ({
  plugin,
  server,
}: {
  plugin: PluginListType | NonNullable<ServerType['plugins']>[number]
  server: ServerType
}) => {
  const { execute: installPlugin, isPending: isInstallingPlugin } = useAction(
    installPluginAction,
    {
      onSuccess: ({ data, input }) => {
        if (data?.success) {
          toast.success(`Added ${input.pluginName} plugin to deployment-queue`)
        }
      },
    },
  )

  const { execute: togglePluginStatus, isPending: isUpdatingPluginStatus } =
    useAction(togglePluginStatusAction, {
      onSuccess: ({ data, input }) => {
        if (data?.success) {
          toast.success(
            `Successfully ${input.enabled ? 'enabled' : 'disabled'} ${input.pluginName} plugin`,
          )
        }
      },
    })

  const params = useParams<{ id: string }>()
  const defaultPlugins = server.plugins ?? []
  const notCustomPlugin = 'value' in plugin
  const pluginName = notCustomPlugin ? plugin.value : plugin.name

  const installedPlugin = notCustomPlugin
    ? defaultPlugins.find(defaultPlugin => defaultPlugin.name === plugin.value)
    : plugin

  const Icon = 'value' in plugin ? iconMapping[plugin.value] : Plug2

  return (
    <Card className='h-full' key={pluginName}>
      <CardHeader className='w-full flex-row items-start justify-between'>
        <div>
          <CardTitle className='flex items-center gap-2'>
            <Icon className='size-5' />
            {pluginName}

            {installedPlugin && (
              <code className='font-normal text-muted-foreground'>
                {`(${installedPlugin.version})`}
              </code>
            )}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent
        className={`flex w-full items-center pt-4 ${installedPlugin ? 'justify-between' : 'justify-end'} `}>
        {installedPlugin && (
          <Switch
            disabled={isUpdatingPluginStatus}
            defaultChecked={installedPlugin.status === 'enabled'}
            onCheckedChange={enabled => {
              if (notCustomPlugin) {
                togglePluginStatus({
                  pluginName: plugin.value,
                  pluginURL: plugin.githubURL,
                  enabled,
                  serverId: server.id,
                })
              }
            }}
          />
        )}

        {installedPlugin ? (
          <Button variant='outline'>
            <Trash2 />
            Uninstall
          </Button>
        ) : (
          <Button
            variant='outline'
            disabled={isInstallingPlugin}
            onClick={() => {
              if (notCustomPlugin) {
                installPlugin({
                  pluginName: plugin.value,
                  pluginURL: plugin.githubURL,
                  serverId: params.id,
                })
              }
            }}>
            <Download />
            Install
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

const PluginSection = ({
  title,
  plugins,
  server,
}: {
  title: string
  plugins: PluginListType[] | NonNullable<ServerType['plugins']>
  server: ServerType
}) => {
  return (
    <div className='space-y-2 pt-2'>
      <h5 className='font-semibold capitalize'>{title}</h5>
      <div className='grid gap-x-4 gap-y-8 md:grid-cols-3'>
        {plugins.map((plugin, index) => {
          return <PluginCard plugin={plugin} key={index} server={server} />
        })}
      </div>
    </div>
  )
}

const PluginsList = ({ server }: { server: ServerType }) => {
  const { execute, isPending } = useAction(syncPluginAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success('Successfully synced plugins')
      }
    },
  })

  const customPlugins = server.plugins
    ? server?.plugins.filter(({ name }) => {
        const pluginExists = pluginList.find(plugin => plugin.value === name)

        return !pluginExists
      })
    : []

  const FormattedPlugins = Object.entries(
    groupBy({ items: pluginList, key: 'category' }),
  )

  return (
    <div className='space-y-4 rounded bg-muted/30 p-4'>
      <h4 className='text-lg font-semibold'>Plugins</h4>

      <Alert variant='info'>
        <RefreshCcw className='h-4 w-4' />
        <AlertTitle>Sync Plugins</AlertTitle>
        <AlertDescription className='flex w-full flex-col justify-between gap-2 md:flex-row'>
          <p>Sync the existing dokku plugins installed on server</p>
          <Button
            disabled={isPending}
            onClick={() => execute({ serverId: server.id })}
            variant='secondary'>
            Sync Plugins
          </Button>
        </AlertDescription>
      </Alert>

      {FormattedPlugins.map(([category, list]) => (
        <PluginSection
          title={category}
          server={server}
          plugins={list}
          key={category}
        />
      ))}

      {customPlugins.length ? (
        <PluginSection
          title='Custom Plugins'
          server={server}
          plugins={customPlugins}
        />
      ) : null}
    </div>
  )
}

export default PluginsList
