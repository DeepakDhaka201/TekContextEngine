FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache git

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Build the TypeScript code
RUN npm run build

# Create output directory
RUN mkdir -p /output

# Set the entrypoint
ENTRYPOINT ["node", "dist/index.js"]

# Default command shows help
CMD ["--help"]