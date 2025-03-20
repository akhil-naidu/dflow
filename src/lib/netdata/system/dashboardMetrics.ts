import { NetdataApiParams } from '../types'
import { isApiAccessible, netdataAPI } from '../utils'

/**
 * Common response type for all metric functions
 */
export interface MetricsResponse<T> {
  success: boolean
  message: string
  data?: T
  error?: string
}

/**
 * Formats a Unix timestamp to a time string in HH:MM format
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return date.toTimeString().substring(0, 5) // HH:MM format
}

/**
 * Fetches and transforms time-series data from Netdata
 * @param params API connection parameters
 * @param chart Chart name to query
 * @param dataPoints Number of data points to retrieve
 * @returns Processed time-series data
 */
const getTimeSeriesData = async <T>(
  params: NetdataApiParams,
  chart: string,
  dataPoints: number = 100, // Default to 100 data points
): Promise<MetricsResponse<T[]>> => {
  // Check API accessibility first
  const apiAvailable = await isApiAccessible(params)
  if (!apiAvailable) {
    return {
      success: false,
      message: 'Netdata API is not accessible',
    }
  }

  // Build query with points parameter to limit data points
  const query = `data?chart=${chart}&points=${dataPoints}&format=json`

  // Fetch data
  const data = await netdataAPI(params, query)

  // if (chart === 'system.ram') {
  //   console.dir({ resultMemory: data }, { depth: null })
  // }

  // Check if we have data and labels
  if (
    !data ||
    !data.data ||
    data.data.length === 0 ||
    !data.labels ||
    data.labels.length === 0
  ) {
    return {
      success: false,
      message: `No data available for ${chart}`,
    }
  }

  // Get labels and data points
  const labels = data.labels
  const points = data.data

  // Transform the data to the required format based on labels
  return {
    success: true,
    message: `${chart} time series data retrieved successfully`,
    data: transformData(labels, points) as T[],
  }
}

/**
 * Helper function to transform raw data based on labels
 */
function transformData(labels: string[], dataPoints: any[]): any[] {
  const result = []

  // Process each data point
  for (const point of dataPoints) {
    const timestamp = point[0] // First element is always timestamp
    const timeStr = formatTimestamp(timestamp)

    const transformedPoint: any = { time: timeStr }

    // Add values based on label names
    for (let i = 1; i < labels.length; i++) {
      transformedPoint[labels[i]] = point[i]
    }

    result.push(transformedPoint)
  }

  return result
}

/**
 * Gets a single data point for a specific chart
 */
const getChartData = async <T>(
  params: NetdataApiParams,
  chart: string,
): Promise<MetricsResponse<T>> => {
  // Check API accessibility first
  const apiAvailable = await isApiAccessible(params)
  if (!apiAvailable) {
    return {
      success: false,
      message: 'Netdata API is not accessible',
    }
  }

  // Fetch data
  const data = await netdataAPI(params, `data?chart=${chart}`)

  // Check if we have data and labels
  if (
    !data ||
    !data.data ||
    data.data.length === 0 ||
    !data.labels ||
    data.labels.length === 0
  ) {
    return {
      success: false,
      message: `No data available for ${chart}`,
    }
  }

  // Get latest data point (last item in the data array)
  const latestData = data.data[data.data.length - 1]
  const labels = data.labels || []

  // Create a mapping of labels to values
  const processedData: any = {}

  // Skip the first element (timestamp)
  for (let i = 1; i < labels.length; i++) {
    processedData[labels[i]] = latestData[i]
  }

  return {
    success: true,
    message: `${chart} metrics retrieved successfully`,
    data: processedData as T,
  }
}

/**
 * Gets CPU usage time series data for shadcn graphs
 */
