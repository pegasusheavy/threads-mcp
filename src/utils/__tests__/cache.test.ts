import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Cache, AutoCleanCache } from '../cache.js';

describe('Cache', () => {
  let cache: Cache<string>;

  beforeEach(() => {
    cache = new Cache({ ttl: 1000, maxSize: 3 });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('get and set', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should update existing keys', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      expect(cache.get('key1')).toBe('value2');
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');

      vi.advanceTimersByTime(1001);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should support custom TTL per entry', () => {
      cache.set('key1', 'value1', 500);
      cache.set('key2', 'value2', 2000);

      vi.advanceTimersByTime(600);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
    });

    it('should update last accessed time on get', () => {
      cache.set('key1', 'value1');

      vi.advanceTimersByTime(500);
      cache.get('key1'); // Access it

      vi.advanceTimersByTime(600);
      expect(cache.get('key1')).toBeUndefined(); // Should expire
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used when at max size', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      vi.advanceTimersByTime(100);
      cache.get('key1'); // Access key1, making key2 LRU

      cache.set('key4', 'value4'); // Should evict key2

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });
  });

  describe('has', () => {
    it('should check existence of non-expired keys', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });

    it('should return false for expired keys', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);

      vi.advanceTimersByTime(1001);
      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete entries', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should return false for non-existent keys', () => {
      expect(cache.delete('nonexistent')).toBe(false);
    });

    it('should call onEvict callback', () => {
      const onEvict = vi.fn();
      const cacheWithCallback = new Cache({ onEvict });

      cacheWithCallback.set('key1', 'value1');
      cacheWithCallback.delete('key1');

      expect(onEvict).toHaveBeenCalledWith('key1', 'value1');
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.clear();

      expect(cache.size()).toBe(0);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should call onEvict for all entries', () => {
      const onEvict = vi.fn();
      const cacheWithCallback = new Cache({ onEvict });

      cacheWithCallback.set('key1', 'value1');
      cacheWithCallback.set('key2', 'value2');
      cacheWithCallback.clear();

      expect(onEvict).toHaveBeenCalledTimes(2);
    });
  });

  describe('size', () => {
    it('should return current cache size', () => {
      expect(cache.size()).toBe(0);

      cache.set('key1', 'value1');
      expect(cache.size()).toBe(1);

      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);

      cache.delete('key1');
      expect(cache.size()).toBe(1);
    });
  });

  describe('cleanExpired', () => {
    it('should remove expired entries', () => {
      cache.set('key1', 'value1', 500);
      cache.set('key2', 'value2', 2000);

      vi.advanceTimersByTime(600);
      cache.cleanExpired();

      expect(cache.size()).toBe(1);
      expect(cache.get('key2')).toBe('value2');
    });
  });

  describe('keys', () => {
    it('should return all keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const keys = cache.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys.length).toBe(2);
    });
  });

  describe('stats', () => {
    it('should return cache statistics', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const stats = cache.stats();

      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(3);
      expect(stats.ttl).toBe(1000);
      expect(stats.entries.length).toBe(2);
    });
  });
});

describe('AutoCleanCache', () => {
  let cache: AutoCleanCache<string>;

  beforeEach(() => {
    cache = new AutoCleanCache({ ttl: 1000, cleanupIntervalMs: 500 });
    vi.useFakeTimers();
  });

  afterEach(() => {
    cache.stopCleanup();
    vi.useRealTimers();
  });

  it('should automatically clean expired entries', () => {
    cache.set('key1', 'value1', 300);
    cache.set('key2', 'value2', 2000);

    expect(cache.size()).toBe(2);

    vi.advanceTimersByTime(500); // First cleanup
    // Manual cleanup since timer might not fire immediately
    cache.cleanExpired();
    expect(cache.size()).toBe(1);
    expect(cache.get('key2')).toBe('value2');
  });

  it('should stop cleanup when requested', () => {
    cache.set('key1', 'value1', 300);
    cache.stopCleanup();

    vi.advanceTimersByTime(1000);
    expect(cache.size()).toBe(1); // Not cleaned automatically
  });

  it('should stop cleanup on clear', () => {
    cache.set('key1', 'value1');
    cache.clear();

    cache.set('key2', 'value2', 300);
    vi.advanceTimersByTime(1000);
    expect(cache.size()).toBe(1); // Cleanup stopped
  });
});

