import { CollectionConfig, Field } from 'payload'

import { isAdmin } from '@/payload/access/isAdmin'

import { populateDokkuVersion } from './hooks/populateDokkuVersion'

const pluginFields: Field[] = [
  {
    name: 'name',
    type: 'text',
    required: true,
  },
  {
    name: 'version',
    type: 'text',
    required: true,
  },
  {
    name: 'status',
    type: 'select',
    options: [
      {
        label: 'Enabled',
        value: 'enabled',
      },
      {
        label: 'Disabled',
        value: 'disabled',
      },
    ],
    required: true,
  },
  {
    name: 'configuration',
    type: 'json',
  },
]

export const Servers: CollectionConfig = {
  slug: 'servers',
  labels: {
    singular: 'Server',
    plural: 'Servers',
  },
  admin: {
    useAsTitle: 'name',
  },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
    readVersions: isAdmin,
  },
  hooks: {
    afterRead: [populateDokkuVersion],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Name',
      required: true,
      admin: {
        description: 'Enter the name of the service.',
        placeholder: 'e.g., test-service',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      admin: {
        description: 'Provide a brief description of the service.',
        placeholder: 'test-service database',
      },
    },
    {
      name: 'provider',
      type: 'select',
      required: true,
      options: [
        {
          label: 'DigitalOcean',
          value: 'digitalocean',
        },
        {
          label: 'AWS',
          value: 'aws',
        },
        {
          label: 'Google Cloud Platform',
          value: 'gcp',
        },
        {
          label: 'Azure',
          value: 'azure',
        },
        {
          label: 'Other',
          value: 'other',
        },
      ],
      defaultValue: 'other',
    },
    {
      name: 'instanceId',
      type: 'text',
      admin: {
        condition: data => {
          if (data.provider !== 'other') {
            return true
          }

          return false
        },
      },
    },
    {
      name: 'cloudProviderAccount',
      type: 'relationship',
      relationTo: 'cloudProviderAccounts',
      admin: {
        condition: data => {
          if (data.provider !== 'other') {
            return true
          }

          return false
        },
      },
    },
    {
      name: 'sshKey',
      type: 'relationship',
      relationTo: 'sshKeys',
      hasMany: false,
      required: true,
      maxDepth: 10,
    },
    {
      name: 'securityGroups',
      type: 'relationship',
      relationTo: 'securityGroups',
      hasMany: true,
      maxDepth: 10,
      admin: {
        condition: data => {
          if (data.provider !== 'other') {
            return true
          }

          return false
        },
      },
    },
    {
      name: 'ip',
      type: 'text',
      label: 'IP Address',
      required: true,
      admin: {
        description: 'Enter the IP address of the server.',
        placeholder: 'e.g: 0:0:0:0',
      },
      unique: true,
    },
    {
      name: 'port',
      type: 'number',
      label: 'Port Number',
      required: true,
      admin: {
        description: 'Enter the Port of the server.',
        placeholder: 'e.g: 3000',
      },
    },
    {
      name: 'username',
      type: 'text',
      label: 'Username',
      required: true,
      admin: {
        description: 'Enter the username of the server.',
        placeholder: 'e.g: root',
      },
    },
    {
      name: 'plugins',
      type: 'array',
      fields: pluginFields,
    },
    {
      name: 'domains',
      type: 'array',
      fields: [
        {
          name: 'domain',
          type: 'text',
          required: true,
        },
        {
          name: 'default',
          type: 'checkbox',
          required: true,
        },
      ],
    },
    {
      name: 'onboarded',
      type: 'checkbox',
      label: 'Onboarded',
      defaultValue: false,
    },
  ],
}
