import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  ThreadsConfig,
  ThreadsUser,
  ThreadsMedia,
  ThreadsInsights,
  ThreadsReplies,
  ThreadsConversation,
  CreateThreadResponse,
  CreateThreadParams,
  GetMediaParams,
  GetInsightsParams,
  GetRepliesParams,
  ThreadsUserSchema,
  ThreadsMediaSchema,
  ThreadsInsightsSchema,
  ThreadsRepliesSchema,
  ThreadsConversationSchema,
  CreateThreadResponseSchema,
} from '../types/threads.js';

export class ThreadsAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'ThreadsAPIError';
  }
}

export class ThreadsClient {
  private client: AxiosInstance;
  private config: ThreadsConfig;
  private baseUrl: string;

  constructor(config: ThreadsConfig) {
    this.config = {
      apiVersion: 'v1.0',
      ...config,
    };

    this.baseUrl = `https://graph.threads.net/${this.config.apiVersion}`;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use(async (config) => {
      // Use token manager if available, otherwise use static token
      const accessToken = this.config.tokenManager
        ? await this.config.tokenManager.getToken()
        : this.config.accessToken;

      config.params = {
        ...config.params,
        access_token: accessToken,
      };
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          throw new ThreadsAPIError(
            error.response.data ? JSON.stringify(error.response.data) : 'Unknown API error',
            error.response.status,
            error.response.data
          );
        } else if (error.request) {
          throw new ThreadsAPIError('No response received from Threads API');
        } else {
          throw new ThreadsAPIError(`Request failed: ${error.message}`);
        }
      }
    );
  }

  /**
   * Get the authenticated user's profile
   */
  async getProfile(fields?: string[]): Promise<ThreadsUser> {
    const defaultFields = [
      'id',
      'username',
      'name',
      'threads_profile_picture_url',
      'threads_biography',
    ];
    const requestFields = fields || defaultFields;

    const response = await this.client.get(`/${this.config.userId}`, {
      params: {
        fields: requestFields.join(','),
      },
    });

    return ThreadsUserSchema.parse(response.data);
  }

  /**
   * Get user's threads (posts)
   */
  async getThreads(params?: GetMediaParams): Promise<ThreadsMedia[]> {
    const defaultFields = [
      'id',
      'media_product_type',
      'media_type',
      'media_url',
      'permalink',
      'username',
      'text',
      'timestamp',
      'shortcode',
      'thumbnail_url',
      'children',
      'is_quote_post',
    ];

    const requestFields = params?.fields || defaultFields;

    const response = await this.client.get(`/${this.config.userId}/threads`, {
      params: {
        fields: requestFields.join(','),
        limit: params?.limit || 25,
      },
    });

    if (!response.data.data) {
      return [];
    }

    return response.data.data.map((item: unknown) => ThreadsMediaSchema.parse(item));
  }

  /**
   * Get a specific thread by ID
   */
  async getThread(threadId: string, fields?: string[]): Promise<ThreadsMedia> {
    const defaultFields = [
      'id',
      'media_product_type',
      'media_type',
      'media_url',
      'permalink',
      'username',
      'text',
      'timestamp',
      'shortcode',
      'thumbnail_url',
      'children',
      'is_quote_post',
    ];

    const requestFields = fields || defaultFields;

    const response = await this.client.get(`/${threadId}`, {
      params: {
        fields: requestFields.join(','),
      },
    });

    return ThreadsMediaSchema.parse(response.data);
  }

  /**
   * Create a new thread (post)
   */
  async createThread(params: CreateThreadParams): Promise<CreateThreadResponse> {
    // Step 1: Create media container
    const containerParams: Record<string, string> = {
      media_type: 'TEXT',
    };

    if (params.text) {
      containerParams.text = params.text;
    }

    if (params.imageUrl) {
      containerParams.media_type = 'IMAGE';
      containerParams.image_url = params.imageUrl;
    }

    if (params.videoUrl) {
      containerParams.media_type = 'VIDEO';
      containerParams.video_url = params.videoUrl;
    }

    if (params.replyToId) {
      containerParams.reply_to_id = params.replyToId;
    }

    if (params.replyControl) {
      containerParams.reply_control = params.replyControl;
    }

    const containerResponse = await this.client.post(`/${this.config.userId}/threads`, null, {
      params: containerParams,
    });

    const containerId = containerResponse.data.id;

    // Step 2: Publish the media container
    const publishResponse = await this.client.post(`/${this.config.userId}/threads_publish`, null, {
      params: {
        creation_id: containerId,
      },
    });

    return CreateThreadResponseSchema.parse(publishResponse.data);
  }

  /**
   * Get insights for a specific thread
   */
  async getThreadInsights(threadId: string, params: GetInsightsParams): Promise<ThreadsInsights[]> {
    const response = await this.client.get(`/${threadId}/insights`, {
      params: {
        metric: params.metric.join(','),
        ...(params.since && { since: params.since }),
        ...(params.until && { until: params.until }),
      },
    });

    if (!response.data.data) {
      return [];
    }

    return response.data.data.map((item: unknown) => ThreadsInsightsSchema.parse(item));
  }

  /**
   * Get user insights
   */
  async getUserInsights(params: GetInsightsParams): Promise<ThreadsInsights[]> {
    const response = await this.client.get(`/${this.config.userId}/threads_insights`, {
      params: {
        metric: params.metric.join(','),
        ...(params.since && { since: params.since }),
        ...(params.until && { until: params.until }),
      },
    });

    if (!response.data.data) {
      return [];
    }

    return response.data.data.map((item: unknown) => ThreadsInsightsSchema.parse(item));
  }

  /**
   * Get replies to a thread
   */
  async getReplies(threadId: string, params?: GetRepliesParams): Promise<ThreadsReplies> {
    const defaultFields = ['id', 'text', 'username', 'permalink', 'timestamp'];
    const requestFields = params?.fields || defaultFields;

    const response = await this.client.get(`/${threadId}/replies`, {
      params: {
        fields: requestFields.join(','),
        ...(params?.reverse !== undefined && { reverse: params.reverse }),
      },
    });

    return ThreadsRepliesSchema.parse(response.data);
  }

  /**
   * Get conversation (thread and its replies)
   */
  async getConversation(threadId: string, params?: GetRepliesParams): Promise<ThreadsConversation> {
    const defaultFields = ['id', 'text', 'username', 'permalink', 'timestamp'];
    const requestFields = params?.fields || defaultFields;

    const response = await this.client.get(`/${threadId}/conversation`, {
      params: {
        fields: requestFields.join(','),
        ...(params?.reverse !== undefined && { reverse: params.reverse }),
      },
    });

    return ThreadsConversationSchema.parse(response.data);
  }

  /**
   * Reply to a thread
   */
  async replyToThread(
    threadId: string,
    text: string,
    replyControl?: CreateThreadParams['replyControl']
  ): Promise<CreateThreadResponse> {
    return this.createThread({
      text,
      replyToId: threadId,
      replyControl,
    });
  }

  /**
   * Validate the access token
   */
  async validateToken(): Promise<boolean> {
    try {
      await this.getProfile(['id']);
      return true;
    } catch {
      return false;
    }
  }
}
