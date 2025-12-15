# Threads MCP Server API Documentation

Complete API reference for the Threads MCP Server.

## Table of Contents

- [MCP Tools](#mcp-tools)
- [ThreadsClient API](#threadsclient-api)
- [Type Definitions](#type-definitions)
- [Error Handling](#error-handling)

## MCP Tools

All tools return JSON responses. Parameters marked with `*` are required.

### threads_get_profile

Get the authenticated user's Threads profile.

**Parameters:**
```typescript
{
  fields?: string[]  // Optional fields to retrieve
}
```

**Default fields:** `['id', 'username', 'name', 'threads_profile_picture_url', 'threads_biography']`

**Example:**
```json
{
  "name": "threads_get_profile",
  "arguments": {
    "fields": ["id", "username", "name"]
  }
}
```

**Response:**
```json
{
  "id": "123456789",
  "username": "myusername",
  "name": "My Display Name",
  "threads_profile_picture_url": "https://...",
  "threads_biography": "My bio text"
}
```

---

### threads_get_threads

Get the authenticated user's threads (posts).

**Parameters:**
```typescript
{
  limit?: number     // 1-100, default: 25
  fields?: string[]  // Optional fields
}
```

**Example:**
```json
{
  "name": "threads_get_threads",
  "arguments": {
    "limit": 10
  }
}
```

**Response:**
```json
[
  {
    "id": "thread-123",
    "media_type": "TEXT",
    "text": "Hello world!",
    "timestamp": "2024-01-01T00:00:00Z",
    "permalink": "https://threads.net/..."
  }
]
```

---

### threads_get_thread

Get a specific thread by ID.

**Parameters:**
```typescript
{
  threadId*: string  // Thread ID
  fields?: string[]  // Optional fields
}
```

**Example:**
```json
{
  "name": "threads_get_thread",
  "arguments": {
    "threadId": "thread-123"
  }
}
```

---

### threads_create_thread

Create a new thread (post).

**Parameters:**
```typescript
{
  text?: string                                        // Text content
  imageUrl?: string                                    // Image URL (publicly accessible)
  videoUrl?: string                                    // Video URL (publicly accessible)
  replyToId?: string                                   // Thread ID to reply to
  replyControl?: 'everyone' | 'accounts_you_follow' | 'mentioned_only'
}
```

**Examples:**

Text thread:
```json
{
  "name": "threads_create_thread",
  "arguments": {
    "text": "Hello from the API! 🚀"
  }
}
```

Image thread:
```json
{
  "name": "threads_create_thread",
  "arguments": {
    "text": "Check out this image!",
    "imageUrl": "https://example.com/image.jpg"
  }
}
```

Reply:
```json
{
  "name": "threads_create_thread",
  "arguments": {
    "text": "Great post!",
    "replyToId": "thread-123",
    "replyControl": "everyone"
  }
}
```

**Response:**
```json
{
  "id": "new-thread-456"
}
```

---

### threads_get_insights

Get analytics/insights for a thread or user account.

**Parameters:**
```typescript
{
  threadId?: string   // Thread ID (omit for user-level insights)
  metrics*: string[]  // Metrics to retrieve
  since?: number      // Unix timestamp start
  until?: number      // Unix timestamp end
}
```

**Thread Metrics:**
- `views` - Number of times the thread was viewed
- `likes` - Number of likes
- `replies` - Number of replies
- `reposts` - Number of reposts
- `quotes` - Number of quote posts

**User Metrics:**
- `followers_count` - Total followers
- `follower_demographics` - Follower demographics
- `views` - Total views
- `likes` - Total likes
- `replies` - Total replies
- `reposts` - Total reposts
- `quotes` - Total quotes

**Example (Thread):**
```json
{
  "name": "threads_get_insights",
  "arguments": {
    "threadId": "thread-123",
    "metrics": ["views", "likes", "replies"]
  }
}
```

**Example (User):**
```json
{
  "name": "threads_get_insights",
  "arguments": {
    "metrics": ["followers_count", "views"],
    "since": 1704067200,
    "until": 1704153600
  }
}
```

**Response:**
```json
[
  {
    "name": "views",
    "period": "lifetime",
    "values": [{ "value": 1250 }],
    "title": "Views",
    "description": "Total views"
  }
]
```

---

### threads_get_replies

Get replies to a specific thread.

**Parameters:**
```typescript
{
  threadId*: string   // Thread ID
  fields?: string[]   // Optional fields
  reverse?: boolean   // Reverse order (newest first)
}
```

**Example:**
```json
{
  "name": "threads_get_replies",
  "arguments": {
    "threadId": "thread-123",
    "reverse": true
  }
}
```

**Response:**
```json
{
  "data": [
    {
      "id": "reply-1",
      "text": "Great post!",
      "username": "replier",
      "timestamp": "2024-01-01T01:00:00Z"
    }
  ],
  "paging": {
    "cursors": {
      "before": "cursor-before",
      "after": "cursor-after"
    }
  }
}
```

---

### threads_get_conversation

Get the full conversation (original thread + all replies).

**Parameters:**
```typescript
{
  threadId*: string   // Thread ID
  fields?: string[]   // Optional fields
  reverse?: boolean   // Reverse order
}
```

**Example:**
```json
{
  "name": "threads_get_conversation",
  "arguments": {
    "threadId": "thread-123"
  }
}
```

**Response:**
```json
{
  "data": [
    {
      "id": "thread-123",
      "text": "Original post",
      "username": "author",
      "timestamp": "2024-01-01T00:00:00Z"
    },
    {
      "id": "reply-1",
      "text": "Reply",
      "username": "replier",
      "timestamp": "2024-01-01T01:00:00Z"
    }
  ]
}
```

---

### threads_reply_to_thread

Reply to an existing thread.

**Parameters:**
```typescript
{
  threadId*: string                                    // Thread ID to reply to
  text*: string                                        // Reply text
  replyControl?: 'everyone' | 'accounts_you_follow' | 'mentioned_only'
}
```

**Example:**
```json
{
  "name": "threads_reply_to_thread",
  "arguments": {
    "threadId": "thread-123",
    "text": "Thanks for sharing!",
    "replyControl": "everyone"
  }
}
```

**Response:**
```json
{
  "id": "reply-456"
}
```

---

## ThreadsClient API

For direct API access without MCP.

### Constructor

```typescript
import { ThreadsClient } from 'threads-mcp';

const client = new ThreadsClient({
  accessToken: string;   // Required
  userId: string;        // Required
  apiVersion?: string;   // Optional, default: 'v1.0'
});
```

### Methods

#### getProfile(fields?: string[]): Promise\<ThreadsUser\>

Get user profile.

```typescript
const profile = await client.getProfile();
console.log(profile.username);
```

#### getThreads(params?: GetMediaParams): Promise\<ThreadsMedia[]\>

Get user's threads.

```typescript
const threads = await client.getThreads({ limit: 10 });
threads.forEach(thread => console.log(thread.text));
```

#### getThread(threadId: string, fields?: string[]): Promise\<ThreadsMedia\>

Get specific thread.

```typescript
const thread = await client.getThread('thread-123');
console.log(thread.text);
```

#### createThread(params: CreateThreadParams): Promise\<CreateThreadResponse\>

Create new thread.

```typescript
const result = await client.createThread({
  text: 'Hello world!',
  replyControl: 'everyone'
});
console.log('Created:', result.id);
```

#### getThreadInsights(threadId: string, params: GetInsightsParams): Promise\<ThreadsInsights[]\>

Get thread insights.

```typescript
const insights = await client.getThreadInsights('thread-123', {
  metric: ['views', 'likes']
});
```

#### getUserInsights(params: GetInsightsParams): Promise\<ThreadsInsights[]\>

Get user insights.

```typescript
const insights = await client.getUserInsights({
  metric: ['followers_count']
});
```

#### getReplies(threadId: string, params?: GetRepliesParams): Promise\<ThreadsReplies\>

Get thread replies.

```typescript
const replies = await client.getReplies('thread-123');
console.log(`${replies.data.length} replies`);
```

#### getConversation(threadId: string, params?: GetRepliesParams): Promise\<ThreadsConversation\>

Get full conversation.

```typescript
const conversation = await client.getConversation('thread-123');
```

#### replyToThread(threadId: string, text: string, replyControl?: string): Promise\<CreateThreadResponse\>

Reply to thread.

```typescript
const reply = await client.replyToThread('thread-123', 'Great post!');
```

#### validateToken(): Promise\<boolean\>

Validate access token.

```typescript
const isValid = await client.validateToken();
if (!isValid) {
  console.error('Invalid token');
}
```

---

## Type Definitions

### ThreadsUser

```typescript
interface ThreadsUser {
  id: string;
  username: string;
  name?: string;
  threads_profile_picture_url?: string;
  threads_biography?: string;
}
```

### ThreadsMedia

```typescript
interface ThreadsMedia {
  id: string;
  media_product_type: string;
  media_type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  permalink: string;
  username?: string;
  text?: string;
  timestamp: string;
  shortcode?: string;
  thumbnail_url?: string;
  children?: {
    data: { id: string }[];
  };
  is_quote_post?: boolean;
}
```

### CreateThreadParams

```typescript
interface CreateThreadParams {
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  replyToId?: string;
  replyControl?: 'everyone' | 'accounts_you_follow' | 'mentioned_only';
}
```

### ThreadsInsights

```typescript
interface ThreadsInsights {
  name: string;
  period: string;
  values: { value: number }[];
  title?: string;
  description?: string;
  id?: string;
}
```

---

## Error Handling

### ThreadsAPIError

All API errors throw a `ThreadsAPIError`:

```typescript
class ThreadsAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  )
}
```

**Example:**

```typescript
import { ThreadsAPIError } from 'threads-mcp';

try {
  await client.createThread({ text: 'Hello!' });
} catch (error) {
  if (error instanceof ThreadsAPIError) {
    console.error('Status:', error.statusCode);
    console.error('Message:', error.message);
    console.error('Response:', error.response);
  }
}
```

### Common Errors

| Status Code | Meaning | Solution |
|-------------|---------|----------|
| 400 | Bad Request | Check your parameters |
| 401 | Unauthorized | Verify access token |
| 403 | Forbidden | Check permissions |
| 404 | Not Found | Verify resource ID |
| 429 | Rate Limited | Wait before retrying |
| 500 | Server Error | Retry after delay |

### Rate Limiting

The Threads API has rate limits. Handle them appropriately:

```typescript
async function createThreadWithRetry(text: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.createThread({ text });
    } catch (error) {
      if (error instanceof ThreadsAPIError && error.statusCode === 429) {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## Best Practices

1. **Always validate tokens** before making requests
2. **Handle errors gracefully** with try-catch blocks
3. **Respect rate limits** - implement backoff strategies
4. **Use type safety** - leverage TypeScript types
5. **Validate inputs** - use Zod schemas
6. **Cache responses** when appropriate
7. **Test thoroughly** - write comprehensive tests
8. **Monitor usage** - track API calls and errors

---

For more information, see the [README](../README.md) or [Threads API Documentation](https://developers.facebook.com/docs/threads).

