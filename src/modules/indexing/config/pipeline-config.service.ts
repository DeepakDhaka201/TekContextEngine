import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IndexPipelineType, IndexPipelineConfig } from '../entities/index-pipeline.entity';

@Injectable()
export class PipelineConfigService {
  constructor(private configService: ConfigService) {}

  /**
   * Get default configuration for a pipeline type
   */
  getDefaultConfiguration(
    pipelineType: IndexPipelineType,
    customConfig?: Partial<IndexPipelineConfig>
  ): IndexPipelineConfig {
    const baseConfig = this.createBaseConfiguration(pipelineType);
    
    // Apply pipeline type specific overrides
    this.applyPipelineTypeOverrides(baseConfig, pipelineType);
    
    // Merge with custom configuration if provided
    if (customConfig) {
      return this.deepMerge(baseConfig, customConfig);
    }
    
    return baseConfig;
  }

  /**
   * Create base configuration with environment variable defaults
   */
  private createBaseConfiguration(pipelineType: IndexPipelineType): IndexPipelineConfig {
    return {
      // Git Sync Configuration
      gitSync: {
        baseCommit: undefined,
        targetCommit: undefined,
        incrementalMode: pipelineType === IndexPipelineType.INCREMENTAL,
        includeDeleted: this.configService.get('GIT_SYNC_INCLUDE_DELETED', true),
        maxFileSize: this.configService.get('GIT_SYNC_MAX_FILE_SIZE', 50 * 1024 * 1024),
        excludePatterns: this.configService.get('GIT_SYNC_EXCLUDE_PATTERNS', [
          'node_modules/**',
          '.git/**',
          'dist/**',
          'build/**',
          '*.log',
          '*.tmp',
          '.idea/**',
          '.vscode/**',
          '*.class',
          '*.jar',
          '*.war',
          'target/**',
          '__pycache__/**',
          '*.pyc',
          '.pytest_cache/**',
        ]),
        timeout: this.configService.get('GIT_SYNC_TIMEOUT', 300000), // 5 minutes
        shallow: this.configService.get('GIT_SYNC_SHALLOW', false),
      },

      // Docker Configuration
      docker: {
        enabled: this.configService.get('DOCKER_ENABLED', true),
        networkMode: this.configService.get('DOCKER_NETWORK_MODE', 'bridge'),
        memoryLimit: this.configService.get('DOCKER_MEMORY_LIMIT', '2g'),
        cpuLimit: this.configService.get('DOCKER_CPU_LIMIT', '1.5'),
        timeout: this.configService.get('DOCKER_TIMEOUT', 600000), // 10 minutes
        registry: this.configService.get('DOCKER_REGISTRY', ''),
        pullPolicy: this.configService.get('DOCKER_PULL_POLICY', 'if-not-present') as 'always' | 'if-not-present' | 'never',
        cleanup: this.configService.get('DOCKER_CLEANUP', true),
      },

      // Language-Specific Parsing
      parsing: {
        languages: {
          java: {
            enabled: this.configService.get('PARSING_JAVA_ENABLED', true),
            dockerImage: this.configService.get('DOCKER_IMAGE_JAVA', 'tekai/java-parser:latest'),
            jvmOptions: this.configService.get('PARSING_JAVA_JVM_OPTIONS', ['-Xmx1g', '-XX:+UseG1GC']),
          },
          typescript: {
            enabled: this.configService.get('PARSING_TS_ENABLED', true),
            dockerImage: this.configService.get('DOCKER_IMAGE_TS', 'tekai/ts-parser:latest'),
            nodeOptions: this.configService.get('PARSING_TS_NODE_OPTIONS', ['--max-old-space-size=2048']),
          },
          python: {
            enabled: this.configService.get('PARSING_PYTHON_ENABLED', true),
            dockerImage: this.configService.get('DOCKER_IMAGE_PYTHON', 'tekai/python-parser:latest'),
            pythonPath: this.configService.get('PARSING_PYTHON_PATH', '/usr/bin/python3'),
          },
          go: {
            enabled: this.configService.get('PARSING_GO_ENABLED', true),
            dockerImage: this.configService.get('DOCKER_IMAGE_GO', 'tekai/go-parser:latest'),
            goModules: this.configService.get('PARSING_GO_MODULES', true),
          },
          rust: {
            enabled: this.configService.get('PARSING_RUST_ENABLED', true),
            dockerImage: this.configService.get('DOCKER_IMAGE_RUST', 'tekai/rust-parser:latest'),
            cargoFeatures: this.configService.get('PARSING_RUST_FEATURES', []),
          },
        },
        outputFormat: this.configService.get('PARSING_OUTPUT_FORMAT', 'json') as 'json' | 'protobuf',
        includePrivate: this.configService.get('PARSING_INCLUDE_PRIVATE', true),
        includeComments: this.configService.get('PARSING_INCLUDE_COMMENTS', true),
        includeTests: this.configService.get('PARSING_INCLUDE_TESTS', true),
        maxFileSize: this.configService.get('PARSING_MAX_FILE_SIZE', 10 * 1024 * 1024), // 10MB
      },

      // Neo4j Configuration
      graph: {
        url: this.configService.get('NEO4J_URL', 'bolt://localhost:7687'),
        username: this.configService.get('NEO4J_USERNAME', 'neo4j'),
        password: this.configService.get('NEO4J_PASSWORD', 'password'),
        database: this.configService.get('NEO4J_DATABASE', 'neo4j'),
        batchSize: this.configService.get('NEO4J_BATCH_SIZE', 100),
        enableVectorIndex: this.configService.get('NEO4J_VECTOR_INDEX', true),
        vectorDimensions: this.configService.get('NEO4J_VECTOR_DIMENSIONS', 768),
        indexingMode: this.configService.get('NEO4J_INDEXING_MODE', 'sync') as 'sync' | 'async',
        retainHistory: this.configService.get('NEO4J_RETAIN_HISTORY', false),
        schema: {
          nodeLabels: this.configService.get('NEO4J_NODE_LABELS', [
            'Project',
            'Codebase',
            'File',
            'Class',
            'Interface',
            'Method',
            'Function',
            'Variable',
            'Constant',
            'Enum',
            'Package',
            'Module',
            'Namespace',
          ]),
          relationshipTypes: this.configService.get('NEO4J_RELATIONSHIP_TYPES', [
            'CONTAINS',
            'DEFINES',
            'EXTENDS',
            'IMPLEMENTS',
            'CALLS',
            'USES',
            'DEPENDS_ON',
            'IMPORTS',
            'OVERRIDES',
            'THROWS',
            'RETURNS',
            'PARAMETERS',
          ]),
        },
      },

      // Performance/Scaling
      performance: {
        maxConcurrentTasks: this.configService.get('PERFORMANCE_MAX_CONCURRENT', 4),
        taskTimeout: this.configService.get('PERFORMANCE_TASK_TIMEOUT', 1800000), // 30 minutes
        memoryLimit: this.configService.get('PERFORMANCE_MEMORY_LIMIT', '4g'),
        tempDirCleanup: this.configService.get('PERFORMANCE_TEMP_CLEANUP', true),
        enableMetrics: this.configService.get('PERFORMANCE_ENABLE_METRICS', true),
        logLevel: this.configService.get('PERFORMANCE_LOG_LEVEL', 'info') as 'debug' | 'info' | 'warn' | 'error',
        enableProfiling: this.configService.get('PERFORMANCE_ENABLE_PROFILING', false),
        checkpointInterval: this.configService.get('PERFORMANCE_CHECKPOINT_INTERVAL', 300000), // 5 minutes
      },

      // File Processing
      files: {
        includePaths: this.configService.get('FILES_INCLUDE_PATHS', ['**/*']),
        excludePaths: this.configService.get('FILES_EXCLUDE_PATHS', [
          'node_modules/**',
          '.git/**',
          'dist/**',
          'build/**',
          'target/**',
          'out/**',
          'bin/**',
          '__pycache__/**',
          '.pytest_cache/**',
          '.idea/**',
          '.vscode/**',
          '**/*.log',
          '**/*.tmp',
          '**/*.temp',
          '**/*.class',
          '**/*.jar',
          '**/*.war',
          '**/*.pyc',
          '**/*.pyo',
          '**/*.so',
          '**/*.dll',
          '**/*.exe',
          '**/.*',
        ]),
        supportedExtensions: this.configService.get('FILES_SUPPORTED_EXTENSIONS', [
          '.js',
          '.jsx',
          '.ts',
          '.tsx',
          '.java',
          '.py',
          '.go',
          '.rs',
          '.cpp',
          '.cc',
          '.cxx',
          '.c',
          '.h',
          '.hpp',
          '.cs',
          '.php',
          '.rb',
          '.kt',
          '.scala',
          '.swift',
          '.m',
          '.mm',
          '.sql',
          '.sh',
          '.bash',
          '.ps1',
          '.yaml',
          '.yml',
          '.json',
          '.xml',
          '.md',
          '.txt',
        ]),
        encoding: this.configService.get('FILES_ENCODING', 'utf-8'),
        detectBinary: this.configService.get('FILES_DETECT_BINARY', true),
        maxDepth: this.configService.get('FILES_MAX_DEPTH', 20),
      },

      // Retry/Recovery
      retry: {
        maxRetries: this.configService.get('RETRY_MAX_RETRIES', 3),
        retryDelay: this.configService.get('RETRY_DELAY', 5000), // 5 seconds
        exponentialBackoff: this.configService.get('RETRY_EXPONENTIAL_BACKOFF', true),
        retryableErrors: this.configService.get('RETRY_RETRYABLE_ERRORS', [
          'ECONNRESET',
          'ETIMEDOUT',
          'ENOTFOUND',
          'ECONNREFUSED',
          'EHOSTUNREACH',
          'timeout',
          'network',
          'connection',
        ]),
        failureThreshold: this.configService.get('RETRY_FAILURE_THRESHOLD', 50), // 50% failure rate
      },
    };
  }

