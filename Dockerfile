# ============================================
# Stage 1: Base - Production dependencies
# ============================================
FROM node:18-alpine AS base

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# ============================================
# Stage 2: Development
# ============================================
FROM node:18-alpine AS development

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies)
RUN npm install

# Copy source code (will be overridden by volume mount)
COPY . .

# Expose port
EXPOSE 3000

# Development command (uses nodemon + ts-node)
CMD ["npm", "run", "dev"]

# ============================================
# Stage 3: Builder - Compile TypeScript
# ============================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (need TypeScript compiler)
RUN npm install

# Copy source code
COPY . .

# Compile TypeScript to JavaScript
RUN npm run build

# ============================================
# Stage 4: Production
# ============================================
FROM node:18-alpine AS production

WORKDIR /app

# Copy production dependencies from base stage
COPY --from=base /app/node_modules ./node_modules

# Copy compiled JavaScript from builder stage
COPY --from=builder /app/dist ./dist

# Copy package.json for metadata
COPY package*.json ./

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Production command (run compiled JS)
CMD ["npm", "start"]
