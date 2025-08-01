import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { spawn, SpawnOptions } from 'child_process';
import { GitConfiguration, GitTimeouts } from '@/config/git.config';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { GitCommit, GitFileChange, CloneOptions, DiffOptions } from './dto';

// Re-export DTOs for backward compatibility
export { GitCommit, GitFileChange, CloneOptions, DiffOptions };

@Injectable()
export class GitClientService {
  private gitConfiguration: GitConfiguration;
  private timeouts: GitTimeouts;

  constructor(
    configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.gitConfiguration = GitConfiguration.getInstance(configService);
    this.timeouts = this.gitConfiguration.getTimeouts();
  }

  /**
   * Clone a repository to local storage
   */
  async cloneRepository(
    gitlabUrl: string,
    localPath: string,
    options: CloneOptions = {}
  ): Promise<string> {
    this.logger.log('[GIT-CLIENT] Starting repository clone operation', {
      gitlabUrl,
      localPath,
      options: {
        depth: options.depth,
        branch: options.branch,
        hasSparseCheckout: !!(options.sparseCheckout?.length),
        sparseCheckoutCount: options.sparseCheckout?.length || 0,
        hasGitConfig: !!options.gitConfig
      }
    });

    this.logger.log(`Cloning repository ${gitlabUrl} to ${localPath}`);

    // Create directory if it doesn't exist
    const parentDir = path.dirname(localPath);
    this.logger.debug('[GIT-CLIENT] Creating parent directory if needed', {
      parentDir,
      localPath
    });

    await fs.mkdir(parentDir, { recursive: true });
    this.logger.debug('[GIT-CLIENT] Parent directory ensured');

    // Build clone command
    const args = ['clone'];

    if (options.depth) {
      args.push('--depth', options.depth.toString());
      this.logger.debug('[GIT-CLIENT] Added depth option to clone command', {
        depth: options.depth
      });
    }

    if (options.branch) {
      args.push('--branch', options.branch);
      this.logger.debug('[GIT-CLIENT] Added branch option to clone command', {
        branch: options.branch
      });
    }

    // Add authentication to URL if needed
    this.logger.debug('[GIT-CLIENT] Adding authentication to URL');
    const authenticatedUrl = this.addAuthentication(gitlabUrl, options);
    args.push(authenticatedUrl, localPath);

    this.logger.debug('[GIT-CLIENT] Git clone command prepared', {
      argsCount: args.length,
      timeout: this.timeouts.cloneTimeout,
      // Don't log the full command as it may contain credentials
      hasAuthentication: authenticatedUrl !== gitlabUrl
    });

    // Execute git clone
    const cloneStartTime = Date.now();
    await this.executeGitCommand(args, {
      timeout: this.timeouts.cloneTimeout
    });
    const cloneDuration = Date.now() - cloneStartTime;

    this.logger.debug('[GIT-CLIENT] Git clone command completed', {
      durationMs: cloneDuration,
      durationSec: Math.round(cloneDuration / 1000)
    });

    // Set up sparse checkout if requested
    if (options.sparseCheckout && options.sparseCheckout.length > 0) {
      this.logger.debug('[GIT-CLIENT] Setting up sparse checkout', {
        sparseCheckoutPaths: options.sparseCheckout
      });

      await this.setupSparseCheckout(localPath, options.sparseCheckout);

      this.logger.debug('[GIT-CLIENT] Sparse checkout configured successfully');
    }

    // Get initial commit hash
    this.logger.debug('[GIT-CLIENT] Getting initial commit hash');
    const initialCommit = await this.getCurrentCommit(localPath);

    this.logger.log('[GIT-CLIENT] Repository clone completed successfully', {
      gitlabUrl,
      localPath,
      initialCommit: initialCommit.substring(0, 8),
      fullCommit: initialCommit,
      cloneDurationMs: cloneDuration,
      hasSparseCheckout: !!(options.sparseCheckout?.length)
    });

    this.logger.log(`Successfully cloned repository to ${localPath}, commit: ${initialCommit}`);
    return initialCommit;
  }

