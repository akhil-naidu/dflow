// 'use server'

// import { dokku } from '../../lib/dokku'

// import { pub } from '@/lib/redis'
// import { publicClient } from '@/lib/safe-action'

// import { sshConnect } from './../../lib/ssh'
// import { deployAppQueue } from './../../queues/deployApp'
// import { createAppGithubSchema } from './validator'

// export const createAppGithubAction = publicClient
//   .metadata({
//     actionName: 'createAppGithub',
//   })
//   .schema(createAppGithubSchema)
//   .action(async ({ clientInput }) => {
//     const { appName, repoName, userName, branch } = clientInput

//     const ssh = await sshConnect()
//     // check if the same app exist, if exist skip this step
//     const dokkuApp = await dokku.apps.create(ssh, appName, {
//       onStdout: async chunk => {
//         await pub.publish('my-channel', chunk.toString())
//         // console.info(chunk.toString());
//       },
//       onStderr: chunk => {
//         console.info({
//           createAppsLogs: {
//             message: chunk.toString(),
//             type: 'stdout',
//           },
//         })
//       },
//     })

//     console.log({ dokkuApp })

//     // add to db, and get the appID

//     // assign port (which can be from ui)
//     const portsResponse = await dokku.ports.set(
//       ssh,
//       appName,
//       'http',
//       '80',
//       '3000',
//       {
//         onStdout: async chunk => {
//           await pub.publish('my-channel', chunk.toString())
//           // console.info(chunk.toString());
//         },
//         onStderr: chunk => {
//           console.info({
//             setPortLogs: {
//               message: chunk.toString(),
//               type: 'stdout',
//             },
//           })
//         },
//       },
//     )

//     console.log({ portsResponse })

//     // assign ssl certificate
//     // const sslJob = await enableLetsEncryptQueue.add('enable-letsencrypt', {
//     //   appName: appName,
//     // })

//     const deployJob = await deployAppQueue.add('deploy-app', {
//       appId: '1',
//       appName: appName,
//       userName: userName,
//       repoName: repoName,
//       branch: branch,

//     })

//     ssh.dispose()

//     return { result: true }
//   })
