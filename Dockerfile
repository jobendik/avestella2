# Stage 1: Build Frontend
FROM node:20-alpine as builder

WORKDIR /app

# Copy root files for frontend build
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.node.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY postcss.config.js ./
COPY tailwind.config.js ./
COPY .env* ./

# Copy source
COPY src ./src
COPY public ./public

# Install and Build
RUN npm install
RUN npm run build

# Stage 2: Production Server
FROM node:20-alpine

WORKDIR /app

# Copy server files
COPY server/package*.json ./
COPY server/tsconfig.json ./
COPY server/index.ts ./
COPY server/common ./common
COPY server/middleware ./middleware
COPY server/services ./services
COPY server/database ./database
COPY server/websocket ./websocket

# Install server dependencies
RUN npm install --production
RUN npm install typescript tsx -g

# Copy built frontend from Stage 1 to server/public
COPY --from=builder /app/dist ./public

# Expose port
EXPOSE 3001

# Environment variables (override in docker-compose or run command)
ENV PORT=3001
ENV NODE_ENV=production

# Start server
CMD ["tsx", "index.ts"]
