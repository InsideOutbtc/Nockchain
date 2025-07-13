// Endpoint Hardening - Comprehensive API endpoint security and protection

import { Logger } from '../utils/logger';
import { AdvancedSecurityManager } from './advanced-security-manager';
import * as rateLimit from 'express-rate-limit';
import * as helmet from 'helmet';

export interface EndpointSecurityConfig {
  // Rate limiting
  rateLimiting: {
    global: {
      windowMs: number;
      max: number;
      message: string;
      standardHeaders: boolean;
      legacyHeaders: boolean;
    };
    
    perEndpoint: {
      [endpoint: string]: {
        windowMs: number;
        max: number;
        skipSuccessfulRequests: boolean;
        skipFailedRequests: boolean;
        keyGenerator?: (req: any) => string;
      };
    };
    
    premium: {
      multiplier: number;
      tierBased: boolean;
    };
  };
  
  // Input validation
  validation: {
    enableStrictValidation: boolean;
    maxRequestSize: number;
    maxFieldLength: number;
    allowedMimeTypes: string[];
    enableSanitization: boolean;
    
    rules: {
      [endpoint: string]: {
        method: string;
        schema: any;
        required: string[];
        optional: string[];
        forbidden: string[];
      };
    };
  };
  
  // Security headers
  headers: {
    enableHSTS: boolean;
    hstsMaxAge: number;
    enableCSP: boolean;
    cspPolicy: string;
    enableXFrameOptions: boolean;
    enableXSSProtection: boolean;
    enableContentTypeNoSniff: boolean;
    enableReferrerPolicy: boolean;
    customHeaders: { [key: string]: string };
  };
  
  // Authentication requirements
  authentication: {
    publicEndpoints: string[];
    requireApiKey: string[];
    requireJWT: string[];
    requireMFA: string[];
    requireCertificate: string[];
    
    apiKeyValidation: {
      enableScopeValidation: boolean;
      enableRateLimitBinding: boolean;
      enableIPBinding: boolean;
      enableTimeRestriction: boolean;
    };
  };
  
  // Request filtering
  filtering: {
    enableIPFiltering: boolean;
    enableGeoFiltering: boolean;
    enableUserAgentFiltering: boolean;
    enablePayloadFiltering: boolean;
    
    blockedPatterns: {
      userAgents: string[];
      payloadPatterns: string[];
      headerPatterns: string[];
    };
    
    allowedCountries: string[];
    blockedCountries: string[];
  };
  
  // Response security
  response: {
    enableDataMinimization: boolean;
    enableErrorSanitization: boolean;
    enableResponseSigning: boolean;
    maxResponseSize: number;
    enableCompression: boolean;
    compressionLevel: number;
  };
}

export interface EndpointMetrics {
  endpoint: string;
  method: string;
  totalRequests: number;
  blockedRequests: number;
  authenticatedRequests: number;
  averageResponseTime: number;
  errorRate: number;
  lastActivity: number;
  securityIncidents: number;
  rateLimitHits: number;
}

export interface SecurityIncident {
  id: string;
  timestamp: number;
  endpoint: string;
  method: string;
  sourceIP: string;
  userAgent: string;
  incidentType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  blocked: boolean;
  details: any;
  response: string;
}

export class EndpointHardening {
  private config: EndpointSecurityConfig;
  private logger: Logger;
  private securityManager: AdvancedSecurityManager;
  
  // Security state
  private endpointMetrics: Map<string, EndpointMetrics>;
  private securityIncidents: SecurityIncident[];
  private rateLimiters: Map<string, any>;
  private validationSchemas: Map<string, any>;
  
  // Real-time monitoring
  private activeConnections: Map<string, any>;
  private suspiciousActivity: Map<string, any>;

  constructor(config: EndpointSecurityConfig, securityManager: AdvancedSecurityManager) {
    this.config = config;
    this.logger = new Logger('EndpointHardening');
    this.securityManager = securityManager;
    
    this.endpointMetrics = new Map();
    this.securityIncidents = [];
    this.rateLimiters = new Map();
    this.validationSchemas = new Map();
    this.activeConnections = new Map();
    this.suspiciousActivity = new Map();
    
    this.initializeSecurityMiddleware();
    this.initializeValidationSchemas();
    this.startSecurityMonitoring();
  }

  createSecurityMiddleware() {
    return {
      // Global security headers
      securityHeaders: helmet({
        hsts: {
          maxAge: this.config.headers.hstsMaxAge,
          includeSubDomains: true,
          preload: true
        },
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          }
        },
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" },
        dnsPrefetchControl: true,
        frameguard: { action: 'deny' },
        hidePoweredBy: true,
        ieNoOpen: true,
        noSniff: true,
        originAgentCluster: true,
        permittedCrossDomainPolicies: false,
        referrerPolicy: { policy: "no-referrer" },
        xssFilter: true
      }),
      
