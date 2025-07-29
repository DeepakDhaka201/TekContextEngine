# Deployment Guide

This guide covers different deployment strategies for TekAI Context Engine 2.0.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Manual Deployment](#manual-deployment)
- [Production Considerations](#production-considerations)
- [Monitoring and Maintenance](#monitoring-and-maintenance)

## Prerequisites

### System Requirements

- **CPU**: 2+ cores recommended
- **Memory**: 4GB+ RAM recommended
- **Storage**: 20GB+ available space
- **Network**: Internet access for GitLab integration

### Dependencies

- **Node.js**: 20.x or higher
- **PostgreSQL**: 15.x or higher
- **Redis**: 7.x or higher
- **Docker**: 24.x or higher (for containerized deployment)

## Environment Configuration

### Required Environment Variables

```bash
# Application
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Redis
REDIS_HOST=redis-host
REDIS_PORT=6379
REDIS_PASSWORD=redis-password

# GitLab Integration
GITLAB_URL=https://gitlab.com
GITLAB_TOKEN=your-gitlab-token

# JWT Authentication
JWT_SECRET=your-secure-jwt-secret
JWT_EXPIRES_IN=7d

# Storage Configuration
STORAGE_TYPE=local  # or s3, gcs
STORAGE_PATH=/app/storage

# Sync Configuration
SYNC_INTERVAL_MINUTES=30
MAX_CONCURRENT_SYNC_JOBS=3
```

### Optional Environment Variables

```bash
# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/app/logs

# Performance
MAX_FILE_SIZE_MB=100
DB_MAX_CONNECTIONS=10

# Security
ALLOWED_ORIGINS=https://yourdomain.com
```

## Docker Deployment

### Quick Start with Docker Compose

1. **Clone and configure**:
   ```bash
   git clone <repository-url>
   cd TekAIContextEngine2
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Deploy**:
   ```bash
   chmod +x scripts/prod.sh
   ./scripts/prod.sh
   ```

### Manual Docker Deployment

1. **Build images**:
   ```bash
   docker build -t tekaicontext-app .
   docker build -f Dockerfile.worker -t tekaicontext-worker .
   ```

2. **Run with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

3. **Check status**:
   ```bash
   docker-compose ps
   docker-compose logs -f app
   ```

### Docker Compose Services

- **app**: Main application server
- **worker**: Background job processors (2 replicas)
- **postgres**: PostgreSQL database
- **redis**: Redis cache and queue
- **migrate**: Database migration runner

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (1.24+)
- kubectl configured
- Helm 3.x (optional)

### Using Kubernetes Manifests

1. **Create namespace**:
   ```bash
   kubectl create namespace tekaicontext
   ```

2. **Create secrets**:
   ```bash
   kubectl create secret generic tekaicontext-secrets \
     --from-literal=database-url="postgresql://..." \
     --from-literal=gitlab-token="your-token" \
     --from-literal=jwt-secret="your-secret" \
     -n tekaicontext
   ```

3. **Deploy PostgreSQL**:
   ```yaml
   # postgres.yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: postgres
     namespace: tekaicontext
   spec:
     replicas: 1
     selector:
       matchLabels:
         app: postgres
     template:
       metadata:
         labels:
           app: postgres
       spec:
         containers:
         - name: postgres
           image: postgres:15-alpine
           env:
           - name: POSTGRES_DB
             value: tekaicontextengine2
           - name: POSTGRES_USER
             value: postgres
           - name: POSTGRES_PASSWORD
             value: postgres
           ports:
           - containerPort: 5432
           volumeMounts:
           - name: postgres-storage
             mountPath: /var/lib/postgresql/data
         volumes:
         - name: postgres-storage
           persistentVolumeClaim:
             claimName: postgres-pvc
   ```

4. **Deploy Redis**:
   ```yaml
   # redis.yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: redis
     namespace: tekaicontext
   spec:
     replicas: 1
     selector:
       matchLabels:
         app: redis
     template:
       metadata:
         labels:
           app: redis
       spec:
         containers:
         - name: redis
           image: redis:7-alpine
           ports:
           - containerPort: 6379
   ```

5. **Deploy application**:
   ```yaml
   # app.yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: tekaicontext-app
     namespace: tekaicontext
   spec:
     replicas: 2
     selector:
       matchLabels:
         app: tekaicontext-app
     template:
       metadata:
         labels:
           app: tekaicontext-app
       spec:
         containers:
         - name: app
           image: tekaicontext-app:latest
           ports:
           - containerPort: 3000
           env:
           - name: DATABASE_URL
             valueFrom:
               secretKeyRef:
                 name: tekaicontext-secrets
                 key: database-url
           - name: GITLAB_TOKEN
             valueFrom:
               secretKeyRef:
                 name: tekaicontext-secrets
                 key: gitlab-token
           - name: JWT_SECRET
             valueFrom:
               secretKeyRef:
                 name: tekaicontext-secrets
                 key: jwt-secret
           livenessProbe:
             httpGet:
               path: /api/v1/health/liveness
               port: 3000
             initialDelaySeconds: 30
             periodSeconds: 10
           readinessProbe:
             httpGet:
               path: /api/v1/health/readiness
               port: 3000
             initialDelaySeconds: 5
             periodSeconds: 5
   ```

## Manual Deployment

### Server Setup

1. **Install dependencies**:
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs postgresql redis-server
   
   # CentOS/RHEL
   curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
   sudo yum install -y nodejs postgresql-server redis
   ```

2. **Setup PostgreSQL**:
   ```bash
   sudo -u postgres createuser tekaicontext
   sudo -u postgres createdb tekaicontextengine2 -O tekaicontext
   sudo -u postgres psql -c "ALTER USER tekaicontext PASSWORD 'your-password';"
   ```

3. **Setup Redis**:
   ```bash
   sudo systemctl enable redis
   sudo systemctl start redis
   ```

### Application Deployment

1. **Clone and build**:
   ```bash
   git clone <repository-url>
   cd TekAIContextEngine2
   npm ci --only=production
   npm run build
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

3. **Run database migrations**:
   ```bash
   npx prisma migrate deploy
   ```

4. **Start application**:
   ```bash
   # Using PM2 (recommended)
   npm install -g pm2
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   
   # Or using systemd
   sudo cp scripts/tekaicontext.service /etc/systemd/system/
   sudo systemctl enable tekaicontext
   sudo systemctl start tekaicontext
   ```

## Production Considerations

### Security

1. **Use HTTPS**: Configure SSL/TLS certificates
2. **Firewall**: Restrict access to necessary ports only
3. **Secrets**: Use secure secret management
4. **Updates**: Keep dependencies updated

### Performance

1. **Database**: Configure connection pooling
2. **Redis**: Configure memory limits and persistence
3. **File Storage**: Use distributed storage for scalability
4. **Load Balancing**: Use reverse proxy (nginx, HAProxy)

### Backup Strategy

1. **Database backups**:
   ```bash
   # Daily backup script
   pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
   ```

2. **File storage backups**:
   ```bash
   # Sync to backup location
   rsync -av /app/storage/ /backup/storage/
   ```

### Monitoring

1. **Health checks**: Monitor `/api/v1/health` endpoints
2. **Logs**: Centralize log collection
3. **Metrics**: Monitor system resources
4. **Alerts**: Set up alerting for critical issues

## Monitoring and Maintenance

### Health Monitoring

The application provides several health check endpoints:

- `/api/v1/health` - Basic health check
- `/api/v1/health/detailed` - Detailed system information
- `/api/v1/health/readiness` - Kubernetes readiness probe
- `/api/v1/health/liveness` - Kubernetes liveness probe

### Log Management

Logs are written to:
- Console (development)
- Files in `/app/logs` (production)
- Structured JSON format for parsing

### Maintenance Tasks

1. **Database maintenance**:
   ```bash
   # Vacuum and analyze
   psql $DATABASE_URL -c "VACUUM ANALYZE;"
   ```

2. **Log rotation**:
   ```bash
   # Rotate logs older than 30 days
   find /app/logs -name "*.log" -mtime +30 -delete
   ```

3. **Storage cleanup**:
   ```bash
   # Clean temporary files
   find /app/storage/temp -mtime +1 -delete
   ```

### Scaling

1. **Horizontal scaling**: Add more app instances
2. **Worker scaling**: Increase worker replicas
3. **Database scaling**: Use read replicas
4. **Storage scaling**: Use distributed storage

For more detailed information, see the [API Documentation](./API.md) and [Architecture Guide](./ARCHITECTURE.md).
