import { create } from './apps/create'
import { destroy } from './apps/destroy'
import { list as appList } from './apps/list'
import { logs } from './apps/logs'
import { listVars } from './config/listVars'
import { set } from './config/set'
import { unset } from './config/unset'
import { info as distroInfo } from './distro/info'
import { options } from './docker/options'
import { add } from './domains/add'
import { addGlobal } from './domains/addGlobal'
import { remove } from './domains/remove'
import { removeGlobal } from './domains/removeGlobal'
import { report } from './domains/report'
import { set as domainsSet } from './domains/set'
import { setGlobal } from './domains/setGlobal'
import { auth } from './git/auth'
import { deployImage } from './git/deployImage'
import { sync } from './git/sync'
import { unlock } from './git/unlock'
import { create as createDatabase } from './plugin/database/create'
import { destroy as destroyDb } from './plugin/database/destroy'
import { expose as exposeDatabasePort } from './plugin/database/expose'
import { info } from './plugin/database/info'
import { infoVersion } from './plugin/database/infoVersion'
import { link } from './plugin/database/link'
import { links as databaseLinks } from './plugin/database/links'
import { list as databaseList } from './plugin/database/list'
import { logs as databaseLogs } from './plugin/database/logs'
import { restart as databaseRestart } from './plugin/database/restart'
import { stop as stopDatabase } from './plugin/database/stop'
import { unexpose as unexposeDatabasePort } from './plugin/database/unexpose'
import { unlink } from './plugin/database/unlink'
import { install as dokkuPluginInstall } from './plugin/install'
import { installed } from './plugin/installed'
import { addCron } from './plugin/letsEncrypt/cron'
import { letsencryptEmail } from './plugin/letsEncrypt/email'
import { enable } from './plugin/letsEncrypt/enable'
import { status as letsencryptStatus } from './plugin/letsEncrypt/status'
import { list } from './plugin/list'
import { toggle } from './plugin/toggle'
import { uninstall as PluginUninstall } from './plugin/uninstall'
import { portsAdd } from './ports/add'
import { portsList } from './ports/list'
import { portsRemove } from './ports/remove'
import { portsSet } from './ports/set'
import { restart } from './process/restart'
import { stop } from './process/stop'
import { info as dokkuVersionInfo } from './version/info'
import { install as dokkuInstall } from './version/install'

export const dokku = {
  apps: { create, logs, destroy, list: appList },
  plugin: {
    installed,
    list,
    toggle,
    install: dokkuPluginInstall,
    uninstall: PluginUninstall,
  },
  config: { listVars, set, unset },
  docker: {
    options,
  },
  database: {
    destroy: destroyDb,
    info,
    infoVersion,
    logs: databaseLogs,
    list: databaseList,
    listLinks: databaseLinks,
    create: createDatabase,
    link,
    unlink,
    restart: databaseRestart,
    stop: stopDatabase,
    expose: exposeDatabasePort,
    unexpose: unexposeDatabasePort,
  },
  ports: {
    list: portsList,
    set: portsSet,
    add: portsAdd,
    remove: portsRemove,
  },
  process: {
    restart,
    stop,
  },
  domains: {
    report,
    set: domainsSet,
    remove,
    add,
    addGlobal,
    removeGlobal,
    setGlobal,
  },
  letsencrypt: {
    email: letsencryptEmail,
    cron: addCron,
    enable,
    status: letsencryptStatus,
  },
  git: {
    sync,
    unlock,
    auth,
    deployImage,
  },
  version: {
    info: dokkuVersionInfo,
    install: dokkuInstall,
  },
  distro: {
    info: distroInfo,
  },
}