      // Global rate limiting
      globalRateLimit: rateLimit({
        windowMs: this.config.rateLimiting.global.windowMs,
        max: this.config.rateLimiting.global.max,
        message: this.config.rateLimiting.global.message,
        standardHeaders: this.config.rateLimiting.global.standardHeaders,
        legacyHeaders: this.config.rateLimiting.global.legacyHeaders,
        keyGenerator: (req: any) => {
          // Use IP + User ID for authenticated requests
          return req.user ? `${req.ip}:${req.user.id}` : req.ip;
        },
        skip: (req: any) => {
          // Skip rate limiting for health checks
          return req.path === '/health';
        },
        onLimitReached: (req: any) => {
          this.recordSecurityIncident({
            endpoint: req.path,
            method: req.method,
            sourceIP: req.ip,
            userAgent: req.get('User-Agent'),
            incidentType: 'rate_limit_exceeded',
            severity: 'medium',
            blocked: true,
            details: { limit: this.config.rateLimiting.global.max }
          });
        }
      }),
      
      // Request validation and filtering
      requestValidation: async (req: any, res: any, next: any) => {
        try {
          await this.validateRequest(req);
          next();
        } catch (error) {
          this.logger.warn('Request validation failed', {
            endpoint: req.path,
            method: req.method,
            ip: req.ip,
            error: error.message
          });
          
          this.recordSecurityIncident({
            endpoint: req.path,
            method: req.method,
            sourceIP: req.ip,
            userAgent: req.get('User-Agent'),
            incidentType: 'validation_failure',
            severity: 'medium',
            blocked: true,
            details: { error: error.message }
          });
          
          res.status(400).json({ error: 'Invalid request' });
        }
      },
      
      // Authentication middleware
      authentication: async (req: any, res: any, next: any) => {
        try {
          await this.authenticateRequest(req);
          next();
        } catch (error) {
          this.logger.warn('Authentication failed', {
            endpoint: req.path,
            method: req.method,
            ip: req.ip,
            error: error.message
          });
          
          this.recordSecurityIncident({
            endpoint: req.path,
            method: req.method,
            sourceIP: req.ip,
            userAgent: req.get('User-Agent'),
            incidentType: 'authentication_failure',
            severity: 'high',
            blocked: true,
            details: { error: error.message }
          });
          
          res.status(401).json({ error: 'Authentication required' });
        }
      },
      
      // Threat detection
      threatDetection: async (req: any, res: any, next: any) => {
        const threatAnalysis = await this.securityManager.detectThreats({
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: req.path,
          method: req.method,
          payload: req.body,
          headers: req.headers,
          userId: req.user?.id
        });
        
        if (threatAnalysis.blocked) {
          this.recordSecurityIncident({
            endpoint: req.path,
            method: req.method,
            sourceIP: req.ip,
            userAgent: req.get('User-Agent'),
            incidentType: 'threat_detected',
            severity: threatAnalysis.threatLevel as any,
            blocked: true,
            details: {
              threats: threatAnalysis.threats,
              riskScore: threatAnalysis.riskScore,
              actions: threatAnalysis.actions
            }
          });
          
          res.status(403).json({ error: 'Request blocked for security reasons' });
          return;
        }
        
        // Add threat info to request for logging
        req.securityContext = threatAnalysis;
        next();
      },
      
