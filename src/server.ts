import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { ThreadsClient } from './client/threads-client.js';
import { z } from 'zod';

// Tool parameter schemas
const GetProfileSchema = z.object({
  fields: z.array(z.string()).optional(),
});

const GetThreadsSchema = z.object({
  limit: z.number().min(1).max(100).optional(),
  fields: z.array(z.string()).optional(),
});

const GetThreadSchema = z.object({
  threadId: z.string().min(1),
  fields: z.array(z.string()).optional(),
});

const CreateThreadSchema = z.object({
  text: z.string().optional(),
  imageUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  replyToId: z.string().optional(),
  replyControl: z.enum(['everyone', 'accounts_you_follow', 'mentioned_only']).optional(),
});

const GetInsightsSchema = z.object({
  threadId: z.string().optional(),
  metrics: z.array(z.string()).min(1),
  since: z.number().optional(),
  until: z.number().optional(),
});

const GetRepliesSchema = z.object({
  threadId: z.string().min(1),
  fields: z.array(z.string()).optional(),
  reverse: z.boolean().optional(),
});

const GetConversationSchema = z.object({
  threadId: z.string().min(1),
  fields: z.array(z.string()).optional(),
  reverse: z.boolean().optional(),
});

const ReplyToThreadSchema = z.object({
  threadId: z.string().min(1),
  text: z.string().min(1),
  replyControl: z.enum(['everyone', 'accounts_you_follow', 'mentioned_only']).optional(),
});

export class ThreadsMCPServer {
  private server: Server;
  private client: ThreadsClient | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'threads-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'threads_get_profile',
          description: 'Get the authenticated user\'s Threads profile including username, name, bio, and profile picture',
          inputSchema: {
            type: 'object',
            properties: {
              fields: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional fields to retrieve. Defaults to id, username, name, threads_profile_picture_url, threads_biography',
              },
            },
          },
        },
        {
          name: 'threads_get_threads',
          description: 'Get the authenticated user\'s threads (posts) with pagination support',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Number of threads to retrieve (1-100, default: 25)',
                minimum: 1,
                maximum: 100,
              },
              fields: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional fields to retrieve for each thread',
              },
            },
          },
        },
        {
          name: 'threads_get_thread',
          description: 'Get a specific thread by its ID',
          inputSchema: {
            type: 'object',
            properties: {
              threadId: {
                type: 'string',
                description: 'The ID of the thread to retrieve',
              },
              fields: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional fields to retrieve',
              },
            },
            required: ['threadId'],
          },
        },
        {
          name: 'threads_create_thread',
          description: 'Create a new thread (post) with text, image, or video. Can also be used to reply to another thread.',
          inputSchema: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'The text content of the thread',
              },
              imageUrl: {
                type: 'string',
                description: 'URL of an image to include (must be publicly accessible)',
              },
              videoUrl: {
                type: 'string',
                description: 'URL of a video to include (must be publicly accessible)',
              },
              replyToId: {
                type: 'string',
                description: 'ID of the thread to reply to',
              },
              replyControl: {
                type: 'string',
                enum: ['everyone', 'accounts_you_follow', 'mentioned_only'],
                description: 'Who can reply to this thread',
              },
            },
          },
        },
        {
          name: 'threads_get_insights',
          description: 'Get insights (analytics) for a specific thread or for the user account',
          inputSchema: {
            type: 'object',
            properties: {
              threadId: {
                type: 'string',
                description: 'The ID of the thread (omit for user-level insights)',
              },
              metrics: {
                type: 'array',
                items: { type: 'string' },
                description: 'Metrics to retrieve (e.g., views, likes, replies, reposts, quotes)',
              },
              since: {
                type: 'number',
                description: 'Unix timestamp for start of time range',
              },
              until: {
                type: 'number',
                description: 'Unix timestamp for end of time range',
              },
            },
            required: ['metrics'],
          },
        },
        {
          name: 'threads_get_replies',
          description: 'Get replies to a specific thread',
          inputSchema: {
            type: 'object',
            properties: {
              threadId: {
                type: 'string',
                description: 'The ID of the thread',
              },
              fields: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional fields to retrieve for each reply',
              },
              reverse: {
                type: 'boolean',
                description: 'Whether to reverse the order of replies',
              },
            },
            required: ['threadId'],
          },
        },
        {
          name: 'threads_get_conversation',
          description: 'Get the full conversation thread including the original post and all replies',
          inputSchema: {
            type: 'object',
            properties: {
              threadId: {
                type: 'string',
                description: 'The ID of the thread',
              },
              fields: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional fields to retrieve',
              },
              reverse: {
                type: 'boolean',
                description: 'Whether to reverse the order',
              },
            },
            required: ['threadId'],
          },
        },
        {
          name: 'threads_reply_to_thread',
          description: 'Reply to an existing thread',
          inputSchema: {
            type: 'object',
            properties: {
              threadId: {
                type: 'string',
                description: 'The ID of the thread to reply to',
              },
              text: {
                type: 'string',
                description: 'The text content of the reply',
              },
              replyControl: {
                type: 'string',
                enum: ['everyone', 'accounts_you_follow', 'mentioned_only'],
                description: 'Who can reply to this reply',
              },
            },
            required: ['threadId', 'text'],
          },
        },
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!this.client) {
        throw new Error('Threads client not initialized. Please configure access token and user ID.');
      }

      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'threads_get_profile': {
            const params = GetProfileSchema.parse(args);
            const profile = await this.client.getProfile(params.fields);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(profile, null, 2),
                },
              ],
            };
          }

          case 'threads_get_threads': {
            const params = GetThreadsSchema.parse(args);
            const threads = await this.client.getThreads(params);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(threads, null, 2),
                },
              ],
            };
          }

          case 'threads_get_thread': {
            const params = GetThreadSchema.parse(args);
            const thread = await this.client.getThread(params.threadId, params.fields);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(thread, null, 2),
                },
              ],
            };
          }

          case 'threads_create_thread': {
            const params = CreateThreadSchema.parse(args);
            const result = await this.client.createThread(params);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'threads_get_insights': {
            const params = GetInsightsSchema.parse(args);
            const insights = params.threadId
              ? await this.client.getThreadInsights(params.threadId, {
                  metric: params.metrics,
                  since: params.since,
                  until: params.until,
                })
              : await this.client.getUserInsights({
                  metric: params.metrics,
                  since: params.since,
                  until: params.until,
                });
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(insights, null, 2),
                },
              ],
            };
          }

          case 'threads_get_replies': {
            const params = GetRepliesSchema.parse(args);
            const replies = await this.client.getReplies(params.threadId, {
              fields: params.fields,
              reverse: params.reverse,
            });
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(replies, null, 2),
                },
              ],
            };
          }

          case 'threads_get_conversation': {
            const params = GetConversationSchema.parse(args);
            const conversation = await this.client.getConversation(params.threadId, {
              fields: params.fields,
              reverse: params.reverse,
            });
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(conversation, null, 2),
                },
              ],
            };
          }

          case 'threads_reply_to_thread': {
            const params = ReplyToThreadSchema.parse(args);
            const result = await this.client.replyToThread(
              params.threadId,
              params.text,
              params.replyControl
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(`Invalid parameters: ${JSON.stringify(error.errors)}`);
        }
        throw error;
      }
    });
  }

  setClient(client: ThreadsClient) {
    this.client = client;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

