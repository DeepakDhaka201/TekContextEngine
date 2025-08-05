import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TaskConfig,
  GitSyncConfig,
  CodeParsingConfig,
  GraphUpdateConfig,
  DocProcessingConfig,
  AnalysisConfig,
  IndexJobType,
} from '../entities/index-job.entity';

@Injectable()
export class TaskConfigService {
  constructor(private configService: ConfigService) {}

  /**
   * Get configuration for a specific task
   */
  getTaskConfig<T extends TaskConfig>(
    taskName: string,
    jobType: IndexJobType,
    customConfig?: Partial<T>
  ): T {
    const baseConfig = this.getBaseTaskConfig(taskName, jobType);
    
    if (customConfig) {
      return this.deepMerge(baseConfig, customConfig) as T;
    }
    
    return baseConfig as T;
  }

  /**
   * Get Git Sync configuration
   */
  getGitSyncConfig(jobType: IndexJobType, customConfig?: Partial<GitSyncConfig>): GitSyncConfig {
    const baseConfig: GitSyncConfig = {
      enabled: true,
      timeout: this.configService.get('GIT_SYNC_TIMEOUT', 300000), // 5 minutes
      retries: this.configService.get('GIT_SYNC_RETRIES', 3),
      baseCommit: undefined,
      targetCommit: undefined,
      incrementalMode: jobType === IndexJobType.CODEBASE_INCR,
      includeDeleted: this.configService.get('GIT_SYNC_INCLUDE_DELETED', true),
      maxFileSize: this.configService.get('GIT_SYNC_MAX_FILE_SIZE', 50 * 1024 * 1024), // 50MB
      excludePatterns: this.configService.get('GIT_SYNC_EXCLUDE_PATTERNS', [
        'node_modules/**',
        '.git/**',
        'dist/**',
        'build/**',
        '*.log',
        '*.tmp',
        '.idea/**',
        '.vscode/**',
        '__pycache__/**',
        '*.pyc',
        'target/**',
      ]),
      shallow: false, // Never use shallow for incremental - need full history for diffs
    };

    return customConfig ? this.deepMerge(baseConfig, customConfig) : baseConfig;
  }

  /**
   * Get Code Parsing configuration
   */
  getCodeParsingConfig(_jobType: IndexJobType, customConfig?: Partial<CodeParsingConfig>): CodeParsingConfig {
    const baseConfig: CodeParsingConfig = {
      enabled: true,
      timeout: this.configService.get('CODE_PARSING_TIMEOUT', 600000), // 10 minutes
      retries: this.configService.get('CODE_PARSING_RETRIES', 2),
      languages: {
        java: {
          enabled: this.configService.get('PARSING_JAVA_ENABLED', true),
          dockerImage: this.configService.get('DOCKER_IMAGE_JAVA', 'tekai/java-parser:latest'),
          options: this.configService.get('PARSING_JAVA_JVM_OPTIONS', ['-Xmx1g', '-XX:+UseG1GC']),
        },
        typescript: {
          enabled: this.configService.get('PARSING_TS_ENABLED', true),
          dockerImage: this.configService.get('DOCKER_IMAGE_TS', 'tekai/ts-parser:latest'),
          options: this.configService.get('PARSING_TS_NODE_OPTIONS', ['--max-old-space-size=2048']),
        },
      },
      outputFormat: this.configService.get('PARSING_OUTPUT_FORMAT', 'json') as 'json' | 'protobuf',
      maxFileSize: this.configService.get('PARSING_MAX_FILE_SIZE', 10 * 1024 * 1024), // 10MB
    };

    return customConfig ? this.deepMerge(baseConfig, customConfig) : baseConfig;
  }

