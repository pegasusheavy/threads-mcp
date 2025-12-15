#!/usr/bin/env node

import { ThreadsMCPServer } from './server.js';
import { ThreadsClient } from './client/threads-client.js';

async function main() {
  const accessToken = process.env.THREADS_ACCESS_TOKEN;
  const userId = process.env.THREADS_USER_ID;

  if (!accessToken || !userId) {
    console.error('Error: THREADS_ACCESS_TOKEN and THREADS_USER_ID environment variables are required');
    console.error('');
    console.error('Please set these environment variables:');
    console.error('  export THREADS_ACCESS_TOKEN="your-access-token"');
    console.error('  export THREADS_USER_ID="your-user-id"');
    console.error('');
    console.error('Get your access token from: https://developers.facebook.com/docs/threads');
    process.exit(1);
  }

  try {
    const client = new ThreadsClient({
      accessToken,
      userId,
    });

    // Validate token on startup
    const isValid = await client.validateToken();
    if (!isValid) {
      console.error('Error: Invalid access token or user ID');
      process.exit(1);
    }

    const server = new ThreadsMCPServer();
    server.setClient(client);

    console.error('Threads MCP Server starting...');
    await server.run();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

