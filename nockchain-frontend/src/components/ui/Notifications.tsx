'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Info, 
  X, 
  Bell,
  Zap,
  TrendingUp,
  Shield,
  Clock
} from 'lucide-react';
import { Button } from './Button';
import { Badge } from './Badge';

export type NotificationType = 'success' | 'warning' | 'error' | 'info' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  actions?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }[];
  timestamp?: Date;
  category?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Auto-remove non-persistent notifications
    if (!notification.persistent && notification.duration !== 0) {
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, notification.duration || 5000);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      removeNotification,
      clearAll
    }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

function NotificationContainer() {
  const { notifications, removeNotification } = useNotifications();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 w-96 max-w-[calc(100vw-2rem)]">
      <AnimatePresence>
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function NotificationItem({ 
  notification, 
  onClose 
}: { 
  notification: Notification; 
  onClose: () => void;
}) {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-[#ff8c42]" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-[#ff8c42]" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'system':
        return <Zap className="w-5 h-5 text-[#ff8c42]" />;
      default:
        return <Info className="w-5 h-5 text-[#ff8c42]" />;
    }
  };

  const getBorderColor = () => {
    switch (notification.type) {
      case 'success':
        return 'border-green-500/30';
      case 'warning':
        return 'border-yellow-500/30';
      case 'error':
        return 'border-red-500/30';
      case 'system':
        return 'border-purple-500/30';
      default:
        return 'border-blue-500/30';
    }
  };

  const getPriorityBadge = () => {
    if (!notification.priority || notification.priority === 'low') return null;
    
    const colors = {
      medium: 'bg-[#ff8c42]/20 text-[#ff8c42]',
      high: 'bg-orange-500/20 text-orange-400',
      critical: 'bg-red-500/20 text-red-400'
    };

    return (
      <Badge className={`text-xs ${colors[notification.priority]}`}>
        {notification.priority.toUpperCase()}
      </Badge>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.9 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`glass-card border-l-4 ${getBorderColor()} p-4 space-y-3 shadow-xl`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-semibold text-white">
                  {notification.title}
                </h4>
                {getPriorityBadge()}
              </div>
              <p className="text-sm text-white/70 leading-relaxed">
                {notification.message}
              </p>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white/50 hover:text-white p-1 h-auto"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {notification.category && (
            <div className="mt-2">
              <Badge variant="neutral" className="text-xs">
                {notification.category}
              </Badge>
            </div>
          )}
          
          {notification.actions && notification.actions.length > 0 && (
            <div className="flex gap-2 mt-3">
              {notification.actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'secondary'}
                  size="sm"
                  onClick={action.onClick}
                  className="text-xs px-3 py-1"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
          
          {notification.timestamp && (
            <div className="flex items-center gap-1 mt-2 text-xs text-white/50">
              <Clock className="w-3 h-3" />
              {notification.timestamp.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Toast Notification Component
export function Toast({ 
  notification, 
  onClose 
}: { 
  notification: Notification; 
  onClose: () => void;
}) {
  useEffect(() => {
    if (!notification.persistent && notification.duration !== 0) {
      const timer = setTimeout(onClose, notification.duration || 3000);
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  return <NotificationItem notification={notification} onClose={onClose} />;
}

// Notification Bell Component
export function NotificationBell() {
  const { notifications, clearAll } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  
  const unreadCount = notifications.filter(n => !n.persistent).length;
  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative glass-button-secondary p-2"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-80 glass-card border border-white/10 rounded-lg shadow-xl z-50"
          >
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">Notifications</h3>
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      clearAll();
                      setIsOpen(false);
                    }}
                    className="text-xs text-white/60 hover:text-white"
                  >
                    Clear all
                  </Button>
                )}
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {recentNotifications.length === 0 ? (
                <div className="p-8 text-center text-white/50">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-b-0"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 mt-1">
                          {(() => {
                            switch (notification.type) {
                              case 'success':
                                return <CheckCircle className="w-4 h-4 text-green-400" />;
                              case 'warning':
                                return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
                              case 'error':
                                return <XCircle className="w-4 h-4 text-red-400" />;
                              case 'system':
                                return <Zap className="w-4 h-4 text-purple-400" />;
                              default:
                                return <Info className="w-4 h-4 text-blue-400" />;
                            }
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {notification.title}
                          </p>
                          <p className="text-xs text-white/60 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          {notification.timestamp && (
                            <p className="text-xs text-white/40 mt-1">
                              {notification.timestamp.toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {notifications.length > 5 && (
              <div className="p-3 border-t border-white/10 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  View all notifications
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// System Status Indicator
export function SystemStatusIndicator({ 
  status = 'operational',
  uptime = 99.9,
  lastUpdate,
  className = ''
}: {
  status?: 'operational' | 'degraded' | 'maintenance' | 'outage';
  uptime?: number;
  lastUpdate?: Date;
  className?: string;
}) {
  const getStatusColor = () => {
    switch (status) {
      case 'operational':
        return 'text-green-400';
      case 'degraded':
        return 'text-yellow-400';
      case 'maintenance':
        return 'text-blue-400';
      case 'outage':
        return 'text-red-400';
      default:
        return 'text-white/60';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="w-4 h-4" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4" />;
      case 'maintenance':
        return <Clock className="w-4 h-4" />;
      case 'outage':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className={getStatusColor()}
      >
        {getStatusIcon()}
      </motion.div>
      <div className="text-sm">
        <span className="text-white/80 capitalize">{status}</span>
        <span className="text-white/50 ml-2">({uptime}% uptime)</span>
      </div>
      {lastUpdate && (
        <span className="text-xs text-white/40">
          Updated {lastUpdate.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}

// Utility functions for common notifications
export const NotificationTemplates = {
  success: (title: string, message: string) => ({
    type: 'success' as NotificationType,
    title,
    message,
    duration: 4000
  }),

  error: (title: string, message: string) => ({
    type: 'error' as NotificationType,
    title,
    message,
    duration: 6000,
    priority: 'high' as const
  }),

  warning: (title: string, message: string) => ({
    type: 'warning' as NotificationType,
    title,
    message,
    duration: 5000
  }),

  info: (title: string, message: string) => ({
    type: 'info' as NotificationType,
    title,
    message,
    duration: 4000
  }),

  system: (title: string, message: string, category?: string) => ({
    type: 'system' as NotificationType,
    title,
    message,
    category,
    duration: 5000
  }),

  miningAlert: (hashrate: number, threshold: number) => ({
    type: 'warning' as NotificationType,
    title: 'Mining Performance Alert',
    message: `Hashrate dropped to ${hashrate.toFixed(2)} MH/s (below ${threshold} MH/s threshold)`,
    category: 'Mining',
    priority: 'medium' as const,
    duration: 8000
  }),

  paymentConfirmed: (amount: number, txHash: string) => ({
    type: 'success' as NotificationType,
    title: 'Payment Confirmed',
    message: `Received ${amount} NOCK`,
    category: 'Payments',
    actions: [{
      label: 'View Transaction',
      onClick: () => window.open(`https://explorer.example.com/tx/${txHash}`, '_blank')
    }]
  }),

  systemMaintenance: (startTime: Date, duration: number) => ({
    type: 'info' as NotificationType,
    title: 'Scheduled Maintenance',
    message: `System maintenance scheduled for ${startTime.toLocaleString()}. Estimated duration: ${duration} minutes.`,
    category: 'System',
    persistent: true,
    priority: 'medium' as const
  })
};