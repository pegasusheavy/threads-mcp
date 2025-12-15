/**
 * Advanced Usage Examples
 * Demonstrates rate limiting, caching, and webhook features
 */

import { EnhancedThreadsClient } from '../src/client/enhanced-threads-client.js';
import { RateLimiter, RateLimiterManager } from '../src/utils/rate-limiter.js';
import { Cache, AutoCleanCache } from '../src/utils/cache.js';
import { WebhookManager } from '../src/utils/webhook.js';

// =============================================================================
// Example 1: Basic Enhanced Client Usage
// =============================================================================

async function example1_BasicEnhancedClient() {
  console.log('\n=== Example 1: Basic Enhanced Client ===\n');

  const client = new EnhancedThreadsClient({
    accessToken: process.env.THREADS_ACCESS_TOKEN!,
    userId: process.env.THREADS_USER_ID!,
    enableRateLimiting: true,
    enableCaching: true,
    enableWebhooks: true,
  });

  // Get profile (cached automatically)
  const profile = await client.getProfile();
  console.log('Profile:', profile.username);

  // Get profile again (served from cache)
  const cachedProfile = await client.getProfile();
  console.log('Cached profile:', cachedProfile.username);

  // Create thread (respects rate limit)
  const thread = await client.createThread({
    text: 'Hello from enhanced client!',
  });
  console.log('Created thread:', thread.id);

  // Check stats
  const stats = client.getStats();
  console.log('\nClient Stats:', {
    cacheSize: stats.cache?.size,
    rateLimiterTokens: stats.rateLimiter?.tokens,
    webhookSubscriptions: stats.webhooks?.subscriptions,
  });
}

// =============================================================================
// Example 2: Rate Limiting
// =============================================================================

async function example2_RateLimiting() {
  console.log('\n=== Example 2: Rate Limiting ===\n');

  // Create a rate limiter: 10 requests per second
  const limiter = new RateLimiter({
    maxTokens: 10,
    refillRate: 10,
    refillInterval: 1000, // 1 second
  });

  console.log('Initial tokens:', limiter.getTokens());

  // Make some requests
  for (let i = 0; i < 5; i++) {
    if (limiter.tryConsume(1)) {
      console.log(`Request ${i + 1}: Allowed`);
    } else {
      const waitTime = limiter.getWaitTime(1);
      console.log(`Request ${i + 1}: Rate limited (wait ${waitTime}ms)`);
      await limiter.consume(1); // Wait for token
      console.log(`Request ${i + 1}: Allowed after waiting`);
    }
  }

  console.log('Remaining tokens:', limiter.getTokens());
}

// =============================================================================
// Example 3: Rate Limiter Manager
// =============================================================================

async function example3_RateLimiterManager() {
  console.log('\n=== Example 3: Rate Limiter Manager ===\n');

  const manager = new RateLimiterManager();

  // Different limits for different endpoints
  manager.register('api/read', {
    maxTokens: 100,
    refillRate: 20,
  });

  manager.register('api/write', {
    maxTokens: 50,
    refillRate: 5,
  });

  manager.register('api/analytics', {
    maxTokens: 10,
    refillRate: 1,
  });

  // Make requests
  console.log('Read request:', manager.tryConsume('api/read', 10));
  console.log('Write request:', manager.tryConsume('api/write', 5));
  console.log('Analytics request:', manager.tryConsume('api/analytics', 2));

  // Check wait times
  console.log('\nWait times:');
  console.log('- Read:', manager.getWaitTime('api/read', 1), 'ms');
  console.log('- Write:', manager.getWaitTime('api/write', 1), 'ms');
  console.log('- Analytics:', manager.getWaitTime('api/analytics', 1), 'ms');
}

// =============================================================================
// Example 4: Caching
// =============================================================================

