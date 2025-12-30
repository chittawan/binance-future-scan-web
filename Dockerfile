# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# ============================================
# Environment Variables Configuration
# ============================================
# API_BASE_URL: Base URL for the backend API
#   - Default: https://bnbot.codewalk.myds.me
#   - Can be overridden at build time: docker build --build-arg API_BASE_URL=https://custom-api.com
#   - Can be overridden at runtime: docker run -e API_BASE_URL=https://custom-api.com
#   - Or via docker-compose.yml environment section
ARG API_BASE_URL=https://xbot-api.codewalk.myds.me
ENV API_BASE_URL=${API_BASE_URL}

# PORT: Port number for nginx to listen on
#   - Default: 80
#   - Can be overridden at build time: docker build --build-arg PORT=8080
#   - Can be overridden at runtime: docker run -e PORT=8080
#   - Or via docker-compose.yml environment section
ARG PORT=80
ENV PORT=${PORT}

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy nginx configuration template (will be updated by entrypoint script)
# Note: PORT will be injected at runtime via entrypoint script
RUN echo 'server { \
    listen __PORT__; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # MIME types \
    include /etc/nginx/mime.types; \
    types { \
        image/svg+xml svg svgz; \
    } \
    default_type application/octet-stream; \
    \
    # Gzip compression \
    gzip on; \
    gzip_vary on; \
    gzip_min_length 1024; \
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json image/svg+xml; \
    \
    # SVG files with correct content-type \
    location ~* \.svg$ { \
        add_header Content-Type "image/svg+xml"; \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
    \
    # Cache static assets \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|woff|woff2|ttf|eot)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
    \
    # SPA routing \
    location / { \
        try_files $uri $uri/ /index.html; \
        add_header Cache-Control "no-cache"; \
    } \
}' > /etc/nginx/conf.d/default.conf.template

# Expose port (default 80, can be overridden)
EXPOSE ${PORT}

# Use entrypoint script
ENTRYPOINT ["/docker-entrypoint.sh"]

