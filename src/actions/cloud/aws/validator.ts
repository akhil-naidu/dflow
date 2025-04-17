import { z } from 'zod'

export const connectAWSAccountSchema = z.object({
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
  name: z.string().min(1),
  id: z.string().optional(),
})

export const deleteAWSAccountSchema = z.object({
  id: z.string(),
})

export const createEC2InstanceSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  sshKeyId: z.string(),
  accountId: z.string(),
  region: z.string(),
  ami: z.string(),
  instanceType: z.string(),
  diskSize: z.number().min(30),
  securityGroupIds: z.array(z.string()).optional(),
})

// Security Group Schemas
export const securityGroupRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  protocol: z.enum(['tcp', 'udp', 'icmp', 'all']),
  fromPort: z.number().min(0).max(65535),
  toPort: z.number().min(0).max(65535),
  cidrIp: z.string().ip({ version: 'v4' }).or(z.literal('0.0.0.0/0')),
  direction: z.enum(['ingress', 'egress']),
})

export const createSecurityGroupSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  region: z.string().min(1),
  accountId: z.string().min(1),
  rules: z.array(securityGroupRuleSchema).optional(),
})

export const updateSecurityGroupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  rulesToAdd: z.array(securityGroupRuleSchema).optional(),
  rulesToRemove: z.array(z.string()).optional(), // Rule IDs to remove
})

export const deleteSecurityGroupSchema = z.object({
  id: z.string().min(1),
  region: z.string().min(1),
  accountId: z.string().min(1),
})

export const updateEC2InstanceSchema = z.object({
  instanceId: z.string(),
  accountId: z.string(),
  region: z.string(),
  newSecurityGroupIds: z.array(z.string()).optional(),
  newName: z.string().optional(),
})