async function example4_Caching() {
  console.log('\n=== Example 4: Caching ===\n');

  const cache = new Cache<any>({
    ttl: 60000, // 1 minute
    maxSize: 100,
  });

  // Store data
  cache.set('user:123', { name: 'John', age: 30 });
  cache.set('post:456', { title: 'Hello World', likes: 100 }, 5000); // Custom TTL

  // Retrieve data
  console.log('User:', cache.get('user:123'));
  console.log('Post:', cache.get('post:456'));

  // Check existence
  console.log('Has user:123?', cache.has('user:123'));

  // Get stats
  const stats = cache.stats();
  console.log('\nCache stats:', {
    size: stats.size,
    maxSize: stats.maxSize,
    entries: stats.entries.length,
  });

  // Clean expired entries
  setTimeout(() => {
    cache.cleanExpired();
    console.log('\nAfter cleanup, size:', cache.size());
  }, 6000);
}

// =============================================================================
// Example 5: Auto-Clean Cache
// =============================================================================

async function example5_AutoCleanCache() {
  console.log('\n=== Example 5: Auto-Clean Cache ===\n');

  const cache = new AutoCleanCache({
    ttl: 5000, // 5 seconds
    maxSize: 50,
    cleanupIntervalMs: 2000, // Clean every 2 seconds
  });

  // Add entries
  for (let i = 0; i < 10; i++) {
    cache.set(`key${i}`, `value${i}`);
  }

  console.log('Initial size:', cache.size());

  // Wait and watch auto-cleanup
  await new Promise((resolve) => setTimeout(resolve, 6000));
  console.log('After 6 seconds:', cache.size());

  cache.stopCleanup(); // Stop automatic cleanup
}

// =============================================================================
// Example 6: Webhooks
// =============================================================================

async function example6_Webhooks() {
  console.log('\n=== Example 6: Webhooks ===\n');

  const webhooks = new WebhookManager({
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 5000,
  });

  // Subscribe to events
  const subscription = webhooks.subscribe(
    'https://my-app.com/webhook',
    ['thread.created', 'reply.created'],
    'my-secret-key'
  );

  console.log('Created subscription:', subscription.id);

  // Listen to delivery events
  webhooks.on('delivery:success', (delivery) => {
    console.log('✅ Webhook delivered:', delivery.id);
  });

  webhooks.on('delivery:failed', (delivery, error) => {
    console.error('❌ Webhook failed:', delivery.id, error);
  });

  // Trigger webhook
  await webhooks.trigger('thread.created', {
    threadId: '123456',
    text: 'Hello World!',
    createdAt: new Date(),
  });

  // Get stats
  const stats = webhooks.stats();
  console.log('\nWebhook stats:', stats);
}

// =============================================================================
// Example 7: Complete Integration
// =============================================================================

async function example7_CompleteIntegration() {
  console.log('\n=== Example 7: Complete Integration ===\n');

  // Setup enhanced client
  const client = new EnhancedThreadsClient({
    accessToken: process.env.THREADS_ACCESS_TOKEN!,
    userId: process.env.THREADS_USER_ID!,
    rateLimitOptions: {
      maxTokens: 100,
      refillRate: 10,
    },
    cacheOptions: {
      ttl: 60000,
      maxSize: 200,
    },
  });

  // Setup webhook subscriptions
  const webhooks = client.getWebhookManager();
  if (webhooks) {
    webhooks.subscribe(
      'https://my-app.com/webhook/threads',
      ['thread.created', 'thread.updated'],
      process.env.WEBHOOK_SECRET
    );

    webhooks.on('delivery:success', (delivery) => {
      console.log('Webhook delivered:', delivery.event);
    });
  }

  // Perform operations
  console.log('Creating thread...');
  const thread = await client.createThread({
    text: 'Testing advanced features! 🚀',
  });

  console.log('Thread created:', thread.id);

  console.log('\nGetting thread details...');
  const threadDetails = await client.getThread(thread.id, ['id', 'text', 'timestamp']);
  console.log('Thread details:', threadDetails);

  console.log('\nGetting cached thread (no API call)...');
  const cachedThread = await client.getThread(thread.id, ['id', 'text', 'timestamp']);
  console.log('Cached thread:', cachedThread);

  // Check overall stats
  const stats = client.getStats();
  console.log('\n=== Final Stats ===');
  console.log('Cache:', {
    size: stats.cache?.size,
    maxSize: stats.cache?.maxSize,
  });
  console.log('Rate Limiter:', {
    tokensAvailable: stats.rateLimiter?.tokens,
  });
  console.log('Webhooks:', {
    subscriptions: stats.webhooks?.subscriptions,
    deliveries: stats.webhooks?.deliveries,
    successful: stats.webhooks?.successfulDeliveries,
  });
}

