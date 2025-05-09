'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  Edge,
  MarkerType,
  Node,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import { useAction } from 'next-safe-action/hooks'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator,
} from 'unique-names-generator'

import {
  createTemplate,
  getTemplateById,
  updateTemplate,
} from '@/actions/templates'
import {
  CreateTemplateSchemaType,
  createTemplateSchema,
} from '@/actions/templates/validator'
import ReactFlowConfig from '@/components/reactflow/reactflow.config'
import { convertNodesToServices } from '@/components/reactflow/utils/convertNodesToServices'
import { convertToGraph } from '@/components/reactflow/utils/convertServicesToNodes'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'

import ChooseService, { ChildRef, getPositionForNewNode } from './ChooseService'

const CreateNewTemplate = () => {
  const [openCreateTemplate, setOpenCreateTemplate] = useState<boolean>(false)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const services = convertNodesToServices(nodes)
  const childRef = useRef<ChildRef>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const templateId = searchParams.get('templateId')
  const { organisation } = useParams()

  const {
    register,
    reset,
    formState: { errors },
    handleSubmit,
    setValue,
  } = useForm<CreateTemplateSchemaType>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: {
      name: uniqueNamesGenerator({
        dictionaries: [adjectives, colors, animals],
        separator: '-',
        style: 'lowerCase',
        length: 2,
      }),
      services: services,
    },
  })

  //create template api
  const { execute: createNewTemplate, isPending: isCreateNewTemplatePending } =
    useAction(createTemplate, {
      onSuccess: ({ data, input }) => {
        if (data) {
          toast.success(`Template created successfully`)
          router.push(`/${organisation}/templates`)
        }
      },
      onError: ({ error }) => {
        toast.error(`Failed to create template`)
      },
    })

  const {
    execute: updateExistingTemplate,
    isPending: isUpdateTemplatePending,
  } = useAction(updateTemplate, {
    onSuccess: ({ data, input }) => {
      if (data) {
        toast.success(`Template updated successfully`)
        router.push(`/${organisation}/templates`)
      }
    },
    onError: ({ error }) => {
      toast.error(`Failed to update template`)
    },
  })

  //getTemplateBYId api
  const {
    execute: getTemplateByIdAction,
    isPending: isGetTemplateByIdPending,
    result: template,
  } = useAction(getTemplateById, {
    onError: ({ error }) => {
      toast.error(`Failed to get template: ${error.serverError}`)
    },
  })

  const onSubmit = (data: CreateTemplateSchemaType) => {
    if (templateId && template?.data) {
      updateExistingTemplate({
        id: templateId,
        name: data.name,
        description: data.description,
        services,
      })
    } else {
      createNewTemplate({
        name: data?.name,
        description: data?.description,
        services,
      })
    }
  }

  const callChildFunction = (args: { serviceId: string }) => {
    childRef.current?.handleOnClick(args)
  }

  useEffect(() => {
    if (templateId) {
      getTemplateByIdAction({ id: templateId })
    }
  }, [templateId])

  useEffect(() => {
    if (!template?.data?.services) return

    setValue('name', template?.data?.name)
    setValue('description', template?.data?.description ?? '')

    const { edges: edgesData, nodes: nodesData } = convertToGraph(
      template.data.services,
    )

    const initialNodes = nodesData?.map((node, index) => ({
      id: node.id,
      position: getPositionForNewNode(index),
      data: {
        ...node,
        onClick: () => callChildFunction({ serviceId: node.id! }),
      },
      type: 'custom',
    }))

    const initialEdges = edgesData.map(edge => ({
      ...edge,
      type: 'floating',
      style: { strokeDasharray: '5 5' },
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
      label: 'Ref',
    }))

    setNodes(initialNodes || [])
    setEdges(initialEdges)
  }, [template?.data?.services])

  if (isGetTemplateByIdPending) {
    return (
      <ReactFlowConfig
        edges={[]}
        nodes={[]}
        onEdgesChange={onEdgesChange}
        onNodesChange={onNodesChange}
        className='h-[calc(100vh-120px)] w-full'>
        <div className='flex h-full w-full flex-col items-center justify-center gap-4 md:flex-row'>
          {/* Generate 6 skeleton card placeholders */}
          {Array(2)
            .fill(0)
            .map((_, index) => (
              <div
                key={index}
                className='h-36 w-full rounded-xl border bg-[#171d33] text-card-foreground shadow md:w-72'>
                <div className='flex w-full flex-row justify-between space-y-1.5 p-6'>
                  <div className='flex items-center gap-x-3'>
                    <Skeleton className='size-6 rounded-full' />
                    <div className='flex-1 items-start'>
                      <Skeleton className='mb-2 h-5 w-32' />
                      <Skeleton className='h-4 w-24' />
                    </div>
                  </div>
                  <Skeleton className='h-9 w-9 flex-shrink-0 rounded-md' />
                </div>
                <div className='flex items-center p-6 pt-0'>
                  <Skeleton className='h-4 w-36' />
                </div>
              </div>
            ))}
        </div>
      </ReactFlowConfig>
    )
  }
  return (
    <div className='w-full'>
      <div className='flex w-full items-center justify-end p-2'>
        <Button
          variant={'default'}
          disabled={nodes?.length <= 0}
          onClick={() => setOpenCreateTemplate(true)}>
          {templateId && template?.data ? 'Update template' : 'Save template'}
        </Button>
      </div>
      <ChooseService
        ref={childRef}
        nodes={nodes}
        edges={edges}
        setNodes={setNodes}
        setEdges={setEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
      />
      {/* Template creation */}
      <Dialog open={openCreateTemplate} onOpenChange={setOpenCreateTemplate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {templateId && template?.data ? 'Update' : 'Create'} Template
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className='space-y-4'>
              <div>
                <Label>
                  Name <span className='text-red-500'>*</span>
                </Label>
                <Input {...register('name')} />
                {errors.name?.message && <p>{errors.name?.message}</p>}
              </div>
              <div>
                <Label>Description</Label>
                <Textarea {...register('description')} className='min-h-44' />
              </div>
            </div>
            <DialogFooter className='mt-4'>
              <Button
                disabled={isCreateNewTemplatePending || isUpdateTemplatePending}
                type='submit'>
                {templateId && template?.data ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CreateNewTemplate
