FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Build frontend
RUN cd frontend && npm ci && npm run build && cd ..

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]