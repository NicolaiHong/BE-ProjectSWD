# ============================================
# Stage 1: Base - Production dependencies
# ============================================
FROM node:20.18-alpine AS base

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only (skip postinstall since prisma schema isn't available yet)
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

# ============================================
# Stage 2: Development
# ============================================
FROM node:20.18-alpine AS development

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies)
RUN npm install --ignore-scripts

# Copy source code (will be overridden by volume mount)
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose port
EXPOSE 3000

# Development command (uses ts-node-dev)
CMD ["npm", "run", "dev"]

# ============================================
# Stage 3: Builder - Compile TypeScript
# ============================================
FROM node:20.18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (skip postinstall, we'll generate prisma manually)
RUN npm install --ignore-scripts

# Copy source code + prisma schema
COPY . .

# Generate Prisma client then compile TypeScript
RUN npx prisma generate && npx tsc

# ============================================
# Stage 4: Production
# ============================================
FROM node:20.18-alpine AS production

WORKDIR /app

# Copy production dependencies from base stage
COPY --from=base /app/node_modules ./node_modules

# Copy compiled JavaScript from builder stage
COPY --from=builder /app/dist ./dist

# Copy Prisma generated client from builder stage (critical!)
COPY --from=builder /app/src/generated ./src/generated

# Copy prisma schema (needed at runtime for migrations/introspection)
COPY --from=builder /app/prisma ./prisma

# Copy package.json for metadata
COPY package*.json ./

# Copy entrypoint script
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Use entrypoint script
ENTRYPOINT ["./entrypoint.sh"]

# Production command (run compiled JS)
CMD ["npm", "start"]
