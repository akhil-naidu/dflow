import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { User } from '@/payload-types'

interface UserProps {
  email: string
  password: string
  name?: string
}

export const getUserByEmail = async (data: UserProps): Promise<User> => {
  const payload = await getPayload({
    config: configPromise,
  })

  const email = data.email
  const result = await payload.find({
    collection: 'users',
    depth: 1,
    page: 1,
    limit: 1,
    pagination: false,
    where: {
      email: {
        equals: email,
      },
    },
  })

  const user =
    result.totalDocs === 0 ? await createUser(data) : result.docs.at(0)!

  return user
}

export const createUser = async (data: UserProps): Promise<User> => {
  const payload = await getPayload({
    config: configPromise,
  })

  const user = payload.create({
    collection: 'users',
    data: {
      email: data.email,
      password: data.password,
    },
  })

  return user
}
