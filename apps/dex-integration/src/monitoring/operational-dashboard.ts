// Operational Dashboard - Real-time operational visibility and control center

import { Logger } from '../utils/logger';
import { ComprehensiveMonitoring } from './comprehensive-monitoring';
import BN from 'bn.js';

export interface DashboardConfig {
  // Dashboard settings
  display: {
    theme: 'light' | 'dark' | 'auto';
    layout: 'grid' | 'tabs' | 'masonry';
    refreshInterval: number; // seconds
    autoRefresh: boolean;
    enableFullscreen: boolean;
  };
  
  // Widget configuration
  widgets: {
    enableSystemMetrics: boolean;
    enableApplicationMetrics: boolean;
    enableBusinessMetrics: boolean;
    enableSecurityMetrics: boolean;
    enableCustomMetrics: boolean;
    
    defaultTimeRange: '1h' | '6h' | '24h' | '7d' | '30d';
    enableTimeRangeSelector: boolean;
    enableFiltering: boolean;
  };
  
  // Alerts and notifications
  notifications: {
    enableDesktopNotifications: boolean;
    enableSoundAlerts: boolean;
    enableBrowserNotifications: boolean;
    alertBadgeEnabled: boolean;
    
    severityColors: {
      info: string;
      warning: string;
      error: string;
      critical: string;
    };
  };
  
  // User interface
  ui: {
    enableDarkMode: boolean;
    compactMode: boolean;
    showTooltips: boolean;
    enableKeyboardShortcuts: boolean;
    responsiveBreakpoints: {
      mobile: number;
      tablet: number;
      desktop: number;
    };
  };
  
  // Data export
  export: {
    enableExport: boolean;
    formats: ('csv' | 'json' | 'pdf' | 'png')[];
    enableScheduledReports: boolean;
    reportRecipients: string[];
  };
}

export interface WidgetDefinition {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'table' | 'status' | 'alert' | 'custom';
  size: 'small' | 'medium' | 'large' | 'xl';
  position: { row: number; col: number; width: number; height: number };
  
  // Data configuration
  dataSource: {
    metric: string;
    aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count';
    timeRange: string;
    groupBy?: string[];
    filters?: { [key: string]: any };
  };
  
  // Visualization configuration
  visualization: {
    chartType?: 'line' | 'bar' | 'pie' | 'gauge' | 'heatmap';
    colors?: string[];
    thresholds?: { value: number; color: string; label?: string }[];
    unit?: string;
    decimals?: number;
    showLegend?: boolean;
    showGrid?: boolean;
  };
  
  // Interaction
  interactions: {
    clickable: boolean;
    drillDown?: string;
    tooltip?: boolean;
    zoomable?: boolean;
  };
  
  // Alerts
  alerting: {
    enabled: boolean;
    thresholds?: { value: number; severity: string }[];
    comparison: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  };
}

export interface DashboardState {
  // Current data
  widgets: Map<string, any>;
  alerts: any[];
  systemStatus: 'healthy' | 'degraded' | 'critical';
  
  // User interaction
  selectedTimeRange: string;
  activeFilters: { [key: string]: any };
  selectedWidgets: string[];
  
  // Real-time updates
  lastUpdated: number;
  updateInProgress: boolean;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  
  // Performance
  loadTime: number;
  renderTime: number;
  dataFreshness: { [widgetId: string]: number };
}

export interface SystemOverview {
  // System health
  overallStatus: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  version: string;
  
  // Performance metrics
  performance: {
    cpu: { current: number; average: number; peak: number };
    memory: { used: number; total: number; percentage: number };
    disk: { used: number; total: number; percentage: number };
    network: { inbound: number; outbound: number };
  };
  
  // Application metrics
  application: {
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
    activeConnections: number;
    queueDepth: number;
  };
  
  // Business metrics
  business: {
    totalTransactions: number;
    successRate: number;
    volumeProcessed: BN;
    revenue: BN;
    activeUsers: number;
  };
  
  // Security metrics
  security: {
    activeThreats: number;
    blockedRequests: number;
    securityIncidents: number;
    lastSecurityScan: number;
  };
}

export class OperationalDashboard {
  private config: DashboardConfig;
  private logger: Logger;
  private monitoring: ComprehensiveMonitoring;
  
