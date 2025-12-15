import * as http from 'http';
import { URL } from 'url';
import { ThreadsOAuth, TokenManager, type StoredToken } from './oauth.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface OAuthServerConfig {
  appId: string;
  appSecret: string;
  port?: number;
  tokenStorePath?: string;
}

/**
 * OAuth Server that handles the complete authentication flow
 * Automatically opens browser, handles callback, and stores tokens
 */
export class OAuthServer {
  private oauth: ThreadsOAuth;
  private server: http.Server | null = null;
  private port: number;
  private tokenStorePath: string;
  private resolveAuth: ((token: StoredToken) => void) | null = null;
  private rejectAuth: ((error: Error) => void) | null = null;

  constructor(config: OAuthServerConfig) {
    this.port = config.port || 48810; // High port number to avoid collisions
    this.tokenStorePath = config.tokenStorePath || path.join(process.cwd(), '.threads-token.json');

    this.oauth = new ThreadsOAuth({
      appId: config.appId,
      appSecret: config.appSecret,
      redirectUri: `http://localhost:${this.port}/callback`,
    });
  }

  /**
   * Start the OAuth flow
   * Opens browser and waits for user to authorize
   */
  async authenticate(): Promise<StoredToken> {
    // Check if we have a valid token already
    const existingToken = await this.loadToken();
    if (existingToken && this.isTokenValid(existingToken)) {
      console.error('✅ Using existing valid token');
      return existingToken;
    }

    console.error('🔐 Starting OAuth authentication flow...');
    console.error(`📡 Starting local server on http://localhost:${this.port}`);

    return new Promise((resolve, reject) => {
      this.resolveAuth = resolve;
      this.rejectAuth = reject;

      this.server = http.createServer((req, res) => this.handleRequest(req, res));

      this.server.listen(this.port, async () => {
        try {
          const authUrl = this.oauth.getAuthorizationUrl(
            [
              'threads_basic',
              'threads_content_publish',
              'threads_manage_insights',
              'threads_manage_replies',
              'threads_read_replies',
            ],
            Math.random().toString(36).substring(7) // CSRF state
          );

          console.error('\n🌐 Opening browser for authentication...');
          console.error("📋 If browser doesn't open, visit:");
          console.error(`   ${authUrl}\n`);

          // Try to open browser
          await this.openBrowser(authUrl);
        } catch (error) {
          this.rejectAuth?.(error as Error);
        }
      });

      // Timeout after 5 minutes
      setTimeout(
        () => {
          if (this.server) {
            this.server.close();
            this.rejectAuth?.(new Error('Authentication timeout after 5 minutes'));
          }
        },
        5 * 60 * 1000
      );
    });
  }

  /**
   * Get a token manager with automatic refresh
   */
  async getTokenManager(): Promise<TokenManager> {
    const token = await this.authenticate();
    const tokenManager = new TokenManager(this.oauth);
    tokenManager.setToken(token);
    return tokenManager;
  }

