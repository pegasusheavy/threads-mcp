/**
 * Enhanced Threads Client with Rate Limiting, Caching, and Webhook Support
 */

import { ThreadsClient } from './threads-client.js';
import type { ThreadsConfig } from '../types/threads.js';
import { RateLimiter } from '../utils/rate-limiter.js';
import { AutoCleanCache } from '../utils/cache.js';
import { WebhookManager } from '../utils/webhook.js';
import type {
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
} from '../types/threads.js';

export interface EnhancedThreadsConfig extends ThreadsConfig {
  enableRateLimiting?: boolean;
  enableCaching?: boolean;
  enableWebhooks?: boolean;
  rateLimitOptions?: {
    maxTokens?: number;
    refillRate?: number;
  };
  cacheOptions?: {
    ttl?: number;
    maxSize?: number;
  };
}

export class EnhancedThreadsClient extends ThreadsClient {
  private rateLimiter?: RateLimiter;
  private cache?: AutoCleanCache;
  private webhookManager?: WebhookManager;

  constructor(config: EnhancedThreadsConfig) {
    super(config);

    // Initialize rate limiter
    if (config.enableRateLimiting !== false) {
      this.rateLimiter = new RateLimiter({
        maxTokens: config.rateLimitOptions?.maxTokens || 100,
        refillRate: config.rateLimitOptions?.refillRate || 10,
      });
    }

    // Initialize cache
    if (config.enableCaching !== false) {
      this.cache = new AutoCleanCache({
        ttl: config.cacheOptions?.ttl || 60000, // 1 minute default
        maxSize: config.cacheOptions?.maxSize || 100,
        cleanupIntervalMs: 30000, // Clean every 30 seconds
      });
    }

    // Initialize webhook manager
    if (config.enableWebhooks) {
      this.webhookManager = new WebhookManager({
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 5000,
      });
    }
  }

  /**
   * Get profile with caching and rate limiting
   */
  override async getProfile(fields?: string[]): Promise<ThreadsUser> {
    await this.checkRateLimit();

    const cacheKey = `profile:${fields?.join(',') || 'default'}`;
    const cached = this.cache?.get(cacheKey);
    if (cached) {
      return cached;
    }

    const profile = await super.getProfile(fields);
    this.cache?.set(cacheKey, profile);

    return profile;
  }

  /**
   * Get threads with caching and rate limiting
   */
  override async getThreads(params?: GetMediaParams): Promise<ThreadsMedia[]> {
    await this.checkRateLimit();

    const cacheKey = `threads:${JSON.stringify(params || {})}`;
    const cached = this.cache?.get(cacheKey);
    if (cached) {
      return cached;
    }

    const threads = await super.getThreads(params);
    this.cache?.set(cacheKey, threads, 30000); // Cache for 30 seconds

    return threads;
  }

  /**
   * Get thread with caching and rate limiting
   */
  override async getThread(threadId: string, fields?: string[]): Promise<ThreadsMedia> {
    await this.checkRateLimit();

    const cacheKey = `thread:${threadId}:${fields?.join(',') || 'default'}`;
    const cached = this.cache?.get(cacheKey);
    if (cached) {
      return cached;
    }

    const thread = await super.getThread(threadId, fields);
    this.cache?.set(cacheKey, thread);

    return thread;
  }

  /**
   * Create thread with rate limiting and webhook trigger
   */
  override async createThread(params: CreateThreadParams): Promise<CreateThreadResponse> {
    await this.checkRateLimit(2); // Creating costs more tokens

    const result = await super.createThread(params);

    // Trigger webhook
    if (this.webhookManager) {
      await this.webhookManager.trigger('thread.created', {
        threadId: result.id,
        params,
      });
    }

    // Invalidate relevant caches
    this.invalidateCache('threads:');

    return result;
  }

  /**
   * Get thread insights with caching
   */
  override async getThreadInsights(
    threadId: string,
    params: GetInsightsParams
  ): Promise<ThreadsInsights[]> {
    await this.checkRateLimit();

    const cacheKey = `insights:${threadId}:${JSON.stringify(params)}`;
    const cached = this.cache?.get(cacheKey);
    if (cached) {
      return cached;
    }

    const insights = await super.getThreadInsights(threadId, params);
    this.cache?.set(cacheKey, insights, 300000); // Cache for 5 minutes

    return insights;
  }