export const getCpuTimeSeriesData = async (
  params: NetdataApiParams,
  points: number = 24, // 24 data points by default
): Promise<MetricsResponse<any[]>> => {
  const result = await getTimeSeriesData(params, 'system.cpu', points)

  if (!result.success) return result

  // Transform to match the expected format: { time: 'HH:MM', usage: number }
  const formattedData = result.data!.map((point: any) => {
    // Calculate CPU usage based on all available metrics except 'time' and 'idle'
    let totalUsage = 0

    // Dynamically process all available CPU states
    for (const [key, value] of Object.entries(point)) {
      // Skip the 'time' field and 'idle' if it exists
      if (key !== 'time' && key !== 'idle' && typeof value === 'number') {
        totalUsage += value
      }
    }

    // If 'idle' is present, use it for the calculation (100 - idle)
    if (point.idle !== undefined && typeof point.idle === 'number') {
      totalUsage = 100 - point.idle
    }

    // Ensure the usage is within 0-100 range
    totalUsage = Math.min(100, Math.max(0, totalUsage))

    return {
      time: point.time,
      usage: parseFloat(totalUsage.toFixed(1)),
    }
  })

  return {
    success: true,
    message: 'CPU time series data retrieved successfully',
    data: formattedData,
  }
}

/**
 * Gets memory usage time series data for shadcn graphs
 */
export const getMemoryTimeSeriesData = async (
  params: NetdataApiParams,
  points: number = 24,
): Promise<MetricsResponse<any[]>> => {
  const result = await getTimeSeriesData(params, 'system.ram', points)

  if (!result.success) return result

  // Transform to match the expected format: { time: 'HH:MM', usage: number }
  const formattedData = result.data!.map((point: any) => {
    // Calculate memory usage percentage based on the available fields
    let usagePercent = 0

    // Method 1: If we have both used and free fields
    if (point.used !== undefined && point.free !== undefined) {
      const total =
        point.used + point.free + (point.cached || 0) + (point.buffers || 0)
      usagePercent = Math.round((point.used / total) * 100)
    }
    // Method 2: If we only have the used field but no direct total
    else if (point.used !== undefined) {
      // Sum all memory components to get total
      const total =
        (point.used || 0) +
        (point.free || 0) +
        (point.cached || 0) +
        (point.buffers || 0)

      if (total > 0) {
        usagePercent = Math.round((point.used / total) * 100)
      }
    }

    return {
      time: point.time,
      usage: usagePercent,
    }
  })

  return {
    success: true,
    message: 'Memory time series data retrieved successfully',
    data: formattedData,
  }
}

/**
 * Gets network usage time series data for shadcn graphs
 */
export const getNetworkTimeSeriesData = async (
  params: NetdataApiParams,
  points: number = 24,
): Promise<MetricsResponse<any[]>> => {
  const result = await getTimeSeriesData(params, 'system.net', points)

  if (!result.success) return result

  // Transform to match the expected format: { time: 'HH:MM', incoming: number, outgoing: number }
  const formattedData = result.data!.map((point: any) => {
    // For received (incoming) traffic
    let incoming = 0
    if (point.received !== undefined) {
      // Values are already in bytes/s, convert to MB/s
      // The values appear to be very small, so they might already be in MB/s or another unit
      // Check if value is already small (likely already in MB/s)
      if (Math.abs(point.received) < 1000) {
        incoming = parseFloat(Math.abs(point.received).toFixed(2))
      } else {
        // Convert from bytes/s to MB/s
        incoming = parseFloat(
          (Math.abs(point.received) / (1024 * 1024)).toFixed(2),
        )
      }
    }

    // For sent (outgoing) traffic - note that values are negative
    let outgoing = 0
    if (point.sent !== undefined) {
      // Use absolute value since sent traffic is represented as negative
      if (Math.abs(point.sent) < 1000) {
        outgoing = parseFloat(Math.abs(point.sent).toFixed(2))
      } else {
        outgoing = parseFloat((Math.abs(point.sent) / (1024 * 1024)).toFixed(2))
      }
    }

    return {
      time: point.time,
      incoming,
      outgoing,
    }
  })

  return {
    success: true,
    message: 'Network time series data retrieved successfully',
    data: formattedData,
  }
}

