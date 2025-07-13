import { create } from 'zustand';
import { useEffect, useState } from 'react';

// WebSocket connection states
export enum WebSocketState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}

// Message types for type-safe WebSocket communication
export interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp?: number;
  id?: string;
}

export interface MiningDataMessage extends WebSocketMessage {
  type: 'mining_stats' | 'worker_update' | 'block_found' | 'alert';
  data: {
    hashrate?: number;
    workers?: Array<{
      id: string;
      hashrate: number;
      temperature: number;
      status: string;
    }>;
    block?: {
      height: number;
      reward: number;
      timestamp: string;
    };
    alert?: {
      type: string;
      message: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    };
  };
}

// WebSocket store interface
interface WebSocketStore {
  // Connection state
  state: WebSocketState;
  url: string | null;
  ws: WebSocket | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectInterval: number;
  lastError: string | null;

  // Data subscriptions
  subscriptions: Map<string, Set<(data: unknown) => void>>;
  messageQueue: WebSocketMessage[];
  
  // Methods
  connect: (url: string) => void;
  disconnect: () => void;
  reconnect: () => void;
  send: (message: WebSocketMessage) => boolean;
  subscribe: (type: string, callback: (data: unknown) => void) => () => void;
  unsubscribe: (type: string, callback: (data: unknown) => void) => void;
  clearSubscriptions: () => void;
  
  // Internal methods
  setState: (state: WebSocketState) => void;
  setError: (error: string) => void;
  handleMessage: (event: MessageEvent) => void;
  handleError: (event: Event) => void;
  handleClose: (event: CloseEvent) => void;
  processMessageQueue: () => void;
}

