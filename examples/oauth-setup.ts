#!/usr/bin/env tsx

/**
 * OAuth Setup Example for Threads MCP Server
 *
 * This example demonstrates the complete OAuth 2.0 flow for Threads:
 * 1. Generate authorization URL
 * 2. User authorizes and you receive a code
 * 3. Exchange code for tokens
 * 4. Store and manage long-lived tokens
 * 5. Automatic token refresh
 */

import { ThreadsOAuth, TokenManager, type StoredToken } from '../src/auth/oauth.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// OAuth Configuration
const config = {
  appId: process.env.THREADS_APP_ID || '',
  appSecret: process.env.THREADS_APP_SECRET || '',
  redirectUri: process.env.THREADS_REDIRECT_URI || 'http://localhost:48810/callback',
};

// File to store tokens persistently
const TOKEN_FILE = path.join(process.cwd(), '.threads-token.json');

/**
 * Example 1: Start OAuth Flow
 * Generate authorization URL and direct user to it
 */
async function startOAuthFlow() {
  console.log('🚀 Starting OAuth Flow for Threads\n');

  const oauth = new ThreadsOAuth(config);

  // Generate authorization URL with required scopes
  const authUrl = oauth.getAuthorizationUrl(
    [
      'threads_basic', // Read basic profile info
      'threads_content_publish', // Create and publish threads
      'threads_manage_insights', // Read analytics
      'threads_manage_replies', // Read and manage replies
      'threads_read_replies', // Read replies
    ],
    'random-state-for-csrf-protection' // CSRF protection
  );

  console.log('📋 Step 1: Direct user to this URL:\n');
  console.log(authUrl);
  console.log('\n🔐 After user authorizes, they will be redirected to your redirect_uri');
  console.log('   Extract the "code" parameter from the callback URL\n');
}

/**
 * Example 2: Complete OAuth Flow
 * Exchange authorization code for long-lived token
 */
async function completeOAuthFlow(authCode: string) {
  console.log('🔄 Completing OAuth Flow...\n');

  const oauth = new ThreadsOAuth(config);

  try {
    // Complete full OAuth flow: code -> short token -> long token -> user ID
    const result = await oauth.completeOAuthFlow(authCode);

    console.log('✅ OAuth flow completed successfully!\n');
    console.log('📊 Token Information:');
    console.log(`  - User ID: ${result.userId}`);
    console.log(
      `  - Token expires in: ${result.expiresIn} seconds (${Math.floor(result.expiresIn / 86400)} days)`
    );
    console.log(`  - Access Token: ${result.accessToken.substring(0, 20)}...`);

    // Store token for future use
    const storedToken: StoredToken = {
      accessToken: result.accessToken,
      expiresAt: Date.now() + result.expiresIn * 1000,
      userId: result.userId,
    };

    await saveToken(storedToken);
    console.log(`\n💾 Token saved to ${TOKEN_FILE}`);
    console.log('   You can now use this token with the Threads MCP server!\n');

    // Show environment variables for MCP config
    console.log('🔧 Add these to your MCP configuration:');
    console.log(`   THREADS_ACCESS_TOKEN="${result.accessToken}"`);
    console.log(`   THREADS_USER_ID="${result.userId}"\n`);

    return result;
  } catch (error) {
    console.error('❌ OAuth flow failed:', error);
    throw error;
  }
}

/**
 * Example 3: Using Token Manager
 * Automatic token refresh and management
 */
async function useTokenManager() {
  console.log('🔐 Using Token Manager for automatic refresh\n');

  const oauth = new ThreadsOAuth(config);
  const tokenManager = new TokenManager(oauth);

  // Load existing token
  const token = await loadToken();
  if (!token) {
    console.error('❌ No token found. Please complete OAuth flow first.');
    return;
  }

  tokenManager.setToken(token);

  // Check if token is valid
  if (!tokenManager.isValid()) {
    console.log('⚠️  Token has expired. Please re-authenticate.');
    return;
  }

  console.log('✅ Token is valid');
  console.log(`   User ID: ${tokenManager.getUserId()}`);

  // Get token (will automatically refresh if needed)
  const accessToken = await tokenManager.getToken();
  console.log(`   Access Token: ${accessToken.substring(0, 20)}...\n`);

  // Export token for storage (in case it was refreshed)
  const updatedToken = tokenManager.exportToken();
  if (updatedToken) {
    await saveToken(updatedToken);
    console.log('💾 Token updated and saved\n');
  }

  return accessToken;
}

/**
 * Example 4: Manual Token Refresh
 * Refresh a long-lived token before it expires
 */
async function refreshToken() {
  console.log('🔄 Manually refreshing token...\n');

  const oauth = new ThreadsOAuth(config);
  const token = await loadToken();

  if (!token) {
    console.error('❌ No token found. Please complete OAuth flow first.');
    return;
  }

  try {
    const refreshed = await oauth.refreshLongLivedToken(token.accessToken);

    console.log('✅ Token refreshed successfully!\n');
    console.log(
      `   New token expires in: ${refreshed.expires_in} seconds (${Math.floor(refreshed.expires_in / 86400)} days)`
    );

    // Update stored token
    const updatedToken: StoredToken = {
      accessToken: refreshed.access_token,
      expiresAt: Date.now() + refreshed.expires_in * 1000,
      userId: token.userId,
    };

    await saveToken(updatedToken);
    console.log(`   Token saved to ${TOKEN_FILE}\n`);

    return refreshed;
  } catch (error) {
    console.error('❌ Token refresh failed:', error);
    throw error;
  }
}

/**
 * Helper: Save token to file
 */
async function saveToken(token: StoredToken): Promise<void> {
  await fs.writeFile(TOKEN_FILE, JSON.stringify(token, null, 2), 'utf-8');
}

/**
 * Helper: Load token from file
 */
async function loadToken(): Promise<StoredToken | null> {
  try {
    const data = await fs.readFile(TOKEN_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Main CLI
 */
async function main() {
  const command = process.argv[2];

  if (!config.appId || !config.appSecret) {
    console.error('❌ Error: Missing required environment variables');
    console.error('   Please set: THREADS_APP_ID and THREADS_APP_SECRET\n');
    console.error('   Get these from: https://developers.facebook.com/\n');
    process.exit(1);
  }

  switch (command) {
    case 'start':
      await startOAuthFlow();
      break;

    case 'complete': {
      const code = process.argv[3];
      if (!code) {
        console.error('❌ Usage: tsx oauth-setup.ts complete <authorization-code>');
        process.exit(1);
      }
      await completeOAuthFlow(code);
      break;
    }

    case 'check':
      await useTokenManager();
      break;

    case 'refresh':
      await refreshToken();
      break;

    default:
      console.log('Threads OAuth Setup Utility\n');
      console.log('Usage:');
      console.log('  tsx oauth-setup.ts start               - Generate authorization URL');
      console.log('  tsx oauth-setup.ts complete <code>     - Complete OAuth flow with auth code');
      console.log(
        '  tsx oauth-setup.ts check               - Check token status and refresh if needed'
      );
      console.log('  tsx oauth-setup.ts refresh             - Manually refresh token\n');
      console.log('Environment Variables:');
      console.log('  THREADS_APP_ID         - Your Threads App ID (required)');
      console.log('  THREADS_APP_SECRET     - Your Threads App Secret (required)');
      console.log(
        '  THREADS_REDIRECT_URI   - Your OAuth redirect URI (default: https://localhost:3000/callback)\n'
      );
      break;
  }
}

// Run CLI if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

export { startOAuthFlow, completeOAuthFlow, useTokenManager, refreshToken, saveToken, loadToken };
