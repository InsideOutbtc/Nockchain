// Web dashboard for monitoring metrics and alerts
// Provides real-time visualization and alert management interface

import express, { Router } from 'express'
import path from 'path'
import { MetricsCollector } from '../metrics/collector'
import { AlertManager } from '../alerts/manager'
import { Logger } from '../utils/logger'

const logger = Logger.getInstance()

export class Dashboard {
  private router: Router
  private metricsCollector: MetricsCollector
  private alertManager: AlertManager

  constructor(metricsCollector: MetricsCollector, alertManager: AlertManager) {
    this.router = Router()
    this.metricsCollector = metricsCollector
    this.alertManager = alertManager
    this.setupRoutes()
  }

  private setupRoutes() {
    // Serve static dashboard files
    this.router.use('/static', express.static(path.join(__dirname, 'static')))

    // Dashboard home page
    this.router.get('/', (req, res) => {
      res.send(this.generateDashboardHTML())
    })

    // API endpoints for dashboard data
    this.router.get('/api/metrics', async (req, res) => {
      try {
        const metrics = await this.metricsCollector.getCurrentMetrics()
        res.json(metrics)
      } catch (error) {
        logger.error('Failed to get metrics for dashboard', error)
        res.status(500).json({ error: 'Failed to get metrics' })
      }
    })

    this.router.get('/api/alerts', async (req, res) => {
      try {
        const alerts = await this.alertManager.getActiveAlerts()
        res.json(alerts)
      } catch (error) {
        logger.error('Failed to get alerts for dashboard', error)
        res.status(500).json({ error: 'Failed to get alerts' })
      }
    })

    this.router.get('/api/alerts/history', async (req, res) => {
      try {
        const limit = parseInt(req.query.limit as string) || 50
        const history = await this.alertManager.getAlertHistory(limit)
        res.json(history)
      } catch (error) {
        logger.error('Failed to get alert history', error)
        res.status(500).json({ error: 'Failed to get alert history' })
      }
    })

    this.router.post('/api/alerts/:id/acknowledge', async (req, res) => {
      try {
        const { id } = req.params
        const { user } = req.body
        
        const success = await this.alertManager.acknowledgeAlert(id, user || 'dashboard')
        
        if (success) {
          res.json({ success: true })
        } else {
          res.status(404).json({ error: 'Alert not found' })
        }
      } catch (error) {
        logger.error('Failed to acknowledge alert', error)
        res.status(500).json({ error: 'Failed to acknowledge alert' })
      }
    })

    this.router.post('/api/alerts/:id/resolve', async (req, res) => {
      try {
        const { id } = req.params
        
        const success = await this.alertManager.resolveAlert(id)
        
        if (success) {
          res.json({ success: true })
        } else {
          res.status(404).json({ error: 'Alert not found' })
        }
      } catch (error) {
        logger.error('Failed to resolve alert', error)
        res.status(500).json({ error: 'Failed to resolve alert' })
      }
    })

    this.router.get('/api/rules', async (req, res) => {
      try {
        const rules = await this.alertManager.getAlertRules()
        res.json(rules)
      } catch (error) {
        logger.error('Failed to get alert rules', error)
        res.status(500).json({ error: 'Failed to get alert rules' })
      }
    })
  }