  /**
   * Get Graph Update configuration
   */
  getGraphUpdateConfig(_jobType: IndexJobType, customConfig?: Partial<GraphUpdateConfig>): GraphUpdateConfig {
    const baseConfig: GraphUpdateConfig = {
      enabled: true,
      timeout: this.configService.get('GRAPH_UPDATE_TIMEOUT', 900000), // 15 minutes
      retries: this.configService.get('GRAPH_UPDATE_RETRIES', 2),
      url: this.configService.get('NEO4J_URL', 'bolt://localhost:7687'),
      username: this.configService.get('NEO4J_USERNAME', 'neo4j'),
      password: this.configService.get('NEO4J_PASSWORD', 'password'),
      database: this.configService.get('NEO4J_DATABASE', 'neo4j'),
      batchSize: this.configService.get('NEO4J_BATCH_SIZE', 100),
      enableVectorIndex: this.configService.get('NEO4J_VECTOR_INDEX', true),
      vectorDimensions: this.configService.get('NEO4J_VECTOR_DIMENSIONS', 768),
      indexingMode: this.configService.get('NEO4J_INDEXING_MODE', 'sync') as 'sync' | 'async',
    };

    return customConfig ? this.deepMerge(baseConfig, customConfig) : baseConfig;
  }

  /**
   * Get Document Processing configuration
   */
  getDocProcessingConfig(_jobType: IndexJobType, customConfig?: Partial<DocProcessingConfig>): DocProcessingConfig {
    const baseConfig: DocProcessingConfig = {
      enabled: true,
      timeout: this.configService.get('DOC_PROCESSING_TIMEOUT', 600000), // 10 minutes
      retries: this.configService.get('DOC_PROCESSING_RETRIES', 2),
      supportedFormats: this.configService.get('DOC_SUPPORTED_FORMATS', [
        '.md', '.txt', '.pdf', '.doc', '.docx', '.html', '.rst'
      ]),
      extractText: this.configService.get('DOC_EXTRACT_TEXT', true),
      extractMetadata: this.configService.get('DOC_EXTRACT_METADATA', true),
      chunkSize: this.configService.get('DOC_CHUNK_SIZE', 1000),
    };

    return customConfig ? this.deepMerge(baseConfig, customConfig) : baseConfig;
  }

  /**
   * Get Analysis configuration
   */
  getAnalysisConfig(jobType: IndexJobType, customConfig?: Partial<AnalysisConfig>): AnalysisConfig {
    const analysisType = jobType === IndexJobType.API_ANALYSIS ? 'api' : 'userflow';
    
    const baseConfig: AnalysisConfig = {
      enabled: true,
      timeout: this.configService.get('ANALYSIS_TIMEOUT', 1800000), // 30 minutes
      retries: this.configService.get('ANALYSIS_RETRIES', 1),
      analysisType: analysisType as 'api' | 'userflow' | 'dependency',
      depth: this.configService.get('ANALYSIS_DEPTH', 3),
      includeExternal: this.configService.get('ANALYSIS_INCLUDE_EXTERNAL', false),
    };

    return customConfig ? this.deepMerge(baseConfig, customConfig) : baseConfig;
  }

  /**
   * Get base task configuration
   */
  private getBaseTaskConfig(taskName: string, _jobType: IndexJobType): TaskConfig {
    const envPrefix = `${taskName.toUpperCase()}_`;
    
    return {
      enabled: this.configService.get(`${envPrefix}ENABLED`, true),
      timeout: this.configService.get(`${envPrefix}TIMEOUT`, 300000), // 5 minutes default
      retries: this.configService.get(`${envPrefix}RETRIES`, 2),
    };
  }

  /**
   * Validate task configuration
   */
  validateTaskConfig(taskName: string, config: TaskConfig): string[] {
    const errors: string[] = [];

    if (config.timeout && config.timeout <= 0) {
      errors.push(`${taskName}: timeout must be positive`);
    }

    if (config.retries && config.retries < 0) {
      errors.push(`${taskName}: retries cannot be negative`);
    }

    // Task-specific validations
    if (taskName === 'GIT_SYNC') {
      const gitConfig = config as GitSyncConfig;
      if (gitConfig.maxFileSize <= 0) {
        errors.push('GIT_SYNC: maxFileSize must be positive');
      }
    }

    if (taskName === 'GRAPH_UPDATE') {
      const graphConfig = config as GraphUpdateConfig;
      try {
        new URL(graphConfig.url);
      } catch {
        errors.push('GRAPH_UPDATE: url must be a valid URL');
      }
      
      if (!graphConfig.username || !graphConfig.password) {
        errors.push('GRAPH_UPDATE: username and password are required');
      }
    }

    return errors;
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
