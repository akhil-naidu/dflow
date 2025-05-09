import { z } from 'zod'

export const getProjectDetailsSchema = z.object({ id: z.string() })
