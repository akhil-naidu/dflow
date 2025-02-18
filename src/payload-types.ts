/* tslint:disable */
/* eslint-disable */
/**
 * This file was automatically generated by Payload.
 * DO NOT MODIFY IT BY HAND. Instead, modify your source Payload config,
 * and re-run `payload generate:types` to regenerate this file.
 */

/**
 * Supported timezones in IANA format.
 *
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "supportedTimezones".
 */
export type SupportedTimezones =
  | 'Pacific/Midway'
  | 'Pacific/Niue'
  | 'Pacific/Honolulu'
  | 'Pacific/Rarotonga'
  | 'America/Anchorage'
  | 'Pacific/Gambier'
  | 'America/Los_Angeles'
  | 'America/Tijuana'
  | 'America/Denver'
  | 'America/Phoenix'
  | 'America/Chicago'
  | 'America/Guatemala'
  | 'America/New_York'
  | 'America/Bogota'
  | 'America/Caracas'
  | 'America/Santiago'
  | 'America/Buenos_Aires'
  | 'America/Sao_Paulo'
  | 'Atlantic/South_Georgia'
  | 'Atlantic/Azores'
  | 'Atlantic/Cape_Verde'
  | 'Europe/London'
  | 'Europe/Berlin'
  | 'Africa/Lagos'
  | 'Europe/Athens'
  | 'Africa/Cairo'
  | 'Europe/Moscow'
  | 'Asia/Riyadh'
  | 'Asia/Dubai'
  | 'Asia/Baku'
  | 'Asia/Karachi'
  | 'Asia/Tashkent'
  | 'Asia/Calcutta'
  | 'Asia/Dhaka'
  | 'Asia/Almaty'
  | 'Asia/Jakarta'
  | 'Asia/Bangkok'
  | 'Asia/Shanghai'
  | 'Asia/Singapore'
  | 'Asia/Tokyo'
  | 'Asia/Seoul'
  | 'Australia/Sydney'
  | 'Pacific/Guam'
  | 'Pacific/Noumea'
  | 'Pacific/Auckland'
  | 'Pacific/Fiji';

