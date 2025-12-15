/**
 * Caching Layer Utility
 * Implements in-memory caching with TTL support
 */

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  onEvict?: (key: string, value: any) => void; // Callback on eviction
}

interface CacheEntry<T> {
  value: T;
  expires: number;
  lastAccessed: number;
}

export class Cache<T = any> {
  private cache: Map<string, CacheEntry<T>>;
  private readonly ttl: number;
  private readonly maxSize: number;
  private readonly onEvict?: (key: string, value: T) => void;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.ttl = options.ttl || 60000; // Default: 60 seconds
    this.maxSize = options.maxSize || 1000; // Default: 1000 entries
    this.onEvict = options.onEvict;
  }

  /**
   * Get value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expires) {
      this.delete(key);
      return undefined;
    }

    // Update last accessed time
    entry.lastAccessed = Date.now();
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    // Evict if at max size
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const expiresIn = ttl || this.ttl;
    const entry: CacheEntry<T> = {
      value,
      expires: Date.now() + expiresIn,
      lastAccessed: Date.now(),
    };

    this.cache.set(key, entry);
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry && this.onEvict) {
      this.onEvict(key, entry.value);
    }
    return this.cache.delete(key);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expires) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    if (this.onEvict) {
      this.cache.forEach((entry, key) => {
        this.onEvict!(key, entry.value);
      });
    }
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    this.cache.forEach((entry, key) => {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now > entry.expires) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.delete(key));
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache statistics
   */
  stats(): {
    size: number;
    maxSize: number;
    ttl: number;
    entries: { key: string; expiresIn: number; lastAccessed: number }[];
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      expiresIn: entry.expires - now,
      lastAccessed: now - entry.lastAccessed,
    }));

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
      entries,
    };
  }
}

/**
 * Cache decorator for methods
 */
export function Cached(cache: Cache, keyGenerator?: (...args: any[]) => string) {
  return function (
    _target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = keyGenerator
        ? keyGenerator(...args)
        : `${propertyKey}:${JSON.stringify(args)}`;

      // Try to get from cache
      const cached = cache.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }

      // Execute and cache
      const result = await originalMethod.apply(this, args);
      cache.set(cacheKey, result);
      return result;
    };

    return descriptor;
  };
}

/**
 * Advanced cache with automatic cleanup
 */
export class AutoCleanCache<T = any> extends Cache<T> {
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options: CacheOptions & { cleanupIntervalMs?: number } = {}) {
    super(options);

    const cleanupIntervalMs = options.cleanupIntervalMs || 60000; // Default: 1 minute
    this.startCleanup(cleanupIntervalMs);
  }

  /**
   * Start automatic cleanup
   */
  private startCleanup(intervalMs: number): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanExpired();
    }, intervalMs);
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Override clear to stop cleanup
   */
  override clear(): void {
    this.stopCleanup();
    super.clear();
  }
}

