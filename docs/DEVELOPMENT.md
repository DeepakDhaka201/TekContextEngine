# Development Guide

This guide covers setting up the development environment and contributing to TekAI Context Engine 2.0.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Quality](#code-quality)
- [Contributing](#contributing)

## Prerequisites

### Required Software

- **Node.js**: 20.x or higher
- **npm**: 9.x or higher
- **PostgreSQL**: 15.x or higher
- **Redis**: 7.x or higher
- **Git**: Latest version
- **Docker**: 24.x or higher (optional)

### Development Tools

- **VS Code**: Recommended IDE
- **Postman/Insomnia**: API testing
- **GitLab account**: For testing integrations

## Development Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd TekAIContextEngine2
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit with your configuration
nano .env
```

**Required environment variables:**
```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tekaicontextengine2_dev?schema=public

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# GitLab (get token from GitLab settings)
GITLAB_URL=https://gitlab.com
GITLAB_TOKEN=your-gitlab-token

# JWT
JWT_SECRET=your-development-jwt-secret

# Storage
STORAGE_TYPE=local
STORAGE_PATH=./storage

# Logging
LOG_LEVEL=debug
```

### 4. Database Setup

```bash
# Start PostgreSQL (if not running)
sudo systemctl start postgresql

# Create development database
createdb tekaicontextengine2_dev

# Run migrations
npm run db:migrate

# Seed database (optional)
npm run db:seed
```

### 5. Redis Setup

```bash
# Start Redis (if not running)
sudo systemctl start redis

# Verify Redis is running
redis-cli ping
```

### 6. Start Development Server

```bash
# Start in development mode with hot reload
npm run start:dev

# Or start with debug mode
npm run start:debug
```

The application will be available at:
- **API**: http://localhost:3000/api/v1
- **Documentation**: http://localhost:3000/api/docs
- **Health**: http://localhost:3000/api/v1/health

### 7. Docker Development (Alternative)

```bash
# Start development environment with Docker
chmod +x scripts/dev.sh
./scripts/dev.sh
```

## Project Structure

```
TekAIContextEngine2/
├── src/                          # Source code
│   ├── app.module.ts            # Main application module
│   ├── main.ts                  # Application entry point
│   ├── worker.ts                # Background worker entry
│   ├── common/                  # Shared utilities
│   │   ├── dto/                 # Data transfer objects
│   │   ├── types/               # TypeScript types
│   │   └── utils/               # Utility functions
│   ├── config/                  # Configuration services
│   │   ├── app.config.ts        # Application configuration
│   │   ├── logger.config.ts     # Logging configuration
│   │   └── validation.schema.ts # Environment validation
│   ├── modules/                 # Feature modules
│   │   ├── auth/                # Authentication
│   │   ├── project/             # Project management
│   │   ├── codebase/            # Codebase operations
│   │   ├── sync/                # Synchronization
│   │   ├── file/                # File management
│   │   ├── gitlab/              # GitLab integration
│   │   ├── health/              # Health monitoring
│   │   └── websocket/           # Real-time updates
│   └── shared/                  # Shared modules
│       ├── database/            # Database configuration
│       ├── storage/             # Storage services
│       └── monitoring/          # Monitoring services
├── prisma/                      # Database schema and migrations
├── test/                        # Test files
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   └── e2e/                     # End-to-end tests
├── docs/                        # Documentation
├── scripts/                     # Utility scripts
└── docker/                      # Docker configurations
```

### Module Structure

Each feature module follows this structure:

```
module-name/
├── module-name.module.ts        # Module definition
├── module-name.controller.ts    # REST API endpoints
├── module-name.service.ts       # Business logic
├── dto/                         # Data transfer objects
│   ├── create-module.dto.ts
│   ├── update-module.dto.ts
│   └── module-response.dto.ts
├── guards/                      # Authorization guards
├── decorators/                  # Custom decorators
└── interfaces/                  # TypeScript interfaces
```

## Development Workflow

### 1. Feature Development

1. **Create feature branch**:
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Implement feature**:
   - Add/modify modules
   - Write tests
   - Update documentation

3. **Test changes**:
   ```bash
   npm run test
   npm run test:e2e
   ```

4. **Commit changes**:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

### 2. Database Changes

1. **Modify Prisma schema**:
   ```bash
   # Edit prisma/schema.prisma
   nano prisma/schema.prisma
   ```

2. **Generate migration**:
   ```bash
   npx prisma migrate dev --name migration-name
   ```

3. **Update Prisma client**:
   ```bash
   npx prisma generate
   ```

### 3. Adding New Endpoints

1. **Create DTO classes**:
   ```typescript
   // dto/create-item.dto.ts
   export class CreateItemDto {
     @IsString()
     name: string;
   }
   ```

2. **Add controller methods**:
   ```typescript
   @Post()
   async create(@Body() createDto: CreateItemDto) {
     return this.service.create(createDto);
   }
   ```

3. **Implement service logic**:
   ```typescript
   async create(createDto: CreateItemDto) {
     return this.prisma.item.create({
       data: createDto,
     });
   }
   ```

4. **Add tests**:
   ```typescript
   describe('create', () => {
     it('should create item', async () => {
       // Test implementation
     });
   });
   ```

### 4. Background Jobs

1. **Define job processor**:
   ```typescript
   @Process('job-name')
   async handleJob(job: Job<JobData>) {
     // Job implementation
   }
   ```

2. **Queue job**:
   ```typescript
   await this.queue.add('job-name', jobData);
   ```

3. **Test job processing**:
   ```typescript
   // Test job execution
   ```

## Testing

### Running Tests

```bash
# All tests
npm run test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

### Writing Tests

#### Unit Tests

```typescript
// service.spec.ts
describe('ServiceName', () => {
  let service: ServiceName;
  let mockRepository: jest.Mocked<Repository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ServiceName,
        {
          provide: Repository,
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ServiceName>(ServiceName);
    mockRepository = module.get(Repository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

#### Integration Tests

```typescript
// controller.e2e-spec.ts
describe('Controller (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/endpoint (GET)', () => {
    return request(app.getHttpServer())
      .get('/endpoint')
      .expect(200);
  });
});
```

### Test Database

Tests use a separate test database:

```bash
# Setup test database
createdb tekaicontextengine2_test

