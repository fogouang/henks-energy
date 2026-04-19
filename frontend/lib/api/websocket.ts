/**
 * Pusher client for real-time data updates (using Soketi)
 */

import Pusher from 'pusher-js';

export type WebSocketMessage = {
  type: string;
  data: any;
  timestamp?: string;
};

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WebSocketCallbacks {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export class PusherClient {
  private pusher: Pusher | null = null;
  private channel: ReturnType<Pusher['subscribe']> | null = null;
  private installationId: number;
  private callbacks: WebSocketCallbacks;
  private status: WebSocketStatus = 'disconnected';

  constructor(
    installationId: number,
    token: string,
    callbacks: WebSocketCallbacks
  ) {
    this.installationId = installationId;
    this.callbacks = callbacks;

    // Get Soketi configuration from environment
    const key = process.env.NEXT_PUBLIC_SOKETI_KEY || 'jsenergy-app-key';
    const cluster = process.env.NEXT_PUBLIC_SOKETI_CLUSTER || 'mt1';
    const host = process.env.NEXT_PUBLIC_SOKETI_HOST || 'localhost';
    const port = process.env.NEXT_PUBLIC_SOKETI_PORT || '6001';  // Soketi uses same port for HTTP API and WebSocket
    const wsHost = host === 'localhost' ? 'localhost' : host;
    const wsPort = port;

    console.log(`[WebSocket] Initializing Pusher client:`, {
      key,
      cluster,
      wsHost,
      wsPort: parseInt(wsPort),
      installationId: this.installationId,
    });

    // Initialize Pusher client
    this.pusher = new Pusher(key, {
      cluster: cluster,
      wsHost: wsHost,
      wsPort: parseInt(wsPort),
      wssPort: parseInt(wsPort),
      forceTLS: process.env.NODE_ENV === 'production' ? true : false as boolean,
      enabledTransports: ['ws', 'wss'],
      authEndpoint: undefined, // No auth needed for public channels
    });

    // Set up connection event handlers
    this.pusher.connection.bind('connected', () => {
      console.log('[WebSocket] ✅ Connected successfully to Soketi');
      console.log('[WebSocket] Connection details:', {
        socketId: this.pusher?.connection.socket_id,
        installationId: this.installationId,
        channel: `installation-${this.installationId}`,
      });
      this.status = 'connected';
      this.callbacks.onConnect?.();
    });

    this.pusher.connection.bind('disconnected', () => {
      console.log('[WebSocket] Disconnected');
      this.status = 'disconnected';
      this.callbacks.onDisconnect?.();
    });

    this.pusher.connection.bind('error', (error: any) => {
      console.error('[WebSocket] Connection error:', error);
      this.status = 'error';
      this.callbacks.onError?.(error as Event);
    });

    this.pusher.connection.bind('state_change', (states: { previous: string; current: string }) => {
      if (states.current === 'connected') {
        this.status = 'connected';
      } else if (states.current === 'disconnected' || states.current === 'failed') {
        this.status = 'disconnected';
      }
    });
  }

  connect(): void {
    if (this.status === 'connected' && this.channel) {
      return;
    }

    this.status = 'connecting';
    console.log(`[WebSocket] Connecting to installation ${this.installationId}...`);

    try {
      // Subscribe to installation channel
      const channelName = `installation-${this.installationId}`;
      console.log(`[WebSocket] 📡 Subscribing to channel: ${channelName} for installation ${this.installationId}`);
      this.channel = this.pusher!.subscribe(channelName);
      
      // Log subscription success
      this.channel.bind('pusher:subscription_succeeded', () => {
        console.log(`[WebSocket] ✅ Successfully subscribed to channel: ${channelName}`);
      });
      
      // Log subscription errors
      this.channel.bind('pusher:subscription_error', (error: any) => {
        console.error(`[WebSocket] ❌ Subscription error for channel ${channelName}:`, error);
      });

      // Bind to measurement update events
      this.channel.bind('meter_update', (data: any) => {
        console.log('[WebSocket] 📨 Received meter_update payload:', {
          event: 'meter_update',
          channel: channelName,
          payload: data,
          timestamp: new Date().toISOString(),
        });
        this.callbacks.onMessage?.({
          type: 'meter_update',
          data: data,
          timestamp: data.timestamp,
        });
      });

      this.channel.bind('battery_update', (data: any) => {
        console.log('[WebSocket] 📨 Received battery_update payload:', {
          event: 'battery_update',
          channel: channelName,
          payload: data,
          timestamp: new Date().toISOString(),
        });
        this.callbacks.onMessage?.({
          type: 'battery_update',
          data: data,
          timestamp: data.timestamp,
        });
      });

      this.channel.bind('inverter_update', (data: any) => {
        console.log('[WebSocket] 📨 Received inverter_update payload:', {
          event: 'inverter_update',
          channel: channelName,
          payload: data,
          timestamp: new Date().toISOString(),
        });
        this.callbacks.onMessage?.({
          type: 'inverter_update',
          data: data,
          timestamp: data.timestamp,
        });
      });

      this.channel.bind('generator_update', (data: any) => {
        console.log('[WebSocket] 📨 Received generator_update payload:', {
          event: 'generator_update',
          channel: channelName,
          payload: data,
          timestamp: new Date().toISOString(),
        });
        this.callbacks.onMessage?.({
          type: 'generator_update',
          data: data,
          timestamp: data.timestamp,
        });
      });

      this.channel.bind('ev_charger_update', (data: any) => {
        console.log('[WebSocket] 📨 Received ev_charger_update payload:', {
          event: 'ev_charger_update',
          channel: channelName,
          payload: data,
          timestamp: new Date().toISOString(),
        });
        this.callbacks.onMessage?.({
          type: 'ev_charger_update',
          data: data,
          timestamp: data.timestamp,
        });
      });

      // Connect Pusher
      this.pusher!.connect();
    } catch (error) {
      console.error('Pusher connection error:', error);
      this.status = 'error';
    }
  }

  disconnect(): void {
    if (this.channel) {
      this.channel.unbind_all();
      this.pusher?.unsubscribe(`installation-${this.installationId}`);
      this.channel = null;
    }

    if (this.pusher) {
      this.pusher.disconnect();
      this.pusher = null;
    }

    this.status = 'disconnected';
  }

  send(message: any): void {
    // Pusher doesn't support client-to-server messages in the same way
    // This is kept for API compatibility but won't do anything
    console.warn('Pusher client does not support sending messages');
  }

  getStatus(): WebSocketStatus {
    return this.status;
  }
}

