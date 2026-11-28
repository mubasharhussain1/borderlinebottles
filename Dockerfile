# Use lightweight official Node.js 20 Alpine image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install production dependencies and timezone data for Alberta (MST/MDT)
RUN apk add --no-cache tzdata
RUN npm ci --only=production

# Copy application source code
COPY . .

# Set environment to production and timezone to Alberta
ENV NODE_ENV=production
ENV TZ=America/Edmonton

# Run the daily scheduler daemon on startup
CMD ["node", "src/scheduler.js"]
