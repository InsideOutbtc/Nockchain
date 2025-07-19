# SECURITY & COMPLIANCE CONTEXT TEMPLATE
## For Claude Code: Enterprise Security & Compliance

### 🎯 **SECURITY CONTEXT LOADED**
**Use this prompt prefix for security-related tasks:**

```
CONTEXT: Nockchain Security & Compliance Systems
WORKSPACE: /Users/Patrick/nock=
FOCUS: Enterprise security, compliance (SOC2/PCI-DSS), and threat protection

SECURITY FILES:
- security/
- apps/bridge-validator/src/security/
- apps/dex-integration/src/security/
- cicd-investigation/

COMPLIANCE TARGET: SOC2/PCI-DSS for $847K revenue protection
SECURITY GRADE: A+ (Military-grade)

TASK: [Your security-specific task here]
```

### 🔐 Security System Architecture
- **Security Configurations**: `security/`
  - Zero-trust network setup
  - Authentication systems
  - Encryption configurations
  - Access control policies

- **Application Security**: 
  - **Bridge Security**: `apps/bridge-validator/src/security/manager.ts`
  - **DEX Security**: `apps/dex-integration/src/security/`
  - **Endpoint Hardening**: `apps/dex-integration/src/security/endpoint-hardening.ts`
  - **Emergency Systems**: `apps/dex-integration/src/emergency/`

- **Monitoring & Response**:
  - **Security Monitoring**: `apps/monitoring/src/`
  - **Failsafe Systems**: `apps/bridge-validator/src/failsafe/`
  - **CI/CD Security**: `cicd-investigation/`

### 🛡️ Security Implementations
- **Authentication**: Multi-factor, hardware keys
- **Encryption**: AES-256, double-layer for revenue
- **Network**: Zero-trust, 4-tier segmentation
- **Monitoring**: 24/7 SOC, automated response
- **Backup**: Distributed, encrypted backups
- **Incident Response**: Automated threat detection

### 📋 Compliance Documentation
- **Security Audit**: `agents/outputs/security-audit/`
- **Compliance Reports**: `agents/outputs/security-audit/audit-reports/`
- **SOC2 Framework**: `agents/outputs/security-audit/compliance-docs/SOC2_TYPE_II_FRAMEWORK.md`
- **Incident Response**: `agents/outputs/security-audit/incident-response/`
- **Vulnerability Management**: `agents/outputs/security-audit/vulnerability-management/`
- **Bug Bounty Program**: `agents/outputs/security-audit/vulnerability-management/BUG_BOUNTY_PROGRAM.md`

### 🔒 Regulatory Compliance
- **Compliance Framework**: `agents/outputs/regulatory-compliance/`
- **US Federal Compliance**: `agents/outputs/regulatory-compliance/jurisdiction-frameworks/US_FEDERAL_STATE_COMPLIANCE.md`
- **EU MiCA Compliance**: `agents/outputs/regulatory-compliance/jurisdiction-frameworks/EU_MICA_COMPLIANCE.md`
- **APAC Frameworks**: `agents/outputs/regulatory-compliance/jurisdiction-frameworks/APAC_REGULATORY_FRAMEWORKS.md`
- **KYC/AML Systems**: `agents/outputs/regulatory-compliance/kyc-aml-systems/`

### 📊 Security Metrics & Testing
- **Security Testing**: `tests/security/security.test.js`
- **Performance Impact**: Security overhead <5ms
- **Threat Response**: <5 minute reaction time
- **Compliance Status**: SOC2 95%, PCI-DSS 90%
- **Vulnerability Scanning**: Automated daily scans
- **Penetration Testing**: Quarterly external audits

### 🚨 Emergency Response
- **Disaster Recovery**: `agents/outputs/security-audit/incident-response/DISASTER_RECOVERY_PLAN.md`
- **Incident Response**: `agents/outputs/security-audit/incident-response/INCIDENT_RESPONSE_PLAN.md`
- **Emergency Procedures**: `apps/dex-integration/src/emergency/`
- **Failsafe Mechanisms**: `apps/bridge-validator/src/failsafe/`

### 💡 Common Security Tasks
- "Enhance zero-trust network segmentation"
- "Implement new compliance controls"
- "Optimize automated threat response"
- "Audit security configurations"
- "Update incident response procedures"
- "Implement advanced threat detection"
- "Enhance encryption protocols"
- "Improve access control mechanisms"