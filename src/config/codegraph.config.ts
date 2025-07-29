import { ConfigService } from '@nestjs/config';

export interface ScipToolsConfig {
  typescript: string;
  javascript: string;
  java: string;
  python: string;
  go: string;
  rust: string;
  cpp: string;
  csharp: string;
}

export interface CodegraphIndexingConfig {
  scipTimeout: number;
  treeSitterTimeout: number;
  batchSize: number;
  enableScipAnalysis: boolean;
  enableTreeSitterParsing: boolean;
  enableSymbolExtraction: boolean;
  badgerDbBaseDir: string;
}

export interface CodegraphConfiguration {
  scipTools: ScipToolsConfig;
  indexing: CodegraphIndexingConfig;
  supportedLanguages: string[];
}

export class CodegraphConfig {
  private static instance?: CodegraphConfig;
  private configService?: ConfigService;

  static getInstance(configService?: ConfigService): CodegraphConfig {
    if (!CodegraphConfig.instance) {
      CodegraphConfig.instance = new CodegraphConfig();
    }
    if (configService) {
      CodegraphConfig.instance.configService = configService;
    }
    return CodegraphConfig.instance;
  }

  getCodegraphConfig(): CodegraphConfiguration {
    if (!this.configService) {
      throw new Error('ConfigService not initialized in CodegraphConfig');
    }

    return {
      scipTools: {
        typescript: this.configService.get<string>('SCIP_TYPESCRIPT_PATH', '/usr/local/bin/scip-typescript'),
        javascript: this.configService.get<string>('SCIP_JAVASCRIPT_PATH', '/usr/local/bin/scip-typescript'),
        java: this.configService.get<string>('SCIP_JAVA_PATH', '/usr/local/bin/scip-java'),
        python: this.configService.get<string>('SCIP_PYTHON_PATH', '/usr/local/bin/scip-python'),
        go: this.configService.get<string>('SCIP_GO_PATH', '/usr/local/bin/scip-go'),
        rust: this.configService.get<string>('SCIP_RUST_PATH', '/usr/local/bin/scip-rust'),
        cpp: this.configService.get<string>('SCIP_CPP_PATH', '/usr/local/bin/scip-clang'),
        csharp: this.configService.get<string>('SCIP_CSHARP_PATH', '/usr/local/bin/scip-dotnet'),
      },
      indexing: {
        scipTimeout: this.configService.get<number>('SCIP_TIMEOUT_SECONDS', 1800),
        treeSitterTimeout: this.configService.get<number>('TREE_SITTER_TIMEOUT_SECONDS', 300),
        batchSize: this.configService.get<number>('CODEGRAPH_BATCH_SIZE', 50),
        enableScipAnalysis: this.configService.get<boolean>('CODEGRAPH_ENABLE_SCIP', true),
        enableTreeSitterParsing: this.configService.get<boolean>('CODEGRAPH_ENABLE_TREE_SITTER', true),
        enableSymbolExtraction: this.configService.get<boolean>('CODEGRAPH_ENABLE_SYMBOL_EXTRACTION', true),
        badgerDbBaseDir: this.configService.get<string>('BADGER_DB_BASE_DIR', '.shenma'),
      },
      supportedLanguages: [
        'typescript',
        'javascript',
        'java',
        'python',
        'go',
        'rust',
        'cpp',
        'c',
        'csharp',
        'php',
        'ruby',
        'swift',
        'kotlin',
        'scala',
      ],
    };
  }

  getScipToolPath(language: string): string | undefined {
    const config = this.getCodegraphConfig();
    return config.scipTools[language as keyof ScipToolsConfig];
  }

  getBadgerDbPath(codebaseStoragePath: string): string {
    const config = this.getCodegraphConfig();
    return `${codebaseStoragePath}/${config.indexing.badgerDbBaseDir}/badger.db`;
  }

  validateConfig(): boolean {
    try {
      const config = this.getCodegraphConfig();
      
      // Validate timeouts
      if (config.indexing.scipTimeout <= 0 || config.indexing.treeSitterTimeout <= 0) {
        throw new Error('Invalid timeout configuration');
      }

      // Validate batch size
      if (config.indexing.batchSize <= 0) {
        throw new Error('Invalid batch size configuration');
      }

      return true;
    } catch (error) {
      console.error('Codegraph configuration validation failed:', error);
      return false;
    }
  }

  getConfigSummary(): Record<string, any> {
    const config = this.getCodegraphConfig();
    return {
      scipToolsConfigured: Object.keys(config.scipTools).length,
      supportedLanguages: config.supportedLanguages.length,
      scipEnabled: config.indexing.enableScipAnalysis,
      treeSitterEnabled: config.indexing.enableTreeSitterParsing,
      symbolExtractionEnabled: config.indexing.enableSymbolExtraction,
      scipTimeout: config.indexing.scipTimeout,
      treeSitterTimeout: config.indexing.treeSitterTimeout,
      batchSize: config.indexing.batchSize,
    };
  }
}