// Create WebSocket store
export const useWebSocketStore = create<WebSocketStore>((set, get) => ({
  // Initial state
  state: WebSocketState.DISCONNECTED,
  url: null,
  ws: null,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  reconnectInterval: 5000,
  lastError: null,
  subscriptions: new Map(),
  messageQueue: [],

  // Connect to WebSocket
  connect: (url: string) => {
    const state = get();
    
    if (state.ws && state.state === WebSocketState.CONNECTED) {
      console.warn('WebSocket already connected');
      return;
    }

    try {
      set({ state: WebSocketState.CONNECTING, url, lastError: null });
      
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        set({ 
          state: WebSocketState.CONNECTED, 
          ws, 
          reconnectAttempts: 0,
          lastError: null 
        });
        
        // Process any queued messages
        get().processMessageQueue();
      };
      
      ws.onmessage = get().handleMessage;
      ws.onerror = get().handleError;
      ws.onclose = get().handleClose;
      
      set({ ws });
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      get().setError(error instanceof Error ? error.message : 'Connection failed');
    }
  },

  // Disconnect WebSocket
  disconnect: () => {
    const { ws } = get();
    
    if (ws) {
      set({ state: WebSocketState.DISCONNECTING });
      ws.close(1000, 'Client disconnect');
    }
  },

  // Reconnect WebSocket
  reconnect: () => {
    const { url, reconnectAttempts, maxReconnectAttempts, reconnectInterval } = get();
    
    if (!url) {
      console.error('Cannot reconnect: No URL specified');
      return;
    }
    
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      get().setError('Max reconnect attempts reached');
      return;
    }
    
    set({ reconnectAttempts: reconnectAttempts + 1 });
    
    setTimeout(() => {
      console.log(`Reconnecting... (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
      get().connect(url);
    }, reconnectInterval);
  },

  // Send message through WebSocket
  send: (message: WebSocketMessage) => {
    const { ws, state, messageQueue } = get();
    
    // Add timestamp and ID if not present
    const messageWithMeta = {
      ...message,
      timestamp: message.timestamp || Date.now(),
      id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    if (ws && state === WebSocketState.CONNECTED) {
      try {
        ws.send(JSON.stringify(messageWithMeta));
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        return false;
      }
    } else {
      // Queue message for later if not connected
      set({ messageQueue: [...messageQueue, messageWithMeta] });
      return false;
    }
  },

  // Subscribe to message types
  subscribe: (type: string, callback: (data: unknown) => void) => {
    const { subscriptions } = get();
    
    if (!subscriptions.has(type)) {
      subscriptions.set(type, new Set());
    }
    
    subscriptions.get(type)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      get().unsubscribe(type, callback);
    };
  },

  // Unsubscribe from message types
  unsubscribe: (type: string, callback: (data: unknown) => void) => {
    const { subscriptions } = get();
    
    if (subscriptions.has(type)) {
      subscriptions.get(type)!.delete(callback);
      
      // Remove empty subscription sets
      if (subscriptions.get(type)!.size === 0) {
        subscriptions.delete(type);
      }
    }
  },

  // Clear all subscriptions
  clearSubscriptions: () => {
    set({ subscriptions: new Map() });
  },

  // Set connection state
  setState: (state: WebSocketState) => {
    set({ state });
  },

  // Set error state
  setError: (error: string) => {
    set({ 
      state: WebSocketState.ERROR, 
      lastError: error 
    });
  },

  // Handle incoming messages
  handleMessage: (event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      const { subscriptions } = get();
      
      // Dispatch to subscribers
      if (subscriptions.has(message.type)) {
        subscriptions.get(message.type)!.forEach(callback => {
          try {
            callback(message.data);
          } catch (error) {
            console.error(`Error in message callback for type ${message.type}:`, error);
          }
        });
      }
      
      // Dispatch to wildcard subscribers
      if (subscriptions.has('*')) {
        subscriptions.get('*')!.forEach(callback => {
          try {
            callback(message);
          } catch (error) {
            console.error('Error in wildcard message callback:', error);
          }
        });
      }
      
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  },

  // Handle connection errors
  handleError: (event: Event) => {
    console.error('WebSocket error:', event);
    get().setError('Connection error occurred');
  },

  // Handle connection close
  handleClose: (event: CloseEvent) => {
    console.log('WebSocket closed:', event.code, event.reason);
    
    set({ 
      state: WebSocketState.DISCONNECTED, 
      ws: null 
    });
    
    // Attempt reconnection if not a clean close
    if (event.code !== 1000 && event.code !== 1001) {
      get().reconnect();
    }
  },

  // Process queued messages
  processMessageQueue: () => {
    const { messageQueue } = get();
    
    if (messageQueue.length > 0) {
      console.log(`Processing ${messageQueue.length} queued messages`);
      
      messageQueue.forEach(message => {
        get().send(message);
      });
      
      set({ messageQueue: [] });
    }
  }
}));

// WebSocket manager class for advanced features
export class WebSocketManager {
  private static instance: WebSocketManager;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatTimeout: NodeJS.Timeout | null = null;

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  // Initialize WebSocket with configuration
  public initialize(config: {
    url: string;
    enableHeartbeat?: boolean;
    heartbeatInterval?: number;
    maxReconnectAttempts?: number;
    reconnectInterval?: number;
  }) {
    const store = useWebSocketStore.getState();
    
    // Update configuration
    if (config.maxReconnectAttempts !== undefined) {
      useWebSocketStore.setState({ maxReconnectAttempts: config.maxReconnectAttempts });
    }
    
    if (config.reconnectInterval !== undefined) {
      useWebSocketStore.setState({ reconnectInterval: config.reconnectInterval });
    }
    
    // Connect to WebSocket
    store.connect(config.url);
    
    // Enable heartbeat if requested
    if (config.enableHeartbeat) {
      this.startHeartbeat(config.heartbeatInterval || 30000);
    }
  }

  // Start heartbeat mechanism
  private startHeartbeat(interval: number) {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      const store = useWebSocketStore.getState();
      
      if (store.state === WebSocketState.CONNECTED) {
        // Send ping message
        const success = store.send({
          type: 'ping',
          data: { timestamp: Date.now() }
        });
        
        if (success) {
          // Set timeout for pong response
          this.heartbeatTimeout = setTimeout(() => {
            console.warn('Heartbeat timeout - connection may be dead');
            store.disconnect();
          }, 5000);
        }
      }
    }, interval);
    
    // Listen for pong responses
    const unsubscribe = useWebSocketStore.getState().subscribe('pong', () => {
      if (this.heartbeatTimeout) {
        clearTimeout(this.heartbeatTimeout);
        this.heartbeatTimeout = null;
      }
    });
  }

  // Stop heartbeat mechanism
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  // Subscribe to multiple message types
  public subscribeToTypes(
    types: string[], 
    callback: (type: string, data: unknown) => void
  ): () => void {
    const unsubscribeFunctions = types.map(type => 
      useWebSocketStore.getState().subscribe(type, (data) => callback(type, data))
    );
    
    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }

  // Batch send messages
  public sendBatch(messages: WebSocketMessage[]): boolean[] {
    const store = useWebSocketStore.getState();
    return messages.map(message => store.send(message));
  }

  // Get connection statistics
  public getStats() {
    const store = useWebSocketStore.getState();
    return {
      state: store.state,
      reconnectAttempts: store.reconnectAttempts,
      subscriptionCount: Array.from(store.subscriptions.values())
        .reduce((total, set) => total + set.size, 0),
      queuedMessages: store.messageQueue.length,
      lastError: store.lastError
    };
  }

  // Cleanup on app shutdown
  public cleanup() {
    this.stopHeartbeat();
    const store = useWebSocketStore.getState();
    store.disconnect();
    store.clearSubscriptions();
  }
}

// React hook for easy WebSocket integration
export function useWebSocket(url?: string) {
  const store = useWebSocketStore();
  
  // Auto-connect on mount if URL provided
  useEffect(() => {
    if (url && store.state === WebSocketState.DISCONNECTED) {
      store.connect(url);
    }
    
    return () => {
      // Cleanup on unmount
      if (store.state === WebSocketState.CONNECTED) {
        store.disconnect();
      }
    };
  }, [url, store]);
  
  return {
    state: store.state,
    isConnected: store.state === WebSocketState.CONNECTED,
    lastError: store.lastError,
    send: store.send,
    subscribe: store.subscribe,
    connect: store.connect,
    disconnect: store.disconnect,
    reconnect: store.reconnect
  };
}

// Hook for mining data subscriptions
export function useMiningWebSocket() {
  const wsManager = WebSocketManager.getInstance();
  const [miningData, setMiningData] = useState<any>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  
  useEffect(() => {
    // Initialize WebSocket for mining data
    wsManager.initialize({
      url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/mining',
      enableHeartbeat: true,
      heartbeatInterval: 30000,
      maxReconnectAttempts: 10,
      reconnectInterval: 5000
    });
    
    // Subscribe to mining data types
    const unsubscribe = wsManager.subscribeToTypes(
      ['mining_stats', 'worker_update', 'block_found', 'alert'],
      (type, data) => {
        switch (type) {
          case 'mining_stats':
            setMiningData(data);
            break;
          case 'worker_update':
            setWorkers(prev => {
              const updated = [...prev];
              const workerData = data as any;
              const index = updated.findIndex(w => w.id === workerData.id);
              if (index >= 0) {
                updated[index] = { ...updated[index], ...workerData };
              } else {
                updated.push(workerData);
              }
              return updated;
            });
            break;
          case 'block_found':
            console.log('New block found:', data);
            break;
          case 'alert':
            setAlerts(prev => [data, ...prev].slice(0, 10)); // Keep last 10 alerts
            break;
        }
      }
    );
    
    return () => {
      unsubscribe();
      wsManager.cleanup();
    };
  }, [wsManager]);
  
  return {
    miningData,
    workers,
    alerts,
    connectionStats: wsManager.getStats(),
    sendCommand: (command: string, data: unknown) => {
      useWebSocketStore.getState().send({
        type: 'command',
        data: { command, ...data }
      });
    }
  };
}

// Export default WebSocket manager instance
export default WebSocketManager.getInstance();