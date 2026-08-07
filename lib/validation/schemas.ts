import { z } from 'zod'

export const CourseSchema = z.object({
  title: z.string().min(1).max(200),
  url: z.string().url(),
  category: z.string().min(1).max(100),
  tags: z.array(z.string().min(1).max(50)).max(10).default([]),
  description: z.string().max(1000).optional(),
})

export const ToggleCompletionSchema = z.object({
  courseId: z.string().uuid(),
  completed: z.boolean(),
})

export const BADGE_MAX_FILE_SIZE_BYTES = Number(process.env.BADGE_MAX_FILE_SIZE_MB ?? 5) * 1024 * 1024

export const BADGE_ALLOWED_MIME_TYPES = (
  process.env.BADGE_ALLOWED_MIME_TYPES ?? 'image/jpeg,image/png,image/webp'
).split(',')

export const CreateBadgePostSchema = z.object({
  courseId: z.string().uuid().nullable(),
  imagePath: z.string().min(1),
  caption: z.string().max(280).optional(),
})

export const ReportPostSchema = z.object({
  postId: z.string().uuid(),
  reason: z.string().min(1).max(500),
})
