import { ConfigService } from '@nestjs/config';

export interface GitConfig {
  username?: string;
  accessToken?: string;
  sshKey?: string;
}

export interface GitTimeouts {
  cloneTimeout: number;
  pullTimeout: number;
  commandTimeout: number;
}

export interface GitOptions {
  defaultBranch: string;
  maxDepth?: number;
  enableSparseCheckout: boolean;
  ignoredPatterns: string[];
  ignoredDirectories: string[];
}

export class GitConfiguration {
  private static instance?: GitConfiguration;
  private configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;
  }

  static getInstance(configService: ConfigService): GitConfiguration {
    if (!GitConfiguration.instance) {
      GitConfiguration.instance = new GitConfiguration(configService);
    }
    return GitConfiguration.instance;
  }

  /**
   * Get default git configuration
   */
  getDefaultGitConfig(): GitConfig {
    return {
      username: this.configService.get('GIT_DEFAULT_USERNAME'),
      accessToken: this.configService.get('GIT_DEFAULT_ACCESS_TOKEN'),
      sshKey: this.configService.get('GIT_DEFAULT_SSH_KEY'),
    };
  }

  /**
   * Get git timeout configurations
   */
  getTimeouts(): GitTimeouts {
    return {
      cloneTimeout: this.configService.get('GIT_CLONE_TIMEOUT', 600000), // 10 minutes
      pullTimeout: this.configService.get('GIT_PULL_TIMEOUT', 300000), // 5 minutes
      commandTimeout: this.configService.get('GIT_COMMAND_TIMEOUT', 60000), // 1 minute
    };
  }

  /**
   * Get git operation options
   */
  getOptions(): GitOptions {
    return {
      defaultBranch: this.configService.get('GIT_DEFAULT_BRANCH', 'main'),
      maxDepth: this.configService.get('GIT_MAX_DEPTH'),
      enableSparseCheckout: this.configService.get('GIT_ENABLE_SPARSE_CHECKOUT', false),
      ignoredPatterns: this.getIgnoredPatterns(),
      ignoredDirectories: this.getIgnoredDirectories(),
    };
  }

  /**
   * Merge codebase-specific git config with defaults
   */
  mergeWithDefaults(codebaseGitConfig?: GitConfig): GitConfig {
    const defaults = this.getDefaultGitConfig();
    
    return {
      username: codebaseGitConfig?.username || defaults.username,
      accessToken: codebaseGitConfig?.accessToken || defaults.accessToken,
      sshKey: codebaseGitConfig?.sshKey || defaults.sshKey,
    };
  }

  /**
   * Get ignored file patterns
   */
  private getIgnoredPatterns(): string[] {
    const defaultPatterns = [
      'node_modules',
      '.git',
      'dist/',
      'build/',
      '.DS_Store',
      '.env',
      '*.log'
    ];

    const customPatterns = this.configService.get('GIT_IGNORED_PATTERNS', '');
    const additionalPatterns = customPatterns ? customPatterns.split(',').map(p => p.trim()) : [];

    return [...defaultPatterns, ...additionalPatterns];
  }

  /**
   * Get ignored directories
   */
  private getIgnoredDirectories(): string[] {
    const defaultDirectories = [
      '.git',
      'node_modules',
      'dist',
      'build',
      '.next',
      'coverage',
      '.cache'
    ];

    const customDirectories = this.configService.get('GIT_IGNORED_DIRECTORIES', '');
    const additionalDirectories = customDirectories ? customDirectories.split(',').map(d => d.trim()) : [];

    return [...defaultDirectories, ...additionalDirectories];
  }

  /**
   * Validate git configuration
   */
  validateGitConfig(gitConfig: GitConfig): boolean {
    // At least one authentication method should be provided
    return !!(gitConfig.accessToken || gitConfig.sshKey || gitConfig.username);
  }

  /**
   * Check if file should be processed based on ignored patterns
   */
  shouldProcessFile(filePath: string): boolean {
    const patterns = this.getIgnoredPatterns();
    const regexPatterns = patterns.map(pattern => 
      new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'))
    );
    
    return !regexPatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * Check if directory should be ignored
   */
  shouldIgnoreDirectory(dirName: string): boolean {
    const ignoredDirs = this.getIgnoredDirectories();
    return ignoredDirs.includes(dirName);
  }
}

/**
 * Factory function to create GitConfiguration instance
 */
export const createGitConfiguration = (configService: ConfigService): GitConfiguration => {
  return GitConfiguration.getInstance(configService);
};