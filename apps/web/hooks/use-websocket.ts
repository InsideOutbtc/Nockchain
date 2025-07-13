'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

interface WebSocketMessage {
  type: string
  data?: any
  timestamp?: number
}

interface UseWebSocketOptions {
  channels: string[]
  onMessage?: (message: WebSocketMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

interface UseWebSocketReturn {
  data: WebSocketMessage | null
  isConnected: boolean
  error: string | null
  reconnectCount: number
  sendMessage: (message: any) => void
  subscribe: (channels: string[]) => void
  unsubscribe: (channels: string[]) => void
}

export function useWebSocket({
  channels = [],
  onMessage,
  onConnect,
  onDisconnect,
  onError,
  reconnectInterval = 3000,
  maxReconnectAttempts = 10
}: UseWebSocketOptions): UseWebSocketReturn {
  const [data, setData] = useState<WebSocketMessage | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reconnectCount, setReconnectCount] = useState(0)
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const subscribedChannelsRef = useRef<string[]>(channels)

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/ws`
      
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        setError(null)
        reconnectAttemptsRef.current = 0
        setReconnectCount(0)
        
        // Subscribe to initial channels
        if (subscribedChannelsRef.current.length > 0) {
          ws.send(JSON.stringify({
            type: 'Subscribe',
            data: { channels: subscribedChannelsRef.current }
          }))
        }
        
        onConnect?.()
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          setData(message)
          onMessage?.(message)
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e)
        }
      }

      ws.onclose = (event) => {
        setIsConnected(false)
        wsRef.current = null
        
        onDisconnect?.()
        
        // Attempt to reconnect if not manually closed
        if (!event.wasClean && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++
          setReconnectCount(reconnectAttemptsRef.current)
          setError(`Connection lost. Reconnecting... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setError('Max reconnection attempts reached. Please refresh the page.')
        }
      }

      ws.onerror = (event) => {
        setError('WebSocket connection error')
        onError?.(event)
      }

    } catch (e) {
      setError('Failed to create WebSocket connection')
      console.error('WebSocket connection error:', e)
    }
  }, [onConnect, onDisconnect, onError, onMessage, maxReconnectAttempts, reconnectInterval])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect')
      wsRef.current = null
    }
    
    setIsConnected(false)
    setData(null)
    setError(null)
  }, [])

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message)
    }
  }, [])

  const subscribe = useCallback((newChannels: string[]) => {
    subscribedChannelsRef.current = [...new Set([...subscribedChannelsRef.current, ...newChannels])]
    
    if (isConnected && newChannels.length > 0) {
      sendMessage({
        type: 'Subscribe',
        data: { channels: newChannels }
      })
    }
  }, [isConnected, sendMessage])

  const unsubscribe = useCallback((channelsToRemove: string[]) => {
    subscribedChannelsRef.current = subscribedChannelsRef.current.filter(
      channel => !channelsToRemove.includes(channel)
    )
    
    if (isConnected && channelsToRemove.length > 0) {
      sendMessage({
        type: 'Unsubscribe',
        data: { channels: channelsToRemove }
      })
    }
  }, [isConnected, sendMessage])

  // Initialize connection
  useEffect(() => {
    connect()
    
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  // Send ping periodically to keep connection alive
  useEffect(() => {
    if (!isConnected) return

    const pingInterval = setInterval(() => {
      sendMessage({ type: 'Ping' })
    }, 30000) // Ping every 30 seconds

    return () => clearInterval(pingInterval)
  }, [isConnected, sendMessage])

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, reduce activity
        return
      } else {
        // Page is visible, ensure connection is active
        if (!isConnected && reconnectAttemptsRef.current < maxReconnectAttempts) {
          connect()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [connect, isConnected, maxReconnectAttempts])

  return {
    data,
    isConnected,
    error,
    reconnectCount,
    sendMessage,
    subscribe,
    unsubscribe
  }
}

// Hook for mining-specific WebSocket data
export function useMiningWebSocket() {
  const [poolStats, setPoolStats] = useState<any>(null)
  const [hashrateData, setHashrateData] = useState<any>(null)
  const [minerUpdates, setMinerUpdates] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])

  const { data, isConnected, error, sendMessage } = useWebSocket({
    channels: ['pool_stats', 'hashrate', 'miners', 'shares', 'blocks', 'alerts'],
    onMessage: (message) => {
      switch (message.type) {
        case 'PoolStats':
          setPoolStats(message.data)
          break
        case 'HashrateUpdate':
          setHashrateData(message.data)
          break
        case 'MinerUpdate':
          setMinerUpdates(prev => [message.data, ...prev.slice(0, 99)]) // Keep last 100
          break
        case 'Alert':
          setAlerts(prev => [message.data, ...prev.slice(0, 49)]) // Keep last 50
          break
        default:
          break
      }
    }
  })

  return {
    poolStats,
    hashrateData,
    minerUpdates,
    alerts,
    isConnected,
    error,
    sendMessage
  }
}

// Hook for real-time share updates
export function useShareUpdates() {
  const [recentShares, setRecentShares] = useState<any[]>([])
  const [shareStats, setShareStats] = useState({
    totalShares: 0,
    validShares: 0,
    invalidShares: 0,
    sharesPerSecond: 0
  })

  const { isConnected } = useWebSocket({
    channels: ['shares'],
    onMessage: (message) => {
      if (message.type === 'ShareSubmitted') {
        const share = message.data
        setRecentShares(prev => [share, ...prev.slice(0, 99)])
        
        setShareStats(prev => ({
          ...prev,
          totalShares: prev.totalShares + 1,
          validShares: share.isValid ? prev.validShares + 1 : prev.validShares,
          invalidShares: !share.isValid ? prev.invalidShares + 1 : prev.invalidShares
        }))
      }
    }
  })

  // Calculate shares per second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const recentSharesInLastSecond = recentShares.filter(
        share => now - share.timestamp * 1000 < 1000
      ).length
      
      setShareStats(prev => ({
        ...prev,
        sharesPerSecond: recentSharesInLastSecond
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [recentShares])

  return {
    recentShares,
    shareStats,
    isConnected
  }
}