import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebhookManager } from '../webhook.js';

// Mock fetch
global.fetch = vi.fn();

describe('WebhookManager', () => {
  let manager: WebhookManager;

  beforeEach(() => {
    manager = new WebhookManager({ maxRetries: 2, retryDelay: 100, timeout: 1000 });
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('subscribe', () => {
    it('should create a subscription', () => {
      const subscription = manager.subscribe('https://example.com/webhook', ['thread.created'], 'secret');

      expect(subscription.id).toBeDefined();
      expect(subscription.url).toBe('https://example.com/webhook');
      expect(subscription.events).toContain('thread.created');
      expect(subscription.secret).toBe('secret');
      expect(subscription.active).toBe(true);
    });

    it('should emit subscription:created event', () => {
      const handler = vi.fn();
      manager.on('subscription:created', handler);

      const subscription = manager.subscribe('https://example.com/webhook', ['*']);

      expect(handler).toHaveBeenCalledWith(subscription);
    });
  });

  describe('unsubscribe', () => {
    it('should remove a subscription', () => {
      const subscription = manager.subscribe('https://example.com/webhook', ['*']);

      expect(manager.unsubscribe(subscription.id)).toBe(true);
      expect(manager.getSubscription(subscription.id)).toBeUndefined();
    });

    it('should return false for non-existent subscription', () => {
      expect(manager.unsubscribe('nonexistent')).toBe(false);
    });

    it('should emit subscription:deleted event', () => {
      const handler = vi.fn();
      manager.on('subscription:deleted', handler);

      const subscription = manager.subscribe('https://example.com/webhook', ['*']);
      manager.unsubscribe(subscription.id);

      expect(handler).toHaveBeenCalledWith(subscription);
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription properties', () => {
      const subscription = manager.subscribe('https://example.com/webhook', ['thread.created']);

      const updated = manager.updateSubscription(subscription.id, {
        url: 'https://new.example.com/webhook',
        active: false,
      });

      expect(updated?.url).toBe('https://new.example.com/webhook');
      expect(updated?.active).toBe(false);
    });

    it('should return null for non-existent subscription', () => {
      const result = manager.updateSubscription('nonexistent', { active: false });
      expect(result).toBeNull();
    });
  });

  describe('getSubscriptionsForEvent', () => {
    it('should return subscriptions for specific event', () => {
      manager.subscribe('https://example.com/webhook1', ['thread.created']);
      manager.subscribe('https://example.com/webhook2', ['thread.deleted']);
      manager.subscribe('https://example.com/webhook3', ['*']);

      const subs = manager.getSubscriptionsForEvent('thread.created');

      expect(subs.length).toBe(2); // Specific + wildcard
    });

    it('should not return inactive subscriptions', () => {
      const sub = manager.subscribe('https://example.com/webhook', ['thread.created']);
      manager.updateSubscription(sub.id, { active: false });

      const subs = manager.getSubscriptionsForEvent('thread.created');

      expect(subs.length).toBe(0);
    });
  });

  describe('trigger', () => {
    it('should trigger webhooks for matching subscriptions', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'OK',
      });

      manager.subscribe('https://example.com/webhook1', ['thread.created']);
      manager.subscribe('https://example.com/webhook2', ['thread.created']);

      const deliveries = await manager.trigger('thread.created', { threadId: '123' });

      expect(deliveries.length).toBe(2);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should include webhook signature when secret provided', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'OK',
      });

      manager.subscribe('https://example.com/webhook', ['thread.created'], 'my-secret');

      await manager.trigger('thread.created', { threadId: '123' });

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[1].headers['X-Webhook-Signature']).toBeDefined();
    });

    it('should retry failed deliveries', async () => {
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => 'OK',
        });

      manager.subscribe('https://example.com/webhook', ['thread.created']);

      const triggerPromise = manager.trigger('thread.created', { data: 'test' });

      await vi.runAllTimersAsync();
      const deliveries = await triggerPromise;

      expect(deliveries[0].status).toBe('success');
      expect(deliveries[0].attempts).toBe(2);
    });

    it('should mark as failed after max retries', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      manager.subscribe('https://example.com/webhook', ['thread.created']);

      const triggerPromise = manager.trigger('thread.created', { data: 'test' });

      await vi.runAllTimersAsync();
      const deliveries = await triggerPromise;

      expect(deliveries[0].status).toBe('failed');
      expect(deliveries[0].attempts).toBe(2);
    });

    it('should emit delivery events', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'OK',
      });

      const successHandler = vi.fn();
      manager.on('delivery:success', successHandler);

      manager.subscribe('https://example.com/webhook', ['thread.created']);
      await manager.trigger('thread.created', { data: 'test' });

      expect(successHandler).toHaveBeenCalled();
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature', () => {
      const payload = JSON.stringify({ data: 'test' });
      const secret = 'my-secret';
      const signature = require('crypto')
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const isValid = WebhookManager.verifySignature(payload, signature, secret);
      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const payload = JSON.stringify({ data: 'test' });
      const secret = 'my-secret';
      const invalidSignature = 'invalid';

      const isValid = WebhookManager.verifySignature(payload, invalidSignature, secret);
      expect(isValid).toBe(false);
    });
  });

  describe('getDeliveriesForSubscription', () => {
    it('should return deliveries for a subscription', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'OK',
      });

      const sub = manager.subscribe('https://example.com/webhook', ['thread.created']);
      await manager.trigger('thread.created', { data: 'test1' });
      await manager.trigger('thread.created', { data: 'test2' });

      const deliveries = manager.getDeliveriesForSubscription(sub.id);
      expect(deliveries.length).toBe(2);
    });
  });

  describe('cleanDeliveries', () => {
    it('should remove old deliveries', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'OK',
      });

      manager.subscribe('https://example.com/webhook', ['thread.created']);
      await manager.trigger('thread.created', { data: 'test' });

      vi.advanceTimersByTime(60000); // 1 minute
      await manager.trigger('thread.created', { data: 'test2' });

      const oneMinuteAgo = new Date(Date.now() - 30000);
      const cleaned = manager.cleanDeliveries(oneMinuteAgo);

      expect(cleaned).toBe(1);
    });
  });

  describe('stats', () => {
    it('should return correct statistics', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'OK',
      });

      manager.subscribe('https://example.com/webhook1', ['thread.created']);
      const sub2 = manager.subscribe('https://example.com/webhook2', ['thread.deleted']);
      manager.updateSubscription(sub2.id, { active: false });

      await manager.trigger('thread.created', { data: 'test' });

      const stats = manager.stats();

      expect(stats.subscriptions).toBe(2);
      expect(stats.activeSubscriptions).toBe(1);
      expect(stats.deliveries).toBe(1);
      expect(stats.successfulDeliveries).toBe(1);
      expect(stats.failedDeliveries).toBe(0);
    });
  });
});

