# Use lightweight official Node.js 20 Alpine image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application source code
COPY . .

# Set environment to production
ENV NODE_ENV=production

# Run the sync engine on startup
CMD ["node", "src/sync/sync_engine.js"]
