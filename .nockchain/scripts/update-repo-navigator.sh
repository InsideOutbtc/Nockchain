#!/bin/bash
# Nockchain Smart Documentation Auto-Updater

DOCS_DIR="/Users/Patrick/nock=/docs/auto-generated"
CACHE_DIR="/Users/Patrick/nock=/.nockchain/cache"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

echo "🔄 Updating Nockchain repository navigator..."

# Create cache directory if it doesn't exist
mkdir -p "$CACHE_DIR"

# Generate current statistics
TOTAL_FILES=$(find /Users/Patrick/nock= -type f -not -path '*/node_modules*' -not -path '*/.git*' -not -path '*/target*' | wc -l | xargs)
TOTAL_DIRS=$(find /Users/Patrick/nock= -type d -not -path '*/node_modules*' -not -path '*/.git*' -not -path '*/target*' | wc -l | xargs)

# Generate current app structure
APP_STRUCTURE=$(find /Users/Patrick/nock=/apps -maxdepth 1 -type d | grep -v "^/Users/Patrick/nock=/apps$" | sort | sed 's|/Users/Patrick/nock=/apps/|├── |')

# Generate current agent structure  
AGENT_STRUCTURE=$(find /Users/Patrick/nock=/agents -maxdepth 2 -type d | grep -v "^/Users/Patrick/nock=/agents$" | sort | sed 's|/Users/Patrick/nock=/agents/|├── |')

# Generate infrastructure structure
INFRA_STRUCTURE=$(find /Users/Patrick/nock= -maxdepth 1 -type d -name "scripts" -o -name "docker" -o -name "k8s" -o -name "security" -o -name "tests" -o -name "cicd-investigation" | sort | sed 's|/Users/Patrick/nock=/|├── |')

# Update the master navigator with current data
cat > "$DOCS_DIR/repo-navigator.md" << EOF
# NOCKCHAIN REPOSITORY NAVIGATOR
## Auto-Generated Repository Structure & Context Guide

**Last Updated**: $TIMESTAMP
**Total Files**: $TOTAL_FILES
**Total Directories**: $TOTAL_DIRS
**Generator**: Smart Documentation System v1.0

---

## 🎯 **QUICK CONTEXT SELECTION**

### **Choose Your Context Type:**
- **[AGENTS]** - 21-agent ecosystem development
- **[REVENUE]** - \$847K daily revenue system  
- **[DEX]** - DeFi & trading integrations
- **[SECURITY]** - Security audit & compliance
- **[PERFORMANCE]** - Optimization & load testing
- **[FRONTEND]** - Web & mobile interfaces
- **[INFRASTRUCTURE]** - Deployment & CI/CD

---

## 📁 **LIVE REPOSITORY STRUCTURE**

### **🏗️ Core Applications ($TOTAL_FILES total files)**
\`\`\`
apps/
$APP_STRUCTURE
\`\`\`

### **🤖 AI Agents System (21 Agents)**
\`\`\`
agents/
$AGENT_STRUCTURE
\`\`\`

### **📦 Shared Packages**
\`\`\`
packages/
├── database/             # Database utilities
└── shared/              # Shared components
\`\`\`

### **🔧 Infrastructure**
\`\`\`
$INFRA_STRUCTURE
\`\`\`

---

## 🔍 **FILE LOCATION QUICK REFERENCE**

### **Revenue System Files**
- Main: \`apps/revenue-engine/src/main.rs\`
- Config: \`apps/revenue-engine/src/config.rs\`
- Billing: \`apps/revenue-engine/src/billing.rs\`
- Coordinator: \`apps/revenue-coordinator/src/main.rs\`

### **Mining Operations**
- Core: \`apps/mining-pool/src/main.rs\`
- Payout: \`apps/mining-pool/src/payout_engine.rs\`
- WebSocket: \`apps/mining-pool/src/websocket.rs\`

### **DEX Integration**
- Main: \`apps/dex-integration/src/index.ts\`
- Aggregator: \`apps/dex-integration/src/core/dex-aggregator.ts\`
- Strategies: \`apps/dex-integration/src/strategies/\`

### **Security Systems**
- Manager: \`apps/bridge-validator/src/security/manager.ts\`
- Configs: \`security/\`
- Monitoring: \`apps/monitoring/src/\`

### **Frontend Applications**
- Web: \`apps/web/\` & \`nockchain-frontend/\`
- Mobile: \`apps/nock-mobile/\`
- Components: \`nockchain-frontend/src/components/\`

---

## 📊 **REPOSITORY STATISTICS**

### **📊 Live Statistics**
- **Total Files**: $TOTAL_FILES
- **Total Directories**: $TOTAL_DIRS
- **Last Updated**: $TIMESTAMP

### **🔧 File Distribution**
- Rust files: $(find /Users/Patrick/nock= -name "*.rs" | grep -v target | wc -l | xargs)
- TypeScript files: $(find /Users/Patrick/nock= -name "*.ts" -o -name "*.tsx" | grep -v node_modules | wc -l | xargs)
- JavaScript files: $(find /Users/Patrick/nock= -name "*.js" -o -name "*.jsx" | grep -v node_modules | wc -l | xargs)
- Markdown files: $(find /Users/Patrick/nock= -name "*.md" | wc -l | xargs)
- Config files: $(find /Users/Patrick/nock= -name "*.json" -o -name "*.yml" -o -name "*.yaml" -o -name "*.toml" | grep -v node_modules | wc -l | xargs)

---

## 🚀 **CONTEXT TEMPLATES AVAILABLE**

### **Quick Context Access:**
- **Agent Development**: \`docs/claude-templates/agent-context.md\`
- **Revenue System**: \`docs/claude-templates/revenue-context.md\`
- **DEX Integration**: \`docs/claude-templates/dex-context.md\`
- **Security & Compliance**: \`docs/claude-templates/security-context.md\`

### **Quick Context Loader:**
\`\`\`bash
# Load agent context for development
./.nockchain/scripts/claude-context.sh agent "your specific task"

# Load revenue context for optimization
./.nockchain/scripts/claude-context.sh revenue "your specific task"
\`\`\`

**🎯 Auto-updated every commit | Generated by Smart Documentation System**
EOF

# Cache current state
echo "$TIMESTAMP: $TOTAL_FILES files, $TOTAL_DIRS directories" >> "$CACHE_DIR/update-log.txt"

echo "✅ Repository navigator updated: $TOTAL_FILES files, $TOTAL_DIRS directories"