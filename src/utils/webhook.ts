/**
 * Webhook Support Utility
 * Handles webhook subscriptions and event dispatching
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';

export interface WebhookSubscription {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
  createdAt: Date;
  lastTriggered?: Date;
}

export interface WebhookPayload {
  event: string;
  timestamp: Date;
  data: any;
  subscriptionId: string;
}

export interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  event: string;
  payload: WebhookPayload;
  status: 'pending' | 'success' | 'failed';
  attempts: number;
  lastAttempt?: Date;
  response?: {
    status: number;
    body: string;
  };
}

export interface WebhookOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

export class WebhookManager extends EventEmitter {
  private subscriptions: Map<string, WebhookSubscription>;
  private deliveries: Map<string, WebhookDelivery>;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly timeout: number;

  constructor(options: WebhookOptions = {}) {
    super();
    this.subscriptions = new Map();
    this.deliveries = new Map();
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.timeout = options.timeout || 5000;
  }

  /**
   * Subscribe to webhook events
   */
  subscribe(url: string, events: string[], secret?: string): WebhookSubscription {
    const subscription: WebhookSubscription = {
      id: this.generateId(),
      url,
      events,
      secret,
      active: true,
      createdAt: new Date(),
    };

    this.subscriptions.set(subscription.id, subscription);
    this.emit('subscription:created', subscription);

    return subscription;
  }

  /**
   * Unsubscribe from webhooks
   */
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    this.subscriptions.delete(subscriptionId);
    this.emit('subscription:deleted', subscription);

    return true;
  }

  /**
   * Update subscription
   */
  updateSubscription(
    subscriptionId: string,
    updates: Partial<Pick<WebhookSubscription, 'url' | 'events' | 'secret' | 'active'>>
  ): WebhookSubscription | null {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return null;
    }

    Object.assign(subscription, updates);
    this.emit('subscription:updated', subscription);

    return subscription;
  }

  /**
   * Get subscription by ID
   */
  getSubscription(subscriptionId: string): WebhookSubscription | undefined {
    return this.subscriptions.get(subscriptionId);
  }

  /**
   * Get all subscriptions
   */
  getSubscriptions(): WebhookSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Get subscriptions for an event
   */
  getSubscriptionsForEvent(event: string): WebhookSubscription[] {
    return Array.from(this.subscriptions.values()).filter(
      (sub) => sub.active && (sub.events.includes('*') || sub.events.includes(event))
    );
  }

  /**
   * Trigger webhook event
   */
  async trigger(event: string, data: any): Promise<WebhookDelivery[]> {
    const subscriptions = this.getSubscriptionsForEvent(event);
    const deliveries: WebhookDelivery[] = [];

    for (const subscription of subscriptions) {
      const delivery = await this.deliverWebhook(subscription, event, data);
      deliveries.push(delivery);
    }

    return deliveries;
  }

  /**
   * Deliver webhook to a subscription
   */
  private async deliverWebhook(
    subscription: WebhookSubscription,
    event: string,
    data: any
  ): Promise<WebhookDelivery> {
    const payload: WebhookPayload = {
      event,
      timestamp: new Date(),
      data,
      subscriptionId: subscription.id,
    };

    const delivery: WebhookDelivery = {
      id: this.generateId(),
      subscriptionId: subscription.id,
      event,
      payload,
      status: 'pending',
      attempts: 0,
    };

    this.deliveries.set(delivery.id, delivery);

    // Attempt delivery with retries
    await this.attemptDelivery(subscription, delivery);

    return delivery;
  }

  /**
   * Attempt delivery with retries
   */
  private async attemptDelivery(
    subscription: WebhookSubscription,
    delivery: WebhookDelivery
  ): Promise<void> {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      delivery.attempts = attempt + 1;
      delivery.lastAttempt = new Date();

      try {
        const response = await this.sendWebhook(subscription, delivery.payload);

        delivery.status = 'success';
        delivery.response = response;
        subscription.lastTriggered = new Date();

        this.emit('delivery:success', delivery);
        return;
      } catch (error) {
        delivery.status = 'failed';
        delivery.response = {
          status: 0,
          body: error instanceof Error ? error.message : 'Unknown error',
        };

        this.emit('delivery:failed', delivery, error);

        if (attempt < this.maxRetries - 1) {
          await this.delay(this.retryDelay * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }
  }

  /**
   * Send webhook HTTP request
   */
  private async sendWebhook(
    subscription: WebhookSubscription,
    payload: WebhookPayload
  ): Promise<{ status: number; body: string }> {
    const body = JSON.stringify(payload);
    const signature = subscription.secret
      ? this.generateSignature(body, subscription.secret)
      : undefined;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(subscription.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Threads-MCP-Webhook/1.0',
          ...(signature && { 'X-Webhook-Signature': signature }),
        },
        body,
        signal: controller.signal,
      });

      const responseBody = await response.text();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseBody}`);
      }

      return {
        status: response.status,
        body: responseBody,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Verify webhook signature
   */
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Check if signatures have same length
    if (signature.length !== expectedSignature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Get delivery by ID
   */
  getDelivery(deliveryId: string): WebhookDelivery | undefined {
    return this.deliveries.get(deliveryId);
  }

  /**
   * Get deliveries for a subscription
   */
  getDeliveriesForSubscription(subscriptionId: string): WebhookDelivery[] {
    return Array.from(this.deliveries.values()).filter(
      (delivery) => delivery.subscriptionId === subscriptionId
    );
  }

  /**
   * Clean old deliveries
   */
  cleanDeliveries(olderThan: Date): number {
    let cleaned = 0;
    this.deliveries.forEach((delivery, id) => {
      if (delivery.lastAttempt && delivery.lastAttempt < olderThan) {
        this.deliveries.delete(id);
        cleaned++;
      }
    });
    return cleaned;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get statistics
   */
  stats(): {
    subscriptions: number;
    activeSubscriptions: number;
    deliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
  } {
    const deliveryArray = Array.from(this.deliveries.values());

    return {
      subscriptions: this.subscriptions.size,
      activeSubscriptions: Array.from(this.subscriptions.values()).filter(
        (sub) => sub.active
      ).length,
      deliveries: this.deliveries.size,
      successfulDeliveries: deliveryArray.filter((d) => d.status === 'success').length,
      failedDeliveries: deliveryArray.filter((d) => d.status === 'failed').length,
    };
  }
}

