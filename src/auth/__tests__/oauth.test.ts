import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { ThreadsOAuth, TokenManager, type StoredToken } from '../oauth';

vi.mock('axios');

describe('ThreadsOAuth', () => {
  let oauth: ThreadsOAuth;
  const mockConfig = {
    appId: 'test-app-id',
    appSecret: 'test-app-secret',
    redirectUri: 'https://example.com/callback',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    oauth = new ThreadsOAuth(mockConfig);
  });

  describe('getAuthorizationUrl', () => {
    it('should generate correct authorization URL with default scope', () => {
      const url = oauth.getAuthorizationUrl();

      expect(url).toContain('https://threads.net/oauth/authorize');
      expect(url).toContain('client_id=test-app-id');
      expect(url).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcallback');
      expect(url).toContain('scope=threads_basic%2Cthreads_content_publish');
      expect(url).toContain('response_type=code');
    });

    it('should include custom scope', () => {
      const url = oauth.getAuthorizationUrl(['threads_basic', 'threads_read_replies']);

      expect(url).toContain('scope=threads_basic%2Cthreads_read_replies');
    });

    it('should include state parameter when provided', () => {
      const state = 'random-state-123';
      const url = oauth.getAuthorizationUrl(undefined, state);

      expect(url).toContain(`state=${state}`);
    });
  });

  describe('exchangeCodeForToken', () => {
    it('should exchange authorization code for access token', async () => {
      const mockResponse = {
        data: {
          access_token: 'short-lived-token',
          token_type: 'bearer',
        },
      };

      vi.mocked(axios.create).mockReturnValue({
        post: vi.fn().mockResolvedValue(mockResponse),
      } as any);

      oauth = new ThreadsOAuth(mockConfig);
      const result = await oauth.exchangeCodeForToken('auth-code-123');

      expect(result).toEqual({
        access_token: 'short-lived-token',
        token_type: 'bearer',
      });
    });

    it('should throw error on invalid response', async () => {
      const mockResponse = {
        data: {
          invalid: 'response',
        },
      };

      vi.mocked(axios.create).mockReturnValue({
        post: vi.fn().mockResolvedValue(mockResponse),
      } as any);

      oauth = new ThreadsOAuth(mockConfig);

      await expect(oauth.exchangeCodeForToken('auth-code-123')).rejects.toThrow();
    });
  });

  describe('getLongLivedToken', () => {
    it('should exchange short-lived token for long-lived token', async () => {
      const mockResponse = {
        data: {
          access_token: 'long-lived-token',
          token_type: 'bearer',
          expires_in: 5184000, // 60 days
        },
      };

      vi.mocked(axios.create).mockReturnValue({
        get: vi.fn().mockResolvedValue(mockResponse),
      } as any);

      oauth = new ThreadsOAuth(mockConfig);
      const result = await oauth.getLongLivedToken('short-lived-token');

      expect(result).toEqual({
        access_token: 'long-lived-token',
        token_type: 'bearer',
        expires_in: 5184000,
      });
    });
  });

  describe('refreshLongLivedToken', () => {
    it('should refresh a long-lived token', async () => {
      const mockResponse = {
        data: {
          access_token: 'refreshed-token',
          token_type: 'bearer',
          expires_in: 5184000,
        },
      };

      vi.mocked(axios.create).mockReturnValue({
        get: vi.fn().mockResolvedValue(mockResponse),
      } as any);

      oauth = new ThreadsOAuth(mockConfig);
      const result = await oauth.refreshLongLivedToken('old-token');

      expect(result).toEqual({
        access_token: 'refreshed-token',
        token_type: 'bearer',
        expires_in: 5184000,
      });
    });
  });

  describe('getUserId', () => {
    it('should get user ID from access token', async () => {
      const mockResponse = {
        data: {
          id: '123456789',
        },
      };

      vi.mocked(axios.create).mockReturnValue({
        get: vi.fn().mockResolvedValue(mockResponse),
      } as any);

      oauth = new ThreadsOAuth(mockConfig);
      const userId = await oauth.getUserId('access-token');

      expect(userId).toBe('123456789');
    });

    it('should throw error if no user ID in response', async () => {
      const mockResponse = {
        data: {},
      };

      vi.mocked(axios.create).mockReturnValue({
        get: vi.fn().mockResolvedValue(mockResponse),
      } as any);

      oauth = new ThreadsOAuth(mockConfig);

      await expect(oauth.getUserId('access-token')).rejects.toThrow('Failed to get user ID');
    });
  });

  describe('completeOAuthFlow', () => {
    it('should complete full OAuth flow', async () => {
      const mockClient = {
        post: vi.fn().mockResolvedValue({
          data: {
            access_token: 'short-token',
            token_type: 'bearer',
          },
        }),
        get: vi
          .fn()
          .mockResolvedValueOnce({
            data: {
              access_token: 'long-token',
              token_type: 'bearer',
              expires_in: 5184000,
            },
          })
          .mockResolvedValueOnce({
            data: {
              id: '123456789',
            },
          }),
      };

      vi.mocked(axios.create).mockReturnValue(mockClient as any);

      oauth = new ThreadsOAuth(mockConfig);
      const result = await oauth.completeOAuthFlow('auth-code-123');

      expect(result).toEqual({
        accessToken: 'long-token',
        userId: '123456789',
        expiresIn: 5184000,
      });
    });
  });
});

