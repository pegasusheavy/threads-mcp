import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';

// OAuth Response Schemas
export const OAuthTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number().optional(),
});

export const LongLivedTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
});

export const RefreshTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
});

export type OAuthTokenResponse = z.infer<typeof OAuthTokenResponseSchema>;
export type LongLivedTokenResponse = z.infer<typeof LongLivedTokenResponseSchema>;
export type RefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;

export interface OAuthConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

export class ThreadsOAuth {
  private client: AxiosInstance;
  private config: OAuthConfig;
  private readonly authUrl = 'https://threads.net/oauth/authorize';
  private readonly tokenUrl = 'https://graph.threads.net/oauth/access_token';
  private readonly longLivedTokenUrl = 'https://graph.threads.net/access_token';
  private readonly refreshTokenUrl = 'https://graph.threads.net/refresh_access_token';

  constructor(config: OAuthConfig) {
    this.config = config;
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  /**
   * Step 1: Generate the authorization URL
   * Direct users to this URL to grant permissions to your app
   */
  getAuthorizationUrl(
    scope: string[] = ['threads_basic', 'threads_content_publish'],
    state?: string
  ): string {
    const params = new URLSearchParams({
      client_id: this.config.appId,
      redirect_uri: this.config.redirectUri,
      scope: scope.join(','),
      response_type: 'code',
    });

    if (state) {
      params.append('state', state);
    }

    return `${this.authUrl}?${params.toString()}`;
  }

  /**
   * Step 2: Exchange authorization code for short-lived access token
   * Call this after user authorizes and you receive the code via redirect
   */
  async exchangeCodeForToken(code: string): Promise<OAuthTokenResponse> {
    const params = new URLSearchParams({
      client_id: this.config.appId,
      client_secret: this.config.appSecret,
      grant_type: 'authorization_code',
      redirect_uri: this.config.redirectUri,
      code,
    });

    const response = await this.client.post(this.tokenUrl, params.toString());
    return OAuthTokenResponseSchema.parse(response.data);
  }

  /**
   * Step 3: Exchange short-lived token for long-lived token
   * Long-lived tokens last 60 days and can be refreshed
   */
  async getLongLivedToken(shortLivedToken: string): Promise<LongLivedTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'th_exchange_token',
      client_secret: this.config.appSecret,
      access_token: shortLivedToken,
    });

    const response = await this.client.get(`${this.longLivedTokenUrl}?${params.toString()}`);
    return LongLivedTokenResponseSchema.parse(response.data);
  }

  /**
   * Step 4: Refresh a long-lived token before it expires
   * Returns a new long-lived token valid for another 60 days
   */
  async refreshLongLivedToken(longLivedToken: string): Promise<RefreshTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'th_refresh_token',
      access_token: longLivedToken,
    });

    const response = await this.client.get(`${this.refreshTokenUrl}?${params.toString()}`);
    return RefreshTokenResponseSchema.parse(response.data);
  }

  /**
   * Get user ID from an access token
   * Useful after OAuth flow to identify the authenticated user
   */
  async getUserId(accessToken: string): Promise<string> {
    const response = await this.client.get('https://graph.threads.net/v1.0/me', {
      params: {
        fields: 'id',
        access_token: accessToken,
      },
    });

    if (!response.data?.id) {
      throw new Error('Failed to get user ID from access token');
    }

    return response.data.id;
  }

  /**
   * Complete OAuth flow helper
   * Handles the full flow from code to long-lived token
   */
  async completeOAuthFlow(code: string): Promise<{
    accessToken: string;
    userId: string;
    expiresIn: number;
  }> {
    // Exchange code for short-lived token
    const shortToken = await this.exchangeCodeForToken(code);

    // Exchange for long-lived token
    const longToken = await this.getLongLivedToken(shortToken.access_token);

    // Get user ID
    const userId = await this.getUserId(longToken.access_token);

    return {
      accessToken: longToken.access_token,
      userId,
      expiresIn: longToken.expires_in,
    };
  }
}

/**
 * Token manager for handling token refresh automatically
 */
export interface StoredToken {
  accessToken: string;
  expiresAt: number; // Unix timestamp
  userId: string;
}

export class TokenManager {
  private oauth: ThreadsOAuth;
  private token: StoredToken | null = null;
  private refreshBuffer = 7 * 24 * 60 * 60 * 1000; // 7 days before expiry

  constructor(oauth: ThreadsOAuth) {
    this.oauth = oauth;
  }

  /**
   * Set the current token
   */
  setToken(token: StoredToken): void {
    this.token = token;
  }

  /**
   * Get the current token, refreshing if needed
   */
  async getToken(): Promise<string> {
    if (!this.token) {
      throw new Error('No token available. Please authenticate first.');
    }

    // Check if token needs refresh (7 days before expiry)
    const now = Date.now();
    const timeUntilExpiry = this.token.expiresAt - now;

    if (timeUntilExpiry < this.refreshBuffer) {
      await this.refreshToken();
    }

    return this.token.accessToken;
  }

  /**
   * Get user ID
   */
  getUserId(): string {
    if (!this.token) {
      throw new Error('No token available. Please authenticate first.');
    }
    return this.token.userId;
  }

  /**
   * Check if token is valid and not expired
   */
  isValid(): boolean {
    if (!this.token) {
      return false;
    }
    return this.token.expiresAt > Date.now();
  }

  /**
   * Refresh the current token
   */
  private async refreshToken(): Promise<void> {
    if (!this.token) {
      throw new Error('No token to refresh');
    }

    const refreshed = await this.oauth.refreshLongLivedToken(this.token.accessToken);

    this.token = {
      accessToken: refreshed.access_token,
      expiresAt: Date.now() + refreshed.expires_in * 1000,
      userId: this.token.userId,
    };
  }

  /**
   * Export token for storage
   */
  exportToken(): StoredToken | null {
    return this.token;
  }
}
