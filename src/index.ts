#!/usr/bin/env node

import { ThreadsMCPServer } from './server.js';
import { ThreadsClient } from './client/threads-client.js';
import { OAuthServer } from './auth/oauth-server.js';

async function main() {
  // Check for OAuth credentials first (new preferred method)
  const appId = process.env.THREADS_APP_ID;
  const appSecret = process.env.THREADS_APP_SECRET;

  // Fallback to manual token method
  const accessToken = process.env.THREADS_ACCESS_TOKEN;
  const userId = process.env.THREADS_USER_ID;

  try {
    let client: ThreadsClient;

    if (appId && appSecret) {
      // New OAuth flow - automatic authentication
      console.error('🔐 Using OAuth authentication...');

      const oauthServer = new OAuthServer({
        appId,
        appSecret,
      });

      const tokenManager = await oauthServer.getTokenManager();

      client = new ThreadsClient({
        accessToken: '', // Not used with tokenManager
        userId: tokenManager.getUserId(),
        tokenManager: tokenManager,
      });

      console.error('✅ OAuth authentication successful!');
    } else if (accessToken && userId) {
      // Legacy manual token method
      console.error('⚠️  Using manual token authentication (legacy method)');
      console.error('   Consider switching to OAuth with THREADS_APP_ID and THREADS_APP_SECRET');

      client = new ThreadsClient({
        accessToken,
        userId,
      });

      // Validate token on startup
      const isValid = await client.validateToken();
      if (!isValid) {
        console.error('❌ Error: Invalid access token or user ID');
        process.exit(1);
      }
    } else {
      console.error('❌ Error: Missing authentication credentials');
      console.error('');
      console.error('Option 1 (Recommended): OAuth Authentication');
      console.error('  Set these environment variables:');
      console.error('    THREADS_APP_ID="your-app-id"');
      console.error('    THREADS_APP_SECRET="your-app-secret"');
      console.error('');
      console.error('  Get these from: https://developers.facebook.com/');
      console.error('  The server will automatically handle OAuth flow on first run.');
      console.error('');
      console.error('Option 2 (Legacy): Manual Token');
      console.error('  Set these environment variables:');
      console.error('    THREADS_ACCESS_TOKEN="your-access-token"');
      console.error('    THREADS_USER_ID="your-user-id"');
      console.error('');
      process.exit(1);
    }

    const server = new ThreadsMCPServer();
    server.setClient(client);

    console.error('🚀 Threads MCP Server starting...');
    await server.run();
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