// =============================================================================
// Example 8: Webhook Signature Verification
// =============================================================================

function example8_WebhookVerification() {
  console.log('\n=== Example 8: Webhook Signature Verification ===\n');

  // This would be in your webhook receiver endpoint
  const webhookPayload = JSON.stringify({
    event: 'thread.created',
    timestamp: new Date(),
    data: { threadId: '123' },
  });

  const secret = 'my-secret-key';
  const signature = require('crypto')
    .createHmac('sha256', secret)
    .update(webhookPayload)
    .digest('hex');

  console.log('Payload:', webhookPayload);
  console.log('Signature:', signature);

  // Verify in your endpoint
  const isValid = WebhookManager.verifySignature(webhookPayload, signature, secret);
  console.log('Signature valid:', isValid);

  // Try with wrong signature
  const invalidSignature = 'invalid-signature-123';
  const isInvalid = WebhookManager.verifySignature(webhookPayload, invalidSignature, secret);
  console.log('Invalid signature detected:', !isInvalid);
}

// =============================================================================
// Example 9: Production Setup
// =============================================================================

async function example9_ProductionSetup() {
  console.log('\n=== Example 9: Production Setup ===\n');

  const client = new EnhancedThreadsClient({
    accessToken: process.env.THREADS_ACCESS_TOKEN!,
    userId: process.env.THREADS_USER_ID!,

    // Conservative rate limiting
    rateLimitOptions: {
      maxTokens: 80, // 80% of API limit
      refillRate: 8, // Safe refill rate
    },

    // Generous caching
    cacheOptions: {
      ttl: 60000, // 1 minute default
      maxSize: 500, // Large cache
    },
  });

  // Setup monitoring
  setInterval(() => {
    const stats = client.getStats();

    // Alert if rate limit tokens are low
    if (stats.rateLimiter && stats.rateLimiter.tokens < 10) {
      console.warn('⚠️  Rate limit tokens low:', stats.rateLimiter.tokens);
    }

    // Alert if cache is nearly full
    if (stats.cache && stats.cache.size > stats.cache.maxSize * 0.9) {
      console.warn('⚠️  Cache nearly full:', stats.cache.size, '/', stats.cache.maxSize);
    }

    console.log('Health check:', {
      timestamp: new Date().toISOString(),
      rateLimiterTokens: stats.rateLimiter?.tokens,
      cacheSize: stats.cache?.size,
      webhookDeliveries: stats.webhooks?.deliveries,
    });
  }, 60000); // Every minute

  // Setup webhook cleanup
  const webhooks = client.getWebhookManager();
  if (webhooks) {
    setInterval(() => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const cleaned = webhooks.cleanDeliveries(oneDayAgo);
      if (cleaned > 0) {
        console.log(`Cleaned ${cleaned} old webhook deliveries`);
      }
    }, 60 * 60 * 1000); // Every hour
  }

  console.log('Production monitoring setup complete');
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  try {
    // Run examples (comment out as needed)
    // await example1_BasicEnhancedClient();
    // await example2_RateLimiting();
    // await example3_RateLimiterManager();
    // await example4_Caching();
    // await example5_AutoCleanCache();
    // await example6_Webhooks();
    // await example7_CompleteIntegration();
    // example8_WebhookVerification();
    // await example9_ProductionSetup();

    console.log('\n✅ All examples completed!\n');
  } catch (error) {
    console.error('Error running examples:', error);
    process.exit(1);
  }
}

// Uncomment to run
// main();

export {
  example1_BasicEnhancedClient,
  example2_RateLimiting,
  example3_RateLimiterManager,
  example4_Caching,
  example5_AutoCleanCache,
  example6_Webhooks,
  example7_CompleteIntegration,
  example8_WebhookVerification,
  example9_ProductionSetup,
};

