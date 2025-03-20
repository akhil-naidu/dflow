import { NetdataApiParams } from '../types'
import { netdataAPI } from '../utils'

/**
 * Get a list of all node contexts (v1)
 * @param params API parameters
 * @returns List of all node contexts
 */
export const getNodeContexts = async (
  params: NetdataApiParams,
): Promise<any> => {
  return netdataAPI(params, 'contexts')
}
