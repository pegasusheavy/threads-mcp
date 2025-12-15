import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { ThreadsClient, ThreadsAPIError } from '../threads-client.js';
import type { ThreadsConfig } from '../../types/threads.js';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('ThreadsClient', () => {
  let client: ThreadsClient;
  const mockConfig: ThreadsConfig = {
    accessToken: 'test-token',
    userId: 'test-user-id',
  };

  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    client = new ThreadsClient(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create axios instance with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://graph.threads.net/v1.0',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should use custom API version if provided', () => {
      const customConfig = { ...mockConfig, apiVersion: 'v2.0' };
      new ThreadsClient(customConfig);

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://graph.threads.net/v2.0',
        })
      );
    });

    it('should setup request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should fetch user profile with default fields', async () => {
      const mockProfile = {
        id: 'user-123',
        username: 'testuser',
        name: 'Test User',
        threads_profile_picture_url: 'https://example.com/pic.jpg',
        threads_biography: 'Test bio',
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockProfile });

      const result = await client.getProfile();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test-user-id', {
        params: {
          fields: 'id,username,name,threads_profile_picture_url,threads_biography',
        },
      });
      expect(result).toEqual(mockProfile);
    });

    it('should fetch user profile with custom fields', async () => {
      const mockProfile = {
        id: 'user-123',
        username: 'testuser',
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockProfile });

      const result = await client.getProfile(['id', 'username']);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test-user-id', {
        params: {
          fields: 'id,username',
        },
      });
      expect(result).toEqual(mockProfile);
    });

    it('should throw validation error for invalid response', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { invalid: 'data' } });

      await expect(client.getProfile()).rejects.toThrow();
    });
  });

  describe('getThreads', () => {
    it('should fetch user threads with default parameters', async () => {
      const mockThreads = {
        data: [
          {
            id: 'thread-1',
            media_product_type: 'THREADS',
            media_type: 'TEXT',
            permalink: 'https://threads.net/@user/post/1',
            text: 'Test thread',
            timestamp: '2024-01-01T00:00:00Z',
          },
        ],
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockThreads });

      const result = await client.getThreads();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test-user-id/threads', {
        params: {
          fields: expect.any(String),
          limit: 25,
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('thread-1');
    });

    it('should fetch threads with custom limit', async () => {
      const mockThreads = { data: [] };
      mockAxiosInstance.get.mockResolvedValue({ data: mockThreads });

      await client.getThreads({ limit: 50 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test-user-id/threads', {
        params: {
          fields: expect.any(String),
          limit: 50,
        },
      });
    });

    it('should return empty array when no data', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: {} });

      const result = await client.getThreads();

      expect(result).toEqual([]);
    });
  });

  describe('getThread', () => {
    it('should fetch a specific thread by ID', async () => {
      const mockThread = {
        id: 'thread-123',
        media_product_type: 'THREADS',
        media_type: 'IMAGE',
        permalink: 'https://threads.net/@user/post/123',
        text: 'Test thread',
        timestamp: '2024-01-01T00:00:00Z',
        media_url: 'https://example.com/image.jpg',
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockThread });

      const result = await client.getThread('thread-123');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/thread-123', {
        params: {
          fields: expect.any(String),
        },
      });
      expect(result.id).toBe('thread-123');
    });

    it('should fetch thread with custom fields', async () => {
      const mockThread = {
        id: 'thread-123',
        media_product_type: 'THREADS',
        media_type: 'TEXT',
        permalink: 'https://threads.net/@user/post/123',
        timestamp: '2024-01-01T00:00:00Z',
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockThread });

      await client.getThread('thread-123', ['id', 'text']);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/thread-123', {
        params: {
          fields: 'id,text',
        },
      });
    });
  });

  describe('createThread', () => {
    it('should create a text thread', async () => {
      const mockContainer = { id: 'container-123' };
      const mockPublish = { id: 'thread-456' };

      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: mockContainer })
        .mockResolvedValueOnce({ data: mockPublish });

      const result = await client.createThread({ text: 'Hello World' });

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
      expect(mockAxiosInstance.post).toHaveBeenNthCalledWith(1, '/test-user-id/threads', null, {
        params: {
          media_type: 'TEXT',
          text: 'Hello World',
        },
      });
      expect(mockAxiosInstance.post).toHaveBeenNthCalledWith(
        2,
        '/test-user-id/threads_publish',
        null,
        {
          params: {
            creation_id: 'container-123',
          },
        }
      );
      expect(result.id).toBe('thread-456');
    });

    it('should create an image thread', async () => {
      const mockContainer = { id: 'container-123' };
      const mockPublish = { id: 'thread-456' };

      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: mockContainer })
        .mockResolvedValueOnce({ data: mockPublish });

      await client.createThread({
        text: 'Check this out',
        imageUrl: 'https://example.com/image.jpg',
      });

      expect(mockAxiosInstance.post).toHaveBeenNthCalledWith(1, '/test-user-id/threads', null, {
        params: {
          media_type: 'IMAGE',
          text: 'Check this out',
          image_url: 'https://example.com/image.jpg',
        },
      });
    });

    it('should create a video thread', async () => {
      const mockContainer = { id: 'container-123' };
      const mockPublish = { id: 'thread-456' };

      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: mockContainer })
        .mockResolvedValueOnce({ data: mockPublish });

      await client.createThread({
        text: 'Watch this',
        videoUrl: 'https://example.com/video.mp4',
      });

      expect(mockAxiosInstance.post).toHaveBeenNthCalledWith(1, '/test-user-id/threads', null, {
        params: {
          media_type: 'VIDEO',
          text: 'Watch this',
          video_url: 'https://example.com/video.mp4',
        },
      });
    });

    it('should create a reply with reply control', async () => {
      const mockContainer = { id: 'container-123' };
      const mockPublish = { id: 'reply-456' };

      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: mockContainer })
        .mockResolvedValueOnce({ data: mockPublish });

      await client.createThread({
        text: 'Reply text',
        replyToId: 'original-thread-id',
        replyControl: 'accounts_you_follow',
      });

      expect(mockAxiosInstance.post).toHaveBeenNthCalledWith(1, '/test-user-id/threads', null, {
        params: {
          media_type: 'TEXT',
          text: 'Reply text',
          reply_to_id: 'original-thread-id',
          reply_control: 'accounts_you_follow',
        },
      });
    });
  });

  describe('getThreadInsights', () => {
    it('should fetch insights for a thread', async () => {
      const mockInsights = {
        data: [
          {
            name: 'views',
            period: 'lifetime',
            values: [{ value: 100 }],
            title: 'Views',
            description: 'Total views',
          },
        ],
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockInsights });

      const result = await client.getThreadInsights('thread-123', {
        metric: ['views', 'likes'],
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/thread-123/insights', {
        params: {
          metric: 'views,likes',
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('views');
    });

    it('should fetch insights with time range', async () => {
      const mockInsights = { data: [] };
      mockAxiosInstance.get.mockResolvedValue({ data: mockInsights });

      await client.getThreadInsights('thread-123', {
        metric: ['views'],
        since: 1640000000,
        until: 1650000000,
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/thread-123/insights', {
        params: {
          metric: 'views',
          since: 1640000000,
          until: 1650000000,
        },
      });
    });

    it('should return empty array when no data', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: {} });

      const result = await client.getThreadInsights('thread-123', { metric: ['views'] });

      expect(result).toEqual([]);
    });
  });

  describe('getUserInsights', () => {
    it('should fetch user-level insights', async () => {
      const mockInsights = {
        data: [
          {
            name: 'followers_count',
            period: 'day',
            values: [{ value: 1000 }],
          },
        ],
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockInsights });

      const result = await client.getUserInsights({
        metric: ['followers_count', 'engagement_rate'],
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test-user-id/threads_insights', {
        params: {
          metric: 'followers_count,engagement_rate',
        },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('getReplies', () => {
    it('should fetch replies to a thread', async () => {
      const mockReplies = {
        data: [
          {
            id: 'reply-1',
            text: 'Great post!',
            username: 'replier',
            timestamp: '2024-01-01T01:00:00Z',
          },
        ],
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockReplies });

      const result = await client.getReplies('thread-123');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/thread-123/replies', {
        params: {
          fields: 'id,text,username,permalink,timestamp',
        },
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('reply-1');
    });

    it('should fetch replies with reverse order', async () => {
      const mockReplies = { data: [] };
      mockAxiosInstance.get.mockResolvedValue({ data: mockReplies });

      await client.getReplies('thread-123', { reverse: true });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/thread-123/replies', {
        params: {
          fields: 'id,text,username,permalink,timestamp',
          reverse: true,
        },
      });
    });
  });

  describe('getConversation', () => {
    it('should fetch full conversation', async () => {
      const mockConversation = {
        data: [
          {
            id: 'thread-123',
            text: 'Original post',
            username: 'author',
            timestamp: '2024-01-01T00:00:00Z',
          },
          {
            id: 'reply-1',
            text: 'Reply',
            username: 'replier',
            timestamp: '2024-01-01T01:00:00Z',
          },
        ],
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockConversation });

      const result = await client.getConversation('thread-123');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/thread-123/conversation', {
        params: {
          fields: 'id,text,username,permalink,timestamp',
        },
      });
      expect(result.data).toHaveLength(2);
    });
  });

  describe('replyToThread', () => {
    it('should reply to a thread', async () => {
      const mockContainer = { id: 'container-123' };
      const mockPublish = { id: 'reply-456' };

      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: mockContainer })
        .mockResolvedValueOnce({ data: mockPublish });

      const result = await client.replyToThread('thread-123', 'My reply');

      expect(result.id).toBe('reply-456');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/test-user-id/threads',
        null,
        expect.objectContaining({
          params: expect.objectContaining({
            text: 'My reply',
            reply_to_id: 'thread-123',
          }),
        })
      );
    });

    it('should reply with reply control', async () => {
      const mockContainer = { id: 'container-123' };
      const mockPublish = { id: 'reply-456' };

      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: mockContainer })
        .mockResolvedValueOnce({ data: mockPublish });

      await client.replyToThread('thread-123', 'My reply', 'mentioned_only');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/test-user-id/threads',
        null,
        expect.objectContaining({
          params: expect.objectContaining({
            reply_control: 'mentioned_only',
          }),
        })
      );
    });
  });

  describe('validateToken', () => {
    it('should return true for valid token', async () => {
      const mockProfile = {
        id: 'user-123',
        username: 'testuser',
      };

      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockProfile });

      const result = await client.validateToken();

      expect(result).toBe(true);
    });

    it('should return false for invalid token', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Unauthorized'));

      const result = await client.validateToken();

      expect(result).toBe(false);
    });
  });

  describe('ThreadsAPIError', () => {
    it('should create error with all properties', () => {
      const error = new ThreadsAPIError('Test error', 400, { error: 'details' });

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.response).toEqual({ error: 'details' });
      expect(error.name).toBe('ThreadsAPIError');
    });

    it('should create error without optional properties', () => {
      const error = new ThreadsAPIError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBeUndefined();
      expect(error.response).toBeUndefined();
    });
  });
});