  /**
   * Handle HTTP requests to the OAuth callback server
   */
  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url || '', `http://localhost:${this.port}`);

    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(this.getErrorPage(error));
        this.server?.close();
        this.rejectAuth?.(new Error(`OAuth error: ${error}`));
        return;
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(this.getErrorPage('No authorization code received'));
        this.server?.close();
        this.rejectAuth?.(new Error('No authorization code received'));
        return;
      }

      try {
        console.error('🔄 Exchanging authorization code for tokens...');

        // Complete OAuth flow
        const result = await this.oauth.completeOAuthFlow(code);

        const token: StoredToken = {
          accessToken: result.accessToken,
          expiresAt: Date.now() + result.expiresIn * 1000,
          userId: result.userId,
        };

        // Save token
        await this.saveToken(token);

        console.error('✅ Authentication successful!');
        console.error(`   User ID: ${result.userId}`);
        console.error(`   Token expires in ${Math.floor(result.expiresIn / 86400)} days`);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(this.getSuccessPage());

        this.server?.close();
        this.resolveAuth?.(token);
      } catch (error) {
        console.error('❌ Authentication failed:', error);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(this.getErrorPage((error as Error).message));
        this.server?.close();
        this.rejectAuth?.(error as Error);
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  }

  /**
   * Open browser to authorization URL
   */
  private async openBrowser(url: string): Promise<void> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const platform = process.platform;

    try {
      if (platform === 'darwin') {
        await execAsync(`open "${url}"`);
      } else if (platform === 'win32') {
        await execAsync(`start "" "${url}"`);
      } else {
        // Linux/Unix
        await execAsync(`xdg-open "${url}"`);
      }
    } catch {
      // Browser opening failed, user will need to copy URL manually
    }
  }

  /**
   * Save token to file
   */
  private async saveToken(token: StoredToken): Promise<void> {
    await fs.writeFile(this.tokenStorePath, JSON.stringify(token, null, 2), 'utf-8');
  }

  /**
   * Load token from file
   */
  private async loadToken(): Promise<StoredToken | null> {
    try {
      const data = await fs.readFile(this.tokenStorePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Check if token is valid (not expired)
   */
  private isTokenValid(token: StoredToken): boolean {
    return token.expiresAt > Date.now();
  }

  /**
   * HTML page shown after successful authentication
   */
  private getSuccessPage(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Authentication Successful</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      background: white;
      padding: 3rem;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
      max-width: 500px;
    }
    h1 {
      color: #2d3748;
      margin: 0 0 1rem 0;
      font-size: 2rem;
    }
    .checkmark {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: block;
      margin: 0 auto 2rem;
      background: #48bb78;
      position: relative;
    }
    .checkmark::after {
      content: '';
      position: absolute;
      width: 25px;
      height: 50px;
      border: solid white;
      border-width: 0 6px 6px 0;
      top: 10px;
      left: 28px;
      transform: rotate(45deg);
    }
    p {
      color: #4a5568;
      line-height: 1.6;
      margin: 0.5rem 0;
    }
    .close-msg {
      margin-top: 2rem;
      font-size: 0.9rem;
      color: #718096;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="checkmark"></div>
    <h1>✅ Authentication Successful!</h1>
    <p><strong>Your Threads account has been connected.</strong></p>
    <p>You can now close this window and return to Claude Desktop.</p>
    <p class="close-msg">This window will close automatically in 5 seconds...</p>
  </div>
  <script>
    setTimeout(() => window.close(), 5000);
  </script>
</body>
</html>
    `;
  }

  /**
   * HTML page shown after authentication error
   */
  private getErrorPage(error: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Authentication Failed</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }
    .container {
      background: white;
      padding: 3rem;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
      max-width: 500px;
    }
    h1 {
      color: #2d3748;
      margin: 0 0 1rem 0;
      font-size: 2rem;
    }
    .error-icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: block;
      margin: 0 auto 2rem;
      background: #f56565;
      position: relative;
    }
    .error-icon::before,
    .error-icon::after {
      content: '';
      position: absolute;
      width: 6px;
      height: 50px;
      background: white;
      top: 15px;
      left: 37px;
    }
    .error-icon::before {
      transform: rotate(45deg);
    }
    .error-icon::after {
      transform: rotate(-45deg);
    }
    p {
      color: #4a5568;
      line-height: 1.6;
      margin: 0.5rem 0;
    }
    .error-msg {
      background: #fed7d7;
      color: #c53030;
      padding: 1rem;
      border-radius: 8px;
      margin: 1.5rem 0;
      font-family: monospace;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="error-icon"></div>
    <h1>❌ Authentication Failed</h1>
    <p>There was an error connecting your Threads account.</p>
    <div class="error-msg">${this.escapeHtml(error)}</div>
    <p>Please close this window and try again.</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}
