import { z } from 'zod';

// Threads API Response Types
export const ThreadsUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string().optional(),
  threads_profile_picture_url: z.string().optional(),
  threads_biography: z.string().optional(),
});

export const ThreadsMediaSchema = z.object({
  id: z.string(),
  media_product_type: z.string(),
  media_type: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'CAROUSEL_ALBUM']),
  media_url: z.string().optional(),
  permalink: z.string(),
  username: z.string().optional(),
  text: z.string().optional(),
  timestamp: z.string(),
  shortcode: z.string().optional(),
  thumbnail_url: z.string().optional(),
  children: z
    .object({
      data: z.array(
        z.object({
          id: z.string(),
        })
      ),
    })
    .optional(),
  is_quote_post: z.boolean().optional(),
});

export const ThreadsInsightsSchema = z.object({
  name: z.string(),
  period: z.string(),
  values: z.array(
    z.object({
      value: z.number(),
    })
  ),
  title: z.string().optional(),
  description: z.string().optional(),
  id: z.string().optional(),
});

export const ThreadsRepliesSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      text: z.string().optional(),
      username: z.string().optional(),
      permalink: z.string().optional(),
      timestamp: z.string().optional(),
    })
  ),
  paging: z
    .object({
      cursors: z.object({
        before: z.string().optional(),
        after: z.string().optional(),
      }),
    })
    .optional(),
});

export const ThreadsConversationSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      text: z.string().optional(),
      username: z.string().optional(),
      permalink: z.string().optional(),
      timestamp: z.string().optional(),
    })
  ),
  paging: z
    .object({
      cursors: z.object({
        before: z.string().optional(),
        after: z.string().optional(),
      }),
    })
    .optional(),
});

export const CreateThreadResponseSchema = z.object({
  id: z.string(),
});

export type ThreadsUser = z.infer<typeof ThreadsUserSchema>;
export type ThreadsMedia = z.infer<typeof ThreadsMediaSchema>;
export type ThreadsInsights = z.infer<typeof ThreadsInsightsSchema>;
export type ThreadsReplies = z.infer<typeof ThreadsRepliesSchema>;
export type ThreadsConversation = z.infer<typeof ThreadsConversationSchema>;
export type CreateThreadResponse = z.infer<typeof CreateThreadResponseSchema>;

// Client Configuration
export interface ThreadsConfig {
  accessToken: string;
  userId: string;
  apiVersion?: string;
}

// Export for external use
export type { ThreadsConfig as ThreadsClientConfig };

// API Parameters
export interface CreateThreadParams {
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  replyToId?: string;
  replyControl?: 'everyone' | 'accounts_you_follow' | 'mentioned_only';
}

export interface GetMediaParams {
  fields?: string[];
  limit?: number;
}

export interface GetInsightsParams {
  metric: string[];
  since?: number;
  until?: number;
}

export interface GetRepliesParams {
  fields?: string[];
  reverse?: boolean;
}