  /**
   * Apply pipeline type specific configuration overrides
   */
  private applyPipelineTypeOverrides(config: IndexPipelineConfig, pipelineType: IndexPipelineType): void {
    switch (pipelineType) {
      case IndexPipelineType.FULL:
        // Full indexing configuration
        config.gitSync.shallow = false;
        config.gitSync.incrementalMode = false;
        config.performance.maxConcurrentTasks = Math.max(config.performance.maxConcurrentTasks, 2);
        break;

      case IndexPipelineType.INCREMENTAL:
        // Incremental indexing configuration
        config.gitSync.incrementalMode = true;
        config.gitSync.shallow = true;
        config.performance.taskTimeout = Math.min(config.performance.taskTimeout, 900000); // 15 minutes max
        break;

      case IndexPipelineType.DOCUMENT:
        // Document-only processing
        config.parsing.languages.java.enabled = false;
        config.parsing.languages.typescript.enabled = false;
        config.parsing.languages.python.enabled = false;
        config.parsing.languages.go.enabled = false;
        config.parsing.languages.rust.enabled = false;
        config.files.supportedExtensions = ['.md', '.txt', '.pdf', '.doc', '.docx'];
        config.gitSync.incrementalMode = false;
        break;

      case IndexPipelineType.ANALYSIS:
        // Analysis-only processing
        config.gitSync.shallow = true;
        config.parsing.includeComments = false;
        config.parsing.includeTests = false;
        config.performance.maxConcurrentTasks = 1; // Single threaded for analysis
        break;
    }
  }

