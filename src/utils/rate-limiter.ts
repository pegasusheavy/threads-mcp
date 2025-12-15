/**
 * Rate Limiter Utility
 * Implements token bucket algorithm for API rate limiting
 */

export interface RateLimiterOptions {
  maxTokens: number; // Maximum number of tokens in the bucket
  refillRate: number; // Tokens refilled per second
  refillInterval?: number; // Refill interval in milliseconds (default: 1000)
}

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;
  private readonly refillInterval: number;

  constructor(options: RateLimiterOptions) {
    this.maxTokens = options.maxTokens;
    this.refillRate = options.refillRate;
    this.refillInterval = options.refillInterval || 1000;
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const intervalsElapsed = elapsed / this.refillInterval;
    const tokensToAdd = intervalsElapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Try to consume tokens
   * @param tokens Number of tokens to consume (default: 1)
   * @returns true if tokens were consumed, false if not enough tokens
   */
  tryConsume(tokens: number = 1): boolean {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  /**
   * Wait until tokens are available and consume them
   * @param tokens Number of tokens to consume (default: 1)
   */
  async consume(tokens: number = 1): Promise<void> {
    while (!this.tryConsume(tokens)) {
      const waitTime = this.getWaitTime(tokens);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Get estimated wait time for tokens to be available
   * @param tokens Number of tokens needed
   * @returns Wait time in milliseconds
   */
  getWaitTime(tokens: number = 1): number {
    this.refill();

    if (this.tokens >= tokens) {
      return 0;
    }

    const tokensNeeded = tokens - this.tokens;
    const intervalsNeeded = Math.ceil(tokensNeeded / this.refillRate);
    return intervalsNeeded * this.refillInterval;
  }

  /**
   * Get current token count
   */
  getTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }
}

/**
 * Rate Limiter Manager for multiple endpoints
 */
export class RateLimiterManager {
  private limiters: Map<string, RateLimiter>;

  constructor() {
    this.limiters = new Map();
  }

  /**
   * Register a rate limiter for an endpoint
   */
  register(endpoint: string, options: RateLimiterOptions): void {
    this.limiters.set(endpoint, new RateLimiter(options));
  }

  /**
   * Try to consume tokens for an endpoint
   */
  tryConsume(endpoint: string, tokens: number = 1): boolean {
    const limiter = this.limiters.get(endpoint);
    if (!limiter) {
      return true; // No limiter configured, allow request
    }
    return limiter.tryConsume(tokens);
  }

  /**
   * Wait and consume tokens for an endpoint
   */
  async consume(endpoint: string, tokens: number = 1): Promise<void> {
    const limiter = this.limiters.get(endpoint);
    if (limiter) {
      await limiter.consume(tokens);
    }
  }

  /**
   * Get wait time for an endpoint
   */
  getWaitTime(endpoint: string, tokens: number = 1): number {
    const limiter = this.limiters.get(endpoint);
    return limiter ? limiter.getWaitTime(tokens) : 0;
  }

  /**
   * Reset a specific endpoint's limiter
   */
  reset(endpoint: string): void {
    const limiter = this.limiters.get(endpoint);
    if (limiter) {
      limiter.reset();
    }
  }

  /**
   * Reset all limiters
   */
  resetAll(): void {
    this.limiters.forEach((limiter) => limiter.reset());
  }
}

/**
 * Decorator for rate-limited methods
 */
export function RateLimited(limiter: RateLimiter, tokens: number = 1) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      await limiter.consume(tokens);
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

