# Multi-stage build for Barcode Generator Frontend
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy configuration files first
COPY vite.config.ts ./
COPY tsconfig*.json ./
COPY components.json ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY index.html ./

# Copy source code explicitly to ensure all files are included
COPY src ./src
COPY public ./public

# Verify critical files are present and show structure
RUN echo "=== Verifying file structure ===" && \
    echo "Current directory: $(pwd)" && \
    echo "=== Checking if src/lib exists ===" && \
    (test -d src/lib && echo "✓ src/lib directory exists" || echo "✗ src/lib directory NOT found") && \
    echo "=== Listing src/lib contents ===" && \
    (ls -la src/lib/ 2>/dev/null || echo "Cannot list src/lib") && \
    echo "=== Checking for api.ts ===" && \
    (test -f src/lib/api.ts && echo "✓ api.ts FOUND" || echo "✗ api.ts NOT FOUND") && \
    echo "=== Full src/lib file tree ===" && \
    (find src/lib -type f 2>/dev/null || echo "Cannot find files") && \
    echo "=== Checking vite.config.ts ===" && \
    (test -f vite.config.ts && echo "✓ vite.config.ts exists" || echo "✗ vite.config.ts NOT found") || true

# Build argument for API URL (use relative path since nginx proxies /api/)
ARG VITE_API_BASE_URL=/api
ARG VITE_ENVIRONMENT=production

# Set environment variables for build
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_ENVIRONMENT=$VITE_ENVIRONMENT
ENV VITE_DEBUG=false
ENV VITE_LOG_REQUESTS=false
ENV VITE_ENABLE_DEV_TOOLS=false
ENV VITE_SHOW_API_LOGS=false

# Build the application
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Install wget and add healthcheck
RUN apk --no-cache add wget
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/healthz || exit 1

# Expose port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]

