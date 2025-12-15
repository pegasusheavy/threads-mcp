# OAuth 2.0 Setup Guide for Threads MCP Server

This guide walks you through setting up OAuth 2.0 authentication for the Threads API. The Threads MCP Server now handles the entire OAuth flow automatically!

## Table of Contents

- [Quick Start (Recommended)](#quick-start-recommended)
- [Manual OAuth Flow](#manual-oauth-flow)
- [Token Management](#token-management)
- [Troubleshooting](#troubleshooting)

## Quick Start (Recommended)

The easiest way to use Threads MCP Server is to let it handle OAuth automatically.

### Step 1: Create a Meta App

1. Visit [Meta for Developers](https://developers.facebook.com/)
2. Click **"My Apps"** → **"Create App"**
3. Select **"Other"** as the use case
4. Choose **"Consumer"** as the app type
5. Fill in your app details and click **"Create App"**

### Step 2: Add Threads API

1. In your app dashboard, click **"Add Products"**
2. Find **"Threads"** and click **"Set Up"**

### Step 3: Configure OAuth Redirect URI

1. Go to **Threads** → **Settings** in your app dashboard
2. Under **"OAuth Redirect URIs"**, add:
   ```
   http://localhost:48810/callback
   ```
3. Click **"Save Changes"**

⚠️ **Important**: The port number must be exactly **48810**

### Step 4: Get Your App Credentials

1. Go to **Settings** → **Basic**
2. Note your:
   - **App ID** - Your `THREADS_APP_ID`
   - **App Secret** - Your `THREADS_APP_SECRET` (click "Show")

⚠️ **Security Warning**: Never commit your App Secret to version control!

### Step 5: Configure Claude Desktop

Edit your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

Add this configuration:

```json
{
  "mcpServers": {
    "threads": {
      "command": "npx",
      "args": ["-y", "@pegasusheavy/threads-mcp"],
      "env": {
        "THREADS_APP_ID": "your-app-id-here",
        "THREADS_APP_SECRET": "your-app-secret-here"
      }
    }
  }
}
```

### Step 6: Start Claude Desktop

1. Restart Claude Desktop
2. A browser window will automatically open
3. Log in with your Threads account
4. Click **"Allow"** to authorize the app
5. You'll see a success page - you can close it
6. Claude Desktop is now connected! 🎉

**That's it!** The server will:

- Automatically handle the OAuth flow
- Store your tokens securely
- Refresh tokens automatically before expiry
- Reuse existing tokens on future starts

## Manual OAuth Flow

If you prefer to run the OAuth flow manually or need tokens for other purposes:

### Using the OAuth Utility

```bash
# Set your credentials
export THREADS_APP_ID="your-app-id"
export THREADS_APP_SECRET="your-app-secret"

# Start OAuth flow
npx @pegasusheavy/threads-mcp oauth start

# After authorizing in browser, complete with the code:
npx @pegasusheavy/threads-mcp oauth complete YOUR_CODE
```

This will save your tokens to `.threads-token.json`.

### Using Tokens Manually

If you have a token from the manual flow, you can use it directly:

```json
{
  "mcpServers": {
    "threads": {
      "command": "npx",
      "args": ["-y", "@pegasusheavy/threads-mcp"],
      "env": {
        "THREADS_ACCESS_TOKEN": "your-long-lived-token",
        "THREADS_USER_ID": "your-user-id"
      }
    }
  }
}
```

## Token Management

### Token Lifespan

- **Short-lived tokens**: Valid for 1 hour (automatically handled)
- **Long-lived tokens**: Valid for 60 days
- **Automatic refresh**: Tokens are refreshed 7 days before expiry

### Token Storage

Tokens are stored in `.threads-token.json` in your home directory (or the directory where the server runs).

**Structure**:

```json
{
  "accessToken": "IGABCdef123...",
  "expiresAt": 1234567890000,
  "userId": "123456789"
}
```

⚠️ **Security**: Add `.threads-token.json` to your `.gitignore`!

### Automatic Token Refresh

The server automatically refreshes your token when it's within 7 days of expiring. You don't need to do anything!

### Manual Token Refresh

If you need to manually refresh a token:

```bash
export THREADS_APP_ID="your-app-id"
export THREADS_APP_SECRET="your-app-secret"

npx @pegasusheavy/threads-mcp oauth refresh
```

## Required Scopes

The server requests these OAuth scopes by default:

| Scope                     | Description                    | Required For     |
| ------------------------- | ------------------------------ | ---------------- |
| `threads_basic`           | Read basic profile info        | ✅ All features  |
| `threads_content_publish` | Create and publish threads     | Creating posts   |
| `threads_manage_insights` | Read analytics and insights    | Analytics        |
| `threads_manage_replies`  | Manage replies to your threads | Reply management |
| `threads_read_replies`    | Read replies to your threads   | Reading replies  |

## Troubleshooting

### "Invalid OAuth Redirect URI"

**Solution**: Make sure you've added `http://localhost:48810/callback` to your Meta App's OAuth Redirect URIs. The port number **must be 48810**.

### "Invalid App ID or App Secret"

**Solution**: Double-check your `THREADS_APP_ID` and `THREADS_APP_SECRET`. Make sure there are no extra spaces or quotes.

### Browser doesn't open automatically

**Solution**: The OAuth URL will be printed to the console. Copy and paste it into your browser manually.

### "Address already in use" (Port 48810)

**Solution**: Another process is using port 48810. You can either:

1. Stop the other process
2. Wait a few seconds and try again
3. Use a custom port by setting `THREADS_OAUTH_PORT` environment variable

### "Token expired"

**Solution**: The server should automatically refresh expired tokens. If you see this error:

1. Delete `.threads-token.json`
2. Restart Claude Desktop to trigger a new OAuth flow

### Token not refreshing automatically

**Solution**:

1. Make sure you're using `THREADS_APP_ID` and `THREADS_APP_SECRET` (not manual tokens)
2. Check that `.threads-token.json` exists and is readable
3. Verify the token hasn't been manually modified

### Claude Desktop doesn't show the server

**Solution**:

1. Check Claude Desktop logs for errors
2. Verify your `claude_desktop_config.json` syntax is correct
3. Make sure you fully restarted Claude Desktop (quit and reopen)
4. Try running `npx @pegasusheavy/threads-mcp` in your terminal to see detailed error messages

## Security Best Practices

1. **Never commit secrets**: Add `.threads-token.json` and any `.env` files to `.gitignore`
2. **Use environment variables**: Store `THREADS_APP_SECRET` in environment variables, not in code
3. **Rotate tokens regularly**: Delete `.threads-token.json` periodically to force re-auth
4. **Monitor app usage**: Check Meta's developer dashboard for unusual activity
5. **Use HTTPS in production**: For production deployments, use HTTPS redirect URIs
6. **Scope principle of least privilege**: Only request the scopes you actually need

## Port Number

The OAuth callback server uses port **48810** by default. This high port number is chosen to avoid conflicts with common development servers (3000, 8080, etc.).

You can customize the port by setting the `THREADS_OAUTH_PORT` environment variable:

```json
{
  "mcpServers": {
    "threads": {
      "command": "npx",
      "args": ["-y", "@pegasusheavy/threads-mcp"],
      "env": {
        "THREADS_APP_ID": "your-app-id",
        "THREADS_APP_SECRET": "your-app-secret",
        "THREADS_OAUTH_PORT": "12345"
      }
    }
  }
}
```

Remember to update your Meta App's redirect URI to match: `http://localhost:YOUR_PORT/callback`

## Additional Resources

- [Threads API Documentation](https://developers.facebook.com/docs/threads)
- [Meta OAuth Documentation](https://developers.facebook.com/docs/facebook-login/guides/access-tokens)
- [Threads API Permissions](https://developers.facebook.com/docs/threads/overview#permissions)
- [GitHub Repository](https://github.com/pegasusheavy/threads-mcp)

## Need Help?

- 🐛 [Report an issue](https://github.com/pegasusheavy/threads-mcp/issues)
- 📚 [Read the main README](../README.md)
- 💬 [MCP Protocol Documentation](https://modelcontextprotocol.io/)