  // Dashboard state
  private state: DashboardState;
  private widgets: Map<string, WidgetDefinition>;
  private dashboardLayouts: Map<string, any>;
  
  // Real-time updates
  private updateInterval: NodeJS.Timeout | null = null;
  private websocketConnections: Set<any> = new Set();
  
  // Performance tracking
  private renderMetrics: Map<string, number> = new Map();
  private dataCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  constructor(config: DashboardConfig, monitoring: ComprehensiveMonitoring) {
    this.config = config;
    this.logger = new Logger('OperationalDashboard');
    this.monitoring = monitoring;
    
    this.state = this.initializeDashboardState();
    this.widgets = new Map();
    this.dashboardLayouts = new Map();
    
    this.initializeDashboard();
    this.startRealTimeUpdates();
    this.createDefaultWidgets();
  }

  // Widget management
  addWidget(widget: WidgetDefinition): void {
    this.widgets.set(widget.id, widget);
    
    // Initialize widget data
    this.updateWidgetData(widget.id);
    
    this.logger.info('Widget added to dashboard', {
      id: widget.id,
      title: widget.title,
      type: widget.type
    });
  }

  removeWidget(widgetId: string): void {
    this.widgets.delete(widgetId);
    this.state.widgets.delete(widgetId);
    
    this.logger.info('Widget removed from dashboard', { id: widgetId });
  }

  updateWidget(widgetId: string, updates: Partial<WidgetDefinition>): void {
    const widget = this.widgets.get(widgetId);
    if (!widget) return;
    
    const updatedWidget = { ...widget, ...updates };
    this.widgets.set(widgetId, updatedWidget);
    
    // Refresh widget data
    this.updateWidgetData(widgetId);
  }

  // Data management
  async updateWidgetData(widgetId: string): Promise<void> {
    const widget = this.widgets.get(widgetId);
    if (!widget) return;
    
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(widget);
      const cached = this.dataCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        this.state.widgets.set(widgetId, cached.data);
        this.state.dataFreshness[widgetId] = cached.timestamp;
        return;
      }
      
      // Fetch fresh data
      const data = await this.fetchWidgetData(widget);
      
