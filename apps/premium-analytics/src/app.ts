// Premium Analytics Platform - Main Application Server
// Advanced analytics subscriptions targeting $195K monthly revenue

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import dotenv from 'dotenv';

import { logger } from './utils/logger';
import { DatabaseManager } from './database/manager';
import { RedisManager } from './database/redis';
import { SubscriptionManager } from './subscriptions/manager';
import { ChartEngine } from './charts/engine';
import { DashboardManager } from './dashboards/manager';
import { AnalyticsAPI } from './api/analytics';
import { RealtimeManager } from './api/realtime';
import { AuthMiddleware } from './middleware/auth';
import { RateLimitMiddleware } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';

// Load environment variables
dotenv.config();

// Application configuration
const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/premium_analytics',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'premium-analytics-secret',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  revenueTarget: {
    monthly: 195000, // $195K monthly target
    analytics: 50000, // Analytics subscriptions
    mobile: 30000,    // Mobile app premium
    api: 40000,       // Enterprise API
    optimization: 75000 // Mobile mining premium
  }
};

class PremiumAnalyticsApp {
  private app: express.Application;
  private server: any;
  private wss: WebSocketServer;
  private dbManager: DatabaseManager;
  private redisManager: RedisManager;
  private subscriptionManager: SubscriptionManager;
  private chartEngine: ChartEngine;
  private dashboardManager: DashboardManager;
  private analyticsAPI: AnalyticsAPI;
  private realtimeManager: RealtimeManager;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.initializeServices();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true
    }));

    // Utility middleware
    this.app.use(compression());
    this.app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Custom middleware
    this.app.use(RateLimitMiddleware.create());
  }

  private async initializeServices(): Promise<void> {
    logger.info('🚀 Initializing Premium Analytics Platform services...');

    try {
      // Initialize database connections
      this.dbManager = new DatabaseManager(config.databaseUrl);
      await this.dbManager.initialize();

      this.redisManager = new RedisManager(config.redisUrl);
      await this.redisManager.initialize();

      // Initialize core services
      this.subscriptionManager = new SubscriptionManager(this.dbManager, this.redisManager);
      await this.subscriptionManager.initialize();

      this.chartEngine = new ChartEngine(this.dbManager, this.redisManager);
      await this.chartEngine.initialize();

      this.dashboardManager = new DashboardManager(this.dbManager, this.redisManager);
      await this.dashboardManager.initialize();

      // Initialize API services
      this.analyticsAPI = new AnalyticsAPI(
        this.subscriptionManager,
        this.chartEngine,
        this.dashboardManager
      );

      this.realtimeManager = new RealtimeManager(this.redisManager);

      logger.info('✅ All services initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize services:', error);
      process.exit(1);
    }
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'premium-analytics',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        revenue: {
          target: `$${config.revenueTarget.monthly.toLocaleString()}/month`,
          streams: {
            analytics: `$${config.revenueTarget.analytics.toLocaleString()}`,
            mobile: `$${config.revenueTarget.mobile.toLocaleString()}`,
            api: `$${config.revenueTarget.api.toLocaleString()}`,
            optimization: `$${config.revenueTarget.optimization.toLocaleString()}`
          }
        }
      });
    });

    // Authentication routes
    this.app.post('/api/v1/auth/login', this.analyticsAPI.login.bind(this.analyticsAPI));
    this.app.post('/api/v1/auth/register', this.analyticsAPI.register.bind(this.analyticsAPI));
    this.app.post('/api/v1/auth/refresh', this.analyticsAPI.refreshToken.bind(this.analyticsAPI));

    // Protected routes
    this.app.use('/api/v1', AuthMiddleware.authenticate);

    // Subscription management
    this.app.get('/api/v1/subscriptions/tiers', this.analyticsAPI.getSubscriptionTiers.bind(this.analyticsAPI));
    this.app.post('/api/v1/subscriptions/create', this.analyticsAPI.createSubscription.bind(this.analyticsAPI));
    this.app.get('/api/v1/subscriptions/current', this.analyticsAPI.getCurrentSubscription.bind(this.analyticsAPI));
    this.app.put('/api/v1/subscriptions/upgrade', this.analyticsAPI.upgradeSubscription.bind(this.analyticsAPI));
    this.app.delete('/api/v1/subscriptions/cancel', this.analyticsAPI.cancelSubscription.bind(this.analyticsAPI));

    // Analytics and charts
    this.app.get('/api/v1/analytics/portfolio', this.analyticsAPI.getPortfolioAnalytics.bind(this.analyticsAPI));
    this.app.get('/api/v1/analytics/performance', this.analyticsAPI.getPerformanceAnalytics.bind(this.analyticsAPI));
    this.app.get('/api/v1/analytics/risk', this.analyticsAPI.getRiskAnalytics.bind(this.analyticsAPI));
    this.app.get('/api/v1/analytics/predictions', this.analyticsAPI.getPredictiveAnalytics.bind(this.analyticsAPI));

    // Charts and visualizations
    this.app.get('/api/v1/charts/price', this.analyticsAPI.getPriceCharts.bind(this.analyticsAPI));
    this.app.get('/api/v1/charts/volume', this.analyticsAPI.getVolumeCharts.bind(this.analyticsAPI));
    this.app.get('/api/v1/charts/indicators', this.analyticsAPI.getIndicatorCharts.bind(this.analyticsAPI));
    this.app.post('/api/v1/charts/custom', this.analyticsAPI.createCustomChart.bind(this.analyticsAPI));

    // Dashboards
    this.app.get('/api/v1/dashboards', this.analyticsAPI.getDashboards.bind(this.analyticsAPI));
    this.app.post('/api/v1/dashboards', this.analyticsAPI.createDashboard.bind(this.analyticsAPI));
    this.app.put('/api/v1/dashboards/:id', this.analyticsAPI.updateDashboard.bind(this.analyticsAPI));
    this.app.delete('/api/v1/dashboards/:id', this.analyticsAPI.deleteDashboard.bind(this.analyticsAPI));

    // Premium features
    this.app.get('/api/v1/premium/alerts', this.analyticsAPI.getAlerts.bind(this.analyticsAPI));
    this.app.post('/api/v1/premium/alerts', this.analyticsAPI.createAlert.bind(this.analyticsAPI));
    this.app.get('/api/v1/premium/reports', this.analyticsAPI.getReports.bind(this.analyticsAPI));
    this.app.post('/api/v1/premium/reports/generate', this.analyticsAPI.generateReport.bind(this.analyticsAPI));

    // Mobile mining analytics
    this.app.get('/api/v1/mobile/optimization', this.analyticsAPI.getMobileOptimization.bind(this.analyticsAPI));
    this.app.get('/api/v1/mobile/earnings', this.analyticsAPI.getMobileEarnings.bind(this.analyticsAPI));
    this.app.get('/api/v1/mobile/efficiency', this.analyticsAPI.getMobileEfficiency.bind(this.analyticsAPI));

    // Enterprise API features
    this.app.get('/api/v1/enterprise/data-feeds', this.analyticsAPI.getDataFeeds.bind(this.analyticsAPI));
    this.app.get('/api/v1/enterprise/bulk-export', this.analyticsAPI.bulkExport.bind(this.analyticsAPI));
    this.app.get('/api/v1/enterprise/analytics-api', this.analyticsAPI.getAnalyticsAPI.bind(this.analyticsAPI));

    // Admin routes
    this.app.get('/api/v1/admin/revenue', this.analyticsAPI.getRevenueMetrics.bind(this.analyticsAPI));
    this.app.get('/api/v1/admin/subscriptions', this.analyticsAPI.getSubscriptionMetrics.bind(this.analyticsAPI));
    this.app.get('/api/v1/admin/usage', this.analyticsAPI.getUsageMetrics.bind(this.analyticsAPI));

    // Error handling
    this.app.use(errorHandler);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl
      });
    });
  }

  private setupWebSocket(): void {
    this.wss = new WebSocketServer({ server: this.server });

    this.wss.on('connection', (ws, req) => {
      logger.info('📡 WebSocket connection established');

      // Handle real-time data subscriptions
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          await this.realtimeManager.handleMessage(ws, data);
        } catch (error) {
          logger.error('WebSocket message error:', error);
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        logger.info('📡 WebSocket connection closed');
        this.realtimeManager.removeConnection(ws);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
      });
    });

    // Start real-time data broadcasting
    this.realtimeManager.startBroadcasting(this.wss);
  }

  public async start(): Promise<void> {
    await this.initializeServices();
    this.setupRoutes();

    // Create HTTP server
    this.server = createServer(this.app);
    this.setupWebSocket();

    // Start server
    this.server.listen(config.port, () => {
      logger.info(`🚀 Premium Analytics Platform started on port ${config.port}`);
      logger.info(`💰 Revenue Target: $${config.revenueTarget.monthly.toLocaleString()}/month`);
      logger.info(`📊 Analytics Revenue: $${config.revenueTarget.analytics.toLocaleString()}/month`);
      logger.info(`📱 Mobile Premium: $${config.revenueTarget.mobile.toLocaleString()}/month`);
      logger.info(`🔌 API Revenue: $${config.revenueTarget.api.toLocaleString()}/month`);
      logger.info(`⚡ Optimization: $${config.revenueTarget.optimization.toLocaleString()}/month`);
      logger.info(`🌐 Environment: ${config.nodeEnv}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', this.shutdown.bind(this));
    process.on('SIGINT', this.shutdown.bind(this));
  }

  private async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down Premium Analytics Platform...');

    try {
      // Close WebSocket server
      if (this.wss) {
        this.wss.close();
      }

      // Close HTTP server
      if (this.server) {
        this.server.close();
      }

      // Close database connections
      if (this.dbManager) {
        await this.dbManager.close();
      }

      if (this.redisManager) {
        await this.redisManager.close();
      }

      logger.info('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the application
const app = new PremiumAnalyticsApp();
app.start().catch((error) => {
  logger.error('❌ Failed to start Premium Analytics Platform:', error);
  process.exit(1);
});

export default app;