  /**
   * Pull latest changes from remote
   */
  async pullRepository(localPath: string, options: CloneOptions = {}): Promise<string> {
    this.logger.log('[GIT-CLIENT] Starting repository pull operation', {
      localPath,
      branch: options.branch,
      hasGitConfig: !!options.gitConfig
    });

    this.logger.log(`Pulling updates for repository at ${localPath}`);

    this.logger.debug('[GIT-CLIENT] Getting current commit before pull');
    const beforeCommit = await this.getCurrentCommit(localPath);

    this.logger.debug('[GIT-CLIENT] Current commit before pull', {
      beforeCommit: beforeCommit.substring(0, 8),
      fullCommit: beforeCommit
    });

    // Execute git pull
    const args = ['pull', 'origin'];
    if (options.branch) {
      args.push(options.branch);
      this.logger.debug('[GIT-CLIENT] Added branch to pull command', {
        branch: options.branch
      });
    }

    this.logger.debug('[GIT-CLIENT] Git pull command prepared', {
      args,
      timeout: this.timeouts.pullTimeout,
      workingDirectory: localPath
    });

    const pullStartTime = Date.now();
    await this.executeGitCommand(args, {
      cwd: localPath,
      timeout: this.timeouts.pullTimeout
    });
    const pullDuration = Date.now() - pullStartTime;

    this.logger.debug('[GIT-CLIENT] Git pull command completed', {
      durationMs: pullDuration,
      durationSec: Math.round(pullDuration / 1000)
    });

    this.logger.debug('[GIT-CLIENT] Getting current commit after pull');
    const afterCommit = await this.getCurrentCommit(localPath);

    const hasChanges = beforeCommit !== afterCommit;

    this.logger.debug('[GIT-CLIENT] Pull operation analysis', {
      beforeCommit: beforeCommit.substring(0, 8),
      afterCommit: afterCommit.substring(0, 8),
      hasChanges,
      pullDurationMs: pullDuration
    });

    if (hasChanges) {
      this.logger.log('[GIT-CLIENT] Repository updated with new changes', {
        fromCommit: beforeCommit.substring(0, 8),
        toCommit: afterCommit.substring(0, 8),
        pullDurationMs: pullDuration
      });

      this.logger.log(`Repository updated from ${beforeCommit} to ${afterCommit}`);
    } else {
      this.logger.log('[GIT-CLIENT] Repository already up to date', {
        currentCommit: afterCommit.substring(0, 8),
        pullDurationMs: pullDuration
      });

      this.logger.log(`Repository already up to date at ${afterCommit}`);
    }

    return afterCommit;
  }

  /**
   * Get current commit hash
   */
  async getCurrentCommit(localPath: string): Promise<string> {
    const result = await this.executeGitCommand(['rev-parse', 'HEAD'], {
      cwd: localPath,
    });
    
    return result.stdout.trim();
  }

  /**
   * Get commit information
   */
  async getCommitInfo(localPath: string, commitHash?: string): Promise<GitCommit> {
    const commit = commitHash || 'HEAD';
    
    // Get commit details
    const formatArgs = ['show', '--format=%H|%an|%ae|%ai|%s', '--name-status', commit];
    const result = await this.executeGitCommand(formatArgs, { cwd: localPath });
    
    const lines = result.stdout.split('\n').filter(line => line.trim());
    const [commitLine, ...fileLines] = lines;
    
    const [hash, author, email, dateStr, message] = commitLine.split('|');
    const date = new Date(dateStr);
    
    // Parse file changes
    const files: GitFileChange[] = [];
    for (const line of fileLines) {
      if (line.includes('\t')) {
        const [operation, ...pathParts] = line.split('\t');
        const filePath = pathParts.join('\t');
        
        const fileChange: GitFileChange = {
          path: filePath,
          operation: operation as any,
        };
        
        // Handle renames
        if (operation.startsWith('R') && pathParts.length > 1) {
          fileChange.oldPath = pathParts[0];
          fileChange.path = pathParts[1];
          fileChange.operation = 'R';
        }
        
        files.push(fileChange);
      }
    }

    return { hash, author, email, date, message, files };
  }

  /**
   * Get diff between commits
   */
  async getDiff(
    localPath: string, 
    options: DiffOptions = {}
  ): Promise<GitFileChange[]> {
    const args = ['diff'];
    
    if (options.nameOnly) {
      args.push('--name-status');
    }
    
    // Specify commit range
    if (options.fromCommit) {
      args.push(`${options.fromCommit}..HEAD`);
    }

    const result = await this.executeGitCommand(args, { cwd: localPath });
    
    if (!options.nameOnly) {
      // Return raw diff content
      return [{
        path: 'diff.patch',
        operation: 'M',
      }];
    }

    // Parse name-status output
    const files: GitFileChange[] = [];
    const lines = result.stdout.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      if (line.includes('\t')) {
        const [operation, ...pathParts] = line.split('\t');
        const filePath = pathParts.join('\t');
        
        files.push({
          path: filePath,
          operation: operation as any,
        });
      }
    }

