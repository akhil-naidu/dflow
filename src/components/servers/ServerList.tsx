'use client'

import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Download, Server, Trash2 } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'

import { deleteServerAction } from '@/actions/server'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SshKey } from '@/payload-types'
import { ServerType } from '@/payload-types-overrides'

const ServerList = ({
  servers,
  sshKeys,
}: {
  servers: ServerType[]
  sshKeys: SshKey[]
}) => {
  const { execute, isPending } = useAction(deleteServerAction, {
    onSuccess: ({ data }) => {
      if (data) {
        toast.success(`Successfully deleted Server`)
      }
    },
    onError: ({ error }) => {
      toast.error(`Failed to delete Server: ${error.serverError}`)
    },
  })

  return (
    <Accordion type='single' collapsible className='w-full'>
      {servers.map(item => (
        <AccordionItem value={item.id} key={item.id} className='py-2'>
          <AccordionTrigger className='py-2 text-[15px] leading-6 hover:no-underline'>
            <div className='flex w-full items-center justify-between pr-2'>
              <div className='flex gap-3'>
                <Server
                  size={16}
                  strokeWidth={2}
                  className='mt-1 shrink-0 text-muted-foreground'
                  aria-hidden='true'
                />

                <div>
                  <span>{item.name}</span>
                  <p className='text-sm font-normal text-muted-foreground'>
                    {item.description}
                  </p>
                </div>
              </div>
              {item?.version === 'not-installed' ? (
                <Button variant='outline' asChild>
                  <div role='button' tabIndex={0}>
                    <Download />
                    Install Dokku
                  </div>
                </Button>
              ) : (
                <div className='flex items-center gap-1.5 rounded-full border border-cyan-900 bg-cyan-100 px-3 py-1 text-[0.75rem] text-cyan-900'>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    width='25'
                    height='20'
                    viewBox='0 0 89 62'
                    fill='none'>
                    <path
                      d='M78.4046 17.1912C84.738 21.1608 86.2188 20.7419 87.6794 19.9955C88.5202 19.5664 88.8496 18.5392 88.4243 17.6985C86.4622 13.818 78.212 0.118992 59.5364 0.118992C43.8588 0.118992 34.4377 13.3435 31.5684 18.0766C31.0067 19.0027 31.4447 20.2158 32.4755 20.5543C34.1357 21.0995 35.9508 21.216 39.8333 18.8625C52.5306 11.8038 78.4046 17.1912 78.4046 17.1912Z'
                      fill='#F15B55'
                    />
                    <mask
                      id='mask0_55_415'
                      style={{ maskType: 'alpha' }}
                      maskUnits='userSpaceOnUse'
                      x='31'
                      y='0'
                      width='58'
                      height='21'>
                      <path
                        d='M78.4212 17.0723C84.7546 21.0418 86.2354 20.6229 87.696 19.8766C88.5368 19.4474 88.8662 18.4202 88.4409 17.5795C86.4788 13.699 78.2286 3.8147e-06 59.553 3.8147e-06C43.8754 3.8147e-06 34.4543 13.2245 31.585 17.9576C31.0233 18.8837 31.4613 20.0969 32.4921 20.4353C34.1523 20.9805 35.9674 21.097 39.8499 18.7436C52.5472 11.6848 78.4212 17.0723 78.4212 17.0723Z'
                        fill='#F15B55'
                      />
                    </mask>
                    <g mask='url(#mask0_55_415)'>
                      <path
                        d='M43.7907 2.62413C49.4945 9.99967 33.5952 13.8544 45.8049 22.3539'
                        stroke='#FF9580'
                        strokeWidth='1.5'
                        strokeMiterlimit='10'
                      />
                      <path
                        d='M56.7977 -1.62458C62.8837 6.0383 46.832 8.92189 53.8305 19.6981'
                        stroke='#FF9580'
                        strokeWidth='1.5'
                        strokeMiterlimit='10'
                      />
                      <path
                        d='M72.3168 -0.867853C76.7291 7.02473 58.5477 8.73199 64.5571 18.3322'
                        stroke='#FF9580'
                        strokeWidth='1.5'
                        strokeMiterlimit='10'
                      />
                      <path
                        d='M84.2603 7.02465C84.2603 15.1449 71.708 10.5128 72.3169 19.6982'
                        stroke='#FF9580'
                        strokeWidth='1.5'
                        strokeMiterlimit='10'
                      />
                    </g>
                    <g opacity='0.399994'>
                      <g opacity='0.399994'>
                        <path
                          opacity='0.399994'
                          d='M31.3365 18.747C31.2415 19.5146 31.6815 20.2937 32.4751 20.5544C34.1353 21.0993 35.9508 21.2158 39.8333 18.8623C52.5302 11.8039 78.4042 17.1914 78.4042 17.1914C84.7377 21.1606 86.2184 20.7416 87.6795 19.9957C88.3903 19.6328 88.7337 18.8419 88.5657 18.0976C78.1555 10.8635 54.5866 3.8145 31.3365 18.747Z'
                          fill='black'
                        />
                      </g>
                    </g>
                    <path
                      d='M67.274 14.8087H56.4204C44.6233 14.8087 38.4193 18.2775 33.8378 24.2005L29.4542 29.8671L27.7038 32.1805C26.3653 33.9491 24.2728 34.9885 22.0517 34.9885C18.6867 34.9885 15.8194 32.6685 15.0623 29.48C15.0512 29.433 15.0385 29.359 15.025 29.2679C14.9103 28.4884 15.5203 27.7899 16.3099 27.7899H18.4798C22.2049 27.7899 25.2246 24.7776 25.2246 21.0614V20.5325C25.2246 19.8467 24.667 19.2904 23.979 19.2904H17.6005C15.0492 19.2904 13.2669 20.6106 12.6674 22.0612C12.0676 20.6106 10.2853 19.2904 7.73397 19.2904H1.35542C0.667492 19.2904 0.109863 19.8467 0.109863 20.5325V21.0614C0.109863 24.7776 3.12951 27.7899 6.85471 27.7899H9.05492C9.75186 27.7899 10.3443 28.2988 10.4476 28.9867L10.6905 30.604C13.3361 48.2223 28.5057 61.2576 46.3638 61.2576H47.2697H59.4081C71.7445 61.2576 82.2727 52.3616 84.302 40.2227L85.8397 31.0254C87.259 22.5369 81.2902 14.8087 67.274 14.8087Z'
                      fill='#07CBCF'
                    />
                    <path
                      d='M81.4705 48.3116C79.3404 48.386 77.5986 49.0698 75.2239 51.4388C72.2001 54.4552 67.1794 57.8702 59.4197 57.8702H45.0417C39.2224 57.8702 35.1162 53.5434 35.1162 53.5434C35.1162 53.5434 31.7479 53.7154 24.4261 49.5603C12.4254 41.9906 11.9501 29.2979 11.7788 27.7043C11.6076 26.1106 10.7517 25.2568 9.04025 25.2568H6.70074C2.34293 25.2568 1.16088 23.1183 0.893741 19.3792C0.434853 19.5628 0.110352 20.0095 0.110352 20.5327V21.0612C0.110352 24.7773 3.13 27.7897 6.85479 27.7897H9.055C9.75235 27.7897 10.3448 28.2986 10.4481 28.9864L10.6906 30.6038C13.3362 48.2221 28.5062 61.2573 46.3643 61.2573H47.2698H59.4086C68.7888 61.2573 77.1226 56.113 81.4705 48.3116Z'
                      fill='#05B7BF'
                    />
                    <path
                      d='M15.0249 29.2677C14.9102 28.4883 15.5203 27.7898 16.3098 27.7898H18.4797C22.2049 27.7898 25.2246 24.7774 25.2246 21.0617V20.5328C25.2246 20.0092 24.8997 19.5624 24.4404 19.3793V19.3797C24.1728 23.1184 22.9908 25.2569 18.633 25.2569H16.8376C14.4411 25.2569 14.7549 27.9512 15.0249 29.2677Z'
                      fill='#05B7BF'
                    />
                    <path
                      d='M24.4257 49.5606C27.1262 52.1789 25.7188 53.2412 21.2307 53.2412H14.3327C13.2428 53.2412 12.697 54.5557 13.4677 55.3245L14.322 56.1767C16.9737 58.8224 20.5707 60.3085 24.3213 60.3085H24.9584C32.4133 60.3085 37.929 52.8239 37.929 52.8239L24.4257 49.5606Z'
                      fill='#07CBCF'
                    />
                    <path
                      d='M35.1162 53.544C32.9984 55.5574 29.4485 58.1536 25.2235 58.1536H24.6339C21.1631 58.1536 17.8345 56.7783 15.3807 54.33L14.59 53.5415C14.497 53.4488 14.4257 53.3474 14.3728 53.2411H14.3327C13.2428 53.2411 12.697 54.5556 13.4677 55.3244L14.322 56.1766C16.9741 58.8223 20.5711 60.3085 24.3213 60.3085H24.9584C29.8025 60.3085 33.8281 57.1482 36.0533 54.9349L36.3528 54.6312L35.1162 53.544Z'
                      fill='#05B7BF'
                    />
                    <mask
                      id='mask1_55_415'
                      style={{ maskType: 'alpha' }}
                      maskUnits='userSpaceOnUse'
                      x='0'
                      y='15'
                      width='86'
                      height='47'>
                      <path
                        d='M67.1641 15.1884H56.3106C44.5134 15.1884 38.3094 18.6572 33.7279 24.5802L29.3443 30.2468L27.594 32.5602C26.2554 34.3288 24.163 35.3682 21.9419 35.3682C18.5768 35.3682 15.7096 33.0482 14.9524 29.8597C14.9413 29.8127 14.9286 29.7387 14.9151 29.6476C14.8004 28.8681 15.4105 28.1696 16.2 28.1696H18.3699C22.0951 28.1696 25.1147 25.1573 25.1147 21.4411V20.9122C25.1147 20.2264 24.5571 19.6701 23.8692 19.6701H17.4906C14.9393 19.6701 13.157 20.9903 12.5576 22.4409C11.9577 20.9903 10.1755 19.6701 7.62411 19.6701H1.24555C0.557629 19.6701 0 20.2264 0 20.9122V21.4411C0 25.1573 3.01965 28.1696 6.74484 28.1696H8.94506C9.64199 28.1696 10.2344 28.6785 10.3377 29.3664L10.5807 30.9837C13.2262 48.602 28.3958 61.6373 46.2539 61.6373H47.1598H59.2983C71.6346 61.6373 82.1628 52.7413 84.1922 40.6024L85.7299 31.4051C87.1491 22.9166 81.1803 15.1884 67.1641 15.1884Z'
                        fill='#07CBCF'
                      />
                    </mask>
                    <g mask='url(#mask1_55_415)'>
                      <path
                        d='M48.2573 43.0378C50.1929 48.5818 55.4426 52.9185 61.7015 52.9185C72.2568 52.9185 71.2993 45.7048 82.7326 45.7048H84.3526'
                        stroke='#00576C'
                        strokeWidth='1.46'
                        strokeMiterlimit='10'
                        strokeLinecap='round'
                      />
                      <path
                        d='M50.1195 43.0151H46.9814'
                        stroke='#00576C'
                        strokeWidth='1.46'
                        strokeMiterlimit='10'
                        strokeLinecap='round'
                      />
                      <path
                        d='M65.353 42.7305C65.353 41.096 64.0247 39.7709 62.3862 39.7709C60.7478 39.7709 59.4194 41.096 59.4194 42.7305'
                        stroke='#00576C'
                        strokeWidth='1.46'
                        strokeMiterlimit='10'
                        strokeLinecap='round'
                      />
                    </g>
                    <path
                      d='M77.4491 19.774C80.7847 21.9824 82.0434 23.4419 85.095 23.7701C82.9402 18.5919 77.0788 14.8087 67.2741 14.8087H56.4206C45.0819 14.8087 38.9111 18.0148 34.3804 23.5229C37.2443 23.5229 40.3812 21.1661 43.0628 19.698C46.182 17.9907 50.3669 16.3586 59.4197 16.3586C68.4725 16.3586 73.2651 17.004 77.4491 19.774Z'
                      fill='#05B7BF'
                    />
                  </svg>

                  <span>{`v${item?.version}`}</span>
                </div>
              )}
            </div>
          </AccordionTrigger>

          <AccordionContent className='space-y-4 pb-2 ps-7'>
            <div className='space-y-1'>
              <Label>IP Address</Label>
              <Input disabled value={item.ip} />
            </div>

            <div className='grid grid-cols-2 gap-2'>
              <div className='space-y-1'>
                <Label>Port</Label>
                <Input disabled value={item.port} />
              </div>

              <div className='space-y-1'>
                <Label>Username</Label>
                <Input disabled value={item.username} />
              </div>
            </div>

            {typeof item.sshKey === 'object' && (
              <div className='space-y-1'>
                <Label className='block'>SSH Key</Label>

                <Select disabled value={item.sshKey.id}>
                  <SelectTrigger>
                    <SelectValue placeholder='Select a SSH key' />
                  </SelectTrigger>

                  <SelectContent>
                    {sshKeys.map(({ name, id }) => (
                      <SelectItem key={id} value={id}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className='flex w-full justify-end'>
              <Button
                variant='destructive'
                disabled={isPending}
                onClick={() => {
                  execute({ id: item.id })
                }}>
                <Trash2 />
                Delete
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

export default ServerList
