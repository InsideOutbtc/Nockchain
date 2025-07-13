# Production Deployment Guide

**Complete Production Deployment Guide for NOCK Chain Bridge & DEX Integration Platform**

## 📋 Overview

This guide provides step-by-step instructions for deploying the NOCK Bridge platform to production environments. The platform supports multiple deployment strategies including Kubernetes, Docker Compose, and cloud provider-specific deployments.

### Prerequisites

- **Infrastructure**: Kubernetes 1.24+ or Docker 20.10+
- **Database**: PostgreSQL 14+ with SSL
- **Cache**: Redis 6+ with persistence
- **Storage**: 500GB+ SSD storage
- **Network**: Load balancer with SSL termination
- **Monitoring**: Prometheus/Grafana stack

---

## 🏗️ Infrastructure Requirements

### Minimum Production Requirements

| Component | CPU | Memory | Storage | Network |
|-----------|-----|--------|---------|---------|
| API Servers | 4 cores | 8GB | 100GB | 1Gbps |
| Database | 8 cores | 16GB | 500GB SSD | 10Gbps |
| Cache/Redis | 2 cores | 4GB | 50GB | 1Gbps |
| Load Balancer | 2 cores | 4GB | 20GB | 10Gbps |
| Monitoring | 4 cores | 8GB | 200GB | 1Gbps |

### Recommended Production Setup

| Component | CPU | Memory | Storage | Network |
|-----------|-----|--------|---------|---------|
| API Servers | 8 cores | 16GB | 200GB | 10Gbps |
| Database | 16 cores | 32GB | 1TB NVMe | 25Gbps |
| Cache/Redis | 4 cores | 8GB | 100GB | 10Gbps |
| Load Balancer | 4 cores | 8GB | 50GB | 25Gbps |
| Monitoring | 8 cores | 16GB | 500GB | 10Gbps |

### High Availability Setup

- **Multiple Availability Zones**: Deploy across 3+ AZs
- **Database Clustering**: PostgreSQL with read replicas
- **Redis Clustering**: Redis Cluster with 6+ nodes
- **Load Balancer**: Multi-zone load balancing
- **Auto-scaling**: Horizontal pod autoscaling

---

## 🐳 Docker Deployment

