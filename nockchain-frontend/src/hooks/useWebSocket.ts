'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNotifications } from '@/components/ui/Notifications';

export enum WebSocketState {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTING = 'DISCONNECTING',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR'
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: number;
  id?: string;
}

export interface WebSocketConfig {
  url: string;
  protocols?: string | string[];
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  enableHeartbeat?: boolean;
  heartbeatInterval?: number;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
}

export interface UseWebSocketReturn {
  state: WebSocketState;
  isConnected: boolean;
  error: string | null;
  send: (message: WebSocketMessage) => boolean;
  connect: () => void;
  disconnect: () => void;
  subscribe: (type: string, callback: (data: any) => void) => () => void;
  unsubscribe: (type: string, callback?: (data: any) => void) => void;
  getConnectionStats: () => {
    state: WebSocketState;
    reconnectAttempts: number;
    lastError: string | null;
    connectedAt: Date | null;
    messagesSent: number;
    messagesReceived: number;
  };
}

export function useWebSocket(config: WebSocketConfig): UseWebSocketReturn {
  const [state, setState] = useState<WebSocketState>(WebSocketState.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  const [connectedAt, setConnectedAt] = useState<Date | null>(null);
  const [messagesSent, setMessagesSent] = useState(0);
  const [messagesReceived, setMessagesReceived] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const subscribersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueueRef = useRef<WebSocketMessage[]>([]);

  const { addNotification } = useNotifications();

  const {
    url,
    protocols,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
    enableHeartbeat = true,
    heartbeatInterval = 30000,
    onOpen,
    onClose,
    onError,
    onMessage
  } = config;

  const isConnected = state === WebSocketState.CONNECTED;

  // Clean up function
  const cleanup = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Start heartbeat
  const startHeartbeat = useCallback(() => {
    if (!enableHeartbeat || heartbeatIntervalRef.current) return;

    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        send({
          type: 'ping',
          data: { timestamp: Date.now() }
        });
      }
    }, heartbeatInterval);
  }, [enableHeartbeat, heartbeatInterval]);

  // Send message
  const send = useCallback((message: WebSocketMessage): boolean => {
    const messageWithMeta = {
      ...message,
      timestamp: message.timestamp || Date.now(),
      id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(messageWithMeta));
        setMessagesSent(prev => prev + 1);
        return true;
      } catch (err) {
        console.error('Failed to send WebSocket message:', err);
        setError(err instanceof Error ? err.message : 'Failed to send message');
        return false;
      }
    } else {
      // Queue message for later if not connected
      messageQueueRef.current.push(messageWithMeta);
      return false;
    }
  }, []);

  // Process queued messages
  const processMessageQueue = useCallback(() => {
    const queue = messageQueueRef.current;
    messageQueueRef.current = [];
    
    queue.forEach(message => send(message));
  }, [send]);

  // Handle WebSocket events
  const handleOpen = useCallback((event: Event) => {
    console.log('WebSocket connected');
    setState(WebSocketState.CONNECTED);
    setError(null);
    setConnectedAt(new Date());
    reconnectAttemptsRef.current = 0;
    
    startHeartbeat();
    processMessageQueue();
    
    onOpen?.(event);
    
    addNotification({
      type: 'success',
      title: 'Connected',
      message: 'Real-time connection established',
      duration: 3000
    });
  }, [onOpen, startHeartbeat, processMessageQueue, addNotification]);

  const handleClose = useCallback((event: CloseEvent) => {
    console.log('WebSocket closed:', event.code, event.reason);
    setState(WebSocketState.DISCONNECTED);
    setConnectedAt(null);
    cleanup();
    
    onClose?.(event);

    // Attempt reconnection if not a clean close
    if (event.code !== 1000 && event.code !== 1001 && reconnectAttemptsRef.current < maxReconnectAttempts) {
      const attemptReconnect = () => {
        reconnectAttemptsRef.current += 1;
        console.log(`Reconnecting... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
        
        addNotification({
          type: 'warning',
          title: 'Reconnecting',
          message: `Attempting to reconnect... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`,
          duration: 4000
        });

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      };

      attemptReconnect();
    } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      addNotification({
        type: 'error',
        title: 'Connection Failed',
        message: 'Unable to establish connection after multiple attempts',
        duration: 8000
      });
    }
  }, [onClose, cleanup, maxReconnectAttempts, reconnectInterval, addNotification]);

  const handleError = useCallback((event: Event) => {
    console.error('WebSocket error:', event);
    setState(WebSocketState.ERROR);
    setError('Connection error occurred');
    cleanup();
    
    onError?.(event);
    
    addNotification({
      type: 'error',
      title: 'Connection Error',
      message: 'WebSocket connection encountered an error',
      duration: 5000
    });
  }, [onError, cleanup, addNotification]);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      setMessagesReceived(prev => prev + 1);
      
      // Handle pong responses for heartbeat
      if (message.type === 'pong') {
        return;
      }
      
      // Dispatch to subscribers
      const subscribers = subscribersRef.current.get(message.type);
      if (subscribers) {
        subscribers.forEach(callback => {
          try {
            callback(message.data);
          } catch (err) {
            console.error(`Error in message callback for type ${message.type}:`, err);
          }
        });
      }
      
      // Dispatch to wildcard subscribers
      const wildcardSubscribers = subscribersRef.current.get('*');
      if (wildcardSubscribers) {
        wildcardSubscribers.forEach(callback => {
          try {
            callback(message);
          } catch (err) {
            console.error('Error in wildcard message callback:', err);
          }
        });
      }
      
      onMessage?.(message);
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err);
      setError('Failed to parse message');
    }
  }, [onMessage]);

  // Connect function
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.warn('WebSocket already connected');
      return;
    }

    setState(WebSocketState.CONNECTING);
    setError(null);

    try {
      const ws = new WebSocket(url, protocols);
      
      ws.addEventListener('open', handleOpen);
      ws.addEventListener('close', handleClose);
      ws.addEventListener('error', handleError);
      ws.addEventListener('message', handleMessage);
      
      wsRef.current = ws;
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setState(WebSocketState.ERROR);
      setError(err instanceof Error ? err.message : 'Failed to connect');
    }
  }, [url, protocols, handleOpen, handleClose, handleError, handleMessage]);

  // Disconnect function
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      setState(WebSocketState.DISCONNECTING);
      cleanup();
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
  }, [cleanup]);

  // Subscribe to message types
  const subscribe = useCallback((type: string, callback: (data: any) => void) => {
    if (!subscribersRef.current.has(type)) {
      subscribersRef.current.set(type, new Set());
    }
    
    subscribersRef.current.get(type)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      unsubscribe(type, callback);
    };
  }, []);

  // Unsubscribe from message types
  const unsubscribe = useCallback((type: string, callback?: (data: any) => void) => {
    const subscribers = subscribersRef.current.get(type);
    if (subscribers) {
      if (callback) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          subscribersRef.current.delete(type);
        }
      } else {
        subscribersRef.current.delete(type);
      }
    }
  }, []);

  // Get connection statistics
  const getConnectionStats = useCallback(() => ({
    state,
    reconnectAttempts: reconnectAttemptsRef.current,
    lastError: error,
    connectedAt,
    messagesSent,
    messagesReceived
  }), [state, error, connectedAt, messagesSent, messagesReceived]);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [url]); // Only reconnect when URL changes

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [cleanup]);

  return {
    state,
    isConnected,
    error,
    send,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    getConnectionStats
  };
}

// Specialized hooks for specific data types
export function useMiningWebSocket(url?: string) {
  const wsUrl = url || `${process.env.NEXT_PUBLIC_WS_URL}/mining`;
  const [miningData, setMiningData] = useState<any>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [poolStats, setPoolStats] = useState<any>(null);

  const webSocket = useWebSocket({
    url: wsUrl,
    enableHeartbeat: true,
    heartbeatInterval: 30000,
    maxReconnectAttempts: 10
  });

  useEffect(() => {
    const unsubscribers = [
      webSocket.subscribe('mining_stats', setMiningData),
      webSocket.subscribe('worker_update', (data) => {
        setWorkers(prev => {
          const updated = [...prev];
          const index = updated.findIndex(w => w.id === data.id);
          if (index >= 0) {
            updated[index] = { ...updated[index], ...data };
          } else {
            updated.push(data);
          }
          return updated;
        });
      }),
      webSocket.subscribe('pool_stats', setPoolStats)
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [webSocket]);

  return {
    ...webSocket,
    miningData,
    workers,
    poolStats,
    sendMiningCommand: (command: string, params?: any) => {
      return webSocket.send({
        type: 'mining_command',
        data: { command, params }
      });
    }
  };
}

export function useTradingWebSocket(url?: string) {
  const wsUrl = url || `${process.env.NEXT_PUBLIC_WS_URL}/trading`;
  const [orderBook, setOrderBook] = useState<any>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [ticker, setTicker] = useState<any>(null);

  const webSocket = useWebSocket({
    url: wsUrl,
    enableHeartbeat: true,
    heartbeatInterval: 10000,
    maxReconnectAttempts: 5
  });

  useEffect(() => {
    const unsubscribers = [
      webSocket.subscribe('orderbook', setOrderBook),
      webSocket.subscribe('trade', (data) => {
        setTrades(prev => [data, ...prev.slice(0, 99)]); // Keep last 100 trades
      }),
      webSocket.subscribe('ticker', setTicker)
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [webSocket]);

  return {
    ...webSocket,
    orderBook,
    trades,
    ticker,
    placeTrade: (order: any) => {
      return webSocket.send({
        type: 'place_order',
        data: order
      });
    }
  };
}

export function useSystemWebSocket(url?: string) {
  const wsUrl = url || `${process.env.NEXT_PUBLIC_WS_URL}/system`;
  const [systemStats, setSystemStats] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);

  const webSocket = useWebSocket({
    url: wsUrl,
    enableHeartbeat: true,
    heartbeatInterval: 60000,
    maxReconnectAttempts: 3
  });

  useEffect(() => {
    const unsubscribers = [
      webSocket.subscribe('system_stats', setSystemStats),
      webSocket.subscribe('alert', (data) => {
        setAlerts(prev => [data, ...prev.slice(0, 49)]); // Keep last 50 alerts
      })
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [webSocket]);

  return {
    ...webSocket,
    systemStats,
    alerts
  };
}