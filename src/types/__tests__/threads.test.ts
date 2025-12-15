import { describe, it, expect } from 'vitest';
import {
  ThreadsUserSchema,
  ThreadsMediaSchema,
  ThreadsInsightsSchema,
  ThreadsRepliesSchema,
  ThreadsConversationSchema,
  CreateThreadResponseSchema,
} from '../threads.js';

describe('Threads Type Schemas', () => {
  describe('ThreadsUserSchema', () => {
    it('should validate a valid user object', () => {
      const validUser = {
        id: 'user-123',
        username: 'testuser',
        name: 'Test User',
        threads_profile_picture_url: 'https://example.com/pic.jpg',
        threads_biography: 'Test bio',
      };

      const result = ThreadsUserSchema.parse(validUser);
      expect(result).toEqual(validUser);
    });

    it('should validate user with minimal required fields', () => {
      const minimalUser = {
        id: 'user-123',
        username: 'testuser',
      };

      const result = ThreadsUserSchema.parse(minimalUser);
      expect(result).toEqual(minimalUser);
    });

    it('should reject user without required fields', () => {
      const invalidUser = {
        name: 'Test User',
      };

      expect(() => ThreadsUserSchema.parse(invalidUser)).toThrow();
    });
  });

  describe('ThreadsMediaSchema', () => {
    it('should validate a text media object', () => {
      const validMedia = {
        id: 'thread-123',
        media_product_type: 'THREADS',
        media_type: 'TEXT',
        permalink: 'https://threads.net/@user/post/123',
        text: 'Test thread',
        timestamp: '2024-01-01T00:00:00Z',
      };

      const result = ThreadsMediaSchema.parse(validMedia);
      expect(result).toEqual(validMedia);
    });

    it('should validate an image media object', () => {
      const validMedia = {
        id: 'thread-123',
        media_product_type: 'THREADS',
        media_type: 'IMAGE',
        permalink: 'https://threads.net/@user/post/123',
        media_url: 'https://example.com/image.jpg',
        timestamp: '2024-01-01T00:00:00Z',
      };

      const result = ThreadsMediaSchema.parse(validMedia);
      expect(result).toEqual(validMedia);
    });

    it('should validate a video media object', () => {
      const validMedia = {
        id: 'thread-123',
        media_product_type: 'THREADS',
        media_type: 'VIDEO',
        permalink: 'https://threads.net/@user/post/123',
        media_url: 'https://example.com/video.mp4',
        thumbnail_url: 'https://example.com/thumb.jpg',
        timestamp: '2024-01-01T00:00:00Z',
      };

      const result = ThreadsMediaSchema.parse(validMedia);
      expect(result).toEqual(validMedia);
    });

    it('should validate carousel media object', () => {
      const validMedia = {
        id: 'thread-123',
        media_product_type: 'THREADS',
        media_type: 'CAROUSEL_ALBUM',
        permalink: 'https://threads.net/@user/post/123',
        timestamp: '2024-01-01T00:00:00Z',
        children: {
          data: [{ id: 'child-1' }, { id: 'child-2' }],
        },
      };

      const result = ThreadsMediaSchema.parse(validMedia);
      expect(result).toEqual(validMedia);
    });

    it('should validate media with quote post flag', () => {
      const validMedia = {
        id: 'thread-123',
        media_product_type: 'THREADS',
        media_type: 'TEXT',
        permalink: 'https://threads.net/@user/post/123',
        timestamp: '2024-01-01T00:00:00Z',
        is_quote_post: true,
      };

      const result = ThreadsMediaSchema.parse(validMedia);
      expect(result.is_quote_post).toBe(true);
    });

    it('should reject media with invalid media_type', () => {
      const invalidMedia = {
        id: 'thread-123',
        media_product_type: 'THREADS',
        media_type: 'INVALID_TYPE',
        permalink: 'https://threads.net/@user/post/123',
        timestamp: '2024-01-01T00:00:00Z',
      };

      expect(() => ThreadsMediaSchema.parse(invalidMedia)).toThrow();
    });
  });

  describe('ThreadsInsightsSchema', () => {
    it('should validate insights object', () => {
      const validInsights = {
        name: 'views',
        period: 'lifetime',
        values: [{ value: 100 }, { value: 200 }],
        title: 'Views',
        description: 'Total views',
        id: 'insight-123',
      };

      const result = ThreadsInsightsSchema.parse(validInsights);
      expect(result).toEqual(validInsights);
    });

    it('should validate insights with minimal fields', () => {
      const minimalInsights = {
        name: 'likes',
        period: 'day',
        values: [{ value: 50 }],
      };

      const result = ThreadsInsightsSchema.parse(minimalInsights);
      expect(result).toEqual(minimalInsights);
    });

    it('should reject insights without required fields', () => {
      const invalidInsights = {
        name: 'views',
        // missing period and values
      };

      expect(() => ThreadsInsightsSchema.parse(invalidInsights)).toThrow();
    });
  });

  describe('ThreadsRepliesSchema', () => {
    it('should validate replies object', () => {
      const validReplies = {
        data: [
          {
            id: 'reply-1',
            text: 'Great post!',
            username: 'replier',
            permalink: 'https://threads.net/@replier/post/reply-1',
            timestamp: '2024-01-01T01:00:00Z',
          },
        ],
        paging: {
          cursors: {
            before: 'cursor-before',
            after: 'cursor-after',
          },
        },
      };

      const result = ThreadsRepliesSchema.parse(validReplies);
      expect(result).toEqual(validReplies);
    });

    it('should validate replies without paging', () => {
      const validReplies = {
        data: [
          {
            id: 'reply-1',
          },
        ],
      };

      const result = ThreadsRepliesSchema.parse(validReplies);
      expect(result.data).toHaveLength(1);
    });

    it('should validate empty replies', () => {
      const emptyReplies = {
        data: [],
      };

      const result = ThreadsRepliesSchema.parse(emptyReplies);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('ThreadsConversationSchema', () => {
    it('should validate conversation object', () => {
      const validConversation = {
        data: [
          {
            id: 'thread-123',
            text: 'Original post',
            username: 'author',
            permalink: 'https://threads.net/@author/post/123',
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

      const result = ThreadsConversationSchema.parse(validConversation);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('CreateThreadResponseSchema', () => {
    it('should validate create thread response', () => {
      const validResponse = {
        id: 'new-thread-123',
      };

      const result = CreateThreadResponseSchema.parse(validResponse);
      expect(result).toEqual(validResponse);
    });

    it('should reject response without id', () => {
      const invalidResponse = {
        status: 'created',
      };

      expect(() => CreateThreadResponseSchema.parse(invalidResponse)).toThrow();
    });
  });

  describe('Complex scenarios', () => {
    it('should validate media with all optional fields', () => {
      const fullMedia = {
        id: 'thread-123',
        media_product_type: 'THREADS',
        media_type: 'IMAGE',
        media_url: 'https://example.com/image.jpg',
        permalink: 'https://threads.net/@user/post/123',
        username: 'testuser',
        text: 'Check this out!',
        timestamp: '2024-01-01T00:00:00Z',
        shortcode: 'abc123',
        thumbnail_url: 'https://example.com/thumb.jpg',
        children: {
          data: [{ id: 'child-1' }],
        },
        is_quote_post: false,
      };

      const result = ThreadsMediaSchema.parse(fullMedia);
      expect(result).toEqual(fullMedia);
    });

    it('should validate replies with pagination cursors', () => {
      const repliesWithPaging = {
        data: [{ id: 'reply-1' }, { id: 'reply-2' }, { id: 'reply-3' }],
        paging: {
          cursors: {
            before: 'cursor-before',
            after: 'cursor-after',
          },
        },
      };

      const result = ThreadsRepliesSchema.parse(repliesWithPaging);
      expect(result.data).toHaveLength(3);
      expect(result.paging?.cursors.before).toBe('cursor-before');
      expect(result.paging?.cursors.after).toBe('cursor-after');
    });

    it('should validate insights with multiple values', () => {
      const multiValueInsights = {
        name: 'engagement',
        period: '28_days',
        values: [
          { value: 100 },
          { value: 150 },
          { value: 200 },
          { value: 180 },
        ],
        title: 'Engagement Rate',
        description: 'Total engagement over 28 days',
      };

      const result = ThreadsInsightsSchema.parse(multiValueInsights);
      expect(result.values).toHaveLength(4);
    });
  });
});

