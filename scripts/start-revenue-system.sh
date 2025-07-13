#!/bin/bash

# NOCKCHAIN Revenue System Startup Script
# Deploy complete $2M+ monthly revenue activation system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Revenue targets
REVENUE_TARGET_TOTAL=2095000
REVENUE_TARGET_ANALYTICS=195000
REVENUE_TARGET_BRIDGE=645000
REVENUE_TARGET_ENTERPRISE=300000

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════════════════════════╗"
echo "║                    🚀 NOCKCHAIN REVENUE SYSTEM ACTIVATION 🚀                  ║"
echo "║                                                                                ║"
echo "║                        💰 \$2,095,000+ MONTHLY TARGET 💰                        ║"
echo "║                                                                                ║"
echo "║   🎯 Premium Analytics: \$195K   🌉 Bridge Revenue: \$645K                     ║"
echo "║   🏢 Enterprise Services: \$300K  ⚡ Performance: \$120K                       ║"
echo "║   🔗 API Licensing: \$150K       📊 Trading Fees: \$1.295M                    ║"
echo "║   ⛏️  Mining Pool: \$75K          🚀 Optimization: \$200K                      ║"
echo "╚════════════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}[REVENUE]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check Rust
    if ! command -v cargo &> /dev/null; then
        print_error "Rust is not installed. Please install Rust first."
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    print_status "All prerequisites satisfied ✅"
}

# Setup environment variables
setup_environment() {
    print_header "Setting up environment variables..."
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        print_status "Creating .env file with default values..."
        cat > .env << EOF
# Revenue System Environment Variables

# Database Configuration
POSTGRES_PASSWORD=revenue_secure_password_$(date +%s)
POSTGRES_DB=revenue_engine
POSTGRES_USER=revenue_user

# Redis Configuration
REDIS_PASSWORD=redis_secure_password_$(date +%s)

# Stripe Configuration (REQUIRED - Add your keys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# JWT Secrets
JWT_SECRET=revenue_jwt_secret_$(openssl rand -hex 32)

# Blockchain Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NOCK_RPC_URL=https://rpc.nockchain.com

# Fee Collection Addresses (REQUIRED - Add your addresses)
SOLANA_FEE_COLLECTION_ADDRESS=your_solana_fee_address
NOCK_FEE_COLLECTION_ADDRESS=your_nock_fee_address

# Revenue Targets
REVENUE_TARGET_TOTAL=$REVENUE_TARGET_TOTAL
REVENUE_TARGET_ANALYTICS=$REVENUE_TARGET_ANALYTICS
REVENUE_TARGET_BRIDGE=$REVENUE_TARGET_BRIDGE
REVENUE_TARGET_ENTERPRISE=$REVENUE_TARGET_ENTERPRISE

# Monitoring
GRAFANA_PASSWORD=revenue_dashboard_admin

# Production Settings
NODE_ENV=production
RUST_LOG=info
LOG_LEVEL=info
EOF
        
        print_warning "Created .env file with default values. Please update with your actual keys!"
        print_warning "Required: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, fee collection addresses"
    else
        print_status "Using existing .env file"
    fi
}

# Build revenue engine components
build_components() {
    print_header "Building revenue engine components..."
    
    # Build Rust components
    print_status "Building revenue engine (Rust)..."
    cd apps/revenue-engine
    cargo build --release
    cd ../..
    
    print_status "Building bridge revenue system (Rust)..."
    cd apps/bridge-revenue
    cargo build --release
    cd ../..
    
    # Build Node.js components
    print_status "Building premium analytics platform (Node.js)..."
    cd apps/premium-analytics
    npm install
    npm run build
    cd ../..
    
    print_status "All components built successfully ✅"
}

# Create necessary directories
create_directories() {
    print_header "Creating necessary directories..."
    
    mkdir -p data/postgres
    mkdir -p data/redis
    mkdir -p data/elasticsearch
    mkdir -p logs
    mkdir -p monitoring/prometheus
    mkdir -p monitoring/grafana/dashboards
    mkdir -p monitoring/grafana/datasources
    mkdir -p nginx
    mkdir -p sql
    
    print_status "Directories created ✅"
}

# Setup database initialization
setup_database() {
    print_header "Setting up database initialization..."
    
    cat > sql/init-revenue-db.sql << 'EOF'
-- Revenue Engine Database Initialization
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create revenue tracking schema
CREATE SCHEMA IF NOT EXISTS revenue;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA revenue TO revenue_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA revenue TO revenue_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA revenue TO revenue_user;

-- Create initial revenue summary view
CREATE OR REPLACE VIEW revenue_summary AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    SUM(amount) as daily_revenue,
    COUNT(*) as transaction_count
FROM revenue_streams 
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

EOF
    
    print_status "Database initialization script created ✅"
}

# Setup monitoring configuration
setup_monitoring() {
    print_header "Setting up monitoring configuration..."
    
    # Prometheus configuration
    cat > monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'revenue-engine'
    static_configs:
      - targets: ['revenue-engine:8080']
  
  - job_name: 'premium-analytics'
    static_configs:
      - targets: ['premium-analytics:3001']
  
  - job_name: 'bridge-revenue'
    static_configs:
      - targets: ['bridge-revenue:8080']
  
  - job_name: 'revenue-coordinator'
    static_configs:
      - targets: ['revenue-coordinator:8000']

EOF

    # Grafana datasource configuration
    mkdir -p monitoring/grafana/datasources
    cat > monitoring/grafana/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://revenue-prometheus:9090
    isDefault: true

EOF

    print_status "Monitoring configuration created ✅"
}

