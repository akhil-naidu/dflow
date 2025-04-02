'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import CPUTab from './CPUTab'
import OverviewTab from './OverviewTab'

const MonitoringTabs = ({
  dashboardMetrics,
}: {
  dashboardMetrics: {
    overview: {
      cpuUtilization: any[]
      cpuSomePressure: any[]
      cpuSomePressureStallTime: any[]
      systemUptime: any[]
      diskSpace: any[]
      diskIO: any[]
      systemIO: any[]
      memoryUsage: any[]
      memoryAvailable: any[]
      memorySomePressure: any[]
      memorySomePressureStallTime: any[]
      networkBandwidth: any[]
      networkTraffic: any[]
      networkPackets: any[]
      networkErrors: any[]
      serverLoad: any[]
      serverUptime: any[]
      systemAlerts: any[]
      webRequests: any[]
      responseTimes: any[]
    }
    detailed: {
      cpuUtilization: any[]
      cpuSomePressure: any[]
      cpuSomePressureStallTime: any[]
      systemLoad: any[]
      diskSpace: any[]
      diskIO: any[]
      systemIO: any[]
      memoryUsage: any[]
      memoryAvailable: any[]
      memorySomePressure: any[]
      memorySomePressureStallTime: any[]
      networkBandwidth: any[]
      networkTraffic: any[]
      networkPackets: any[]
      networkErrors: any[]
      serverLoad: any[]
      serverUptime: any[]
      systemAlerts: any[]
      webRequests: any[]
      responseTimes: any[]
    }
  }
}) => {
  const { overview, detailed } = dashboardMetrics

  // Define disk colors
  const diskColors = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
  ]

  return (
    <Tabs defaultValue='overview' className='mt-12 space-y-4'>
      <TabsList>
        <TabsTrigger value='overview'>Overview</TabsTrigger>
        <TabsTrigger value='cpu'>CPU</TabsTrigger>
        <TabsTrigger value='memory'>Memory</TabsTrigger>
        <TabsTrigger value='disk'>Disk</TabsTrigger>
        <TabsTrigger value='network'>Network</TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value='overview' className='space-y-4'>
        <OverviewTab {...overview} />
      </TabsContent>

      {/* CPU Tab */}
      <TabsContent value='cpu' className='space-y-4'>
        <CPUTab {...detailed} />
      </TabsContent>

      {/* Memory Tab */}
      <TabsContent value='memory' className='space-y-4'>
        {/* <MemoryTab {...detailed} /> */}
      </TabsContent>

      {/* Disk Tab */}
      <TabsContent value='disk' className='space-y-4'>
        {/* <DiskTab diskColors={diskColors} {...detailed} /> */}
      </TabsContent>

      {/* Network Tab */}
      <TabsContent value='network' className='space-y-4'>
        {/* <NetworkTab {...detailed} /> */}
      </TabsContent>
    </Tabs>
  )
}

export default MonitoringTabs
