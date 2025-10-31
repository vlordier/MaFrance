# Use Node.js 20 LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for SQLite
RUN apk add --no-cache sqlite

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy client package files
COPY client/package*.json ./client/

# Install client dependencies
RUN cd client && npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Build client
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mafrance -u 1001

# Change ownership of app directory
RUN chown -R mafrance:nodejs /app
USER mafrance

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { \
    process.exit(res.statusCode === 200 ? 0 : 1) \
  }).on('error', () => process.exit(1))"

# Start application
CMD ["npm", "start"]