  private generateDashboardHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nockchain Mining Pool Monitor</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            background: #0a0e27;
            color: #ffffff;
            line-height: 1.6;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 1rem 2rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }

        .header h1 {
            font-size: 2rem;
            font-weight: 700;
        }

        .header p {
            opacity: 0.9;
            margin-top: 0.5rem;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
        }

        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
        }

        .card {
            background: #1a1f36;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            border: 1px solid #2d3748;
        }

        .card h3 {
            color: #667eea;
            margin-bottom: 1rem;
            font-size: 1.2rem;
        }

        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem 0;
            border-bottom: 1px solid #2d3748;
        }

        .metric:last-child {
            border-bottom: none;
        }

        .metric-label {
            color: #a0aec0;
        }

        .metric-value {
            font-weight: 600;
            font-size: 1.1rem;
        }

        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }

        .status-healthy { background: #48bb78; }
        .status-warning { background: #ed8936; }
        .status-critical { background: #f56565; }

        .alert {
            background: #2d1b69;
            border-left: 4px solid #667eea;
            padding: 1rem;
            margin: 0.5rem 0;
            border-radius: 4px;
        }

        .alert.warning {
            background: #2d2315;
            border-left-color: #ed8936;
        }

        .alert.critical {
            background: #2d1515;
            border-left-color: #f56565;
        }

        .alert-title {
            font-weight: 600;
            margin-bottom: 0.5rem;
        }

        .alert-description {
            color: #a0aec0;
            font-size: 0.9rem;
        }

        .alert-meta {
            display: flex;
            justify-content: space-between;
            margin-top: 0.5rem;
            font-size: 0.8rem;
            color: #718096;
        }

        .btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: background 0.2s;
        }

        .btn:hover {
            background: #5a67d8;
        }

        .btn-small {
            padding: 0.25rem 0.5rem;
            font-size: 0.8rem;
        }

        .loading {
            text-align: center;
            color: #a0aec0;
            padding: 2rem;
        }

        .refresh-indicator {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #667eea;
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.8rem;
            opacity: 0;
            transition: opacity 0.3s;
        }

        .refresh-indicator.show {
            opacity: 1;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .pulse {
            animation: pulse 2s infinite;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔗 Nockchain Mining Pool Monitor</h1>
        <p>Real-time monitoring and alerting for mining pool operations</p>
    </div>

    <div class="refresh-indicator" id="refreshIndicator">
        Updating...
    </div>

    <div class="container">
        <div class="dashboard-grid">
            <div class="card">
                <h3>📊 Pool Metrics</h3>
                <div id="poolMetrics" class="loading">Loading metrics...</div>
            </div>

            <div class="card">
                <h3>💻 System Health</h3>
                <div id="systemHealth" class="loading">Loading health status...</div>
            </div>

            <div class="card">
                <h3>🚨 Active Alerts</h3>
                <div id="activeAlerts" class="loading">Loading alerts...</div>
            </div>

            <div class="card">
                <h3>📈 Business Metrics</h3>
                <div id="businessMetrics" class="loading">Loading business data...</div>
            </div>
        </div>

        <div class="card">
            <h3>📋 Recent Alert History</h3>
            <div id="alertHistory" class="loading">Loading alert history...</div>
        </div>
    </div>

    <script>
        let websocket = null;
        let isConnected = false;

        function connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = \`\${protocol}//\${window.location.host}\`;
            
            websocket = new WebSocket(wsUrl);
            
            websocket.onopen = function() {
                isConnected = true;
                console.log('Connected to monitoring WebSocket');
            };
            
            websocket.onmessage = function(event) {
                const data = JSON.parse(event.data);
                if (data.type === 'metrics_update') {
                    updateDashboard(data.data);
                    showRefreshIndicator();
                }
            };
            
            websocket.onclose = function() {
                isConnected = false;
                console.log('Disconnected from monitoring WebSocket');
                setTimeout(connectWebSocket, 5000); // Reconnect after 5 seconds
            };
            
            websocket.onerror = function(error) {
                console.error('WebSocket error:', error);
            };
        }

        function showRefreshIndicator() {
            const indicator = document.getElementById('refreshIndicator');
            indicator.classList.add('show');
            setTimeout(() => {
                indicator.classList.remove('show');
            }, 1000);
        }

        function updateDashboard(data) {
            updatePoolMetrics(data.metrics?.pool);
            updateSystemHealth(data.health);
            updateActiveAlerts(data.alerts);
            updateBusinessMetrics(data.metrics?.business);
        }

        function updatePoolMetrics(poolData) {
            const container = document.getElementById('poolMetrics');
            if (!poolData) {
                container.innerHTML = '<div class="loading">No pool data available</div>';
                return;
            }

            container.innerHTML = \`
                <div class="metric">
                    <span class="metric-label">Total Hashrate</span>
                    <span class="metric-value">\${formatHashrate(poolData.totalHashrate || 0)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Active Miners</span>
                    <span class="metric-value">\${poolData.activeMiners || 0}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Pool Efficiency</span>
                    <span class="metric-value">\${(poolData.efficiency || 0).toFixed(2)}%</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Blocks Found</span>
                    <span class="metric-value">\${poolData.blocksFound || 0}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Uptime</span>
                    <span class="metric-value">\${(poolData.uptime || 0).toFixed(1)}%</span>
                </div>
            \`;
        }

        function updateSystemHealth(healthData) {
            const container = document.getElementById('systemHealth');
            if (!healthData) {
                container.innerHTML = '<div class="loading">No health data available</div>';
                return;
            }

            const statusClass = healthData.overall === 'healthy' ? 'status-healthy' : 
                               healthData.overall === 'degraded' ? 'status-warning' : 'status-critical';

            let checksHtml = '';
            if (healthData.checks) {
                checksHtml = healthData.checks.map(check => {
                    const checkStatusClass = check.status === 'healthy' ? 'status-healthy' : 
                                           check.status === 'degraded' ? 'status-warning' : 'status-critical';
                    return \`
                        <div class="metric">
                            <span class="metric-label">
                                <span class="status-indicator \${checkStatusClass}"></span>
                                \${check.name}
                            </span>
                            <span class="metric-value">\${check.responseTime}ms</span>
                        </div>
                    \`;
                }).join('');
            }

            container.innerHTML = \`
                <div class="metric">
                    <span class="metric-label">Overall Status</span>
                    <span class="metric-value">
                        <span class="status-indicator \${statusClass}"></span>
                        \${healthData.overall}
                    </span>
                </div>
                <div class="metric">
                    <span class="metric-label">Uptime</span>
                    <span class="metric-value">\${formatDuration(healthData.uptime || 0)}</span>
                </div>
                \${checksHtml}
            \`;
        }

        function updateActiveAlerts(alertsData) {
            const container = document.getElementById('activeAlerts');
            if (!alertsData || alertsData.length === 0) {
                container.innerHTML = '<div style="color: #48bb78; text-align: center; padding: 1rem;">✅ No active alerts</div>';
                return;
            }

            const alertsHtml = alertsData.map(alert => \`
                <div class="alert \${alert.severity}">
                    <div class="alert-title">\${alert.title}</div>
                    <div class="alert-description">\${alert.description}</div>
                    <div class="alert-meta">
                        <span>\${alert.severity.toUpperCase()} • \${alert.category}</span>
                        <span>\${new Date(alert.timestamp).toLocaleTimeString()}</span>
                    </div>
                </div>
            \`).join('');

            container.innerHTML = alertsHtml;
        }

        function updateBusinessMetrics(businessData) {
            const container = document.getElementById('businessMetrics');
            if (!businessData) {
                container.innerHTML = '<div class="loading">No business data available</div>';
                return;
            }

            container.innerHTML = \`
                <div class="metric">
                    <span class="metric-label">Total Payouts</span>
                    <span class="metric-value">\${businessData.totalPayouts || 0}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Total Paid</span>
                    <span class="metric-value">\${businessData.totalPaid || 0} NOCK</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Pending Payouts</span>
                    <span class="metric-value">\${businessData.pendingPayouts || 0}</span>
                </div>
            \`;
        }

        function formatHashrate(hashrate) {
            if (hashrate === 0) return '0 H/s';
            
            const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s'];
            let unitIndex = 0;
            let value = hashrate;
            
            while (value >= 1000 && unitIndex < units.length - 1) {
                value /= 1000;
                unitIndex++;
            }
            
            return \`\${value.toFixed(2)} \${units[unitIndex]}\`;
        }

        function formatDuration(ms) {
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (days > 0) return \`\${days}d \${hours % 24}h\`;
            if (hours > 0) return \`\${hours}h \${minutes % 60}m\`;
            if (minutes > 0) return \`\${minutes}m \${seconds % 60}s\`;
            return \`\${seconds}s\`;
        }

        // Load initial data
        async function loadInitialData() {
            try {
                const [metricsResponse, alertsResponse, healthResponse] = await Promise.all([
                    fetch('/dashboard/api/metrics'),
                    fetch('/dashboard/api/alerts'),
                    fetch('/health')
                ]);

                const metrics = await metricsResponse.json();
                const alerts = await alertsResponse.json();
                const health = await healthResponse.json();

                updateDashboard({
                    metrics,
                    alerts,
                    health
                });
            } catch (error) {
                console.error('Failed to load initial data:', error);
            }
        }

        // Load alert history
        async function loadAlertHistory() {
            try {
                const response = await fetch('/dashboard/api/alerts/history');
                const history = await response.json();
                
                const container = document.getElementById('alertHistory');
                if (history.length === 0) {
                    container.innerHTML = '<div style="color: #a0aec0; text-align: center; padding: 1rem;">No recent alerts</div>';
                    return;
                }

                const historyHtml = history.map(alert => \`
                    <div class="alert \${alert.severity}">
                        <div class="alert-title">\${alert.title}</div>
                        <div class="alert-description">\${alert.description}</div>
                        <div class="alert-meta">
                            <span>\${alert.severity.toUpperCase()} • \${alert.category} • \${alert.status}</span>
                            <span>\${new Date(alert.timestamp).toLocaleString()}</span>
                        </div>
                    </div>
                \`).join('');

                container.innerHTML = historyHtml;
            } catch (error) {
                console.error('Failed to load alert history:', error);
            }
        }

        // Initialize dashboard
        document.addEventListener('DOMContentLoaded', function() {
            loadInitialData();
            loadAlertHistory();
            connectWebSocket();
            
            // Refresh data every 30 seconds as fallback
            setInterval(loadInitialData, 30000);
        });
    </script>
</body>
</html>
    `
  }

  public getRouter(): Router {
    return this.router
  }
}