# Premium Analytics Platform Dockerfile
# Production-ready container for $195K monthly analytics revenue

FROM node:20-alpine as builder

# Install dependencies
RUN apk add --no-cache python3 make g++ curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Runtime stage
FROM node:20-alpine

# Install runtime dependencies
RUN apk add --no-cache curl

# Create app user
RUN addgroup -g 1001 -S analytics && \
    adduser -S analytics -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder
COPY --from=builder --chown=analytics:analytics /app/dist ./dist
COPY --from=builder --chown=analytics:analytics /app/node_modules ./node_modules
COPY --from=builder --chown=analytics:analytics /app/package.json ./

# Switch to app user
USER analytics

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["node", "dist/app.js"]