export interface Config {
  auth: {
    users: UserAuthOperations;
  };
  collections: {
    users: User;
    projects: Project;
    services: Service;
    servers: Server;
    sshKeys: SshKey;
    gitProviders: GitProvider;
    deployments: Deployment;
    domains: Domain;
    'payload-locked-documents': PayloadLockedDocument;
    'payload-preferences': PayloadPreference;
    'payload-migrations': PayloadMigration;
  };
  collectionsJoins: {
    projects: {
      services: 'services';
    };
  };
  collectionsSelect: {
    users: UsersSelect<false> | UsersSelect<true>;
    projects: ProjectsSelect<false> | ProjectsSelect<true>;
    services: ServicesSelect<false> | ServicesSelect<true>;
    servers: ServersSelect<false> | ServersSelect<true>;
    sshKeys: SshKeysSelect<false> | SshKeysSelect<true>;
    gitProviders: GitProvidersSelect<false> | GitProvidersSelect<true>;
    deployments: DeploymentsSelect<false> | DeploymentsSelect<true>;
    domains: DomainsSelect<false> | DomainsSelect<true>;
    'payload-locked-documents': PayloadLockedDocumentsSelect<false> | PayloadLockedDocumentsSelect<true>;
    'payload-preferences': PayloadPreferencesSelect<false> | PayloadPreferencesSelect<true>;
    'payload-migrations': PayloadMigrationsSelect<false> | PayloadMigrationsSelect<true>;
  };
  db: {
    defaultIDType: string;
  };
  globals: {};
  globalsSelect: {};
  locale: null;
  user: User & {
    collection: 'users';
  };
  jobs: {
    tasks: unknown;
    workflows: unknown;
  };
}
export interface UserAuthOperations {
  forgotPassword: {
    email: string;
    password: string;
  };
  login: {
    email: string;
    password: string;
  };
  registerFirstUser: {
    email: string;
    password: string;
  };
  unlock: {
    email: string;
    password: string;
  };
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "users".
 */
export interface User {
  id: string;
  updatedAt: string;
  createdAt: string;
  email: string;
  resetPasswordToken?: string | null;
  resetPasswordExpiration?: string | null;
  salt?: string | null;
  hash?: string | null;
  loginAttempts?: number | null;
  lockUntil?: string | null;
  password?: string | null;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "projects".
 */
export interface Project {
  id: string;
  /**
   * Enter the name of the project.
   */
  name: string;
  /**
   * Provide a brief description of the project.
   */
  description?: string | null;
  /**
   * Attach a server, all the servers in this project will be deployed in that server
   */
  server: string | Server;
  services?: {
    docs?: (string | Service)[] | null;
    hasNextPage?: boolean | null;
  } | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "servers".
 */
export interface Server {
  id: string;
  /**
   * Enter the name of the service.
   */
  name: string;
  /**
   * Provide a brief description of the service.
   */
  description?: string | null;
  type: 'master' | 'slave';
  sshKey: string | SshKey;
  /**
   * Enter the IP address of the server.
   */
  ip: string;
  /**
   * Enter the Port of the server.
   */
  port: number;
  /**
   * Enter the username of the server.
   */
  username: string;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "sshKeys".
 */
export interface SshKey {
  id: string;
  /**
   * Enter the name of the ssh key.
   */
  name: string;
  /**
   * Provide a brief description of the ssh key.
   */
  description?: string | null;
  publicKey: string;
  privateKey: string;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "services".
 */
export interface Service {
  id: string;
  /**
   * Select the project associated with this service.
   */
  project: string | Project;
  /**
   * Enter the name of the service.
   */
  name: string;
  /**
   * Provide a brief description of the service.
   */
  description?: string | null;
  type: 'database' | 'app' | 'docker';
  environmentVariables?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  builder?: ('nixpacks' | 'dockerfile' | 'herokuBuildPacks' | 'buildPacks') | null;
  provider?: (string | null) | GitProvider;
  providerType?: ('github' | 'gitlab' | 'bitbucket') | null;
  githubSettings?: {
    repository: string;
    owner: string;
    branch: string;
    buildPath: string;
  };
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "gitProviders".
 */
export interface GitProvider {
  id: string;
  type: 'github' | 'gitlab' | 'bitbucket';
  github?: {
    appName: string;
    appUrl: string;
    appId: number;
    clientId: string;
    clientSecret: string;
    installationId?: string | null;
    privateKey: string;
    webhookSecret: string;
    installationToken?: string | null;
    tokenExpiration?: string | null;
  };
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "deployments".
 */
export interface Deployment {
  id: string;
  /**
   * Adding the service for which deployment is related to
   */
  service: string | Service;
  status: 'queued' | 'building' | 'failed' | 'success';
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "domains".
 */
export interface Domain {
  id: string;
  service: string | Service;
  hostName: string;
  certificateType: 'letsencrypt' | 'none';
  autoRegenerateSSL: boolean;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-locked-documents".
 */
export interface PayloadLockedDocument {
  id: string;
  document?:
    | ({
        relationTo: 'users';
        value: string | User;
      } | null)
    | ({
        relationTo: 'projects';
        value: string | Project;
      } | null)
    | ({
        relationTo: 'services';
        value: string | Service;
      } | null)
    | ({
        relationTo: 'servers';
        value: string | Server;
      } | null)
    | ({
        relationTo: 'sshKeys';
        value: string | SshKey;
      } | null)
    | ({
        relationTo: 'gitProviders';
        value: string | GitProvider;
      } | null)
    | ({
        relationTo: 'deployments';
        value: string | Deployment;
      } | null)
    | ({
        relationTo: 'domains';
        value: string | Domain;
      } | null);
  globalSlug?: string | null;
  user: {
    relationTo: 'users';
    value: string | User;
  };
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-preferences".
 */
export interface PayloadPreference {
  id: string;
  user: {
    relationTo: 'users';
    value: string | User;
  };
  key?: string | null;
  value?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-migrations".
 */
export interface PayloadMigration {
  id: string;
  name?: string | null;
  batch?: number | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "users_select".
 */
export interface UsersSelect<T extends boolean = true> {
  updatedAt?: T;
  createdAt?: T;
  email?: T;
  resetPasswordToken?: T;
  resetPasswordExpiration?: T;
  salt?: T;
  hash?: T;
  loginAttempts?: T;
  lockUntil?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "projects_select".
 */
export interface ProjectsSelect<T extends boolean = true> {
  name?: T;
  description?: T;
  server?: T;
  services?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "services_select".
 */
export interface ServicesSelect<T extends boolean = true> {
  project?: T;
  name?: T;
  description?: T;
  type?: T;
  environmentVariables?: T;
  builder?: T;
  provider?: T;
  providerType?: T;
  githubSettings?:
    | T
    | {
        repository?: T;
        owner?: T;
        branch?: T;
        buildPath?: T;
      };
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "servers_select".
 */
export interface ServersSelect<T extends boolean = true> {
  name?: T;
  description?: T;
  type?: T;
  sshKey?: T;
  ip?: T;
  port?: T;
  username?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "sshKeys_select".
 */
export interface SshKeysSelect<T extends boolean = true> {
  name?: T;
  description?: T;
  publicKey?: T;
  privateKey?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "gitProviders_select".
 */
export interface GitProvidersSelect<T extends boolean = true> {
  type?: T;
  github?:
    | T
    | {
        appName?: T;
        appUrl?: T;
        appId?: T;
        clientId?: T;
        clientSecret?: T;
        installationId?: T;
        privateKey?: T;
        webhookSecret?: T;
        installationToken?: T;
        tokenExpiration?: T;
      };
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "deployments_select".
 */
export interface DeploymentsSelect<T extends boolean = true> {
  service?: T;
  status?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "domains_select".
 */
export interface DomainsSelect<T extends boolean = true> {
  service?: T;
  hostName?: T;
  certificateType?: T;
  autoRegenerateSSL?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-locked-documents_select".
 */
export interface PayloadLockedDocumentsSelect<T extends boolean = true> {
  document?: T;
  globalSlug?: T;
  user?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-preferences_select".
 */
export interface PayloadPreferencesSelect<T extends boolean = true> {
  user?: T;
  key?: T;
  value?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-migrations_select".
 */
export interface PayloadMigrationsSelect<T extends boolean = true> {
  name?: T;
  batch?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "auth".
 */
export interface Auth {
  [k: string]: unknown;
}


declare module 'payload' {
  export interface GeneratedTypes extends Config {}
}