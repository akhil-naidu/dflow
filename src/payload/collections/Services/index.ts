import { CollectionConfig, Field } from 'payload'

const databaseField: Field = {
  label: 'Database Details',
  type: 'collapsible',
  admin: {
    // App settings field will be considered if service-type is app
    condition: data => {
      if (data.type === 'database') {
        return true
      }
      return false
    },
  },
  fields: [
    {
      name: 'databaseDetails',
      label: 'Database Details',
      type: 'group',
      fields: [
        {
          name: 'type',
          type: 'select',
          options: [
            {
              label: 'Postgres',
              value: 'postgres',
            },
            {
              label: 'MongoDB',
              value: 'mongo',
            },
            {
              label: 'MySQL',
              value: 'mysql',
            },
            {
              label: 'Redis',
              value: 'redis',
            },
            {
              label: 'MariaDB',
              value: 'mariadb',
            },
          ],
        },
        {
          name: 'username',
          type: 'text',
        },
        {
          name: 'password',
          type: 'text',
        },
        {
          name: 'host',
          type: 'text',
        },
        {
          name: 'port',
          type: 'text',
        },
        {
          name: 'connectionUrl',
          type: 'text',
        },
        {
          name: 'version',
          type: 'text',
        },
        {
          name: 'status',
          type: 'select',
          options: [
            {
              label: 'Running',
              value: 'running',
            },
            {
              label: 'Missing',
              value: 'missing',
            },
            {
              label: 'Exited',
              value: 'exited',
            },
          ],
        },
        {
          name: 'exposedPorts',
          type: 'text',
          hasMany: true,
        },
      ],
    },
  ],
}

const applicationField: Field = {
  label: 'App Details',
  type: 'collapsible',
  admin: {
    // App settings field will be considered if service-type is app
    condition: data => {
      if (data.type === 'app') {
        return true
      }
      return false
    },
  },
  fields: [
    {
      name: 'provider',
      type: 'relationship',
      relationTo: 'gitProviders',
      hasMany: false,
    },
    {
      name: 'providerType',
      type: 'select',
      options: [
        {
          label: 'Github',
          value: 'github',
        },
        {
          label: 'Gitlab',
          value: 'gitlab',
        },
        {
          label: 'Bitbucket',
          value: 'bitbucket',
        },
      ],
    },
    {
      name: 'githubSettings',
      type: 'group',
      admin: {
        // App settings field will be considered if service-type is app
        condition: data => {
          if (data.providerType === 'github') {
            return true
          }
          return false
        },
      },
      fields: [
        {
          name: 'repository',
          type: 'text',
          required: true,
        },
        {
          name: 'owner',
          type: 'text',
          required: true,
        },
        {
          name: 'branch',
          type: 'text',
          required: true,
        },
        {
          name: 'buildPath',
          type: 'text',
          required: true,
          defaultValue: '/',
        },
        {
          name: 'port',
          type: 'number',
          defaultValue: 3000,
        },
      ],
    },
  ],
}

export const Services: CollectionConfig = {
  slug: 'services',
  labels: {
    singular: 'Service',
    plural: 'Services',
  },
  admin: {
    useAsTitle: 'name',
  },
  hooks: {
    // afterDelete: [deleteDokkuService],
  },
  access: {
    create: () => false,
    read: () => true,
    update: () => true,
    delete: () => true,
  },
  defaultPopulate: {
    name: true,
    description: true,
    updatedAt: true,
    createdAt: true,
    type: true,
    databaseDetails: true,
  },
  fields: [
    {
      name: 'project',
      type: 'relationship',
      label: 'Project',
      relationTo: 'projects',
      required: true,
      access: {
        update: () => false,
      },
      admin: {
        position: 'sidebar',
        description: 'Select the project associated with this service.',
      },
    },
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
      name: 'type',
      type: 'select',
      label: 'Type',
      required: true,
      options: [
        { label: 'Database', value: 'database' },
        { label: 'App', value: 'app' },
        { label: 'Docker', value: 'docker' },
      ],
    },
    // Storing environment variables in JSON format
    // there will be 2 types of variables
    // 1. default variables MY_VARIABLE="Something"
    // 2. reference variables 👇
    //   DATABASE_URI: {
    //   type: "reference",
    //   value: "mongodb://something",
    //   linkedService: "mongo-database", // the Dokku service name
    //   dokkuAlias: "MONGO_DATABASE_DB_URL",  // used when running dokku config
    // }
    {
      name: 'environmentVariables',
      type: 'json',
    },
    // Builder settings
    {
      name: 'builder',
      type: 'select',
      options: [
        { label: 'Railpack', value: 'railpack' },
        { label: 'Nixpacks', value: 'nixpacks' },
        { label: 'Dockerfile', value: 'dockerfile' },
        { label: 'Heroku build packs', value: 'herokuBuildPacks' },
        { label: 'Build packs', value: 'buildPacks' },
      ],
      defaultValue: 'railpack',
      admin: {
        condition: data => {
          if (data.type === 'app' || data.type === 'docker') {
            return true
          }
          return false
        },
      },
    },
    applicationField,
    databaseField,
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
          name: 'autoRegenerateSSL',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'certificateType',
          type: 'select',
          options: [
            {
              label: 'Letsencrypt',
              value: 'letsencrypt',
            },
            {
              label: 'None',
              value: 'none',
            },
          ],
        },
      ],
    },
    // deployments join field
    {
      name: 'deployments',
      type: 'join',
      label: 'Deployments',
      collection: 'deployments',
      on: 'service',
    },
    // linked services
    {
      label: 'Linked Services',
      name: 'linkedServices',
      type: 'text',
      hasMany: true,
    },
  ],
}
