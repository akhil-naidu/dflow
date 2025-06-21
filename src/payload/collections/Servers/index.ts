import { CollectionConfig, Field } from 'payload'

import { isAdmin } from '@/payload/access/isAdmin'

import { ensureUniqueIP } from './hooks/ensureUniqueIP'
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
      name: 'hostname',
      type: 'text',
      label: 'Host Name',
      admin: {
        description: 'Enter the Hostname',
        placeholder: 'e.g., vmi2653744',
      },
      defaultValue: undefined,
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
      name: 'sshKey',
      type: 'relationship',
      relationTo: 'sshKeys',
      hasMany: false,
      required: true,
      maxDepth: 10,
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
      hooks: {
        beforeValidate: [ensureUniqueIP],
      },
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
        {
          name: 'synced',
          type: 'checkbox',
          required: true,
          defaultValue: false,
        },
      ],
    },
    {
      name: 'onboarded',
      type: 'checkbox',
      label: 'Onboarded',
      defaultValue: false,
      admin: {
        position: 'sidebar',
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
          label: 'dFlow',
          value: 'dflow',
        },
        {
          label: 'Other',
          value: 'other',
        },
      ],
      defaultValue: 'other',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'cloudProviderAccount',
      type: 'relationship',
      relationTo: 'cloudProviderAccounts',
      admin: {
        position: 'sidebar',
        condition: data => {
          if (data.provider !== 'other') {
            return true
          }

          return false
        },
      },
    },
    {
      name: 'awsEc2Details',
      type: 'group',
      admin: {
        condition: data => data.provider === 'aws',
        description: 'AWS EC2 instance details',
        position: 'sidebar',
      },
      fields: [
        {
          name: 'instanceId',
          type: 'text',
          label: 'Instance ID',
          admin: {
            description: 'The EC2 instance ID (e.g., i-1234567890abcdef0)',
          },
        },
        {
          name: 'region',
          type: 'text',
          label: 'AWS Region',
          admin: {
            description:
              'The AWS region where the instance is deployed (e.g., us-east-1)',
          },
        },
        {
          name: 'imageId',
          type: 'text',
          label: 'AMI Image ID',
          admin: {
            description:
              'The Amazon Machine Image (AMI) ID used to launch the instance',
          },
        },
        {
          name: 'instanceType',
          type: 'text',
          label: 'Instance Type',
          admin: {
            description: 'The EC2 instance type (e.g., t2.micro, m5.large)',
          },
        },
        {
          name: 'diskSize',
          type: 'number',
          label: 'Disk Size (GB)',
          admin: {
            description: 'The size of the root volume in GB',
          },
        },
        {
          name: 'securityGroups',
          type: 'relationship',
          relationTo: 'securityGroups',
          hasMany: true,
          maxDepth: 10,
          admin: {
            description: 'Security groups associated with this instance',
          },
        },
        {
          name: 'launchTime',
          type: 'date',
          label: 'Launch Time',
          admin: {
            description: 'When the instance was launched',
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
        {
          name: 'state',
          type: 'text',
          label: 'Instance State',
          admin: {
            description:
              'Current state of the instance (e.g., running, stopped)',
          },
        },
        {
          name: 'subnetId',
          type: 'text',
          label: 'Subnet ID',
          admin: {
            description: 'The subnet where the instance is running',
          },
        },
        {
          name: 'vpcId',
          type: 'text',
          label: 'VPC ID',
          admin: {
            description: 'The VPC where the instance is running',
          },
        },
        {
          name: 'publicDnsName',
          type: 'text',
          label: 'Public DNS Name',
          admin: {
            description: 'The public DNS name assigned to the instance',
          },
        },
        {
          name: 'privateDnsName',
          type: 'text',
          label: 'Private DNS Name',
          admin: {
            description: 'The private DNS name assigned to the instance',
          },
        },
        {
          name: 'privateIpAddress',
          type: 'text',
          label: 'Private IP Address',
          admin: {
            description: 'The private IP address assigned to the instance',
          },
        },
        {
          name: 'publicIpAddress',
          type: 'text',
          label: 'Public IP Address',
          admin: {
            description: 'The public IP address assigned to the instance',
          },
        },
        {
          name: 'keyName',
          type: 'text',
          label: 'Key Pair Name',
          admin: {
            description: 'The key pair used to launch the instance',
          },
        },
        {
          name: 'architecture',
          type: 'text',
          label: 'Architecture',
          admin: {
            description:
              'The architecture of the instance (e.g., x86_64, arm64)',
          },
        },
      ],
    },
    {
      name: 'dflowVpsDetails',
      type: 'group',
      admin: {
        condition: data => data.provider === 'dflow',
        description: 'dFlow Vps details',
        position: 'sidebar',
      },
      fields: [
        {
          name: 'id',
          type: 'text',
          label: 'Id',
        },
        {
          name: 'instanceId',
          type: 'number',
          label: 'Instance Id',
        },
        {
          name: 'status',
          type: 'select',
          options: [
            { label: 'Provisioning', value: 'provisioning' },
            { label: 'Uninstalled', value: 'uninstalled' },
            { label: 'Running', value: 'running' },
            { label: 'Stopped', value: 'stopped' },
            { label: 'Error', value: 'error' },
            { label: 'Installing', value: 'installing' },
            { label: 'Unknown', value: 'unknown' },
            { label: 'Manual Provisioning', value: 'manual_provisioning' },
            { label: 'Product Not Available', value: 'product_not_available' },
            { label: 'Verification Required', value: 'verification_required' },
            { label: 'Rescue', value: 'rescue' },
            { label: 'Pending Payment', value: 'pending_payment' },
            { label: 'Other', value: 'other' },
            { label: 'Reset Password', value: 'reset_password' },
          ],
        },
      ],
    },
    {
      name: 'connection',
      label: 'Connection',
      type: 'group',
      admin: {
        description: 'Connection details for the server',
        position: 'sidebar',
      },
      fields: [
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          options: [
            {
              label: 'Success',
              value: 'success',
            },
            {
              label: 'Failed',
              value: 'failed',
            },
            {
              label: 'Not Checked Yet',
              value: 'not-checked-yet',
            },
          ],
          defaultValue: 'not-checked-yet',
        },
        {
          name: 'lastChecked',
          label: 'Last Checked',
          type: 'date',
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
      ],
    },
  ],
}
