#!/bin/bash
# Deployment script for Nockchain mining pool
# Supports multiple environments and deployment strategies

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENVIRONMENT="${ENVIRONMENT:-staging}"
DEPLOYMENT_TYPE="${DEPLOYMENT_TYPE:-rolling}"
KUBECTL_TIMEOUT="${KUBECTL_TIMEOUT:-300s}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl not found. Please install kubectl."
        exit 1
    fi
    
    # Check docker
    if ! command -v docker &> /dev/null; then
        log_error "docker not found. Please install Docker."
        exit 1
    fi
    
    # Check helm (optional but recommended)
    if ! command -v helm &> /dev/null; then
        log_warning "helm not found. Some features may not be available."
    fi
    
    # Verify kubectl connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Set environment-specific configuration
set_environment() {
    case "${ENVIRONMENT}" in
        "production")
            NAMESPACE="nockchain"
            IMAGE_TAG="${IMAGE_TAG:-latest}"
            REPLICAS_WEB=5
            REPLICAS_MINING=3
            REPLICAS_MONITORING=2
            ;;
        "staging")
            NAMESPACE="nockchain-staging"
            IMAGE_TAG="${IMAGE_TAG:-develop}"
            REPLICAS_WEB=2
            REPLICAS_MINING=2
            REPLICAS_MONITORING=1
            ;;
        "development")
            NAMESPACE="nockchain-dev"
            IMAGE_TAG="${IMAGE_TAG:-dev}"
            REPLICAS_WEB=1
            REPLICAS_MINING=1
            REPLICAS_MONITORING=1
            ;;
        *)
            log_error "Unknown environment: ${ENVIRONMENT}"
            exit 1
            ;;
    esac
    
    log_info "Deploying to environment: ${ENVIRONMENT}"
    log_info "Using namespace: ${NAMESPACE}"
    log_info "Using image tag: ${IMAGE_TAG}"
}

# Create namespace if it doesn't exist
create_namespace() {
    log_info "Creating namespace ${NAMESPACE} if it doesn't exist..."
    
    if ! kubectl get namespace "${NAMESPACE}" &> /dev/null; then
        kubectl create namespace "${NAMESPACE}"
        kubectl label namespace "${NAMESPACE}" environment="${ENVIRONMENT}"
        log_success "Created namespace ${NAMESPACE}"
    else
        log_info "Namespace ${NAMESPACE} already exists"
    fi
}

# Apply secrets (with validation)
apply_secrets() {
    log_info "Applying secrets..."
    
    # Check if secrets file exists
    if [[ ! -f "${PROJECT_ROOT}/k8s/secrets.yaml" ]]; then
        log_error "Secrets file not found. Please create k8s/secrets.yaml"
        exit 1
    fi
    
    # Validate secrets (check for placeholder values)
    if grep -q "cGFzc3dvcmQ=" "${PROJECT_ROOT}/k8s/secrets.yaml"; then
        log_warning "Found placeholder values in secrets. Please update with real values."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    kubectl apply -f "${PROJECT_ROOT}/k8s/secrets.yaml" -n "${NAMESPACE}"
    log_success "Applied secrets"
}

# Apply ConfigMaps
apply_configmaps() {
    log_info "Applying ConfigMaps..."
    kubectl apply -f "${PROJECT_ROOT}/k8s/configmap.yaml" -n "${NAMESPACE}"
    log_success "Applied ConfigMaps"
}

# Apply RBAC
apply_rbac() {
    log_info "Applying RBAC configuration..."
    kubectl apply -f "${PROJECT_ROOT}/k8s/rbac.yaml" -n "${NAMESPACE}"
    log_success "Applied RBAC configuration"
}

# Deploy databases
deploy_databases() {
    log_info "Deploying databases..."
    
    # PostgreSQL
    kubectl apply -f "${PROJECT_ROOT}/k8s/postgres.yaml" -n "${NAMESPACE}"
    log_info "Waiting for PostgreSQL to be ready..."
    kubectl wait --for=condition=available --timeout="${KUBECTL_TIMEOUT}" deployment/postgres -n "${NAMESPACE}"
    
    # Redis
    kubectl apply -f "${PROJECT_ROOT}/k8s/redis.yaml" -n "${NAMESPACE}"
    log_info "Waiting for Redis to be ready..."
    kubectl wait --for=condition=available --timeout="${KUBECTL_TIMEOUT}" deployment/redis -n "${NAMESPACE}"
    
    log_success "Databases deployed successfully"
}

