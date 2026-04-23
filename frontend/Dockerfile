FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install runtime tools (healthcheck)
RUN apk add --no-cache curl

# Install dependencies (including dev dependencies for build)
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy application code
COPY . .

# Build-time env vars (NEXT_PUBLIC_* are inlined at build time by Next.js)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_API_KEY
ARG BASE_PATH
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_KEY=$NEXT_PUBLIC_API_KEY
ENV BASE_PATH=$BASE_PATH

# Build the application
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -fsS http://localhost:3001/op >/dev/null || exit 1

# Start the application
CMD ["npm", "start"]