# Run tests with test database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tekaicontextengine2_test" npm run test
```

## Code Quality

### Linting

```bash
# Run ESLint
npm run lint

# Fix linting issues
npm run lint:fix
```

### Formatting

```bash
# Format code with Prettier
npm run format
```

### Type Checking

```bash
# Run TypeScript compiler
npm run build

# Type check without compilation
npx tsc --noEmit
```

### Pre-commit Hooks

The project uses Husky for pre-commit hooks:

```bash
# Install Husky
npm run prepare

# Hooks will run automatically on commit
git commit -m "commit message"
```

## Contributing

### Code Style

- Use TypeScript for all code
- Follow ESLint and Prettier configurations
- Write meaningful commit messages
- Add JSDoc comments for public APIs
- Use descriptive variable and function names

### Commit Messages

Follow conventional commit format:

```
type(scope): description

feat(auth): add JWT authentication
fix(sync): resolve file processing issue
docs(api): update endpoint documentation
test(project): add unit tests for service
```

### Pull Request Process

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Ensure all tests pass
5. Update documentation
6. Submit pull request

### Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No breaking changes (or properly documented)
- [ ] Performance impact considered
- [ ] Security implications reviewed

## Debugging

### VS Code Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug NestJS",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/main.ts",
      "runtimeArgs": ["-r", "ts-node/register"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal"
    }
  ]
}
```

### Logging

Use the built-in logger:

```typescript
import { Logger } from '@nestjs/common';

export class MyService {
  private readonly logger = new Logger(MyService.name);

  someMethod() {
    this.logger.log('Info message');
    this.logger.warn('Warning message');
    this.logger.error('Error message');
    this.logger.debug('Debug message');
  }
}
```

### Database Debugging

```bash
# View database with Prisma Studio
npx prisma studio

# Reset database
npx prisma migrate reset

# View migration status
npx prisma migrate status
```

For more information, see the [API Documentation](./API.md) and [Architecture Guide](./ARCHITECTURE.md).
