/**
 * React hook for WebSocket connection
 */

import { useEffect, useRef, useState } from 'react';
import { PusherClient, WebSocketMessage, WebSocketStatus } from '@/lib/api/websocket';

export function useWebSocket(
  installationId: number | null,
  token: string | null,
  onMessage?: (message: WebSocketMessage) => void
) {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const wsClientRef = useRef<PusherClient | null>(null);
  // Use ref to store the latest callback to avoid recreating connection when callback changes
  const onMessageRef = useRef(onMessage);

  // Update the ref whenever the callback changes
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!installationId || !token) {
      console.log('[useWebSocket] Skipping connection - missing installationId or token', {
        installationId,
        hasToken: !!token,
      });
      return;
    }

    console.log(`[useWebSocket] Setting up WebSocket connection for installation ${installationId}`);

    const client = new PusherClient(installationId, token, {
      onMessage: (message) => {
        console.log('[useWebSocket] 📬 Received WebSocket message:', {
          type: message.type,
          data: message.data,
          timestamp: message.timestamp,
          fullMessage: message,
        });
        // Use the ref to call the latest callback
        onMessageRef.current?.(message);
      },
      onConnect: () => {
        console.log('[useWebSocket] Connected');
        setStatus('connected');
      },
      onDisconnect: () => {
        console.log('[useWebSocket] Disconnected');
        setStatus('disconnected');
      },
      onError: (error) => {
        console.error('[useWebSocket] Error:', error);
        setStatus('error');
      },
    });

    wsClientRef.current = client;
    client.connect();

    return () => {
      console.log(`[useWebSocket] Cleaning up connection for installation ${installationId}`);
      client.disconnect();
      wsClientRef.current = null;
    };
  }, [installationId, token]); // Removed onMessage from dependencies

  const send = (message: any) => {
    wsClientRef.current?.send(message);
  };

  return { status, send };
}

