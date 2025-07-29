import { Injectable } from '@nestjs/common';
import { BaseTask } from '../interfaces/base-task.interface';
import { PipelineContext, TaskExecutionResult } from '../interfaces/pipeline-context.interface';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class CleanupTask extends BaseTask {
  readonly name = 'cleanup';
  readonly description = 'Clean up temporary files and resources';
  readonly requiredSteps: string[] = [];
  readonly optionalSteps: string[] = ['gitSync', 'codeParsing', 'graphUpdate'];

  shouldExecute(context: PipelineContext): boolean {
    // Always execute cleanup
    return true;
  }

  async validate(context: PipelineContext): Promise<void> {
    // No validation required for cleanup
  }

  protected async executeTask(context: PipelineContext): Promise<TaskExecutionResult> {
    const { logger, workingDirectory, tempDirectory, config } = context;
    
    let tempFilesRemoved = 0;
    let diskSpaceFreed = 0;
    
    try {
      logger.info('Starting cleanup', { 
        workingDirectory, 
        tempDirectory,
        enableTempCleanup: config.performance.tempDirCleanup,
      });

      // Clean up temporary directory
      if (config.performance.tempDirCleanup && tempDirectory) {
        const tempResult = await this.cleanDirectory(tempDirectory, logger);
        tempFilesRemoved += tempResult.filesRemoved;
        diskSpaceFreed += tempResult.spaceFreed;
      }

      // Clean up working directory (repository clone)
      if (workingDirectory && context.data.gitSync?.clonePath) {
        const workingResult = await this.cleanDirectory(workingDirectory, logger);
        tempFilesRemoved += workingResult.filesRemoved;
        diskSpaceFreed += workingResult.spaceFreed;
      }

      // Clean up Docker containers if enabled
      if (config.docker.enabled && config.docker.cleanup) {
        await this.cleanupDockerResources(logger);
      }

      logger.info('Cleanup completed', {
        tempFilesRemoved,
        diskSpaceFreedMB: Math.round(diskSpaceFreed / (1024 * 1024)),
      });

      // Store results in context
      context.data.cleanup = {
        tempFilesRemoved,
        diskSpaceFreed,
      };

      return {
        success: true,
        duration: 0,
        data: context.data.cleanup,
        metrics: {
          itemsUpdated: tempFilesRemoved,
        },
      };

    } catch (error) {
      logger.error('Cleanup failed', { error: error.message });
      
      // Don't fail the entire pipeline if cleanup fails
      return {
        success: true, // Mark as success even if cleanup fails
        duration: 0,
        error: `Cleanup warning: ${error.message}`,
      };
    }
  }

  getEstimatedDuration(context: PipelineContext): number {
    // Cleanup is usually quick
    return 10000; // 10 seconds
  }

  private async cleanDirectory(dirPath: string, logger: any): Promise<{
    filesRemoved: number;
    spaceFreed: number;
  }> {
    let filesRemoved = 0;
    let spaceFreed = 0;

    try {
      // Check if directory exists
      await fs.access(dirPath);
      
      logger.debug(`Cleaning directory: ${dirPath}`);
      
      // Calculate size before cleanup
      const sizeBefore = await this.getDirectorySize(dirPath);
      
      // Remove directory and all contents
      await fs.rm(dirPath, { recursive: true, force: true });
      
      spaceFreed = sizeBefore;
      filesRemoved = await this.countFilesInDirectory(dirPath, true);
      
      logger.debug(`Directory cleaned: ${dirPath}`, {
        filesRemoved,
        spaceFreedMB: Math.round(spaceFreed / (1024 * 1024)),
      });
      
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.warn(`Failed to clean directory: ${dirPath}`, { error: error.message });
      }
    }

    return { filesRemoved, spaceFreed };
  }

  private async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    try {
      const walk = async (dir: string): Promise<void> => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            await walk(fullPath);
          } else if (entry.isFile()) {
            const stats = await fs.stat(fullPath);
            totalSize += stats.size;
          }
        }
      };

      await walk(dirPath);
    } catch (error) {
      // Ignore errors when calculating size
    }

    return totalSize;
  }

  private async countFilesInDirectory(dirPath: string, beforeDeletion: boolean = false): Promise<number> {
    let fileCount = 0;

    try {
      if (beforeDeletion) {
        // Estimate file count for deleted directory
        return 0; // We don't know the exact count after deletion
      }

      const walk = async (dir: string): Promise<void> => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory()) {
            await walk(path.join(dir, entry.name));
          } else {
            fileCount++;
          }
        }
      };

      await walk(dirPath);
    } catch (error) {
      // Directory doesn't exist or is inaccessible
    }

    return fileCount;
  }

  private async cleanupDockerResources(logger: any): Promise<void> {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      logger.debug('Cleaning up Docker resources');

      // Remove stopped containers with our labels
      try {
        await execAsync('docker container prune -f --filter "label=tekaicontextengine"');
        logger.debug('Docker containers cleaned');
      } catch (error) {
        logger.warn('Failed to clean Docker containers', { error: error.message });
      }

      // Remove dangling images if configured
      try {
        await execAsync('docker image prune -f');
        logger.debug('Docker images cleaned');
      } catch (error) {
        logger.warn('Failed to clean Docker images', { error: error.message });
      }

    } catch (error) {
      logger.warn('Docker cleanup failed', { error: error.message });
    }
  }

  async cleanup(context: PipelineContext): Promise<void> {
    // This task IS the cleanup, so nothing additional needed
    context.logger.debug('Cleanup task cleanup completed');
  }
}