# Server Onboarding

- Installing dokku `src/queues/dokku/install.ts`
- Installing let's-encrypt plugin `src/queues/plugin/create.ts`
- Installing railpack `src/queues/builder/installRailpack.ts`
- Configuring let's-encrypt global-email & creating a cron to auto-generate-ssl
  `src/queues/letsencrypt/configure.ts`
- Configuring a global domain `src/queues/domain/manageGlobal.ts`

## Plugins

- Plugin installation triggers `src/queues/plugin/create.ts`
- Plugin status toggle triggers `src/queues/plugin/toggle.ts`
- Plugin deletion `src/queues/plugin/delete.ts`
