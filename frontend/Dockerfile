# Stage 1: Build production React + Vite bundle
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Set production environment variable for build time
ENV NODE_ENV=production
RUN npm run build

# Stage 2: Serve static bundle via Alpine Nginx
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

# Clean default html
RUN rm -rf ./*

# Copy compiled files from builder
COPY --from=builder /app/dist .

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