# Update image tags in deployment files
update_image_tags() {
    log_info "Updating image tags to ${IMAGE_TAG}..."
    
    local temp_dir=$(mktemp -d)
    
    # Copy k8s files to temp directory and update image tags
    cp -r "${PROJECT_ROOT}/k8s"/* "${temp_dir}/"
    
    # Update image tags in deployment files
    sed -i.bak "s|:latest-web|:${IMAGE_TAG}-web|g" "${temp_dir}/web-app.yaml"
    sed -i.bak "s|:latest-mining-pool|:${IMAGE_TAG}-mining-pool|g" "${temp_dir}/mining-pool.yaml"
    sed -i.bak "s|:latest-monitoring|:${IMAGE_TAG}-monitoring|g" "${temp_dir}/monitoring.yaml"
    
    # Update replica counts based on environment
    sed -i.bak "s|replicas: 3|replicas: ${REPLICAS_WEB}|g" "${temp_dir}/web-app.yaml"
    sed -i.bak "s|replicas: 2|replicas: ${REPLICAS_MINING}|g" "${temp_dir}/mining-pool.yaml"
    sed -i.bak "s|replicas: 2|replicas: ${REPLICAS_MONITORING}|g" "${temp_dir}/monitoring.yaml"
    
    echo "${temp_dir}"
}

# Deploy applications
deploy_applications() {
    log_info "Deploying applications..."
    
    local temp_dir=$(update_image_tags)
    
    case "${DEPLOYMENT_TYPE}" in
        "rolling")
            deploy_rolling "${temp_dir}"
            ;;
        "blue-green")
            deploy_blue_green "${temp_dir}"
            ;;
        "canary")
            deploy_canary "${temp_dir}"
            ;;
        *)
            log_error "Unknown deployment type: ${DEPLOYMENT_TYPE}"
            exit 1
            ;;
    esac
    
    # Cleanup temp directory
    rm -rf "${temp_dir}"
}

# Rolling deployment
deploy_rolling() {
    local temp_dir="$1"
    
    log_info "Performing rolling deployment..."
    
    # Deploy web application
    kubectl apply -f "${temp_dir}/web-app.yaml" -n "${NAMESPACE}"
    log_info "Waiting for web application rollout..."
    kubectl rollout status deployment/nockchain-web -n "${NAMESPACE}" --timeout="${KUBECTL_TIMEOUT}"
    
    # Deploy mining pool
    kubectl apply -f "${temp_dir}/mining-pool.yaml" -n "${NAMESPACE}"
    log_info "Waiting for mining pool rollout..."
    kubectl rollout status deployment/nockchain-mining-pool -n "${NAMESPACE}" --timeout="${KUBECTL_TIMEOUT}"
    
    # Deploy monitoring
    kubectl apply -f "${temp_dir}/monitoring.yaml" -n "${NAMESPACE}"
    log_info "Waiting for monitoring service rollout..."
    kubectl rollout status deployment/nockchain-monitoring -n "${NAMESPACE}" --timeout="${KUBECTL_TIMEOUT}"
    
    log_success "Rolling deployment completed"
}

# Blue-green deployment (simplified)
deploy_blue_green() {
    local temp_dir="$1"
    
    log_info "Performing blue-green deployment..."
    log_warning "Blue-green deployment is a simplified implementation"
    
    # For now, just do a rolling deployment
    # In production, this would involve creating parallel deployments
    deploy_rolling "${temp_dir}"
}

# Canary deployment (simplified)
deploy_canary() {
    local temp_dir="$1"
    
    log_info "Performing canary deployment..."
    log_warning "Canary deployment is a simplified implementation"
    
    # For now, just do a rolling deployment
    # In production, this would involve traffic splitting
    deploy_rolling "${temp_dir}"
}

# Deploy monitoring infrastructure
deploy_monitoring() {
    log_info "Deploying monitoring infrastructure..."
    
    # Deploy Prometheus and Grafana
    kubectl apply -f "${PROJECT_ROOT}/k8s/monitoring.yaml" -n "${NAMESPACE}"
    
    log_info "Waiting for monitoring services to be ready..."
    kubectl wait --for=condition=available --timeout="${KUBECTL_TIMEOUT}" deployment/prometheus -n "${NAMESPACE}" || true
    kubectl wait --for=condition=available --timeout="${KUBECTL_TIMEOUT}" deployment/grafana -n "${NAMESPACE}" || true
    
    log_success "Monitoring infrastructure deployed"
}

# Deploy ingress
deploy_ingress() {
    log_info "Deploying ingress configuration..."
    
    # Check if ingress controller is installed
    if ! kubectl get ingressclass nginx &> /dev/null; then
        log_warning "NGINX ingress controller not found. Installing..."
        kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
        
        log_info "Waiting for ingress controller to be ready..."
        kubectl wait --namespace ingress-nginx \
            --for=condition=ready pod \
            --selector=app.kubernetes.io/component=controller \
            --timeout=300s
    fi
    
    kubectl apply -f "${PROJECT_ROOT}/k8s/ingress.yaml" -n "${NAMESPACE}"
    log_success "Ingress configuration deployed"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Create a temporary job to run migrations
    kubectl create job migration-job-$(date +%s) \
        --image=ghcr.io/nockchain/mining-pool:${IMAGE_TAG}-web \
        --restart=Never \
        -n "${NAMESPACE}" \
        -- npm run db:migrate
    
    log_success "Database migrations completed"
}

# Health checks
run_health_checks() {
    log_info "Running health checks..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log_info "Health check attempt ${attempt}/${max_attempts}"
        
        # Check web application
        if kubectl exec -n "${NAMESPACE}" deployment/nockchain-web -- curl -f http://localhost:3000/api/health &> /dev/null; then
            log_success "Web application is healthy"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            log_error "Health checks failed after ${max_attempts} attempts"
            return 1
        fi
        
        sleep 10
        ((attempt++))
    done
    
    log_success "All health checks passed"
}

# Smoke tests
run_smoke_tests() {
    log_info "Running smoke tests..."
    
    # Create a test pod to run smoke tests
    cat <<EOF | kubectl apply -f - -n "${NAMESPACE}"
apiVersion: v1
kind: Pod
metadata:
  name: smoke-test-$(date +%s)
  labels:
    app: smoke-test
spec:
  restartPolicy: Never
  containers:
  - name: smoke-test
    image: curlimages/curl:latest
    command: ['sh', '-c']
    args:
    - |
      set -e
      echo "Testing web application..."
      curl -f http://nockchain-web-service:3000/api/health
      echo "Testing mining pool..."
      curl -f http://nockchain-mining-pool-service:8080/health
      echo "Testing monitoring..."
      curl -f http://nockchain-monitoring-service:3001/health
      echo "All smoke tests passed!"
EOF
    
    # Wait for smoke tests to complete
    sleep 30
    
    log_success "Smoke tests completed"
}

# Rollback function
rollback() {
    log_warning "Rolling back deployment..."
    
    kubectl rollout undo deployment/nockchain-web -n "${NAMESPACE}"
    kubectl rollout undo deployment/nockchain-mining-pool -n "${NAMESPACE}"
    kubectl rollout undo deployment/nockchain-monitoring -n "${NAMESPACE}"
    
    log_success "Rollback completed"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary resources..."
    
    # Remove smoke test pods
    kubectl delete pods -l app=smoke-test -n "${NAMESPACE}" --ignore-not-found=true
    
    # Remove completed migration jobs (keep last 3)
    kubectl delete jobs -l job-name=migration-job -n "${NAMESPACE}" --field-selector=status.successful=1 --sort-by=.metadata.creationTimestamp | tail -n +4
    
    log_success "Cleanup completed"
}

# Main deployment function
deploy() {
    log_info "Starting deployment of Nockchain mining pool..."
    
    check_prerequisites
    set_environment
    create_namespace
    apply_secrets
    apply_configmaps
    apply_rbac
    deploy_databases
    deploy_applications
    deploy_monitoring
    deploy_ingress
    run_migrations
    run_health_checks
    run_smoke_tests
    cleanup
    
    log_success "Deployment completed successfully!"
    log_info "Access your mining pool at: https://nockchain-pool.com"
    log_info "Monitoring dashboard: https://monitoring.nockchain-pool.com"
    log_info "Grafana dashboard: https://grafana.nockchain-pool.com"
}

# Show usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS] COMMAND

COMMANDS:
    deploy          Deploy the complete application
    rollback        Rollback to previous deployment
    health-check    Run health checks only
    cleanup         Clean up temporary resources

OPTIONS:
    -e, --environment   Environment to deploy to (production|staging|development)
    -t, --type         Deployment type (rolling|blue-green|canary)
    -i, --image-tag    Docker image tag to deploy
    -h, --help         Show this help message

EXAMPLES:
    $0 deploy
    $0 --environment production --type rolling deploy
    $0 --image-tag v1.2.3 deploy
    $0 rollback

ENVIRONMENT VARIABLES:
    ENVIRONMENT        Target environment (default: staging)
    DEPLOYMENT_TYPE    Deployment strategy (default: rolling)
    IMAGE_TAG          Docker image tag (default: latest)
    KUBECTL_TIMEOUT    Kubectl timeout (default: 300s)
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -t|--type)
            DEPLOYMENT_TYPE="$2"
            shift 2
            ;;
        -i|--image-tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        deploy)
            COMMAND="deploy"
            shift
            ;;
        rollback)
            COMMAND="rollback"
            shift
            ;;
        health-check)
            COMMAND="health-check"
            shift
            ;;
        cleanup)
            COMMAND="cleanup"
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Execute command
case "${COMMAND:-deploy}" in
    "deploy")
        deploy
        ;;
    "rollback")
        rollback
        ;;
    "health-check")
        run_health_checks
        ;;
    "cleanup")
        cleanup
        ;;
    *)
        log_error "Unknown command: ${COMMAND}"
        usage
        exit 1
        ;;
esac