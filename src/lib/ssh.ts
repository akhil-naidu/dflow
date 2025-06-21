import { NodeSSH } from 'node-ssh'

export const dynamicSSH = async ({
  host,
  port,
  username,
  privateKey,
  hostname,
}: {
  host: string
  port: number
  username: string
  privateKey: string
  hostname?: string | undefined | null
}) => {
  const ssh = new NodeSSH()

  console.log('ssh test', hostname, username, host)

  if (hostname) {
    await ssh.connect({
      host: hostname,
      username,
    })
  } else {
    await ssh.connect({
      host,
      port,
      username,
      privateKey,
    })
  }

  return ssh
}
