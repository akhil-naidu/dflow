import { Button } from '../ui/button'
import { Github } from 'lucide-react'

const date = new Date()
const formattedDate = date.toISOString().split('T')[0]

const githubCallbackURL =
  process.env.NODE_ENV === 'development'
    ? process.env.WEBHOOK_URL
    : `https://${process.env.NEXT_PUBLIC_WEBSITE_URL}`

const value = JSON.stringify({
  redirect_url: `${githubCallbackURL}/api/webhook/providers/github?onboarding=true`,
  name: `Dflow-${formattedDate}`,
  url: githubCallbackURL,
  hook_attributes: {
    url: `https://${githubCallbackURL}/api/deploy/github`,
  },
  callback_urls: [`${githubCallbackURL}/api/webhook/providers/github`],
  public: false,
  request_oauth_on_install: true,
  default_permissions: {
    contents: 'read',
    metadata: 'read',
    emails: 'read',
    pull_requests: 'write',
  },
  default_events: ['pull_request', 'push'],
})

const CreateGitAppForm = () => {
  return (
    <form
      method='post'
      action='https://github.com/settings/apps/new?state=gh_init'
      className='mt-4'>
      <input
        type='text'
        name='manifest'
        id='manifest'
        className='sr-only'
        defaultValue={value}
      />

      {/* Added github option in GitProviders collection */}
      <Button type='submit'>
        <Github />
        Github
      </Button>
    </form>
  )
}

export default CreateGitAppForm