/**
 * Gets disk space usage data for shadcn charts
 * This function is specifically for disk space (not I/O)
 */
export const getDiskSpaceChartData = async (
  params: NetdataApiParams,
): Promise<MetricsResponse<any[]>> => {
  // Get disk space usage
  const diskSpaceData = await getTimeSeriesData(params, 'system.storage')

  // Format data for a pie chart
  const data = diskSpaceData.data as any[]
  let formattedData = []

  if (data.length > 0) {
    // Take the latest data point
    const latestData = data[data.length - 1]

    // Check if we have the right properties
    if (latestData.avail !== undefined && latestData.used !== undefined) {
      const total = latestData.avail + latestData.used
      const usedPercent = Math.round((latestData.used / total) * 100)
      const availPercent = 100 - usedPercent

      formattedData.push(
        { name: 'Used', value: usedPercent },
        { name: 'Available', value: availPercent },
      )
    } else {
      // Try alternative property names
      const used = latestData.used || latestData.space_used || 0
      const avail = latestData.avail || latestData.space_avail || 0

      if (used || avail) {
        const total = used + avail
        const usedPercent = total ? Math.round((used / total) * 100) : 50
        const availPercent = 100 - usedPercent

        formattedData.push(
          { name: 'Used', value: usedPercent },
          { name: 'Available', value: availPercent },
        )
      } else {
        // Fallback if we can't find appropriate metrics
        formattedData.push(
          { name: 'Used', value: 50 },
          { name: 'Available', value: 50 },
        )
      }
    }
  }

  return {
    success: true,
    message: 'Disk space usage data retrieved successfully',
    data: formattedData,
  }
}

/**
 * Gets disk I/O data for shadcn charts
 */
export const getDiskIOChartData = async (
  params: NetdataApiParams,
  points: number = 24,
): Promise<MetricsResponse<any[]>> => {
  // Get disk I/O data
  const diskIOData = await getTimeSeriesData(params, 'system.io', points)
  console.dir({ diskIOData }, { depth: null })

  if (!diskIOData.success) return diskIOData as any

  // Transform data for time series chart
  // Format: [{ time: 'HH:MM', reads: number, writes: number }]
  const formattedData = diskIOData.data!.map((point: any) => {
    // Use absolute values for reads and writes
    // Convert to KB/s for better readability if values are large
    let reads = 0
    let writes = 0

    if (point.reads !== undefined) {
      reads = Math.abs(point.reads)
      // If reads are very large, convert to KB/s
      if (reads > 1024) {
        reads = parseFloat((reads / 1024).toFixed(2))
      } else {
        reads = parseFloat(reads.toFixed(2))
      }
    }

    if (point.writes !== undefined) {
      writes = Math.abs(point.writes)
      // If writes are very large, convert to KB/s
      if (writes > 1024) {
        writes = parseFloat((writes / 1024).toFixed(2))
      } else {
        writes = parseFloat(writes.toFixed(2))
      }
    }

    return {
      time: point.time,
      reads,
      writes,
    }
  })

  return {
    success: true,
    message: 'Disk I/O data retrieved successfully',
    data: formattedData,
  }
}

/**
 * Gets server load time series data for shadcn graphs
 */
export const getServerLoadTimeSeriesData = async (
  params: NetdataApiParams,
  points: number = 24,
): Promise<MetricsResponse<any[]>> => {
  const result = await getTimeSeriesData(params, 'system.load', points)

  if (!result.success) return result

  // Transform to match the expected format: { time: 'HH:MM', load: number }
  const formattedData = result.data!.map((point: any) => {
    return {
      time: point.time,
      load: parseFloat(point.load1.toFixed(1)), // Use 1-minute load average
    }
  })

  return {
    success: true,
    message: 'Server load time series data retrieved successfully',
    data: formattedData,
  }
}

/**
 * Gets request time series data for shadcn graphs (success vs error)
 */