    return files;
  }

  /**
   * Get commit history between two commits
   */
  async getCommitHistory(
    localPath: string,
    fromCommit?: string,
    limit?: number
  ): Promise<GitCommit[]> {
    const args = ['log', '--format=%H|%an|%ae|%ai|%s', '--name-status'];
    
    if (limit) {
      args.push(`-${limit}`);
    }
    
    if (fromCommit) {
      args.push(`${fromCommit}..HEAD`);
    }

    const result = await this.executeGitCommand(args, { cwd: localPath });
    
    const commits: GitCommit[] = [];
    const lines = result.stdout.split('\n');
    
    let currentCommit: Partial<GitCommit> | null = null;
    
    for (const line of lines) {
      if (!line.trim()) {
        if (currentCommit) {
          commits.push(currentCommit as GitCommit);
          currentCommit = null;
        }
        continue;
      }
      
      if (line.includes('|')) {
        // Commit info line
        const [hash, author, email, dateStr, message] = line.split('|');
        currentCommit = {
          hash,
          author,
          email,
          date: new Date(dateStr),
          message,
          files: [],
        };
      } else if (line.includes('\t') && currentCommit) {
        // File change line
        const [operation, ...pathParts] = line.split('\t');
        const filePath = pathParts.join('\t');
        
        currentCommit.files!.push({
          path: filePath,
          operation: operation as any,
        });
      }
    }
    
    // Add last commit if exists
    if (currentCommit) {
      commits.push(currentCommit as GitCommit);
    }

    return commits;
  }

  /**
   * Get file content at specific commit
   */
  async getFileContent(
    localPath: string,
    filePath: string,
    commitHash?: string
  ): Promise<string> {
    const ref = commitHash ? `${commitHash}:${filePath}` : filePath;
    
    try {
      if (commitHash) {
        const result = await this.executeGitCommand(['show', ref], { cwd: localPath });
        return result.stdout;
      } else {
        // Read from working directory
        const fullPath = path.join(localPath, filePath);
        return await fs.readFile(fullPath, 'utf-8');
      }
    } catch (error) {
      this.logger.error(`Failed to get content for ${filePath} at ${commitHash || 'HEAD'}:`, error);
      throw error;
    }
  }

  /**
   * Check if repository exists and is valid
   */
  async isValidRepository(localPath: string): Promise<boolean> {
    try {
      await this.executeGitCommand(['status'], { cwd: localPath });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get repository remote URL
   */
  async getRemoteUrl(localPath: string): Promise<string> {
    const result = await this.executeGitCommand(['remote', 'get-url', 'origin'], {
      cwd: localPath,
    });
    
    return result.stdout.trim();
  }

  /**
   * Calculate file hash for change detection
   */
  async calculateFileHash(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
      this.logger.error(`Failed to calculate hash for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * List all files in repository
   */
  async listFiles(localPath: string, patterns?: string[]): Promise<string[]> {
    const args = ['ls-files'];
    
    if (patterns) {
      args.push(...patterns);
    }

    const result = await this.executeGitCommand(args, { cwd: localPath });
    
    return result.stdout
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.trim());
  }

  /**
   * Archive repository to ZIP file
   */
  async archiveRepository(
    localPath: string,
    outputPath: string,
    commitHash?: string
  ): Promise<void> {
    const args = ['archive'];
    
    if (commitHash) {
      args.push(commitHash);
    } else {
      args.push('HEAD');
    }
    
    args.push('--format=zip', `--output=${outputPath}`);

    await this.executeGitCommand(args, { cwd: localPath });
    
    this.logger.log(`Repository archived to ${outputPath}`);
  }

  /**
   * Delete repository directory
   */
  async deleteRepository(localPath: string): Promise<void> {
    try {
      await fs.rm(localPath, { recursive: true, force: true });
      this.logger.log(`Deleted repository at ${localPath}`);
    } catch (error) {
      this.logger.error(`Failed to delete repository at ${localPath}:`, error);
      throw error;
    }
  }

  // Private helper methods
  private addAuthentication(gitlabUrl: string, options: CloneOptions): string {
    const gitConfig = this.gitConfiguration.mergeWithDefaults(options.gitConfig);
    
    if (gitConfig.accessToken) {
      // Use access token authentication
      return gitlabUrl.replace('https://', `https://oauth2:${gitConfig.accessToken}@`);
    }
    
    if (gitConfig.username && gitConfig.accessToken) {
      // Use username and token
      return gitlabUrl.replace('https://', `https://${gitConfig.username}:${gitConfig.accessToken}@`);
    }
    
    // SSH key authentication is handled by git automatically
    return gitlabUrl;
  }

  private async setupSparseCheckout(localPath: string, patterns: string[]): Promise<void> {
    // Enable sparse checkout
    await this.executeGitCommand(['config', 'core.sparseCheckout', 'true'], {
      cwd: localPath,
    });

    // Write sparse checkout patterns
    const sparseCheckoutPath = path.join(localPath, '.git', 'info', 'sparse-checkout');
    await fs.writeFile(sparseCheckoutPath, patterns.join('\n') + '\n');

    // Apply sparse checkout
    await this.executeGitCommand(['read-tree', '-m', '-u', 'HEAD'], {
      cwd: localPath,
    });
  }

  private async executeGitCommand(
    args: string[],
    options: SpawnOptions & { timeout?: number } = {}
  ): Promise<{ stdout: string; stderr: string }> {
    const commandId = Math.random().toString(36).substring(2, 8);
    const { timeout = this.timeouts.commandTimeout, ...spawnOptions } = options;

    // Sanitize args for logging (remove potential credentials)
    const sanitizedArgs = args.map(arg => {
      if (arg.includes('@') && (arg.includes('http') || arg.includes('git'))) {
        return arg.replace(/:\/\/[^@]+@/, '://***:***@');
      }
      return arg;
    });

    this.logger.debug(`[GIT-CLIENT] [${commandId}] Executing git command`, {
      command: `git ${sanitizedArgs.join(' ')}`,
      timeout,
      workingDirectory: spawnOptions.cwd || process.cwd(),
      argsCount: args.length
    });

    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const process = spawn('git', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        ...spawnOptions,
      });

      let stdout = '';
      let stderr = '';
      let stdoutLines = 0;
      let stderrLines = 0;

      process.stdout?.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        stdoutLines += (chunk.match(/\n/g) || []).length;
      });

      process.stderr?.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        stderrLines += (chunk.match(/\n/g) || []).length;
      });

      const timeoutId = setTimeout(() => {
        const duration = Date.now() - startTime;

        this.logger.error(`[GIT-CLIENT] [${commandId}] Git command timed out`, {
          command: `git ${sanitizedArgs.join(' ')}`,
          timeout,
          actualDuration: duration,
          stdoutLines,
          stderrLines,
          workingDirectory: spawnOptions.cwd
        });

        process.kill('SIGTERM');
        reject(new Error(`Git command timed out after ${timeout}ms: git ${args.join(' ')}`));
      }, timeout);

      process.on('close', (code) => {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        if (code === 0) {
          this.logger.debug(`[GIT-CLIENT] [${commandId}] Git command completed successfully`, {
            command: `git ${sanitizedArgs.join(' ')}`,
            exitCode: code,
            duration,
            stdoutLines,
            stderrLines,
            stdoutLength: stdout.length,
            stderrLength: stderr.length
          });

          resolve({ stdout, stderr });
        } else {
          const error = new Error(`Git command failed with code ${code}: ${stderr || stdout}`);

          this.logger.error(`[GIT-CLIENT] [${commandId}] Git command failed`, {
            command: `git ${sanitizedArgs.join(' ')}`,
            exitCode: code,
            duration,
            stdoutLines,
            stderrLines,
            stdoutLength: stdout.length,
            stderrLength: stderr.length,
            stderr: stderr.substring(0, 500) + (stderr.length > 500 ? '...' : ''),
            stdout: stdout.substring(0, 200) + (stdout.length > 200 ? '...' : ''),
            workingDirectory: spawnOptions.cwd
          });

          this.logger.error(`Git command failed: git ${args.join(' ')}`, error);
          reject(error);
        }
      });

      process.on('error', (error) => {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        this.logger.error(`[GIT-CLIENT] [${commandId}] Git command process error`, {
          command: `git ${sanitizedArgs.join(' ')}`,
          error: error.message,
          duration,
          workingDirectory: spawnOptions.cwd,
          stack: error.stack
        });

        this.logger.error(`Git command error: git ${args.join(' ')}`, error);
        reject(error);
      });
    });
  }
}