  /**
   * Validate configuration
   */
  validateConfiguration(config: IndexPipelineConfig): string[] {
    const errors: string[] = [];

    // Validate Git sync
    if (config.gitSync.maxFileSize <= 0) {
      errors.push('Git sync max file size must be positive');
    }

    if (config.gitSync.timeout <= 0) {
      errors.push('Git sync timeout must be positive');
    }

    // Validate Docker
    if (config.docker.enabled) {
      if (!config.docker.memoryLimit.match(/^\d+[kmg]$/i)) {
        errors.push('Docker memory limit must be in format like 2g, 512m, etc.');
      }

      if (parseFloat(config.docker.cpuLimit) <= 0) {
        errors.push('Docker CPU limit must be positive');
      }
    }

    // Validate Neo4j
    try {
      new URL(config.graph.url);
    } catch {
      errors.push('Graph URL must be a valid URL');
    }

    if (!config.graph.username || !config.graph.password) {
      errors.push('Graph username and password are required');
    }

    if (config.graph.batchSize <= 0) {
      errors.push('Graph batch size must be positive');
    }

    // Validate performance
    if (config.performance.maxConcurrentTasks <= 0) {
      errors.push('Max concurrent tasks must be positive');
    }

    if (config.performance.taskTimeout <= 0) {
      errors.push('Task timeout must be positive');
    }

    // Validate files
    if (config.files.maxDepth <= 0) {
      errors.push('File max depth must be positive');
    }

    if (config.files.supportedExtensions.length === 0) {
      errors.push('At least one supported file extension is required');
    }

    // Validate retry
    if (config.retry.maxRetries < 0) {
      errors.push('Max retries cannot be negative');
    }

    if (config.retry.retryDelay <= 0) {
      errors.push('Retry delay must be positive');
    }

    if (config.retry.failureThreshold < 0 || config.retry.failureThreshold > 100) {
      errors.push('Failure threshold must be between 0 and 100');
    }

    return errors;
  }

  /**
   * Get configuration for a specific environment
   */
  getEnvironmentConfiguration(environment: 'development' | 'staging' | 'production'): any {
    switch (environment) {
      case 'development':
        return {
          docker: {
            enabled: false, // Use local tools in development
            cleanup: false,
          },
          performance: {
            maxConcurrentTasks: 2,
            enableProfiling: true,
            logLevel: 'debug',
          },
          retry: {
            maxRetries: 1,
            retryDelay: 1000,
          },
        };

      case 'staging':
        return {
          performance: {
            maxConcurrentTasks: 3,
            logLevel: 'info',
          },
          retry: {
            maxRetries: 2,
          },
        };

      case 'production':
        return {
          performance: {
            maxConcurrentTasks: 6,
            logLevel: 'warn',
            enableMetrics: true,
          },
          retry: {
            maxRetries: 3,
            exponentialBackoff: true,
          },
          docker: {
            cleanup: true,
          },
        };

      default:
        return {};
    }
  }

  /**
   * Deep merge configuration objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
}