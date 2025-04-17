'use client'

import {
  Background,
  Controls,
  Edge,
  Node,
  OnEdgesChange,
  OnNodesChange,
  ReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import FloatingEdge from '@/app/(frontend)/(dashboard)/reactflow/FloatingEdges'
import FloatingConnectionLine from '@/app/(frontend)/(dashboard)/reactflow/FloatingEdges/FloatingConnectionLine'
import { cn } from '@/lib/utils'

import CustomNode from './CustomNodes'

//background types
enum BackgroundVariant {
  Lines = 'lines',
  Dots = 'dots',
  Cross = 'cross',
}

const ReactFlowConfig = ({
  children,
  nodes,
  onNodesChange,
  edges,
  onEdgesChange,
  className,
}: {
  children?: React.ReactNode
  nodes: Node[]
  onNodesChange: OnNodesChange
  edges: Edge[]
  onEdgesChange: OnEdgesChange
  className?: string
}) => {
  //custom nodes
  const nodeTypes = {
    custom: CustomNode,
  }

  //floating edges
  const edgeTypes = {
    floating: FloatingEdge,
  }

  return (
    <div className={cn('h-[calc(100%-80px)] w-[calc(100%-40px)]', className)}>
      <ReactFlow
        nodes={nodes}
        onNodesChange={onNodesChange}
        edges={edges}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        maxZoom={1}
        edgeTypes={edgeTypes}
        connectionLineComponent={FloatingConnectionLine}
        className='z-10'>
        <Background
          variant={BackgroundVariant.Lines}
          lineWidth={0.1}
          gap={32}
          className='bg-base-100 text-base-content/80'
        />
        <Controls
          position='center-left'
          className='bg-primary-foreground text-muted'
        />
        {children}
      </ReactFlow>
    </div>
  )
}

export default ReactFlowConfig