### Docker Compose Production Setup

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  # Load Balancer
  nginx:
    image: nginx:1.24-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl/certs:ro
    depends_on:
      - api-server-1
      - api-server-2
    restart: unless-stopped
    networks:
      - nock-network

  # API Servers (Multiple instances)
  api-server-1:
    image: nockbridge/api:v1.0.0
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@postgres:5432/nockbridge
      - REDIS_URL=redis://redis-cluster:6379
      - BRIDGE_WALLET_PRIVATE_KEY=${BRIDGE_WALLET_PRIVATE_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    volumes:
      - ./config/production.yml:/app/config/production.yml:ro
      - ./logs:/app/logs
    depends_on:
      - postgres
      - redis-cluster
    restart: unless-stopped
    networks:
      - nock-network
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G
        reservations:
          cpus: '2'
          memory: 4G

  api-server-2:
    image: nockbridge/api:v1.0.0
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@postgres:5432/nockbridge
      - REDIS_URL=redis://redis-cluster:6379
      - BRIDGE_WALLET_PRIVATE_KEY=${BRIDGE_WALLET_PRIVATE_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    volumes:
      - ./config/production.yml:/app/config/production.yml:ro
      - ./logs:/app/logs
    depends_on:
      - postgres
      - redis-cluster
    restart: unless-stopped
    networks:
      - nock-network
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G
        reservations:
          cpus: '2'
          memory: 4G

  # Database
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=nockbridge
      - POSTGRES_USER=nockbridge_user
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_INITDB_ARGS=--auth-local=trust --auth-host=md5
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d:ro
      - ./postgresql.conf:/etc/postgresql/postgresql.conf:ro
    ports:
      - "5432:5432"
    restart: unless-stopped
    networks:
      - nock-network
    deploy:
      resources:
        limits:
          cpus: '8'
          memory: 16G
        reservations:
          cpus: '4'
          memory: 8G

  # Redis Cluster
  redis-cluster:
    image: redis:7-alpine
    command: redis-server /etc/redis/redis.conf
    volumes:
      - redis_data:/data
      - ./redis/redis.conf:/etc/redis/redis.conf:ro
    ports:
      - "6379:6379"
    restart: unless-stopped
    networks:
      - nock-network
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G

  # Monitoring
  prometheus:
    image: prom/prometheus:v2.45.0
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    restart: unless-stopped
    networks:
      - nock-network

  grafana:
    image: grafana/grafana:10.0.0
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
      - GF_INSTALL_PLUGINS=grafana-clock-panel,grafana-simple-json-datasource
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources:ro
    ports:
      - "3000:3000"
    restart: unless-stopped
    networks:
      - nock-network

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  prometheus_data:
    driver: local
  grafana_data:
    driver: local

networks:
  nock-network:
    driver: bridge
```

### Environment Variables

Create `.env.production`:

```bash
# Application
NODE_ENV=production
API_PORT=8080
LOG_LEVEL=info

# Database
POSTGRES_PASSWORD=super_secure_postgres_password_2024
DATABASE_URL=postgresql://nockbridge_user:${POSTGRES_PASSWORD}@postgres:5432/nockbridge
DATABASE_POOL_SIZE=20
DATABASE_SSL=true

# Redis
REDIS_URL=redis://redis-cluster:6379
REDIS_PASSWORD=secure_redis_password_2024

# Security
JWT_SECRET=ultra_secure_jwt_secret_key_2024_production
ENCRYPTION_KEY=256_bit_encryption_key_for_production_2024
BRIDGE_WALLET_PRIVATE_KEY=private_key_for_bridge_wallet

# External Services
SOLANA_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
MINING_POOL_API_ENDPOINT=https://pool.nockchain.com/api
MINING_POOL_API_KEY=mining_pool_api_key_production

# Monitoring
GRAFANA_PASSWORD=secure_grafana_admin_password_2024
ENABLE_METRICS=true
METRICS_PORT=9090

# Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
EMAIL_SMTP_HOST=smtp.production-email.com
EMAIL_SMTP_USER=alerts@nockchain.com
EMAIL_SMTP_PASS=email_password_2024

# SSL Certificates
SSL_CERT_PATH=/etc/ssl/certs/nockbridge.crt
SSL_KEY_PATH=/etc/ssl/private/nockbridge.key
```

### Nginx Configuration

Create `nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream api_servers {
        least_conn;
        server api-server-1:8080 max_fails=3 fail_timeout=30s;
        server api-server-2:8080 max_fails=3 fail_timeout=30s;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/s;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";

    # Main API Server
    server {
        listen 443 ssl http2;
        server_name api.nockbridge.com;

        ssl_certificate /etc/ssl/certs/nockbridge.crt;
        ssl_certificate_key /etc/ssl/private/nockbridge.key;

        # API Routes
        location /v1/ {
            limit_req zone=api burst=50 nodelay;
            proxy_pass http://api_servers;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # Authentication Routes (stricter rate limiting)
        location /v1/auth/ {
            limit_req zone=auth burst=10 nodelay;
            proxy_pass http://api_servers;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket Support
        location /v1/ws/ {
            proxy_pass http://api_servers;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
        }

        # Health Check
        location /health {
            proxy_pass http://api_servers;
            access_log off;
        }
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name api.nockbridge.com;
        return 301 https://$server_name$request_uri;
    }
}
```

### Deployment Commands

```bash
# Create production directory
mkdir -p /opt/nockbridge/production
cd /opt/nockbridge/production

# Copy configuration files
cp docker-compose.prod.yml .
cp .env.production .env
cp -r nginx/ .
cp -r config/ .
cp -r monitoring/ .

# Generate SSL certificates (if not using external CA)
openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
  -keyout ssl/nockbridge.key \
  -out ssl/nockbridge.crt \
  -subj "/CN=api.nockbridge.com"

# Start production deployment
docker-compose -f docker-compose.prod.yml up -d

# Verify deployment
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f api-server-1
```

---

## ☸️ Kubernetes Deployment

### Namespace and RBAC

Create `k8s/namespace.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: nockbridge
  labels:
    name: nockbridge
    environment: production
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: nockbridge-api
  namespace: nockbridge
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: nockbridge-api
rules:
- apiGroups: [""]
  resources: ["pods", "services", "endpoints"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: nockbridge-api
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: nockbridge-api
subjects:
- kind: ServiceAccount
  name: nockbridge-api
  namespace: nockbridge
```

### ConfigMap and Secrets

Create `k8s/configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nockbridge-config
  namespace: nockbridge
data:
  NODE_ENV: "production"
  API_PORT: "8080"
  LOG_LEVEL: "info"
  DATABASE_POOL_SIZE: "20"
  DATABASE_SSL: "true"
  ENABLE_METRICS: "true"
  METRICS_PORT: "9090"
  SOLANA_RPC_ENDPOINT: "https://api.mainnet-beta.solana.com"
  MINING_POOL_API_ENDPOINT: "https://pool.nockchain.com/api"
---
apiVersion: v1
kind: Secret
metadata:
  name: nockbridge-secrets
  namespace: nockbridge
type: Opaque
data:
  # Base64 encoded secrets
  POSTGRES_PASSWORD: c3VwZXJfc2VjdXJlX3Bvc3RncmVzX3Bhc3N3b3JkXzIwMjQ=
  JWT_SECRET: dWx0cmFfc2VjdXJlX2p3dF9zZWNyZXRfa2V5XzIwMjRfcHJvZHVjdGlvbg==
  ENCRYPTION_KEY: MjU2X2JpdF9lbmNyeXB0aW9uX2tleV9mb3JfcHJvZHVjdGlvbl8yMDI0
  BRIDGE_WALLET_PRIVATE_KEY: cHJpdmF0ZV9rZXlfZm9yX2JyaWRnZV93YWxsZXQ=
  MINING_POOL_API_KEY: bWluaW5nX3Bvb2xfYXBpX2tleV9wcm9kdWN0aW9u
```

### Database Deployment

Create `k8s/postgres.yaml`:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: nockbridge
spec:
  serviceName: postgres-service
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: "nockbridge"
        - name: POSTGRES_USER
          value: "nockbridge_user"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: nockbridge-secrets
              key: POSTGRES_PASSWORD
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        - name: postgres-config
          mountPath: /etc/postgresql/postgresql.conf
          subPath: postgresql.conf
        resources:
          requests:
            memory: "8Gi"
            cpu: "4"
          limits:
            memory: "16Gi"
            cpu: "8"
        livenessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - nockbridge_user
            - -d
            - nockbridge
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - nockbridge_user
            - -d
            - nockbridge
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: postgres-config
        configMap:
          name: postgres-config
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: "fast-ssd"
      resources:
        requests:
          storage: 1Ti
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: nockbridge
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
  type: ClusterIP
```

### API Deployment

Create `k8s/api-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nockbridge-api
  namespace: nockbridge
  labels:
    app: nockbridge-api
    version: v1.0.0
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: nockbridge-api
  template:
    metadata:
      labels:
        app: nockbridge-api
        version: v1.0.0
    spec:
      serviceAccountName: nockbridge-api
      containers:
      - name: api
        image: nockbridge/api:v1.0.0
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9090
          name: metrics
        envFrom:
        - configMapRef:
            name: nockbridge-config
        - secretRef:
            name: nockbridge-secrets
        env:
        - name: DATABASE_URL
          value: "postgresql://nockbridge_user:$(POSTGRES_PASSWORD)@postgres-service:5432/nockbridge"
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        resources:
          requests:
            memory: "4Gi"
            cpu: "2"
          limits:
            memory: "8Gi"
            cpu: "4"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        volumeMounts:
        - name: app-logs
          mountPath: /app/logs
        - name: ssl-certs
          mountPath: /etc/ssl/certs
          readOnly: true
      volumes:
      - name: app-logs
        emptyDir: {}
      - name: ssl-certs
        secret:
          secretName: nockbridge-ssl-certs
      imagePullSecrets:
      - name: docker-registry-secret
---
apiVersion: v1
kind: Service
metadata:
  name: nockbridge-api-service
  namespace: nockbridge
  labels:
    app: nockbridge-api
spec:
  selector:
    app: nockbridge-api
  ports:
  - name: http
    port: 80
    targetPort: 8080
  - name: metrics
    port: 9090
    targetPort: 9090
  type: ClusterIP
```

### Horizontal Pod Autoscaler

Create `k8s/hpa.yaml`:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nockbridge-api-hpa
  namespace: nockbridge
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nockbridge-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      - type: Pods
        value: 4
        periodSeconds: 15
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
      selectPolicy: Max
```

### Ingress Configuration

Create `k8s/ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nockbridge-ingress
  namespace: nockbridge
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    nginx.ingress.kubernetes.io/ssl-protocols: "TLSv1.2 TLSv1.3"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "30"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "30"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "30"
spec:
  tls:
  - hosts:
    - api.nockbridge.com
    secretName: nockbridge-tls
  rules:
  - host: api.nockbridge.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: nockbridge-api-service
            port:
              number: 80
```

### Deployment Commands

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/api-deployment.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/ingress.yaml

# Verify deployment
kubectl get pods -n nockbridge
kubectl get services -n nockbridge
kubectl get ingress -n nockbridge

# Check logs
kubectl logs -f deployment/nockbridge-api -n nockbridge

# Monitor HPA
kubectl get hpa -n nockbridge -w
```

---

## 🔍 Monitoring Setup

### Prometheus Configuration

Create `monitoring/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'nockbridge-api'
    static_configs:
      - targets: ['api-server-1:9090', 'api-server-2:9090']
    metrics_path: /metrics
    scrape_interval: 30s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-cluster:9121']

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:9113']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
```

### Alert Rules

Create `monitoring/alert_rules.yml`:

```yaml
groups:
- name: nockbridge.rules
  rules:
  - alert: HighResponseTime
    expr: http_request_duration_seconds{quantile="0.95"} > 1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High response time detected"
      description: "95th percentile response time is {{ $value }}s"

  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value | humanizePercentage }}"

  - alert: DatabaseDown
    expr: up{job="postgres"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Database is down"
      description: "PostgreSQL database is not responding"

  - alert: HighCPUUsage
    expr: rate(process_cpu_seconds_total[5m]) * 100 > 80
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "High CPU usage"
      description: "CPU usage is {{ $value | humanizePercentage }}"

  - alert: HighMemoryUsage
    expr: process_resident_memory_bytes / (1024*1024*1024) > 6
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High memory usage"
      description: "Memory usage is {{ $value }}GB"

  - alert: BridgeValidatorDown
    expr: bridge_validators_active < bridge_validators_required
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Bridge validator down"
      description: "Active validators: {{ $value }}, Required: {{ $bridge_validators_required }}"
```

---

## 🔐 Security Configuration

### SSL/TLS Setup

```bash
# Generate production SSL certificate with Let's Encrypt
certbot certonly --nginx \
  --email admin@nockchain.com \
  --agree-tos \
  --non-interactive \
  --domains api.nockbridge.com

# Or use existing certificate
cp /path/to/certificate.crt ssl/nockbridge.crt
cp /path/to/private.key ssl/nockbridge.key
chmod 600 ssl/nockbridge.key
```

### Database Security

Create `postgresql.conf`:

```bash
# Connection settings
listen_addresses = '*'
port = 5432
max_connections = 200

# SSL Configuration
ssl = on
ssl_cert_file = '/etc/ssl/certs/server.crt'
ssl_key_file = '/etc/ssl/private/server.key'
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'
ssl_prefer_server_ciphers = on
ssl_protocols = 'TLSv1.2,TLSv1.3'

# Security
password_encryption = scram-sha-256
log_connections = on
log_disconnections = on
log_checkpoints = on
log_statement = 'all'

# Performance
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 256MB
maintenance_work_mem = 2GB
```

### Redis Security

Create `redis/redis.conf`:

```bash
# Network
bind 127.0.0.1 ::1
port 6379
protected-mode yes

# Authentication
requirepass secure_redis_password_2024

# SSL/TLS
tls-port 6380
tls-cert-file /etc/ssl/certs/redis.crt
tls-key-file /etc/ssl/private/redis.key
tls-protocols "TLSv1.2 TLSv1.3"

# Security
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""
rename-command CONFIG "CONFIG_b835a9af2c5a5a5a5"

# Persistence
save 900 1
save 300 10
save 60 10000
dir /data
```

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] Infrastructure provisioned and configured
- [ ] SSL certificates obtained and validated
- [ ] Database setup with proper permissions
- [ ] Redis cluster configured and secured
- [ ] Load balancer configured with health checks
- [ ] Monitoring stack deployed and configured
- [ ] Backup strategy implemented
- [ ] Security scan completed
- [ ] Performance baseline established

### Deployment Steps

- [ ] Deploy database and verify connectivity
- [ ] Deploy Redis and verify clustering
- [ ] Deploy API servers with health checks
- [ ] Configure load balancer and SSL termination
- [ ] Deploy monitoring and alerting
- [ ] Run smoke tests
- [ ] Configure auto-scaling
- [ ] Set up log aggregation
- [ ] Configure backup jobs
- [ ] Update DNS records

### Post-Deployment

- [ ] Verify all services are healthy
- [ ] Test API endpoints
- [ ] Validate bridge operations
- [ ] Test trading functionality
- [ ] Verify monitoring and alerts
- [ ] Test auto-scaling behavior
- [ ] Validate backup and restore
- [ ] Performance testing
- [ ] Security testing
- [ ] Documentation updated

---

## 🔄 Maintenance & Updates

### Rolling Updates

```bash
# Docker Compose rolling update
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --no-deps api-server-1
# Verify health, then update next server
docker-compose -f docker-compose.prod.yml up -d --no-deps api-server-2

# Kubernetes rolling update
kubectl set image deployment/nockbridge-api api=nockbridge/api:v1.1.0 -n nockbridge
kubectl rollout status deployment/nockbridge-api -n nockbridge
```

### Database Migrations

```bash
# Run database migrations
kubectl exec -it postgres-0 -n nockbridge -- psql -U nockbridge_user -d nockbridge
\i /migrations/v1.1.0.sql

# Verify migration
kubectl exec -it deployment/nockbridge-api -n nockbridge -- npm run db:verify
```

### Backup Procedures

```bash
# Database backup
kubectl exec -it postgres-0 -n nockbridge -- pg_dump \
  -U nockbridge_user -d nockbridge \
  | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Redis backup
kubectl exec -it redis-0 -n nockbridge -- redis-cli BGSAVE
kubectl cp redis-0:/data/dump.rdb ./redis_backup_$(date +%Y%m%d_%H%M%S).rdb -n nockbridge
```

---

## 📞 Support & Troubleshooting

### Common Issues

1. **High Response Times**
   - Check database query performance
   - Verify Redis cache hit rates
   - Monitor CPU and memory usage
   - Check network latency

2. **Bridge Transaction Failures**
   - Verify validator health
   - Check blockchain connectivity
   - Validate wallet balances
   - Monitor gas prices

3. **Database Connection Issues**
   - Check connection pool settings
   - Verify database health
   - Monitor connection counts
   - Check SSL configuration

### Emergency Procedures

1. **Service Outage**
   ```bash
   # Emergency scaling
   kubectl scale deployment nockbridge-api --replicas=10 -n nockbridge
   
   # Restart services
   kubectl rollout restart deployment/nockbridge-api -n nockbridge
   ```

2. **Database Issues**
   ```bash
   # Emergency read-only mode
   kubectl patch deployment nockbridge-api -p '{"spec":{"template":{"spec":{"containers":[{"name":"api","env":[{"name":"READ_ONLY_MODE","value":"true"}]}]}}}}' -n nockbridge
   ```

### Contact Information

- **Infrastructure Team**: infrastructure@nockchain.com
- **On-call Engineer**: +1-555-NOCK-911
- **Status Page**: https://status.nockbridge.com
- **Emergency Slack**: #emergency-response

---

**Last Updated**: July 7, 2024
**Deployment Version**: v1.0.0
**Documentation Version**: 1.0.0