  /**
   * Get user insights with caching
   */
  override async getUserInsights(params: GetInsightsParams): Promise<ThreadsInsights[]> {
    await this.checkRateLimit();

    const cacheKey = `user-insights:${JSON.stringify(params)}`;
    const cached = this.cache?.get(cacheKey);
    if (cached) {
      return cached;
    }

    const insights = await super.getUserInsights(params);
    this.cache?.set(cacheKey, insights, 300000); // Cache for 5 minutes

    return insights;
  }

  /**
   * Get replies with caching
   */
  override async getReplies(
    threadId: string,
    params?: GetRepliesParams
  ): Promise<ThreadsReplies> {
    await this.checkRateLimit();

    const cacheKey = `replies:${threadId}:${JSON.stringify(params || {})}`;
    const cached = this.cache?.get(cacheKey);
    if (cached) {
      return cached;
    }

    const replies = await super.getReplies(threadId, params);
    this.cache?.set(cacheKey, replies, 30000); // Cache for 30 seconds

    return replies;
  }

  /**
   * Get conversation with caching
   */
  override async getConversation(
    threadId: string,
    params?: GetRepliesParams
  ): Promise<ThreadsConversation> {
    await this.checkRateLimit();

    const cacheKey = `conversation:${threadId}:${JSON.stringify(params || {})}`;
    const cached = this.cache?.get(cacheKey);
    if (cached) {
      return cached;
    }

    const conversation = await super.getConversation(threadId, params);
    this.cache?.set(cacheKey, conversation, 30000); // Cache for 30 seconds

    return conversation;
  }

  /**
   * Reply to thread with rate limiting and webhook trigger
   */
  override async replyToThread(
    threadId: string,
    text: string,
    replyControl?: CreateThreadParams['replyControl']
  ): Promise<CreateThreadResponse> {
    await this.checkRateLimit(2);

    const result = await super.replyToThread(threadId, text, replyControl);

    // Trigger webhook
    if (this.webhookManager) {
      await this.webhookManager.trigger('reply.created', {
        replyId: result.id,
        threadId,
        text,
      });
    }

    // Invalidate relevant caches
    this.invalidateCache(`replies:${threadId}`);
    this.invalidateCache(`conversation:${threadId}`);

    return result;
  }

  /**
   * Check rate limit before making request
   */
  private async checkRateLimit(tokens: number = 1): Promise<void> {
    if (this.rateLimiter) {
      await this.rateLimiter.consume(tokens);
    }
  }

  /**
   * Invalidate cache entries by prefix
   */
  private invalidateCache(prefix: string): void {
    if (!this.cache) return;

    const keys = this.cache.keys();
    keys.forEach((key) => {
      if (key.startsWith(prefix)) {
        this.cache!.delete(key);
      }
    });
  }

  /**
   * Get webhook manager for subscription management
   */
  getWebhookManager(): WebhookManager | undefined {
    return this.webhookManager;
  }

  /**
   * Get cache for manual management
   */
  getCache(): AutoCleanCache | undefined {
    return this.cache;
  }

  /**
   * Get rate limiter for inspection
   */
  getRateLimiter(): RateLimiter | undefined {
    return this.rateLimiter;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache?.clear();
  }

  /**
   * Reset rate limiter
   */
  resetRateLimit(): void {
    this.rateLimiter?.reset();
  }

  /**
   * Get statistics
   */
  getStats(): {
    cache?: ReturnType<AutoCleanCache['stats']>;
    rateLimiter?: { tokens: number };
    webhooks?: ReturnType<WebhookManager['stats']>;
  } {
    return {
      cache: this.cache?.stats(),
      rateLimiter: this.rateLimiter
        ? { tokens: this.rateLimiter.getTokens() }
        : undefined,
      webhooks: this.webhookManager?.stats(),
    };
  }
}

