'use client'

import { Hammer, HardDrive, Lock, Plug2 } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'
import { useEffect, useMemo } from 'react'

import TimeLineComponent, {
  TimeLineComponentType,
} from '@/components/TimeLineComponent'
import { Dokku } from '@/components/icons'
import { useDokkuInstallationStep } from '@/components/onboarding/dokkuInstallation/DokkuInstallationStepContext'
import InstallationTerminal from '@/components/onboarding/dokkuInstallation/InstallationTerminal'
import Step1 from '@/components/onboarding/dokkuInstallation/Step1'
import Step2 from '@/components/onboarding/dokkuInstallation/Step2'
import Step3 from '@/components/onboarding/dokkuInstallation/Step3'
import Step4 from '@/components/onboarding/dokkuInstallation/Step4'
import Step5 from '@/components/onboarding/dokkuInstallation/Step5'
import { ServerType } from '@/payload-types-overrides'

export const ClientPage = ({ servers }: { servers: ServerType[] }) => {
  const { dokkuInstallationStep, setDokkuInstallationStep } =
    useDokkuInstallationStep()
  const [selectedServer] = useQueryState(
    'server',
    parseAsString.withDefault(''),
  )

  // component unmount resetting the form state
  useEffect(() => {
    return () => {
      setDokkuInstallationStep(1)
    }
  }, [])

  const serverDetails = useMemo(() => {
    return servers.filter(server => server.id === selectedServer)[0]
  }, [selectedServer, servers])

  const list = useMemo<TimeLineComponentType[]>(() => {
    return [
      {
        title: 'Select a Server',
        description: 'Select a server for dokku installation',
        content: <Step1 servers={servers as ServerType[]} />,
        icon: <HardDrive size={16} />,
        highlighted: dokkuInstallationStep > 1,
      },
      {
        title: 'Dokku Installation',
        description: 'Installing dokku for deployment management',
        content: <Step2 server={serverDetails} />,
        icon: <Dokku fontSize={16} />,
        disabled: dokkuInstallationStep < 2,
        highlighted: dokkuInstallationStep > 2,
      },
      {
        title: 'Plugin Configuration',
        description: 'Installing dokku plugins required for deployment',
        content: <Step3 server={serverDetails} />,
        icon: <Plug2 size={20} />,
        disabled: dokkuInstallationStep < 3,
        highlighted: dokkuInstallationStep > 3,
      },
      {
        title: 'Builder Installation',
        description: 'Installing build-tool required for deployment',
        content: <Step4 server={serverDetails} />,
        icon: <Hammer size={20} />,
        disabled: dokkuInstallationStep < 4,
        highlighted: dokkuInstallationStep > 4,
      },
      {
        title: 'SSL Configuration',
        description:
          'Add a global email configuration, for SSL certificate generation',
        content: <Step5 server={serverDetails} />,
        icon: <Lock size={16} />,
        disabled: dokkuInstallationStep < 5,
      },
    ]
  }, [servers, dokkuInstallationStep, setDokkuInstallationStep, serverDetails])

  return (
    <>
      <TimeLineComponent list={list} />
      <InstallationTerminal />
    </>
  )
}