describe('TokenManager', () => {
  let oauth: ThreadsOAuth;
  let tokenManager: TokenManager;
  const mockConfig = {
    appId: 'test-app-id',
    appSecret: 'test-app-secret',
    redirectUri: 'https://example.com/callback',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    oauth = new ThreadsOAuth(mockConfig);
    tokenManager = new TokenManager(oauth);
  });

  describe('setToken and getToken', () => {
    it('should store and retrieve token', async () => {
      const token: StoredToken = {
        accessToken: 'test-token',
        expiresAt: Date.now() + 60 * 24 * 60 * 60 * 1000, // 60 days
        userId: '123456789',
      };

      tokenManager.setToken(token);
      const result = await tokenManager.getToken();

      expect(result).toBe('test-token');
    });

    it('should throw error when no token is set', async () => {
      await expect(tokenManager.getToken()).rejects.toThrow('No token available');
    });
  });

  describe('getUserId', () => {
    it('should return user ID', () => {
      const token: StoredToken = {
        accessToken: 'test-token',
        expiresAt: Date.now() + 60 * 24 * 60 * 60 * 1000,
        userId: '123456789',
      };

      tokenManager.setToken(token);
      const userId = tokenManager.getUserId();

      expect(userId).toBe('123456789');
    });

    it('should throw error when no token is set', () => {
      expect(() => tokenManager.getUserId()).toThrow('No token available');
    });
  });

  describe('isValid', () => {
    it('should return true for valid token', () => {
      const token: StoredToken = {
        accessToken: 'test-token',
        expiresAt: Date.now() + 60 * 24 * 60 * 60 * 1000,
        userId: '123456789',
      };

      tokenManager.setToken(token);

      expect(tokenManager.isValid()).toBe(true);
    });

    it('should return false for expired token', () => {
      const token: StoredToken = {
        accessToken: 'test-token',
        expiresAt: Date.now() - 1000, // Expired 1 second ago
        userId: '123456789',
      };

      tokenManager.setToken(token);

      expect(tokenManager.isValid()).toBe(false);
    });

    it('should return false when no token is set', () => {
      expect(tokenManager.isValid()).toBe(false);
    });
  });

  describe('token refresh', () => {
    it('should refresh token when close to expiry', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: {
            access_token: 'refreshed-token',
            token_type: 'bearer',
            expires_in: 5184000,
          },
        }),
      };

      vi.mocked(axios.create).mockReturnValue(mockClient as any);
      oauth = new ThreadsOAuth(mockConfig);
      tokenManager = new TokenManager(oauth);

      // Set token that expires in 6 days (within refresh buffer)
      const token: StoredToken = {
        accessToken: 'old-token',
        expiresAt: Date.now() + 6 * 24 * 60 * 60 * 1000,
        userId: '123456789',
      };

      tokenManager.setToken(token);
      const result = await tokenManager.getToken();

      expect(result).toBe('refreshed-token');
      expect(mockClient.get).toHaveBeenCalled();
    });

    it('should not refresh token when not close to expiry', async () => {
      const mockClient = {
        get: vi.fn(),
      };

      vi.mocked(axios.create).mockReturnValue(mockClient as any);
      oauth = new ThreadsOAuth(mockConfig);
      tokenManager = new TokenManager(oauth);

      // Set token that expires in 30 days
      const token: StoredToken = {
        accessToken: 'fresh-token',
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        userId: '123456789',
      };

      tokenManager.setToken(token);
      const result = await tokenManager.getToken();

      expect(result).toBe('fresh-token');
      expect(mockClient.get).not.toHaveBeenCalled();
    });
  });

  describe('exportToken', () => {
    it('should export current token', () => {
      const token: StoredToken = {
        accessToken: 'test-token',
        expiresAt: Date.now() + 60 * 24 * 60 * 60 * 1000,
        userId: '123456789',
      };

      tokenManager.setToken(token);
      const exported = tokenManager.exportToken();

      expect(exported).toEqual(token);
    });

    it('should return null when no token is set', () => {
      const exported = tokenManager.exportToken();
      expect(exported).toBeNull();
    });
  });
});
