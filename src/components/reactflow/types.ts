import { DockerRegistry, GitProvider } from '@/payload-types'

export interface DatabaseDetails {
  type?: 'postgres' | 'mongo' | 'mysql' | 'redis' | 'mariadb' | null
  username?: string | null
  password?: string | null
  host?: string | null
  port?: number | null
  database?: string | null
  url?: string | null
  exposedPorts?: string[] | null
}

export interface ServiceNode {
  id: string
  name: string
  type: 'database' | 'app' | 'docker'
  createdAt?: string
  databaseDetails?: DatabaseDetails
  builder?:
    | 'railpack'
    | 'nixpacks'
    | 'dockerfile'
    | 'herokuBuildPacks'
    | 'buildPacks'
    | null
  provider?: string | GitProvider | null
  providerType?: 'github' | 'gitlab' | 'bitbucket' | null
  githubSettings?: {
    repository: string
    owner: string
    branch: string
    buildPath: string
    port?: number | null
  }
  dockerDetails?: {
    /**
     * Enter the docker-registry URL: ghrc://contentql/pin-bolt:latest
     */
    url?: string | null
    account?: (string | null) | DockerRegistry
    ports?:
      | {
          hostPort: number
          containerPort: number
          scheme: 'http' | 'https'
          id?: string | null
        }[]
      | null
  }
  variables?:
    | {
        key: string
        value: string
      }[]
    | null
}
