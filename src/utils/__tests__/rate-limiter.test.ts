import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter, RateLimiterManager } from '../rate-limiter.js';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Token Bucket Algorithm', () => {
    it('should allow requests within limit', () => {
      const limiter = new RateLimiter({ maxTokens: 10, refillRate: 1 });

      expect(limiter.tryConsume(5)).toBe(true);
      expect(limiter.tryConsume(5)).toBe(true);
      expect(limiter.tryConsume(1)).toBe(false); // Exceeded
    });

    it('should refill tokens over time', () => {
      const limiter = new RateLimiter({ maxTokens: 10, refillRate: 2, refillInterval: 1000 });

      limiter.tryConsume(10); // Use all tokens
      expect(limiter.tryConsume(1)).toBe(false);

      vi.advanceTimersByTime(1000); // Refill 2 tokens
      expect(limiter.tryConsume(2)).toBe(true);
      expect(limiter.tryConsume(1)).toBe(false);
    });

    it('should not exceed max tokens', () => {
      const limiter = new RateLimiter({ maxTokens: 5, refillRate: 10 });

      vi.advanceTimersByTime(10000); // Wait long time
      expect(limiter.getTokens()).toBeLessThanOrEqual(5);
    });

    it('should calculate wait time correctly', () => {
      const limiter = new RateLimiter({ maxTokens: 10, refillRate: 1, refillInterval: 1000 });

      limiter.tryConsume(10);
      const waitTime = limiter.getWaitTime(5);
      expect(waitTime).toBeGreaterThan(0);
    });
  });

  describe('consume method', () => {
    it('should wait and consume tokens', async () => {
      const limiter = new RateLimiter({ maxTokens: 5, refillRate: 1, refillInterval: 100 });

      limiter.tryConsume(5); // Use all tokens

      const consumePromise = limiter.consume(3);

      vi.advanceTimersByTime(300); // Wait for refill
      await consumePromise;

      expect(limiter.getTokens()).toBeLessThan(3);
    });
  });

  describe('reset', () => {
    it('should reset tokens to max', () => {
      const limiter = new RateLimiter({ maxTokens: 10, refillRate: 1 });

      limiter.tryConsume(10);
      expect(limiter.getTokens()).toBe(0);

      limiter.reset();
      expect(limiter.getTokens()).toBe(10);
    });
  });
});

describe('RateLimiterManager', () => {
  let manager: RateLimiterManager;

  beforeEach(() => {
    manager = new RateLimiterManager();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('register and tryConsume', () => {
    it('should manage multiple endpoint limiters', () => {
      manager.register('api/posts', { maxTokens: 10, refillRate: 1 });
      manager.register('api/insights', { maxTokens: 5, refillRate: 1 });

      expect(manager.tryConsume('api/posts', 5)).toBe(true);
      expect(manager.tryConsume('api/posts', 6)).toBe(false);
      expect(manager.tryConsume('api/insights', 5)).toBe(true);
    });

    it('should allow requests for unregistered endpoints', () => {
      expect(manager.tryConsume('unknown', 100)).toBe(true);
    });
  });

  describe('consume', () => {
    it('should handle async consumption', async () => {
      manager.register('api/posts', { maxTokens: 2, refillRate: 1, refillInterval: 100 });

      await manager.consume('api/posts', 2);

      const consumePromise = manager.consume('api/posts', 1);
      vi.advanceTimersByTime(100);
      await consumePromise;

      expect(true).toBe(true); // Completed without error
    });
  });

  describe('reset', () => {
    it('should reset specific endpoint', () => {
      manager.register('api/posts', { maxTokens: 10, refillRate: 1 });
      manager.tryConsume('api/posts', 10);

      manager.reset('api/posts');
      expect(manager.tryConsume('api/posts', 10)).toBe(true);
    });

    it('should reset all endpoints', () => {
      manager.register('api/posts', { maxTokens: 10, refillRate: 1 });
      manager.register('api/insights', { maxTokens: 5, refillRate: 1 });

      manager.tryConsume('api/posts', 10);
      manager.tryConsume('api/insights', 5);

      manager.resetAll();

      expect(manager.tryConsume('api/posts', 10)).toBe(true);
      expect(manager.tryConsume('api/insights', 5)).toBe(true);
    });
  });

  describe('getWaitTime', () => {
    it('should return correct wait time', () => {
      manager.register('api/posts', { maxTokens: 5, refillRate: 1, refillInterval: 1000 });

      manager.tryConsume('api/posts', 5);
      const waitTime = manager.getWaitTime('api/posts', 3);

      expect(waitTime).toBeGreaterThan(0);
    });

    it('should return 0 for unregistered endpoints', () => {
      expect(manager.getWaitTime('unknown', 100)).toBe(0);
    });
  });
});