export const getRequestTimeSeriesData = async (
  params: NetdataApiParams,
  points: number = 24,
): Promise<MetricsResponse<any[]>> => {
  // Try to get data for different web servers
  const webServers = ['nginx', 'apache', 'web']
  let requestData = null

  // Try each web server until we get data
  for (const server of webServers) {
    const result = await getTimeSeriesData(params, `${server}.requests`, points)
    if (result.success) {
      requestData = result
      break
    }
  }

  if (!requestData || !requestData.success) {
    return {
      success: false,
      message: 'No web request metrics available',
    }
  }

  // Transform to match the expected format: { time: 'HH:MM', success: number, error: number }
  const formattedData = requestData.data!.map((point: any) => {
    // Calculate success and error requests
    // Different web servers have different metrics, so we need to check for common patterns
    const success = point.success || point['2xx'] || point.requests || 0
    const error = point.error || point['5xx'] || point['4xx'] || 0

    return {
      time: point.time,
      success: Math.round(success),
      error: Math.round(error),
    }
  })

  return {
    success: true,
    message: 'Request time series data retrieved successfully',
    data: formattedData,
  }
}

/**
 * Gets response time series data for shadcn graphs
 */
export const getResponseTimeSeriesData = async (
  params: NetdataApiParams,
  points: number = 24,
): Promise<MetricsResponse<any[]>> => {
  // Try to get data for different web servers
  const webServers = ['nginx', 'apache', 'web']
  let responseData = null

  // Try each web server until we get data
  for (const server of webServers) {
    const result = await getTimeSeriesData(
      params,
      `${server}.response_time`,
      points,
    )
    if (result.success) {
      responseData = result
      break
    }
  }

  if (!responseData || !responseData.success) {
    return {
      success: false,
      message: 'No response time metrics available',
    }
  }

  // Transform to match the expected format: { time: 'HH:MM', responseTime: number }
  const formattedData = responseData.data!.map((point: any) => {
    // Get response time (different web servers might use different property names)
    let responseTime = 0
    if (point.response_time !== undefined) responseTime = point.response_time
    else if (point.avg !== undefined) responseTime = point.avg

    // Convert to milliseconds if needed
    if (responseTime < 10) responseTime *= 1000 // Assuming seconds to ms conversion

    return {
      time: point.time,
      responseTime: Math.round(responseTime),
    }
  })

  return {
    success: true,
    message: 'Response time series data retrieved successfully',
    data: formattedData,
  }
}

/**
 * Gets all chart data needed for the dashboard in a single call
 */
export const getDashboardMetrics = async (
  params: NetdataApiParams,
  points: number = 24,
): Promise<MetricsResponse<any>> => {
  const results = await Promise.allSettled([
    getCpuTimeSeriesData(params, points),
    getMemoryTimeSeriesData(params, points),
    getNetworkTimeSeriesData(params, points),
    getDiskSpaceChartData(params),
    getDiskIOChartData(params, points),
    getServerLoadTimeSeriesData(params, points),
    getRequestTimeSeriesData(params, points),
    getResponseTimeSeriesData(params, points),
  ])

  // Extract data from settled promises
  const [
    cpuData,
    memoryData,
    networkData,
    diskSpaceData,
    diskIOData,
    serverLoadData,
    requestData,
    responseTimeData,
  ] = results.map(result =>
    result.status === 'fulfilled'
      ? result.value
      : { success: false, data: null },
  )

  return {
    success: true,
    message: 'Dashboard metrics retrieved - some data may be unavailable',
    data: {
      cpuData: cpuData.success ? cpuData.data : null,
      memoryData: memoryData.success ? memoryData.data : null,
      networkData: networkData.success ? networkData.data : null,
      diskSpaceData: diskSpaceData.success ? diskSpaceData.data : null,
      diskIOData: diskIOData.success ? diskIOData.data : null,
      serverLoadData: serverLoadData.success ? serverLoadData.data : null,
      requestData: requestData.success ? requestData.data : null,
      responseTimeData: responseTimeData.success ? responseTimeData.data : null,
    },
  }
}
