# TekAI Context Engine 2.0

A production-ready Context Engine for LLM with project-based structure and GitLab integration, built with TypeScript and NestJS.

## 🚀 Features

- **Project-Based Architecture**: Organize codebases within projects for better management
- **GitLab Integration**: Automatic fetching and synchronization of codebases from GitLab repositories
- **Advanced Code Analysis**: Multi-technology codegraph indexing with SCIP, Tree-sitter, and vector embeddings
- **Semantic Search**: AI-powered code search and similarity matching
- **Real-time Sync**: Background job processing with Bull/BullMQ for automated synchronization
- **File Management**: Intelligent file scanning, hashing, and change detection
- **RESTful API**: Comprehensive REST API with Swagger documentation
- **Health Monitoring**: Built-in health checks and monitoring endpoints
- **Scalable Storage**: Configurable storage backends (local, S3, GCS) with BadgerDB for fast indexing
- **Caching**: Redis-based caching for improved performance
- **Docker Support**: Full Docker and Docker Compose support for easy deployment

## 🏗️ Architecture

### Core Components

- **Projects**: Top-level containers for organizing related codebases
- **Codebases**: Individual GitLab repositories within projects
- **Files**: Individual files within codebases with metadata and content
- **Sync Jobs**: Background tasks for repository synchronization
- **Codegraph**: Advanced code analysis with SCIP, Tree-sitter, and embeddings
- **Storage**: File content storage and caching layer with BadgerDB indexing

### Technology Stack

- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with TypeORM
- **Cache/Queue**: Redis with Bull/BullMQ
- **GitLab Integration**: GitBeaker REST client
- **Code Analysis**: SCIP tools, Tree-sitter parsers, vector embeddings
- **Fast Storage**: BadgerDB for high-performance key-value operations
- **API Documentation**: Swagger/OpenAPI
- **Containerization**: Docker and Docker Compose

## 📋 Prerequisites

- Node.js 20+
- Docker and Docker Compose
- PostgreSQL 15+
- Redis 7+
- GitLab access token

## 🛠️ Installation

### Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TekAIContextEngine2
   ```

2. **Run setup script**
   ```bash
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development environment**
   ```bash
   chmod +x scripts/dev.sh
   ./scripts/dev.sh
   ```

### Manual Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup database**
   ```bash
   # Start PostgreSQL and Redis
   docker-compose up postgres redis -d
   
   # Run migrations
   npm run db:migrate
   
   # Seed database
   npm run db:seed
   ```

3. **Start the application**
   ```bash
   # Development mode
   npm run start:dev
   
   # Production mode
   npm run build
   npm run start:prod
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Application port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `GITLAB_URL` | GitLab instance URL | `https://gitlab.com` |
| `GITLAB_TOKEN` | GitLab access token | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `STORAGE_TYPE` | Storage backend (`local`, `s3`, `gcs`) | `local` |
| `STORAGE_PATH` | Local storage path | `./storage` |
| `SYNC_INTERVAL_MINUTES` | Auto-sync interval | `30` |
| `MAX_FILE_SIZE_MB` | Maximum file size | `100` |

### GitLab Configuration

1. Create a GitLab access token with `read_repository` scope
2. Set the `GITLAB_TOKEN` environment variable
3. Configure `GITLAB_URL` if using a self-hosted GitLab instance

## 📚 API Documentation

Once the application is running, visit:
- **Swagger UI**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/api/v1/health

### Key Endpoints

#### Projects
- `GET /api/v1/projects` - List projects
- `POST /api/v1/projects` - Create project
- `GET /api/v1/projects/:id` - Get project details
- `PATCH /api/v1/projects/:id` - Update project
- `DELETE /api/v1/projects/:id` - Delete project

#### Codebases
- `GET /api/v1/codebases` - List codebases
- `POST /api/v1/codebases/projects/:projectId` - Create codebase
- `GET /api/v1/codebases/:id` - Get codebase details
- `POST /api/v1/codebases/:id/sync` - Trigger sync
- `GET /api/v1/codebases/:id/stats` - Get statistics

#### Sync Jobs
- `GET /api/v1/sync/jobs` - List sync jobs
- `POST /api/v1/sync/jobs/:codebaseId` - Create sync job
- `GET /api/v1/sync/jobs/:id` - Get job details
- `DELETE /api/v1/sync/jobs/:id` - Cancel job

## 🔄 Synchronization

### Automatic Sync
- Runs every 30 minutes by default (configurable)
- Processes codebases that haven't been synced recently
- Handles incremental updates efficiently

### Manual Sync
- Trigger via API endpoints
- Support for full resync or incremental sync
- Real-time progress tracking

### Sync Types
- **Initial Sync**: Full repository scan and file ingestion
- **Incremental Sync**: Only process changed files
- **Full Resync**: Complete re-scan of repository
- **Cleanup**: Remove orphaned files and data

## 🐳 Docker Deployment

### Development
```bash
docker-compose -f docker-compose.dev.yml up
```

### Production
```bash
# Set required environment variables
export GITLAB_TOKEN=your_token_here
export JWT_SECRET=your_secret_here

# Deploy
docker-compose up -d
```

### Services
- **app**: Main application server
- **worker**: Background job processor (2 replicas)
- **postgres**: PostgreSQL database
- **redis**: Redis cache and queue
- **migrate**: Database migration runner

## 🔍 Codegraph Analysis

TekAI Context Engine 2.0 includes advanced code analysis capabilities through the Codegraph module:

### Features
- **Multi-Technology Analysis**: Combines SCIP, Tree-sitter, and vector embeddings
- **Semantic Search**: AI-powered code search and similarity matching
- **Symbol Relationships**: Understand code dependencies and relationships
- **Multi-Language Support**: TypeScript, Python, Go, Java, Rust, and more
- **Real-time Indexing**: Automatic indexing triggered by code changes

### Quick Start
```bash
# Create an indexing job
curl -X POST "http://localhost:3000/api/v1/codegraph/{codebaseId}/index" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"taskType": "CODEGRAPH", "priority": 5}'

# Search code semantically
curl "http://localhost:3000/api/v1/codegraph/{codebaseId}/search?query=authentication%20function&type=semantic"

# Get indexing metrics
curl "http://localhost:3000/api/v1/codegraph/metrics"
```

### Documentation
- [Codegraph Overview](./docs/codegraph/README.md)
- [API Reference](./docs/codegraph/API.md)
- [Architecture Guide](./docs/codegraph/ARCHITECTURE.md)

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Codegraph-specific tests
npm run test -- --testPathPattern=codegraph
```

## 📊 Monitoring

### Health Checks
- `/api/v1/health` - Basic health status
- `/api/v1/health/detailed` - Detailed system information
- `/api/v1/health/readiness` - Readiness probe
- `/api/v1/health/liveness` - Liveness probe

### Metrics
- Database connection status
- Redis connection status
- Storage statistics
- Queue statistics
- Codegraph indexing performance
- SCIP tools availability
- BadgerDB storage metrics
- System resource usage

## 🔒 Security

- JWT-based authentication (planned)
- Role-based access control
- Input validation and sanitization
- Rate limiting (planned)
- CORS configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
1. Check the documentation
2. Search existing issues
3. Create a new issue with detailed information

---

**TekAI Context Engine 2.0** - Built with ❤️ using TypeScript and NestJS
