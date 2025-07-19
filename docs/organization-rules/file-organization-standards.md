# NOCKCHAIN FILE ORGANIZATION STANDARDS
## Maintaining 3,891-File Repository Structure

### 🎯 **DIRECTORY STRUCTURE RULES**

#### **New Applications**
- Location: `apps/[app-name]/`
- Structure: `src/`, `tests/`, `docs/`, `config/`
- Naming: kebab-case (e.g., `new-revenue-stream`)

#### **Agent Development**
- Operational agents: `agents/operational-staff/[agent-name]/`
- Strategic agents: `agents/outputs/[agent-name]/`
- Coordination: `agents/coordination-system/`
- Workspaces: `agents/workspaces/[workspace-name]/`

#### **Shared Code**
- Database utilities: `packages/database/`
- Common components: `packages/shared/`
- Types: `packages/shared/src/types/`

#### **Infrastructure**
- Deployment scripts: `scripts/`
- Docker configs: `docker/`
- Kubernetes manifests: `k8s/`
- Security configs: `security/`
- Testing: `tests/`

#### **Documentation**
- Auto-generated: `docs/auto-generated/`
- Context templates: `docs/claude-templates/`
- Standards: `docs/organization-rules/`
- System docs: `docs/`

### 📝 **FILE NAMING CONVENTIONS**

#### **Rust Files**
- Main entry: `main.rs`
- Modules: `snake_case.rs`
- Tests: `mod.rs` or `[module]_test.rs`
- Config: `config.rs`
- Core logic: `core.rs`, `lib.rs`

#### **TypeScript Files**
- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`
- Types: `kebab-case-types.ts`
- Tests: `[name].test.ts`
- Config: `[name].config.ts`

#### **JavaScript Files**
- Scripts: `kebab-case.js`
- Config: `[tool].config.js`
- Tests: `[name].test.js`

#### **Configuration Files**
- Package configs: `package.json`, `Cargo.toml`
- Build configs: `turbo.json`, `tsconfig.json`
- Environment: `.env.example` (never commit actual .env)
- Docker: `docker-compose.yml`, `Dockerfile`
- Kubernetes: `[resource].yaml`

#### **Documentation Files**
- README: `README.md` (in each directory)
- Guides: `kebab-case-guide.md`
- Reports: `UPPER_CASE_REPORT.md`
- Context templates: `[domain]-context.md`

### 🔄 **MAINTENANCE PROCEDURES**

#### **Adding New Files**
1. Follow directory structure rules
2. Use appropriate naming conventions
3. Add relevant documentation
4. Update context templates if needed
5. Run auto-updater: `./.nockchain/scripts/update-repo-navigator.sh`

#### **Reorganizing Code**
1. Plan changes in advance
2. Update all references and imports
3. Test build system thoroughly
4. Update documentation and context templates
5. Commit with descriptive message
6. Update repository navigator

#### **Documentation Standards**
- README.md in each major directory
- Inline code documentation for complex logic
- Architecture decision records (ADR) for major changes
- API documentation for public interfaces
- Context templates for development domains

### 📊 **QUALITY CHECKPOINTS**

#### **Before Committing**
- [ ] Files in correct directories
- [ ] Naming conventions followed
- [ ] Documentation updated
- [ ] Build system works (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Auto-updater runs successfully

#### **Weekly Maintenance**
- [ ] Review file organization
- [ ] Clean up unused files
- [ ] Update documentation
- [ ] Verify auto-updater working
- [ ] Check link integrity
- [ ] Validate context templates
- [ ] Review repository statistics

#### **Monthly Maintenance**
- [ ] Archive old documentation
- [ ] Review and update standards
- [ ] Optimize directory structure
- [ ] Update context templates
- [ ] Review access patterns
- [ ] Clean up cache files

### 🚨 **ANTI-PATTERNS TO AVOID**

❌ **Don't Do**:
- Files in root directory (except essential config)
- Inconsistent naming conventions
- Undocumented modules or major changes
- Breaking existing structure without planning
- Circular dependencies
- Hardcoded paths in scripts
- Large files without organization
- Duplicate functionality across apps

✅ **Do Instead**:
- Follow established patterns
- Document all changes and decisions
- Maintain clean, logical structure
- Use proper naming conventions
- Keep dependencies clean and explicit
- Use relative paths where appropriate
- Modularize large components
- Reuse shared functionality

### 🔧 **AUTOMATION INTEGRATION**

#### **Git Hooks**
- **Pre-commit**: Auto-update repository navigator
- **Post-merge**: Sync documentation changes
- **Pre-push**: Validate structure integrity

#### **Auto-Update Triggers**
- Git commits and merges
- Manual script execution
- CI/CD pipeline integration
- Scheduled maintenance tasks

#### **Context Template Updates**
- New domain detection
- File structure changes
- Integration point updates
- Performance metric updates

### 📈 **SCALABILITY CONSIDERATIONS**

#### **Growth Management**
- Monitor file count trends
- Plan directory restructuring
- Optimize build system performance
- Manage documentation size
- Review access patterns

#### **Performance Optimization**
- Keep frequently accessed files organized
- Minimize deep nesting
- Optimize build tool configurations
- Cache frequently used data
- Stream large file operations

#### **Team Collaboration**
- Consistent structure across branches
- Clear ownership of directories
- Standardized development workflows
- Shared context templates
- Regular structure reviews

### 🎯 **SUCCESS METRICS**

#### **Organizational Health**
- File discovery time: <30 seconds
- Build time: <2 minutes
- Documentation coverage: >90%
- Structure consistency: 100%
- Context template accuracy: >95%

#### **Developer Experience**
- Onboarding time reduction
- Consistent development patterns
- Reduced context switching
- Improved code discoverability
- Enhanced team collaboration

**🎯 MAINTAINING STRUCTURE FOR 3,891+ FILES WITH ZERO OVERHEAD**