import { z } from 'zod'

export const getServiceDetailsSchema = z.object({ id: z.string() })