      // Cache the data
      this.dataCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl: this.getDataTTL(widget.type)
      });
      
      // Update widget state
      this.state.widgets.set(widgetId, data);
      this.state.dataFreshness[widgetId] = Date.now();
      
      // Record performance metrics
      const loadTime = Date.now() - startTime;
      this.renderMetrics.set(widgetId, loadTime);
      
      // Check for alerts
      this.checkWidgetAlerts(widget, data);
      
    } catch (error) {
      this.logger.error('Failed to update widget data', {
        widgetId,
        error: error.message
      });
      
      // Set error state
      this.state.widgets.set(widgetId, {
        error: true,
        message: 'Failed to load data',
        timestamp: Date.now()
      });
    }
  }

  async updateAllWidgets(): Promise<void> {
    this.state.updateInProgress = true;
    const startTime = Date.now();
    
    try {
      // Update widgets in parallel for better performance
      const updatePromises = Array.from(this.widgets.keys()).map(widgetId =>
        this.updateWidgetData(widgetId)
      );
      
      await Promise.allSettled(updatePromises);
      
      // Update system overview
      await this.updateSystemOverview();
      
      // Update dashboard state
      this.state.lastUpdated = Date.now();
      this.state.loadTime = Date.now() - startTime;
      
      // Broadcast updates to connected clients
      this.broadcastUpdate();
      
    } catch (error) {
      this.logger.error('Failed to update dashboard', error);
    } finally {
      this.state.updateInProgress = false;
    }
  }

  // System overview
  async getSystemOverview(): Promise<SystemOverview> {
    const systemHealth = await this.monitoring.getOverallSystemHealth();
    const performanceReport = this.monitoring.getPerformanceReport();
    const monitoringAnalytics = this.monitoring.getMonitoringAnalytics();
    
    return {
      overallStatus: systemHealth.status,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      
      performance: {
        cpu: {
          current: performanceReport.current.cpuUsage,
          average: performanceReport.current.cpuUsage, // Would calculate from history
          peak: performanceReport.current.cpuUsage
        },
        memory: {
          used: performanceReport.current.memoryUsage,
          total: 8 * 1024 * 1024 * 1024, // 8GB, would get actual value
          percentage: (performanceReport.current.memoryUsage / (8 * 1024 * 1024 * 1024)) * 100
        },
        disk: {
          used: 50 * 1024 * 1024 * 1024, // Would implement actual disk monitoring
          total: 100 * 1024 * 1024 * 1024,
          percentage: 50
        },
        network: {
          inbound: 1024 * 1024, // Would implement actual network monitoring
          outbound: 512 * 1024
        }
      },
      
      application: {
        requestsPerSecond: performanceReport.current.requestsPerSecond,
        averageResponseTime: performanceReport.current.averageResponseTime,
        errorRate: performanceReport.current.errorRate,
        activeConnections: performanceReport.current.openConnections,
        queueDepth: 0 // Would implement queue monitoring
      },
      
      business: {
        totalTransactions: 1000, // Would get from business metrics
        successRate: 99.5,
        volumeProcessed: new BN('1000000000'),
        revenue: new BN('50000'),
        activeUsers: 500
      },
      
      security: {
        activeThreats: 0,
        blockedRequests: 10,
        securityIncidents: 2,
        lastSecurityScan: Date.now() - 3600000 // 1 hour ago
      }
    };
  }

  // Real-time features
  enableRealTimeUpdates(): void {
    if (this.updateInterval) return;
    
    this.updateInterval = setInterval(() => {
      this.updateAllWidgets();
    }, this.config.display.refreshInterval * 1000);
    
    this.logger.info('Real-time updates enabled', {
      interval: this.config.display.refreshInterval
    });
  }

  disableRealTimeUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    this.logger.info('Real-time updates disabled');
  }

  // WebSocket management for real-time updates
  addWebSocketConnection(connection: any): void {
    this.websocketConnections.add(connection);
    
    // Send current state to new connection
    connection.send(JSON.stringify({
      type: 'initial_state',
      data: this.getDashboardData()
    }));
  }

  removeWebSocketConnection(connection: any): void {
    this.websocketConnections.delete(connection);
  }

  // Dashboard data export
  async exportDashboard(format: 'json' | 'csv' | 'pdf'): Promise<Buffer | string> {
    const dashboardData = this.getDashboardData();
    
    switch (format) {
      case 'json':
        return JSON.stringify(dashboardData, null, 2);
      
      case 'csv':
        return this.convertToCSV(dashboardData);
      
      case 'pdf':
        return await this.generatePDF(dashboardData);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Dashboard configuration
  updateDashboardConfig(updates: Partial<DashboardConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // Apply configuration changes
    if (updates.display?.refreshInterval) {
      this.disableRealTimeUpdates();
      this.enableRealTimeUpdates();
    }
    
    this.logger.info('Dashboard configuration updated', updates);
  }

  getDashboardConfig(): DashboardConfig {
    return { ...this.config };
  }

  // Performance metrics
  getDashboardPerformance(): {
    overallLoadTime: number;
    widgetLoadTimes: { [widgetId: string]: number };
    cacheHitRate: number;
    updateFrequency: number;
    connectionStatus: string;
  } {
    const widgetLoadTimes: { [widgetId: string]: number } = {};
    this.renderMetrics.forEach((loadTime, widgetId) => {
      widgetLoadTimes[widgetId] = loadTime;
    });
    
    const totalCacheAttempts = this.dataCache.size;
    const cacheHits = Array.from(this.dataCache.values()).filter(item =>
      Date.now() - item.timestamp < item.ttl
    ).length;
    
    return {
      overallLoadTime: this.state.loadTime,
      widgetLoadTimes,
      cacheHitRate: totalCacheAttempts > 0 ? cacheHits / totalCacheAttempts : 0,
      updateFrequency: this.config.display.refreshInterval,
      connectionStatus: this.state.connectionStatus
    };
  }

  // Public API for dashboard data
  getDashboardData(): {
    widgets: { [widgetId: string]: any };
    systemOverview: SystemOverview;
    alerts: any[];
    state: DashboardState;
    performance: any;
  } {
    return {
      widgets: Object.fromEntries(this.state.widgets),
      systemOverview: this.getSystemOverview() as any, // Would await in real implementation
      alerts: this.state.alerts,
      state: this.state,
      performance: this.getDashboardPerformance()
    };
  }

  // Private methods
  private initializeDashboardState(): DashboardState {
    return {
      widgets: new Map(),
      alerts: [],
      systemStatus: 'healthy',
      selectedTimeRange: this.config.widgets.defaultTimeRange,
      activeFilters: {},
      selectedWidgets: [],
      lastUpdated: 0,
      updateInProgress: false,
      connectionStatus: 'connected',
      loadTime: 0,
      renderTime: 0,
      dataFreshness: {}
    };
  }

  private initializeDashboard(): void {
    this.logger.info('Initializing operational dashboard');
    
    // Set initial connection status
    this.state.connectionStatus = 'connected';
    
    // Initialize performance tracking
    this.startPerformanceTracking();
  }

  private startRealTimeUpdates(): void {
    if (this.config.display.autoRefresh) {
      this.enableRealTimeUpdates();
    }
  }

  private createDefaultWidgets(): void {
    // System metrics widgets
    this.addWidget({
      id: 'cpu-usage',
      title: 'CPU Usage',
      type: 'metric',
      size: 'medium',
      position: { row: 0, col: 0, width: 6, height: 4 },
      dataSource: {
        metric: 'system_cpu_usage',
        aggregation: 'avg',
        timeRange: '1h'
      },
      visualization: {
        chartType: 'gauge',
        colors: ['#00ff00', '#ffff00', '#ff0000'],
        thresholds: [
          { value: 70, color: '#ffff00', label: 'Warning' },
          { value: 90, color: '#ff0000', label: 'Critical' }
        ],
        unit: '%',
        decimals: 1
      },
      interactions: {
        clickable: true,
        tooltip: true,
        zoomable: false
      },
      alerting: {
        enabled: true,
        thresholds: [
          { value: 80, severity: 'warning' },
          { value: 95, severity: 'critical' }
        ],
        comparison: 'gt'
      }
    });
    
    this.addWidget({
      id: 'memory-usage',
      title: 'Memory Usage',
      type: 'metric',
      size: 'medium',
      position: { row: 0, col: 6, width: 6, height: 4 },
      dataSource: {
        metric: 'system_memory_usage',
        aggregation: 'avg',
        timeRange: '1h'
      },
      visualization: {
        chartType: 'gauge',
        colors: ['#00ff00', '#ffff00', '#ff0000'],
        unit: 'GB',
        decimals: 2
      },
      interactions: {
        clickable: true,
        tooltip: true,
        zoomable: false
      },
      alerting: {
        enabled: true,
        thresholds: [
          { value: 6, severity: 'warning' },
          { value: 7, severity: 'critical' }
        ],
        comparison: 'gt'
      }
    });
    
    // Application metrics
    this.addWidget({
      id: 'response-time',
      title: 'Response Time',
      type: 'chart',
      size: 'large',
      position: { row: 4, col: 0, width: 12, height: 6 },
      dataSource: {
        metric: 'app_averageResponseTime',
        aggregation: 'avg',
        timeRange: '6h'
      },
      visualization: {
        chartType: 'line',
        colors: ['#007acc'],
        unit: 'ms',
        showGrid: true,
        showLegend: true
      },
      interactions: {
        clickable: true,
        tooltip: true,
        zoomable: true
      },
      alerting: {
        enabled: true,
        thresholds: [
          { value: 100, severity: 'warning' },
          { value: 500, severity: 'error' }
        ],
        comparison: 'gt'
      }
    });
    
    // Business metrics
    this.addWidget({
      id: 'transaction-volume',
      title: 'Transaction Volume',
      type: 'metric',
      size: 'large',
      position: { row: 10, col: 0, width: 8, height: 4 },
      dataSource: {
        metric: 'business_bridge_volume',
        aggregation: 'sum',
        timeRange: '24h'
      },
      visualization: {
        chartType: 'bar',
        colors: ['#00cc44'],
        unit: 'NOCK',
        decimals: 0
      },
      interactions: {
        clickable: true,
        drillDown: 'transaction-details',
        tooltip: true,
        zoomable: false
      },
      alerting: {
        enabled: false
      }
    });
  }

  private async fetchWidgetData(widget: WidgetDefinition): Promise<any> {
    // Simulate data fetching (in production, this would query the monitoring system)
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    
    switch (widget.dataSource.metric) {
      case 'system_cpu_usage':
        return {
          value: Math.random() * 100,
          timestamp: Date.now(),
          unit: '%'
        };
      
      case 'system_memory_usage':
        return {
          value: Math.random() * 8,
          timestamp: Date.now(),
          unit: 'GB'
        };
      
      case 'app_averageResponseTime':
        const dataPoints = Array.from({ length: 20 }, (_, i) => ({
          timestamp: Date.now() - (19 - i) * 60000,
          value: 50 + Math.random() * 100
        }));
        return {
          series: dataPoints,
          current: dataPoints[dataPoints.length - 1].value,
          unit: 'ms'
        };
      
      default:
        return {
          value: Math.random() * 1000,
          timestamp: Date.now()
        };
    }
  }

  private checkWidgetAlerts(widget: WidgetDefinition, data: any): void {
    if (!widget.alerting.enabled || !widget.alerting.thresholds) return;
    
    const currentValue = data.value || data.current || 0;
    
    for (const threshold of widget.alerting.thresholds) {
      let breached = false;
      
      switch (widget.alerting.comparison) {
        case 'gt':
          breached = currentValue > threshold.value;
          break;
        case 'lt':
          breached = currentValue < threshold.value;
          break;
        case 'gte':
          breached = currentValue >= threshold.value;
          break;
        case 'lte':
          breached = currentValue <= threshold.value;
          break;
        case 'eq':
          breached = currentValue === threshold.value;
          break;
      }
      
      if (breached) {
        this.triggerWidgetAlert(widget, currentValue, threshold);
      }
    }
  }

  private triggerWidgetAlert(widget: WidgetDefinition, value: number, threshold: any): void {
    const alert = {
      id: `widget_${widget.id}_${Date.now()}`,
      widgetId: widget.id,
      widgetTitle: widget.title,
      severity: threshold.severity,
      value,
      threshold: threshold.value,
      timestamp: Date.now(),
      message: `${widget.title} is ${value} (threshold: ${threshold.value})`
    };
    
    this.state.alerts.unshift(alert);
    
    // Keep only last 50 alerts
    if (this.state.alerts.length > 50) {
      this.state.alerts = this.state.alerts.slice(0, 50);
    }
    
    // Trigger notifications
    this.sendNotification(alert);
  }

  private sendNotification(alert: any): void {
    if (this.config.notifications.enableDesktopNotifications) {
      // Would send desktop notification
    }
    
    if (this.config.notifications.enableBrowserNotifications) {
      // Would send browser notification
    }
    
    this.logger.warn('Dashboard alert triggered', alert);
  }

  private broadcastUpdate(): void {
    const updateData = {
      type: 'dashboard_update',
      data: this.getDashboardData(),
      timestamp: Date.now()
    };
    
    this.websocketConnections.forEach(connection => {
      try {
        connection.send(JSON.stringify(updateData));
      } catch (error) {
        this.logger.warn('Failed to send update to WebSocket connection', error);
        this.websocketConnections.delete(connection);
      }
    });
  }

  private async updateSystemOverview(): Promise<void> {
    const overview = await this.getSystemOverview();
    this.state.systemStatus = overview.overallStatus;
  }

  private startPerformanceTracking(): void {
    setInterval(() => {
      this.cleanupCache();
      this.updatePerformanceMetrics();
    }, 60000); // Every minute
  }

  private cleanupCache(): void {
    const now = Date.now();
    
    for (const [key, item] of this.dataCache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.dataCache.delete(key);
      }
    }
  }

  private updatePerformanceMetrics(): void {
    // Update performance metrics for monitoring
    this.state.renderTime = Array.from(this.renderMetrics.values())
      .reduce((sum, time) => sum + time, 0) / this.renderMetrics.size || 0;
  }

  // Utility methods
  private generateCacheKey(widget: WidgetDefinition): string {
    return `${widget.id}_${widget.dataSource.metric}_${widget.dataSource.timeRange}`;
  }

  private getDataTTL(widgetType: string): number {
    switch (widgetType) {
      case 'metric': return 30000; // 30 seconds
      case 'chart': return 60000; // 1 minute
      case 'table': return 120000; // 2 minutes
      default: return 60000;
    }
  }

  private convertToCSV(data: any): string {
    // Convert dashboard data to CSV format
    return 'CSV export functionality would be implemented here';
  }

  private async generatePDF(data: any): Promise<Buffer> {
    // Generate PDF report of dashboard
    return Buffer.from('PDF generation would be implemented here');
  }
}