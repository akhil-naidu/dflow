import { encryptedField } from '@oversightstudio/encrypted-fields'
import { CollectionConfig } from 'payload'

export const DockerRegistries: CollectionConfig = {
  slug: 'dockerRegistries',
  admin: {
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Name',
      required: true,
    },
    {
      name: 'type',
      type: 'select',
      label: 'Type',
      options: [
        { label: 'Docker', value: 'docker' },
        { label: 'Github', value: 'github' },
        { label: 'Digital Ocean', value: 'digitalocean' },
        { label: 'Quay', value: 'quay' },
      ],
      required: true,
    },
    encryptedField({
      name: 'username',
      type: 'text',
      required: true,
    }),
    encryptedField({
      name: 'password',
      type: 'text',
      required: true,
    }),
  ],
}
