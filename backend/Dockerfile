# Stage 1: Dependencies installation
FROM node:20-alpine AS dependencies
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Install curl for Docker health check
RUN apk add --no-cache curl

# Create non-root nodejs user and group
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy node_modules from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application source code with correct ownership
COPY --chown=nodejs:nodejs . .

# Ensure uploads directory structure exists with appropriate write permissions
RUN mkdir -p /app/uploads/recordings && chown -R nodejs:nodejs /app/uploads

USER nodejs

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

CMD ["node", "src/app/server.js"]
