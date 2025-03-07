import { createLoader, parseAsStringEnum } from 'nuqs/server'

// Describe your search params, and reuse this in useQueryStates / createSerializer:
export const servicePageTabs = {
  tab: parseAsStringEnum([
    'general',
    'environment',
    'logs',
    'domains',
    'deployments',
  ]).withDefault('general'),
}

export const loadServicePageTabs = createLoader(servicePageTabs)
