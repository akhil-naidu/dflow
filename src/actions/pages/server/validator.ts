import { z } from 'zod'

export const getServerDetailsSchema = z.object({ id: z.string() })
