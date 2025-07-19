import { User } from '@/payload-types'

import Invitation from './Invitation'
import Roles from './Roles'
import TeamMembers from './TeamMembers'

async function TeamView({
  teamMembers,
  tenant,
}: {
  teamMembers: User[] | undefined
  tenant: any
}) {
  return (
    <div className='mt-4 space-y-10'>
      <Invitation tenant={tenant} />
      <TeamMembers teamMembers={teamMembers} />
      <Roles teamMembers={teamMembers} />
    </div>
  )
}

export default TeamView
