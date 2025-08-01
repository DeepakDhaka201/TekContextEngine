import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
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

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    super();
  }

  shouldExecute(context: PipelineContext): boolean {
    const { pipeline } = context;
    const pipelineId = pipeline.id;

    this.logger.debug(`[${pipelineId}] [CLEANUP] Checking if task should execute`, 'CleanupTask');

    // Always execute cleanup
    this.logger.debug(`[${pipelineId}] [CLEANUP] Task will always execute for cleanup purposes`, 'CleanupTask');
    return true;
  }

  async validate(context: PipelineContext): Promise<void> {
    const { pipeline } = context;
    const pipelineId = pipeline.id;

    this.logger.debug(`[${pipelineId}] [CLEANUP] Validating task prerequisites`);

    // No validation required for cleanup
    this.logger.debug(`[${pipelineId}] [CLEANUP] No validation required for cleanup task`);
  }

  protected async executeTask(context: PipelineContext): Promise<TaskExecutionResult> {
    const { logger, workingDirectory, tempDirectory, config, pipeline } = context;
    const pipelineId = pipeline.id;

    this.logger.log(`[${pipelineId}] [CLEANUP] Starting cleanup task`, {
      workingDirectory,
      tempDirectory,
      enableTempCleanup: config.performance.tempDirCleanup,
      dockerEnabled: config.docker.enabled,
      dockerCleanup: config.docker.cleanup,
      hasGitSyncData: !!context.data.gitSync
    });

    let tempFilesRemoved = 0;
    let diskSpaceFreed = 0;

    try {
      logger.info(`[${pipelineId}] [CLEANUP] Starting cleanup`, {
        workingDirectory,
        tempDirectory,
        enableTempCleanup: config.performance.tempDirCleanup,
      });

      // Clean up temporary directory
      if (config.performance.tempDirCleanup && tempDirectory) {
        this.logger.debug(`[${pipelineId}] [CLEANUP] Cleaning temporary directory`, {
          tempDirectory
        });

        const tempResult = await this.cleanDirectory(tempDirectory, logger, pipelineId);
        tempFilesRemoved += tempResult.filesRemoved;
        diskSpaceFreed += tempResult.spaceFreed;

        this.logger.debug(`[${pipelineId}] [CLEANUP] Temporary directory cleanup completed`, {
          tempDirectory,
          filesRemoved: tempResult.filesRemoved,
          spaceFreedMB: Math.round(tempResult.spaceFreed / (1024 * 1024))
        });
      } else {
        this.logger.debug(`[${pipelineId}] [CLEANUP] Skipping temporary directory cleanup`, {
          tempDirCleanupEnabled: config.performance.tempDirCleanup,
          hasTempDirectory: !!tempDirectory
        });
      }

      // Clean up working directory (repository clone)
      if (workingDirectory && context.data.gitSync?.clonePath) {
        this.logger.debug(`[${pipelineId}] [CLEANUP] Cleaning working directory`, {
          workingDirectory,
          clonePath: context.data.gitSync.clonePath
        });

        const workingResult = await this.cleanDirectory(workingDirectory, logger, pipelineId);
        tempFilesRemoved += workingResult.filesRemoved;
        diskSpaceFreed += workingResult.spaceFreed;

        this.logger.debug(`[${pipelineId}] [CLEANUP] Working directory cleanup completed`, {
          workingDirectory,
          filesRemoved: workingResult.filesRemoved,
          spaceFreedMB: Math.round(workingResult.spaceFreed / (1024 * 1024))
        });
      } else {
        this.logger.debug(`[${pipelineId}] [CLEANUP] Skipping working directory cleanup`, {
          hasWorkingDirectory: !!workingDirectory,
          hasGitSyncClonePath: !!context.data.gitSync?.clonePath
        });
      }

      // Clean up Docker containers if enabled
      if (config.docker.enabled && config.docker.cleanup) {
        this.logger.debug(`[${pipelineId}] [CLEANUP] Starting Docker resource cleanup`);
        await this.cleanupDockerResources(logger, pipelineId);
        this.logger.debug(`[${pipelineId}] [CLEANUP] Docker resource cleanup completed`);
      } else {
        this.logger.debug(`[${pipelineId}] [CLEANUP] Skipping Docker cleanup`, {
          dockerEnabled: config.docker.enabled,
          dockerCleanup: config.docker.cleanup
        });
      }

      this.logger.log(`[${pipelineId}] [CLEANUP] Cleanup task completed successfully`, {
        tempFilesRemoved,
        diskSpaceFreedMB: Math.round(diskSpaceFreed / (1024 * 1024)),
      });

      logger.info(`[${pipelineId}] [CLEANUP] Cleanup completed`, {
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
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.warn(`[${pipelineId}] [CLEANUP] Cleanup task encountered error but continuing`, {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        tempFilesRemoved,
        diskSpaceFreedMB: Math.round(diskSpaceFreed / (1024 * 1024))
      });

      logger.error(`[${pipelineId}] [CLEANUP] Cleanup failed`, {
        error: errorMessage
      });

      // Don't fail the entire pipeline if cleanup fails
      return {
        success: true, // Mark as success even if cleanup fails
        duration: 0,
        error: `Cleanup warning: ${errorMessage}`,
      };
    }
  }

  getEstimatedDuration(context: PipelineContext): number {
    const { pipeline } = context;
    const pipelineId = pipeline.id;

    // Cleanup is usually quick
    const estimatedTime = 10000; // 10 seconds

    this.logger.debug(`[${pipelineId}] [CLEANUP] Estimated task duration calculated`, {
      estimatedTimeMs: estimatedTime,
      estimatedTimeSec: estimatedTime / 1000
    });

    return estimatedTime;
  }

  private async cleanDirectory(dirPath: string, logger: any, pipelineId: string): Promise<{
    filesRemoved: number;
    spaceFreed: number;
  }> {
    let filesRemoved = 0;
    let spaceFreed = 0;

    try {
      // Check if directory exists
      await fs.access(dirPath);

      this.logger.debug(`[${pipelineId}] [CLEANUP] Directory exists, starting cleanup`, {
        dirPath
      });

      logger.debug(`[${pipelineId}] [CLEANUP] Cleaning directory: ${dirPath}`);

      // Calculate size before cleanup
      this.logger.debug(`[${pipelineId}] [CLEANUP] Calculating directory size before cleanup`, {
        dirPath
      });

      const sizeBefore = await this.getDirectorySize(dirPath);

      this.logger.debug(`[${pipelineId}] [CLEANUP] Directory size calculated`, {
        dirPath,
        sizeMB: Math.round(sizeBefore / (1024 * 1024)),
        sizeBytes: sizeBefore
      });

      // Remove directory and all contents
      this.logger.debug(`[${pipelineId}] [CLEANUP] Removing directory and all contents`, {
        dirPath
      });

      await fs.rm(dirPath, { recursive: true, force: true });

      spaceFreed = sizeBefore;
      filesRemoved = await this.countFilesInDirectory(dirPath, true);

      this.logger.debug(`[${pipelineId}] [CLEANUP] Directory removal completed`, {
        dirPath,
        filesRemoved,
        spaceFreedMB: Math.round(spaceFreed / (1024 * 1024))
      });

      logger.debug(`[${pipelineId}] [CLEANUP] Directory cleaned: ${dirPath}`, {
        filesRemoved,
        spaceFreedMB: Math.round(spaceFreed / (1024 * 1024)),
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = error instanceof Error && 'code' in error ? error.code : undefined;

      if (errorCode !== 'ENOENT') {
        this.logger.warn(`[${pipelineId}] [CLEANUP] Failed to clean directory`, {
          dirPath,
          error: errorMessage,
          errorCode
        });

        logger.warn(`[${pipelineId}] [CLEANUP] Failed to clean directory: ${dirPath}`, {
          error: errorMessage
        });
      } else {
        this.logger.debug(`[${pipelineId}] [CLEANUP] Directory does not exist, skipping cleanup`, {
          dirPath
        });
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

  private async cleanupDockerResources(logger: any, pipelineId: string): Promise<void> {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      this.logger.debug(`[${pipelineId}] [CLEANUP] Starting Docker resource cleanup`);
      logger.debug(`[${pipelineId}] [CLEANUP] Cleaning up Docker resources`);

      // Remove stopped containers with our labels
      try {
        this.logger.debug(`[${pipelineId}] [CLEANUP] Removing stopped Docker containers with tekaicontextengine label`);

        const containerResult = await execAsync('docker container prune -f --filter "label=tekaicontextengine"');

        this.logger.debug(`[${pipelineId}] [CLEANUP] Docker container cleanup completed`, {
          output: containerResult.stdout?.trim(),
          errors: containerResult.stderr?.trim()
        });

        logger.debug(`[${pipelineId}] [CLEANUP] Docker containers cleaned`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        this.logger.warn(`[${pipelineId}] [CLEANUP] Failed to clean Docker containers`, {
          error: errorMessage
        });

        logger.warn(`[${pipelineId}] [CLEANUP] Failed to clean Docker containers`, {
          error: errorMessage
        });
      }

      // Remove dangling images if configured
      try {
        this.logger.debug(`[${pipelineId}] [CLEANUP] Removing dangling Docker images`);

        const imageResult = await execAsync('docker image prune -f');

        this.logger.debug(`[${pipelineId}] [CLEANUP] Docker image cleanup completed`, {
          output: imageResult.stdout?.trim(),
          errors: imageResult.stderr?.trim()
        });

        logger.debug(`[${pipelineId}] [CLEANUP] Docker images cleaned`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        this.logger.warn(`[${pipelineId}] [CLEANUP] Failed to clean Docker images`, {
          error: errorMessage
        });

        logger.warn(`[${pipelineId}] [CLEANUP] Failed to clean Docker images`, {
          error: errorMessage
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.warn(`[${pipelineId}] [CLEANUP] Docker cleanup failed`, {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      logger.warn(`[${pipelineId}] [CLEANUP] Docker cleanup failed`, {
        error: errorMessage
      });
    }
  }

  async cleanup(context: PipelineContext): Promise<void> {
    const { pipeline } = context;
    const pipelineId = pipeline.id;

    this.logger.debug(`[${pipelineId}] [CLEANUP] Starting task cleanup`);

    // This task IS the cleanup, so nothing additional needed
    this.logger.debug(`[${pipelineId}] [CLEANUP] This task is the cleanup task itself, no additional cleanup needed`);

    context.logger.debug(`[${pipelineId}] [CLEANUP] Cleanup task cleanup completed`);
  }
}