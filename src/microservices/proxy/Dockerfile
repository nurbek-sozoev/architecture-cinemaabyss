# Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install ALL dependencies (including dev dependencies for build)
RUN npm install && npm cache clean --force

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Add non-root user for security
RUN addgroup -g 1001 -S gateway && \
    adduser -S gateway -u 1001

# Create app directory
WORKDIR /app

# Copy built application and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Create logs directory
RUN mkdir -p logs && chown -R gateway:gateway /app

# Switch to non-root user
USER gateway

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const options = { hostname: 'localhost', port: process.env.PORT || 3200, path: '/gateway/health', timeout: 2000 }; const req = http.get(options, (res) => process.exit(res.statusCode === 200 ? 0 : 1)); req.on('error', () => process.exit(1)); req.on('timeout', () => process.exit(1));"

# Expose port
EXPOSE 3200

# Start the application
CMD ["node", "dist/index.js"]
