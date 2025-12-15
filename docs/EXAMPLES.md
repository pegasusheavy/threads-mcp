# Threads MCP Server Examples

Practical examples for using the Threads MCP Server.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Creating Content](#creating-content)
- [Engagement & Analytics](#engagement--analytics)
- [Conversations](#conversations)
- [Advanced Patterns](#advanced-patterns)
- [Error Handling](#error-handling)

## Basic Usage

### Setup

```typescript
import { ThreadsClient } from 'threads-mcp';

const client = new ThreadsClient({
  accessToken: process.env.THREADS_ACCESS_TOKEN!,
  userId: process.env.THREADS_USER_ID!,
});

// Validate connection
const isValid = await client.validateToken();
if (!isValid) {
  throw new Error('Invalid credentials');
}
```

### Get Your Profile

```typescript
// Get basic profile
const profile = await client.getProfile();
console.log(`Username: ${profile.username}`);
console.log(`Bio: ${profile.threads_biography}`);

// Get specific fields
const minimalProfile = await client.getProfile(['id', 'username']);
```

### List Your Threads

```typescript
// Get recent threads
const threads = await client.getThreads({ limit: 10 });

threads.forEach((thread, index) => {
  console.log(`${index + 1}. ${thread.text || '[No text]'}`);
  console.log(`   Posted: ${thread.timestamp}`);
  console.log(`   URL: ${thread.permalink}`);
  console.log('---');
});
```

## Creating Content

### Simple Text Post

```typescript
const result = await client.createThread({
  text: 'Hello from the Threads API! 🚀',
  replyControl: 'everyone',
});

console.log(`Thread created: ${result.id}`);
```

### Post with Image

```typescript
// Image must be publicly accessible
const result = await client.createThread({
  text: 'Check out this amazing view! 🌄',
  imageUrl: 'https://example.com/mountain.jpg',
  replyControl: 'everyone',
});
```

### Post with Video

```typescript
const result = await client.createThread({
  text: 'Watch this! 🎥',
  videoUrl: 'https://example.com/video.mp4',
  replyControl: 'accounts_you_follow',
});
```

### Post with Reply Control

```typescript
// Only mentioned users can reply
const result = await client.createThread({
  text: 'Private discussion thread',
  replyControl: 'mentioned_only',
});

// Only followed accounts can reply
const result2 = await client.createThread({
  text: 'Thread for my followers',
  replyControl: 'accounts_you_follow',
});
```

## Engagement & Analytics

### Get Thread Insights

```typescript
const threadId = 'thread-123';
const insights = await client.getThreadInsights(threadId, {
  metric: ['views', 'likes', 'replies', 'reposts', 'quotes'],
});

insights.forEach((insight) => {
  console.log(`${insight.name}: ${insight.values[0].value}`);
});
```

### Get User Insights

```typescript
// Get follower count
const followerInsights = await client.getUserInsights({
  metric: ['followers_count'],
});

console.log(`Followers: ${followerInsights[0].values[0].value}`);

// Get engagement metrics for date range
const now = Math.floor(Date.now() / 1000);
const weekAgo = now - 7 * 24 * 60 * 60;

const weeklyInsights = await client.getUserInsights({
  metric: ['views', 'likes', 'replies'],
  since: weekAgo,
  until: now,
});

weeklyInsights.forEach((insight) => {
  console.log(`Weekly ${insight.name}: ${insight.values[0].value}`);
});
```

### Track Thread Performance

```typescript
async function trackThreadPerformance(threadId: string) {
  const insights = await client.getThreadInsights(threadId, {
    metric: ['views', 'likes', 'replies', 'reposts'],
  });

  const metrics = insights.reduce((acc, insight) => {
    acc[insight.name] = insight.values[0].value;
    return acc;
  }, {} as Record<string, number>);

  const engagementRate =
    ((metrics.likes + metrics.replies + metrics.reposts) / metrics.views) * 100;

  return {
    ...metrics,
    engagementRate: engagementRate.toFixed(2) + '%',
  };
}

const performance = await trackThreadPerformance('thread-123');
console.log(performance);
// { views: 1000, likes: 50, replies: 10, reposts: 5, engagementRate: '6.50%' }
```

## Conversations

### Reply to a Thread

```typescript
// Simple reply
const reply = await client.replyToThread(
  'thread-123',
  'Great post! Thanks for sharing. 👍'
);

console.log(`Reply created: ${reply.id}`);

// Reply with controlled responses
const reply2 = await client.replyToThread(
  'thread-123',
  'This is a private reply',
  'mentioned_only'
);
```

### Get Thread Replies

```typescript
// Get all replies
const replies = await client.getReplies('thread-123');

console.log(`Total replies: ${replies.data.length}`);

replies.data.forEach((reply) => {
  console.log(`@${reply.username}: ${reply.text}`);
});

// Get replies in reverse order (newest first)
const recentReplies = await client.getReplies('thread-123', {
  reverse: true,
});
```

### Get Full Conversation

```typescript
const conversation = await client.getConversation('thread-123');

console.log('=== CONVERSATION ===');
conversation.data.forEach((post, index) => {
  const prefix = index === 0 ? '[OP]' : `[${index}]`;
  console.log(`${prefix} @${post.username}:`);
  console.log(`    ${post.text}`);
  console.log('');
});
```

### Conversation Thread

```typescript
async function createConversationThread() {
  // Create original post
  const original = await client.createThread({
    text: 'What\'s your favorite programming language? 🤔',
  });

  console.log(`Created thread: ${original.id}`);

  // Simulate waiting for replies (in real scenario, this would be automated)
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Reply to your own thread
  const reply = await client.replyToThread(
    original.id,
    'Mine is TypeScript! Strong typing FTW 💪'
  );

  console.log(`Added reply: ${reply.id}`);

  // Get the full conversation
  const conversation = await client.getConversation(original.id);
  return conversation;
}
```

## Advanced Patterns

### Scheduled Posting

```typescript
class ThreadScheduler {
  private client: ThreadsClient;
  private queue: Array<{ text: string; time: Date }> = [];

  constructor(client: ThreadsClient) {
    this.client = client;
  }

  schedule(text: string, time: Date) {
    this.queue.push({ text, time });
    this.queue.sort((a, b) => a.time.getTime() - b.time.getTime());
  }

  async start() {
    while (this.queue.length > 0) {
      const next = this.queue[0];
      const now = new Date();

      if (next.time <= now) {
        try {
          await this.client.createThread({ text: next.text });
          console.log(`Posted: ${next.text}`);
          this.queue.shift();
        } catch (error) {
          console.error('Failed to post:', error);
          // Retry logic here
        }
      } else {
        const delay = next.time.getTime() - now.getTime();
        await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 60000)));
      }
    }
  }
}

// Usage
const scheduler = new ThreadScheduler(client);

scheduler.schedule('Good morning! ☀️', new Date('2024-01-01T08:00:00'));
scheduler.schedule('Lunch time! 🍕', new Date('2024-01-01T12:00:00'));
scheduler.schedule('Good night! 🌙', new Date('2024-01-01T22:00:00'));

await scheduler.start();
```

### Bulk Content Creation

```typescript
async function createThreadSeries(posts: string[]) {
  const results = [];

  for (const post of posts) {
    try {
      const result = await client.createThread({ text: post });
      results.push({ success: true, id: result.id, text: post });

      // Wait between posts to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      results.push({ success: false, error, text: post });
    }
  }

  return results;
}

// Usage
const tips = [
  '💡 Tip 1: Always write tests for your code',
  '💡 Tip 2: Use meaningful variable names',
  '💡 Tip 3: Keep functions small and focused',
  '💡 Tip 4: Document your APIs',
  '💡 Tip 5: Review your own code before committing',
];

const results = await createThreadSeries(tips);
console.log(`Posted ${results.filter(r => r.success).length}/${tips.length} tips`);
```

### Analytics Dashboard

```typescript
async function getAnalyticsDashboard(daysBack: number = 7) {
  const now = Math.floor(Date.now() / 1000);
  const pastDate = now - daysBack * 24 * 60 * 60;

  // Get user insights
  const userInsights = await client.getUserInsights({
    metric: ['followers_count', 'views', 'likes', 'replies'],
    since: pastDate,
    until: now,
  });

  // Get recent threads
  const threads = await client.getThreads({ limit: 10 });

  // Get insights for each thread
  const threadInsights = await Promise.all(
    threads.map(async (thread) => {
      try {
        const insights = await client.getThreadInsights(thread.id, {
          metric: ['views', 'likes', 'replies'],
        });
        return {
          id: thread.id,
          text: thread.text?.substring(0, 50),
          insights: insights.reduce((acc, i) => {
            acc[i.name] = i.values[0].value;
            return acc;
          }, {} as Record<string, number>),
        };
      } catch {
        return null;
      }
    })
  );

  return {
    period: `Last ${daysBack} days`,
    userMetrics: userInsights.reduce((acc, i) => {
      acc[i.name] = i.values[0].value;
      return acc;
    }, {} as Record<string, number>),
    topThreads: threadInsights
      .filter((t) => t !== null)
      .sort((a, b) => (b?.insights.views || 0) - (a?.insights.views || 0))
      .slice(0, 5),
  };
}

// Usage
const dashboard = await getAnalyticsDashboard(7);
console.log(JSON.stringify(dashboard, null, 2));
```

### Auto-Reply Bot

```typescript
class AutoReplyBot {
  private client: ThreadsClient;
  private keywords: Map<string, string>;
  private processedReplies = new Set<string>();

  constructor(client: ThreadsClient) {
    this.client = client;
    this.keywords = new Map([
      ['help', 'Hi! How can I assist you today?'],
      ['thanks', 'You\'re welcome! 😊'],
      ['question', 'Feel free to ask anything!'],
    ]);
  }

  async monitorThread(threadId: string) {
    const replies = await this.client.getReplies(threadId);

    for (const reply of replies.data) {
      if (this.processedReplies.has(reply.id)) continue;

      const text = reply.text?.toLowerCase() || '';
      for (const [keyword, response] of this.keywords) {
        if (text.includes(keyword)) {
          await this.client.replyToThread(reply.id, response);
          this.processedReplies.add(reply.id);
          console.log(`Auto-replied to ${reply.username}`);
          break;
        }
      }
    }
  }

  async start(threadId: string, intervalSeconds: number = 60) {
    console.log(`Starting auto-reply bot for thread ${threadId}`);

    while (true) {
      try {
        await this.monitorThread(threadId);
      } catch (error) {
        console.error('Error monitoring thread:', error);
      }

      await new Promise((resolve) =>
        setTimeout(resolve, intervalSeconds * 1000)
      );
    }
  }
}

// Usage
const bot = new AutoReplyBot(client);
await bot.start('your-thread-id', 60);
```

## Error Handling

### Retry with Exponential Backoff

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      const isRateLimit =
        error instanceof ThreadsAPIError && error.statusCode === 429;

      if (!isRateLimit) throw error;

      const delay = Math.pow(2, i) * 1000;
      console.log(`Rate limited. Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

// Usage
const thread = await retryWithBackoff(() =>
  client.createThread({ text: 'Hello!' })
);
```

### Graceful Error Handling

```typescript
async function safeCreateThread(text: string) {
  try {
    const result = await client.createThread({ text });
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ThreadsAPIError) {
      return {
        success: false,
        error: {
          message: error.message,
          statusCode: error.statusCode,
          isRateLimit: error.statusCode === 429,
          isAuth: error.statusCode === 401,
        },
      };
    }
    return {
      success: false,
      error: { message: 'Unknown error occurred' },
    };
  }
}

// Usage
const result = await safeCreateThread('Test post');
if (result.success) {
  console.log('Posted:', result.data.id);
} else {
  console.error('Failed:', result.error.message);
  if (result.error.isRateLimit) {
    console.log('Please wait before trying again');
  }
}
```

---

For more examples and information, check out:
- [API Documentation](./API.md)
- [Main README](../README.md)
- [Threads API Docs](https://developers.facebook.com/docs/threads)