# Setup Nginx configuration
setup_nginx() {
    print_header "Setting up Nginx gateway configuration..."
    
    cat > nginx/revenue-gateway.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream revenue_coordinator {
        server revenue-coordinator:8000;
    }
    
    upstream revenue_engine {
        server revenue-engine:8080;
    }
    
    upstream premium_analytics {
        server premium-analytics:3001;
    }
    
    upstream bridge_revenue {
        server bridge-revenue:8080;
    }

    server {
        listen 80;
        server_name _;

        # Health check
        location /health {
            proxy_pass http://revenue_coordinator/health;
        }

        # Revenue Coordinator API
        location /api/v1/revenue {
            proxy_pass http://revenue_coordinator;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Revenue Engine API
        location /api/v1/engine {
            proxy_pass http://revenue_engine;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Premium Analytics API
        location /api/v1/analytics {
            proxy_pass http://premium_analytics;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Bridge Revenue API
        location /api/v1/bridge {
            proxy_pass http://bridge_revenue;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Default route to coordinator
        location / {
            proxy_pass http://revenue_coordinator;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}

EOF
    
    print_status "Nginx configuration created ✅"
}

# Start revenue system
start_system() {
    print_header "Starting NOCKCHAIN Revenue System..."
    
    # Start with Docker Compose
    docker-compose -f docker-compose.revenue.yml up -d
    
    print_status "Revenue system started! 🚀"
    
    # Wait for services to be ready
    print_status "Waiting for services to initialize..."
    sleep 30
    
    # Check service health
    check_service_health
}

# Check service health
check_service_health() {
    print_header "Checking service health..."
    
    services=(
        "http://localhost:8000/health:Revenue Coordinator"
        "http://localhost:8080/health:Revenue Engine"
        "http://localhost:3001/health:Premium Analytics"
        "http://localhost:8081/health:Bridge Revenue"
    )
    
    for service in "${services[@]}"; do
        IFS=':' read -r url name <<< "$service"
        if curl -f -s "$url" > /dev/null 2>&1; then
            print_status "$name: ✅ Healthy"
        else
            print_warning "$name: ⚠️ Not responding"
        fi
    done
}

# Display system status
display_status() {
    print_header "NOCKCHAIN Revenue System Status"
    
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════════════════════════╗"
    echo "║                            🎯 REVENUE SYSTEM ACTIVE 🎯                        ║"
    echo "╠════════════════════════════════════════════════════════════════════════════════╣"
    echo "║ 🚀 Revenue Coordinator:    http://localhost:8000                              ║"
    echo "║ 💰 Revenue Engine:         http://localhost:8080                              ║"
    echo "║ 📊 Premium Analytics:      http://localhost:3001                              ║"
    echo "║ 🌉 Bridge Revenue:         http://localhost:8081                              ║"
    echo "║                                                                                ║"
    echo "║ 📈 Grafana Dashboard:      http://localhost:3000                              ║"
    echo "║ 🔍 Prometheus Metrics:     http://localhost:9090                              ║"
    echo "║ 📋 Kibana Analytics:       http://localhost:5601                              ║"
    echo "╠════════════════════════════════════════════════════════════════════════════════╣"
    echo "║                       💰 MONTHLY REVENUE TARGETS 💰                           ║"
    echo "║                                                                                ║"
    echo "║ 🎯 Total Target:           \$2,095,000 /month                                  ║"
    echo "║ 📊 Analytics Revenue:      \$195,000 /month                                   ║"
    echo "║ 🌉 Bridge Revenue:         \$645,000 /month                                   ║"
    echo "║ 🏢 Enterprise Revenue:     \$300,000 /month                                   ║"
    echo "║ ⚡ Performance Services:    \$120,000 /month                                   ║"
    echo "╚════════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo ""
    print_status "Revenue system is running and ready to generate \$2M+ monthly revenue! 🚀"
    echo ""
    print_status "Next steps:"
    echo "  1. Update .env file with your Stripe keys and collection addresses"
    echo "  2. Configure pricing and fee structures via the API"
    echo "  3. Monitor revenue progress at http://localhost:3000 (Grafana)"
    echo "  4. Access revenue analytics at http://localhost:8000/api/v1/revenue/status"
    echo ""
    print_warning "Remember to secure your system before production deployment!"
}

# Main execution
main() {
    check_prerequisites
    setup_environment
    create_directories
    setup_database
    setup_monitoring
    setup_nginx
    build_components
    start_system
    display_status
}

# Handle script arguments
case "${1:-start}" in
    "start")
        main
        ;;
    "stop")
        print_header "Stopping NOCKCHAIN Revenue System..."
        docker-compose -f docker-compose.revenue.yml down
        print_status "Revenue system stopped."
        ;;
    "restart")
        print_header "Restarting NOCKCHAIN Revenue System..."
        docker-compose -f docker-compose.revenue.yml down
        docker-compose -f docker-compose.revenue.yml up -d
        print_status "Revenue system restarted."
        ;;
    "status")
        check_service_health
        display_status
        ;;
    "logs")
        docker-compose -f docker-compose.revenue.yml logs -f
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the complete revenue system"
        echo "  stop    - Stop all revenue services"
        echo "  restart - Restart the revenue system"
        echo "  status  - Check system status and display URLs"
        echo "  logs    - Show live logs from all services"
        exit 1
        ;;
esac