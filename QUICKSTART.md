# Quick Start Guide

Get up and running with Threads MCP Server in 5 minutes!

## Prerequisites

- Node.js 18 or higher
- pnpm installed (`npm install -g pnpm`)
- Threads API access token and user ID

## Installation

```bash
# Clone or navigate to the repository
cd threads-mcp

# Install dependencies
pnpm install

# Build the project
pnpm build
```

## Configuration

Create a `.env` file or export environment variables:

```bash
export THREADS_ACCESS_TOKEN="your-access-token-here"
export THREADS_USER_ID="your-user-id-here"
```

## Running the Server

```bash
# Run in development mode
pnpm run dev

# Or run the built version
node dist/index.js
```

## Testing

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch
```

## Using with MCP Clients

### Claude Desktop Configuration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "threads": {
      "command": "node",
      "args": ["/path/to/threads-mcp/dist/index.js"],
      "env": {
        "THREADS_ACCESS_TOKEN": "your-token",
        "THREADS_USER_ID": "your-user-id"
      }
    }
  }
}
```

## Quick Examples

### Using the Client Directly

```typescript
import { ThreadsClient } from './src/client/threads-client.js';

const client = new ThreadsClient({
  accessToken: process.env.THREADS_ACCESS_TOKEN!,
  userId: process.env.THREADS_USER_ID!,
});

// Get your profile
const profile = await client.getProfile();
console.log(`Hello, ${profile.username}!`);

// Create a thread
const thread = await client.createThread({
  text: 'Hello from Threads MCP Server! 🚀',
});
console.log(`Thread created: ${thread.id}`);

// Get insights
const insights = await client.getThreadInsights(thread.id, {
  metric: ['views', 'likes'],
});
console.log('Insights:', insights);
```

### Using MCP Tools

Once connected to an MCP client, you can use these tools:

```json
// Get profile
{
  "name": "threads_get_profile",
  "arguments": {}
}

// Create a thread
{
  "name": "threads_create_thread",
  "arguments": {
    "text": "Hello World! 👋"
  }
}

// Get analytics
{
  "name": "threads_get_insights",
  "arguments": {
    "threadId": "your-thread-id",
    "metrics": ["views", "likes", "replies"]
  }
}
```

## Common Commands

```bash
# Development
pnpm run dev              # Run in dev mode with tsx
pnpm run build            # Compile TypeScript

# Testing
pnpm test                 # Run tests once
pnpm test:coverage       # With coverage report
pnpm test:watch          # Watch mode

# Code Quality
pnpm run lint            # Check code style
pnpm run format          # Format code with Prettier
```

## Troubleshooting

### Error: Invalid credentials

Make sure your `THREADS_ACCESS_TOKEN` and `THREADS_USER_ID` are correct:

```bash
# Test your credentials
tsx src/client/threads-client.ts
```

### Error: Module not found

Rebuild the project:

```bash
pnpm run build
```

### Tests failing

Make sure all dependencies are installed:

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## Next Steps

- Read the [full documentation](./README.md)
- Check out [examples](./docs/EXAMPLES.md)
- Review the [API reference](./docs/API.md)
- Learn about [contributing](./CONTRIBUTING.md)

## Getting Help

- Check the [documentation](./README.md)
- Review [examples](./docs/EXAMPLES.md)
- Read the [API docs](./docs/API.md)
- Open an issue on GitHub

## Development Workflow

```bash
# 1. Make changes to source code
vim src/client/threads-client.ts

# 2. Run tests
pnpm test

# 3. Check coverage
pnpm test:coverage

# 4. Lint and format
pnpm run lint
pnpm run format

# 5. Build
pnpm run build

# 6. Test the built version
node dist/index.js
```

---

Happy coding! 🚀