      // Response security
      responseSecurity: (req: any, res: any, next: any) => {
        // Add custom security headers
        Object.entries(this.config.headers.customHeaders).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
        
        // Override res.json to add response security
        const originalJson = res.json;
        res.json = (data: any) => {
          // Data minimization
          if (this.config.response.enableDataMinimization) {
            data = this.minimizeResponseData(data, req.user?.permissions || []);
          }
          
          // Error sanitization
          if (this.config.response.enableErrorSanitization && data.error) {
            data.error = this.sanitizeError(data.error);
          }
          
          // Response signing
          if (this.config.response.enableResponseSigning) {
            data._signature = this.signResponse(data, req.path);
          }
          
          return originalJson.call(res, data);
        };
        
        next();
      }
    };
  }

  createEndpointSpecificRateLimit(endpoint: string) {
    const endpointConfig = this.config.rateLimiting.perEndpoint[endpoint];
    if (!endpointConfig) {
      return null;
    }
    
    return rateLimit({
      windowMs: endpointConfig.windowMs,
      max: endpointConfig.max,
      skipSuccessfulRequests: endpointConfig.skipSuccessfulRequests,
      skipFailedRequests: endpointConfig.skipFailedRequests,
      keyGenerator: endpointConfig.keyGenerator || ((req: any) => req.ip),
      onLimitReached: (req: any) => {
        this.recordSecurityIncident({
          endpoint: req.path,
          method: req.method,
          sourceIP: req.ip,
          userAgent: req.get('User-Agent'),
          incidentType: 'endpoint_rate_limit',
          severity: 'medium',
          blocked: true,
          details: { limit: endpointConfig.max, window: endpointConfig.windowMs }
        });
      }
    });
  }

  async validateRequest(req: any): Promise<void> {
    const endpoint = req.path;
    const method = req.method;
    
    // Check request size
    if (req.headers['content-length'] && 
        parseInt(req.headers['content-length']) > this.config.validation.maxRequestSize) {
      throw new Error('Request too large');
    }
    
    // Check content type
    if (req.headers['content-type'] && 
        !this.config.validation.allowedMimeTypes.includes(req.headers['content-type'].split(';')[0])) {
      throw new Error('Invalid content type');
    }
    
    // IP filtering
    if (this.config.filtering.enableIPFiltering) {
      await this.validateIPAddress(req.ip);
    }
    
    // Geographic filtering
    if (this.config.filtering.enableGeoFiltering) {
      await this.validateGeographicLocation(req.ip);
    }
    
    // User agent filtering
    if (this.config.filtering.enableUserAgentFiltering) {
      this.validateUserAgent(req.get('User-Agent'));
    }
    
    // Schema validation
    const schema = this.validationSchemas.get(`${method}:${endpoint}`);
    if (schema) {
      await this.validateRequestSchema(req, schema);
    }
    
    // Payload filtering
    if (this.config.filtering.enablePayloadFiltering && req.body) {
      this.validatePayload(req.body);
    }
  }

  async authenticateRequest(req: any): Promise<void> {
    const endpoint = req.path;
    
    // Check if endpoint is public
    if (this.config.authentication.publicEndpoints.includes(endpoint)) {
      return;
    }
    
    // API Key authentication
    if (this.config.authentication.requireApiKey.includes(endpoint)) {
      await this.validateApiKey(req);
    }
    
    // JWT authentication
    if (this.config.authentication.requireJWT.includes(endpoint)) {
      await this.validateJWT(req);
    }
    
    // MFA requirement
    if (this.config.authentication.requireMFA.includes(endpoint)) {
      await this.validateMFA(req);
    }
    
    // Certificate authentication
    if (this.config.authentication.requireCertificate.includes(endpoint)) {
      await this.validateCertificate(req);
    }
  }

  getSecurityReport(): {
    summary: {
      totalRequests: number;
      blockedRequests: number;
      securityIncidents: number;
      topAttackedEndpoints: Array<{ endpoint: string; incidents: number }>;
      topAttackSources: Array<{ ip: string; incidents: number }>;
    };
    endpointMetrics: EndpointMetrics[];
    recentIncidents: SecurityIncident[];
    recommendations: string[];
  } {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    
    // Filter recent data
    const recentIncidents = this.securityIncidents.filter(i => i.timestamp >= last24h);
    const allMetrics = Array.from(this.endpointMetrics.values());
    
    // Calculate summary
    const totalRequests = allMetrics.reduce((sum, m) => sum + m.totalRequests, 0);
    const blockedRequests = allMetrics.reduce((sum, m) => sum + m.blockedRequests, 0);
    
    // Top attacked endpoints
    const endpointAttacks = new Map<string, number>();
    recentIncidents.forEach(incident => {
      const key = `${incident.method} ${incident.endpoint}`;
      endpointAttacks.set(key, (endpointAttacks.get(key) || 0) + 1);
    });
    
    const topAttackedEndpoints = Array.from(endpointAttacks.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([endpoint, incidents]) => ({ endpoint, incidents }));
    
    // Top attack sources
    const sourceAttacks = new Map<string, number>();
    recentIncidents.forEach(incident => {
      sourceAttacks.set(incident.sourceIP, (sourceAttacks.get(incident.sourceIP) || 0) + 1);
    });
    
    const topAttackSources = Array.from(sourceAttacks.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ip, incidents]) => ({ ip, incidents }));
    
    // Generate recommendations
    const recommendations = this.generateSecurityRecommendations(allMetrics, recentIncidents);
    
    return {
      summary: {
        totalRequests,
        blockedRequests,
        securityIncidents: recentIncidents.length,
        topAttackedEndpoints,
        topAttackSources
      },
      endpointMetrics: allMetrics,
      recentIncidents: recentIncidents.slice(0, 50), // Last 50 incidents
      recommendations
    };
  }

  private initializeSecurityMiddleware(): void {
    this.logger.info('Initializing endpoint security middleware');
    
    // Initialize rate limiters for each endpoint
    Object.keys(this.config.rateLimiting.perEndpoint).forEach(endpoint => {
      const limiter = this.createEndpointSpecificRateLimit(endpoint);
      if (limiter) {
        this.rateLimiters.set(endpoint, limiter);
      }
    });
  }

  private initializeValidationSchemas(): void {
    Object.entries(this.config.validation.rules).forEach(([endpoint, rule]) => {
      const key = `${rule.method}:${endpoint}`;
      this.validationSchemas.set(key, rule);
    });
  }

  private startSecurityMonitoring(): void {
    // Monitor endpoint metrics every minute
    setInterval(() => {
      this.updateEndpointMetrics();
    }, 60000);
    
    // Cleanup old incidents every hour
    setInterval(() => {
      this.cleanupOldIncidents();
    }, 3600000);
  }

  private recordSecurityIncident(incident: Omit<SecurityIncident, 'id' | 'timestamp' | 'response'>): void {
    const fullIncident: SecurityIncident = {
      ...incident,
      id: this.generateIncidentId(),
      timestamp: Date.now(),
      response: incident.blocked ? 'blocked' : 'allowed'
    };
    
    this.securityIncidents.push(fullIncident);
    
    // Update endpoint metrics
    const endpointKey = `${incident.method} ${incident.endpoint}`;
    const metrics = this.endpointMetrics.get(endpointKey) || this.createEmptyMetrics(endpointKey);
    metrics.securityIncidents++;
    if (incident.blocked) {
      metrics.blockedRequests++;
    }
    this.endpointMetrics.set(endpointKey, metrics);
    
    // Log high severity incidents
    if (incident.severity === 'high' || incident.severity === 'critical') {
      this.logger.error('High severity security incident', fullIncident);
    }
  }

  private createEmptyMetrics(endpointKey: string): EndpointMetrics {
    const [method, endpoint] = endpointKey.split(' ', 2);
    return {
      endpoint,
      method,
      totalRequests: 0,
      blockedRequests: 0,
      authenticatedRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      lastActivity: Date.now(),
      securityIncidents: 0,
      rateLimitHits: 0
    };
  }

  // Additional private methods (implementations would be more detailed in production)
  private async validateIPAddress(ip: string): Promise<void> {
    // IP validation logic
  }

  private async validateGeographicLocation(ip: string): Promise<void> {
    // Geographic validation logic
  }

  private validateUserAgent(userAgent: string): void {
    // User agent validation logic
  }

  private async validateRequestSchema(req: any, schema: any): Promise<void> {
    // Schema validation logic
  }

  private validatePayload(payload: any): void {
    // Payload validation logic
  }

  private async validateApiKey(req: any): Promise<void> {
    // API key validation logic
  }

  private async validateJWT(req: any): Promise<void> {
    // JWT validation logic
  }

  private async validateMFA(req: any): Promise<void> {
    // MFA validation logic
  }

  private async validateCertificate(req: any): Promise<void> {
    // Certificate validation logic
  }

  private minimizeResponseData(data: any, permissions: string[]): any {
    // Data minimization logic
    return data;
  }

  private sanitizeError(error: any): any {
    // Error sanitization logic
    return typeof error === 'string' ? 'An error occurred' : { message: 'An error occurred' };
  }

  private signResponse(data: any, endpoint: string): string {
    // Response signing logic
    return 'signature';
  }

  private updateEndpointMetrics(): void {
    // Update metrics logic
  }

  private cleanupOldIncidents(): void {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    this.securityIncidents = this.securityIncidents.filter(i => i.timestamp >= cutoff);
  }

  private generateSecurityRecommendations(metrics: EndpointMetrics[], incidents: SecurityIncident[]): string[] {
    const recommendations: string[] = [];
    
    // Analyze patterns and generate recommendations
    const highErrorEndpoints = metrics.filter(m => m.errorRate > 0.05);
    if (highErrorEndpoints.length > 0) {
      recommendations.push(`High error rate detected on ${highErrorEndpoints.length} endpoints - investigate potential attacks`);
    }
    
    const frequentlyAttacked = metrics.filter(m => m.securityIncidents > 10);
    if (frequentlyAttacked.length > 0) {
      recommendations.push(`${frequentlyAttacked.length} endpoints under frequent attack - consider additional protection`);
    }
    
    return recommendations;
  }

  private generateIncidentId(): string {
    return `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}