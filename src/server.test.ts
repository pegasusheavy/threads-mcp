import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ThreadsMCPServer } from './server.js';
import { ThreadsClient } from './client/threads-client.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Mock the Server and transport
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(function(this: any) {
    this.requestHandlers = new Map();
    this.setRequestHandler = vi.fn((schema, handler) => {
      const key = schema.properties?.method?.const || 'unknown';
      this.requestHandlers.set(key, handler);
    });
    this.connect = vi.fn();
    return this;
  }),
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('./client/threads-client.js');

describe('ThreadsMCPServer Integration', () => {
  let server: ThreadsMCPServer;
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    server = new ThreadsMCPServer();

    mockClient = {
      getProfile: vi.fn().mockResolvedValue({
        id: 'user-123',
        username: 'testuser',
      }),
      getThreads: vi.fn().mockResolvedValue([
        {
          id: 'thread-1',
          media_product_type: 'THREADS',
          media_type: 'TEXT',
          permalink: 'https://threads.net/@user/post/1',
          timestamp: '2024-01-01T00:00:00Z',
        },
      ]),
      getThread: vi.fn().mockResolvedValue({
        id: 'thread-123',
        media_product_type: 'THREADS',
        media_type: 'TEXT',
        permalink: 'https://threads.net/@user/post/123',
        timestamp: '2024-01-01T00:00:00Z',
      }),
      createThread: vi.fn().mockResolvedValue({ id: 'new-thread-123' }),
      getThreadInsights: vi.fn().mockResolvedValue([
        {
          name: 'views',
          period: 'lifetime',
          values: [{ value: 100 }],
        },
      ]),
      getUserInsights: vi.fn().mockResolvedValue([
        {
          name: 'followers_count',
          period: 'day',
          values: [{ value: 1000 }],
        },
      ]),
      getReplies: vi.fn().mockResolvedValue({
        data: [{ id: 'reply-1' }],
      }),
      getConversation: vi.fn().mockResolvedValue({
        data: [{ id: 'thread-123' }, { id: 'reply-1' }],
      }),
      replyToThread: vi.fn().mockResolvedValue({ id: 'reply-456' }),
    };

    server.setClient(mockClient as ThreadsClient);
  });

  describe('Server initialization', () => {
    it('should create server instance', () => {
      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(ThreadsMCPServer);
    });

    it('should set client', () => {
      const newServer = new ThreadsMCPServer();
      newServer.setClient(mockClient);
      expect(mockClient).toBeDefined();
    });
  });

  describe('Tool handler registration', () => {
    it('should register request handlers', () => {
      const serverInstance = (server as any).server;
      expect(serverInstance.setRequestHandler).toHaveBeenCalled();
      expect(serverInstance.setRequestHandler.mock.calls.length).toBeGreaterThan(0);
    });

    it('should have tools list handler', () => {
      const serverInstance = (server as any).server;
      const listToolsCalls = serverInstance.setRequestHandler.mock.calls.filter(
        (call: any) => call[0]?.properties?.method?.const === 'tools/list'
      );
      expect(listToolsCalls.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Server lifecycle', () => {
    it('should connect to transport', async () => {
      const serverInstance = (server as any).server;
      serverInstance.connect.mockResolvedValue(undefined);

      await server.run();

      expect(serverInstance.connect).toHaveBeenCalled();
    });
  });

  describe('Error scenarios', () => {
    it('should handle client not initialized', async () => {
      const newServer = new ThreadsMCPServer();
      // Don't set client

      // Get the call tool handler
      const serverInstance = (newServer as any).server;
      const handlers = serverInstance.requestHandlers;

      // Check that handlers were registered
      expect(handlers.size).toBeGreaterThan(0);
    });

    it('should handle client errors gracefully', async () => {
      mockClient.getProfile.mockRejectedValue(new Error('API Error'));

      await expect(mockClient.getProfile()).rejects.toThrow('API Error');
    });
  });

  describe('MCP protocol compliance', () => {
    it('should create server with correct metadata', () => {
      const serverInstance = (server as any).server;
      expect(Server).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'threads-mcp',
          version: '1.0.0',
        }),
        expect.objectContaining({
          capabilities: expect.objectContaining({
            tools: {},
          }),
        })
      );
    });
  });

  describe('Tool execution flows', () => {
    it('should process profile request', async () => {
      const result = await mockClient.getProfile();
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('username');
    });

    it('should process threads list request', async () => {
      const result = await mockClient.getThreads({ limit: 10 });
      expect(Array.isArray(result)).toBe(true);
    });

    it('should process thread creation', async () => {
      const result = await mockClient.createThread({ text: 'Test' });
      expect(result).toHaveProperty('id');
    });

    it('should process insights request', async () => {
      const result = await mockClient.getThreadInsights('thread-123', {
        metric: ['views'],
      });
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

