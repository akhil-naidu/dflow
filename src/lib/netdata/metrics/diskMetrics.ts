import { MetricsResponse, NetdataApiParams, NetdataContexts } from '../types'
import { getTimeSeriesData } from '../utils'

export interface DiskSpaceUsageDetailed {
  timestamp: string
  usedPercent: number
  [key: string]: string | number
}

export interface DiskIODetailed {
  timestamp: string
  readKbps: number
  writeKbps: number
  [key: string]: string | number
}

export interface SystemIODetailed {
  timestamp: string
  readKbps: number
  writeKbps: number
  [key: string]: string | number
}

/**
 * Retrieves disk space usage data with comprehensive formatting
 * @param params - Parameters for fetching metrics
 * @param minutes - Number of minutes of data to retrieve (default: 30)
 * @returns Disk space usage metrics with overview and detailed data
 */
export const getDiskSpaceUsage = async (
  params: NetdataApiParams,
  minutes: number = 30,
): Promise<
  MetricsResponse<{
    overview: { timestamp: string; usedPercent: number }[]
    detailed: DiskSpaceUsageDetailed[]
  }>
> => {
  const result = await getTimeSeriesData(
    params,
    NetdataContexts.DISK_SPACE,
    undefined,
    minutes,
  )
  if (!result.success || !result.data) {
    return {
      success: false,
      message: result.message || 'Failed to retrieve disk space usage data',
      data: undefined,
    }
  }

  // Comprehensive formatting of disk space data
  const formattedData: DiskSpaceUsageDetailed[] = result.data.data.map(
    (point: any) => ({
      timestamp: point.timestamp || new Date().toISOString(),
      usedPercent: (() => {
        const used = Number(point.used || 0)
        const avail = Number(point.avail || 0)
        const total = used + avail
        return total > 0 ? Math.round((used / total) * 100) : 0
      })(),
      ...Object.fromEntries(
        Object.entries(point)
          .filter(([key]) => key !== 'timestamp')
          .map(([key, value]) => [key, Number(value) || 0]),
      ),
    }),
  )

  // Create simplified overview data
  const overview = formattedData.map(point => ({
    timestamp: point.timestamp,
    usedPercent: point.usedPercent,
  }))

  return {
    success: true,
    message: 'Disk space usage retrieved successfully',
    data: {
      overview,
      detailed: formattedData,
    },
  }
}

/**
 * Retrieves disk I/O statistics with comprehensive formatting
 * @param params - Parameters for fetching metrics
 * @param minutes - Number of minutes of data to retrieve (default: 30)
 * @returns Disk I/O metrics with overview and detailed data
 */
export const getDiskIO = async (
  params: NetdataApiParams,
  minutes: number = 30,
): Promise<
  MetricsResponse<{
    overview: { timestamp: string; readKbps: number; writeKbps: number }[]
    detailed: DiskIODetailed[]
  }>
> => {
  const result = await getTimeSeriesData(
    params,
    NetdataContexts.DISK_IO,
    undefined,
    minutes,
  )
  if (!result.success || !result.data) {
    return {
      success: false,
      message: result.message || 'Failed to retrieve disk I/O data',
      data: undefined,
    }
  }

  // Comprehensive formatting of disk I/O data
  const formattedData: DiskIODetailed[] = result.data.data.map(
    (point: any) => ({
      timestamp: point.timestamp || new Date().toISOString(),
      readKbps: Math.abs(Number(point.reads || 0) / 1024),
      writeKbps: Math.abs(Number(point.writes || 0) / 1024),
      ...Object.fromEntries(
        Object.entries(point)
          .filter(
            ([key]) =>
              key !== 'timestamp' && key !== 'reads' && key !== 'writes',
          )
          .map(([key, value]) => [key, Number(value) || 0]),
      ),
    }),
  )

  // Create simplified overview data
  const overview = formattedData.map(point => ({
    timestamp: point.timestamp,
    readKbps: parseFloat(point.readKbps.toFixed(2)),
    writeKbps: parseFloat(point.writeKbps.toFixed(2)),
  }))

  return {
    success: true,
    message: 'Disk I/O retrieved successfully',
    data: {
      overview,
      detailed: formattedData,
    },
  }
}

/**
 * Retrieves system-wide I/O statistics with comprehensive formatting
 * @param params - Parameters for fetching metrics
 * @param minutes - Number of minutes of data to retrieve (default: 30)
 * @returns System I/O metrics with overview and detailed data
 */
export const getSystemIO = async (
  params: NetdataApiParams,
  minutes: number = 30,
): Promise<
  MetricsResponse<{
    overview: { timestamp: string; readKbps: number; writeKbps: number }[]
    detailed: SystemIODetailed[]
  }>
> => {
  const result = await getTimeSeriesData(
    params,
    NetdataContexts.SYSTEM_IO,
    undefined,
    minutes,
  )
  if (!result.success || !result.data) {
    return {
      success: false,
      message: result.message || 'Failed to retrieve system I/O data',
      data: undefined,
    }
  }

  // Comprehensive formatting of system I/O data
  const formattedData: SystemIODetailed[] = result.data.data.map(
    (point: any) => ({
      timestamp: point.timestamp || new Date().toISOString(),
      readKbps: Math.abs(Number(point.reads || 0) / 1024),
      writeKbps: Math.abs(Number(point.writes || 0) / 1024),
      ...Object.fromEntries(
        Object.entries(point)
          .filter(
            ([key]) =>
              key !== 'timestamp' && key !== 'reads' && key !== 'writes',
          )
          .map(([key, value]) => [key, Number(value) || 0]),
      ),
    }),
  )

  // Create simplified overview data
  const overview = formattedData.map(point => ({
    timestamp: point.timestamp,
    readKbps: parseFloat(point.readKbps.toFixed(2)),
    writeKbps: parseFloat(point.writeKbps.toFixed(2)),
  }))

  return {
    success: true,
    message: 'System I/O retrieved successfully',
    data: {
      overview,
      detailed: formattedData,
    },
  }
}
