import { Skeleton } from '@/components/ui/skeleton'

const SSHLoading = () => {
  return (
    <div className='flex h-full w-full justify-center overflow-x-hidden'>
      <div className='flex w-full max-w-6xl flex-col gap-4 p-4'>
        <div className='flex w-full items-center justify-between'>
          <div className='flex items-center gap-2 text-2xl font-semibold'>
            <Skeleton className='h-8 w-24' />
            <Skeleton className='h-8 w-24' />
            <Skeleton className='h-8 w-24' />
            <Skeleton className='h-8 w-24' />
          </div>
        </div>

        <div className='mt-2 flex justify-between gap-x-4'>
          <Skeleton className='h-10 w-40' />
          <Skeleton className='h-10 w-40' />
        </div>

        <div className='mt-4 grid w-full max-w-6xl grid-cols-1 space-y-4'>
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className='h-24 w-full' />
          ))}
        </div>
      </div>
    </div>
  )
}

export default SSHLoading
