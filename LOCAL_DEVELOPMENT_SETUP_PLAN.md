# Nock= Hybrid Local Development Setup - Project Plan

## Current Status: TIER 2 PERMISSION ERRORS (Cache Issues)

### ✅ COMPLETED TASKS
1. **Dependency Analysis Complete** - Identified critical version conflicts
2. **Version Standardization Applied**:
   - React 19→18, Next.js 15→14, ESLint 9→8, Tailwind 4→3
   - Deprecated packages fixed: @project-serum/anchor removed, fastify-* → @fastify/*
   - Problematic packages removed: @jup-ag/*, @orca-so/*
   - Prometheus version conflict resolved: prom-client 15→14

### ⚠️ CURRENT BLOCKER
**npm cache permission issues** - Root-owned files preventing installation
- Error: EACCES permission denied on cache operations
- Requires: `sudo chown -R 501:20 "/Users/Patrick/.npm"`

### 🔄 IN PROGRESS
- **Dependency Installation** - Blocked by cache permissions

### 📋 PENDING TASKS
1. **Fix npm cache permissions** (HIGH PRIORITY)
2. **Install dependencies with fallback strategy**
3. **Verify build system** (turbo run build)
4. **Set up git sync workflow**
5. **Create Lightning AI deployment scripts**

## NEXT ACTIONS

### Immediate (High Priority)
1. **Cache Permission Fix**: Execute `sudo chown -R 501:20 "/Users/Patrick/.npm"`
2. **Alternative Install Methods**: Try yarn/npm alternatives if permissions can't be fixed
3. **Selective Installation**: Install workspace by workspace if monorepo install fails

### Fallback Strategy
- Use Docker for dependency isolation
- Cloud-based installation via Lightning AI
- Individual workspace installation instead of monorepo

## ARCHITECTURE NOTES

### Monorepo Structure
- **Root**: Main workspace coordination
- **Apps**: 11 applications including frontend, bridges, monitoring
- **Packages**: Shared libraries (database, shared)

### Critical Dependencies Fixed
- React ecosystem standardized to v18
- Fastify plugins updated to scoped versions
- Deprecated Solana packages removed
- Version conflicts resolved across workspaces

## SUCCESS METRICS
- [ ] Clean `npm install` or `pnpm install` 
- [ ] Successful `turbo run build`
- [ ] All workspaces building without errors
- [ ] Git workflow established
- [ ] Lightning AI deployment scripts ready

## KNOWLEDGE BASE
- **EACCES npm cache fix**: `sudo chown -R 501:20 "/Users/Patrick/.npm"`
- **Version hierarchy**: React 18, Next.js 14, ESLint 8, Tailwind 3
- **Deprecated packages**: @project-serum/anchor → @coral-xyz/anchor
- **Problematic packages**: @jup-ag/*, @orca-so/* (version conflicts)