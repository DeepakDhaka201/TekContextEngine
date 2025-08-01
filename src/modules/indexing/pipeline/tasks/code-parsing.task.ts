import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { BaseTask } from '../interfaces/base-task.interface';
import { PipelineContext, TaskExecutionResult } from '../interfaces/pipeline-context.interface';
import { IndexPipelineType } from '../../entities/index-pipeline.entity';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class CodeParsingTask extends BaseTask {
  readonly name = 'code_parsing';
  readonly description = 'Parse source code and extract symbols';
  readonly requiredSteps: string[] = ['gitSync'];
  readonly optionalSteps: string[] = [];

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    super();
  }

  shouldExecute(context: PipelineContext): boolean {
    const { pipeline, data } = context;
    const pipelineId = pipeline.id;
    const hasFilesToProcess = !!(data.gitSync?.filesAdded?.length || data.gitSync?.filesChanged?.length);

    this.logger.debug(`[${pipelineId}] [CODE-PARSING] Checking if task should execute`, {
      hasGitSyncData: !!data.gitSync,
      filesAdded: data.gitSync?.filesAdded?.length || 0,
      filesChanged: data.gitSync?.filesChanged?.length || 0,
      shouldExecute: hasFilesToProcess
    });

    return hasFilesToProcess;
  }

  async validate(context: PipelineContext): Promise<void> {
    const { pipeline, data } = context;
    const pipelineId = pipeline.id;

    this.logger.debug(`[${pipelineId}] [CODE-PARSING] Validating task prerequisites`);

    await super.validate(context);

    if (!data.gitSync?.clonePath) {
      this.logger.error(`[${pipelineId}] [CODE-PARSING] Validation failed: No git sync data available`);
      throw new Error('Git sync must complete before code parsing');
    }

    const clonePath = data.gitSync.clonePath;
    this.logger.debug(`[${pipelineId}] [CODE-PARSING] Checking repository path accessibility`, {
      clonePath
    });

    try {
      await fs.access(clonePath);
      this.logger.debug(`[${pipelineId}] [CODE-PARSING] Repository path is accessible`);
    } catch (error) {
      this.logger.error(`[${pipelineId}] [CODE-PARSING] Validation failed: Repository path not accessible`, {
        clonePath,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(`Repository path not accessible: ${clonePath}`);
    }

    this.logger.debug(`[${pipelineId}] [CODE-PARSING] Task validation completed successfully`, {
      clonePath,
      hasGitSyncData: !!data.gitSync,
      filesAdded: data.gitSync.filesAdded?.length || 0,
      filesChanged: data.gitSync.filesChanged?.length || 0,
      filesDeleted: data.gitSync.filesDeleted?.length || 0
    });
  }

  protected async executeTask(context: PipelineContext): Promise<TaskExecutionResult> {
    const { pipeline, data, config, logger } = context;
    const pipelineId = pipeline.id;
    const clonePath = data.gitSync!.clonePath;

    this.logger.log(`[${pipelineId}] [CODE-PARSING] Starting code parsing task`, {
      pipelineType: pipeline.type,
      clonePath,
      gitSyncData: {
        filesAdded: data.gitSync!.filesAdded.length,
        filesChanged: data.gitSync!.filesChanged.length,
        filesDeleted: data.gitSync!.filesDeleted.length
      }
    });

    // Determine which files to process based on pipeline type
    let filesToProcess: string[] = [];

    if (pipeline.type === IndexPipelineType.INCREMENTAL) {
      // For incremental, process only changed and added files (not deleted)
      filesToProcess = [
        ...data.gitSync!.filesAdded,
        ...data.gitSync!.filesChanged
      ];
      this.logger.debug(`[${pipelineId}] [CODE-PARSING] Incremental parsing mode selected`, {
        added: data.gitSync!.filesAdded.length,
        changed: data.gitSync!.filesChanged.length,
        deleted: data.gitSync!.filesDeleted.length,
        totalToProcess: filesToProcess.length
      });
      logger.info(`[${pipelineId}] [CODE-PARSING] Incremental parsing mode`, {
        added: data.gitSync!.filesAdded.length,
        changed: data.gitSync!.filesChanged.length,
        deleted: data.gitSync!.filesDeleted.length,
      });
    } else {
      // For full sync, process all added files
      filesToProcess = data.gitSync!.filesAdded;
      this.logger.debug(`[${pipelineId}] [CODE-PARSING] Full parsing mode selected`, {
        totalFiles: filesToProcess.length
      });
      logger.info(`[${pipelineId}] [CODE-PARSING] Full parsing mode`, {
        totalFiles: filesToProcess.length
      });
    }
    
    let totalSymbolsExtracted = 0;
    let filesProcessed = 0;
    const parsingResults: any[] = [];
    const languages: Record<string, number> = {};

    try {
      const enabledLanguages = Object.keys(config.parsing.languages).filter(lang =>
        config.parsing.languages[lang].enabled
      );

      this.logger.debug(`[${pipelineId}] [CODE-PARSING] Starting code parsing process`, {
        totalFiles: filesToProcess.length,
        enabledLanguages,
        parsingConfig: {
          dockerEnabled: config.docker.enabled,
          memoryLimit: config.docker.memoryLimit,
          cpuLimit: config.docker.cpuLimit
        }
      });

      logger.info(`[${pipelineId}] [CODE-PARSING] Starting code parsing`, {
        totalFiles: filesToProcess.length,
        languages: enabledLanguages
      });

      // Group files by language
      this.logger.debug(`[${pipelineId}] [CODE-PARSING] Grouping files by language`);
      const filesByLanguage = this.groupFilesByLanguage(filesToProcess);

      this.logger.debug(`[${pipelineId}] [CODE-PARSING] Files grouped by language`, {
        languageGroups: Object.keys(filesByLanguage),
        distribution: Object.entries(filesByLanguage).map(([lang, files]) => ({
          language: lang,
          fileCount: files.length
        }))
      });

      // Process each language
      for (const [language, languageFiles] of Object.entries(filesByLanguage)) {
        if (!config.parsing.languages[language]?.enabled) {
          this.logger.debug(`[${pipelineId}] [CODE-PARSING] Skipping disabled language: ${language}`, {
            fileCount: languageFiles.length
          });
          continue;
        }

        this.logger.debug(`[${pipelineId}] [CODE-PARSING] Starting to parse ${language} files`, {
          language,
          fileCount: languageFiles.length,
          parsingMethod: config.docker.enabled ? 'docker' : 'local'
        });

        logger.info(`[${pipelineId}] [CODE-PARSING] Parsing ${language} files`, {
          count: languageFiles.length
        });

        const parseStartTime = Date.now();
        const languageResult = await this.parseLanguageFiles(
          language,
          languageFiles,
          clonePath,
          config,
          context
        );
        const parseDuration = Date.now() - parseStartTime;

        this.logger.debug(`[${pipelineId}] [CODE-PARSING] Completed parsing ${language} files`, {
          language,
          filesProcessed: languageResult.filesProcessed,
          symbolsExtracted: languageResult.symbolsExtracted,
          durationMs: parseDuration,
          avgTimePerFile: Math.round(parseDuration / languageFiles.length)
        });

        totalSymbolsExtracted += languageResult.symbolsExtracted;
        filesProcessed += languageResult.filesProcessed;
        parsingResults.push(...languageResult.results);
        languages[language] = languageResult.filesProcessed;
      }

      this.logger.log(`[${pipelineId}] [CODE-PARSING] Code parsing completed successfully`, {
        filesProcessed,
        totalSymbolsExtracted,
        languages,
        averageSymbolsPerFile: filesProcessed > 0 ? Math.round(totalSymbolsExtracted / filesProcessed) : 0
      });

      logger.info(`[${pipelineId}] [CODE-PARSING] Code parsing completed`, {
        filesProcessed,
        totalSymbolsExtracted,
        languages,
      });

      // Store results in context
      context.data.codeParsing = {
        symbolsExtracted: totalSymbolsExtracted,
        filesProcessed,
        parsingResults,
        languages,
      };

      // Update context metrics
      context.metrics.totalFilesProcessed += filesProcessed;
      context.metrics.totalSymbolsExtracted += totalSymbolsExtracted;

      this.logger.debug(`[${pipelineId}] [CODE-PARSING] Context metrics updated`, {
        totalFilesProcessed: context.metrics.totalFilesProcessed,
        totalSymbolsExtracted: context.metrics.totalSymbolsExtracted
      });

      return {
        success: true,
        duration: 0,
        data: context.data.codeParsing,
        metrics: {
          filesProcessed,
          symbolsExtracted: totalSymbolsExtracted,
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`[${pipelineId}] [CODE-PARSING] Task failed with error`, {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        filesProcessed,
        totalSymbolsExtracted,
        clonePath
      });

      logger.error(`[${pipelineId}] [CODE-PARSING] Code parsing failed`, {
        error: errorMessage
      });

      return {
        success: false,
        duration: 0,
        error: `Code parsing failed: ${errorMessage}`,
      };
    }
  }

  getEstimatedDuration(context: PipelineContext): number {
    const { pipeline, data } = context;
    const pipelineId = pipeline.id;

    const filesAdded = data.gitSync?.filesAdded?.length || 0;
    const filesChanged = data.gitSync?.filesChanged?.length || 0;
    const totalFiles = filesAdded + filesChanged;

    const estimatedTime = Math.max(60000, totalFiles * 100); // Minimum 1 minute, ~100ms per file

    this.logger.debug(`[${pipelineId}] [CODE-PARSING] Estimated task duration calculated`, {
      filesAdded,
      filesChanged,
      totalFiles,
      estimatedTimeMs: estimatedTime,
      estimatedTimeMin: Math.round(estimatedTime / 60000)
    });

    return estimatedTime;
  }

  private groupFilesByLanguage(files: string[]): Record<string, string[]> {
    const groups: Record<string, string[]> = {};
    
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      const language = this.getLanguageFromExtension(ext);
      
      if (language) {
        if (!groups[language]) {
          groups[language] = [];
        }
        groups[language].push(file);
      }
    }
    
    return groups;
  }

  private getLanguageFromExtension(ext: string): string | null {
    const extensionMap: Record<string, string> = {
      '.js': 'typescript',
      '.jsx': 'typescript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.java': 'java',
      '.py': 'python',
      '.go': 'go',
      '.rs': 'rust',
      '.cpp': 'cpp',
      '.cc': 'cpp',
      '.cxx': 'cpp',
      '.c': 'cpp',
      '.h': 'cpp',
      '.hpp': 'cpp',
    };
    
    return extensionMap[ext] || null;
  }

  private async parseLanguageFiles(
    language: string,
    files: string[],
    repoPath: string,
    config: any,
    context: PipelineContext
  ): Promise<{
    symbolsExtracted: number;
    filesProcessed: number;
    results: any[];
  }> {
    const languageConfig = config.parsing.languages[language];
    
    if (config.docker.enabled && languageConfig.dockerImage) {
      return this.parseWithDocker(language, files, repoPath, languageConfig, context);
    } else {
      return this.parseWithLocalTools(language, files, repoPath, languageConfig, context);
    }
  }

  private async parseWithDocker(
    language: string,
    files: string[],
    repoPath: string,
    languageConfig: any,
    context: PipelineContext
  ): Promise<any> {
    const { config, tempDirectory, logger, pipeline } = context;
    const pipelineId = pipeline.id;

    this.logger.debug(`[${pipelineId}] [CODE-PARSING] Starting Docker parsing for ${language}`, {
      language,
      fileCount: files.length,
      dockerImage: languageConfig.dockerImage,
      repoPath,
      tempDirectory
    });

    // Create file list for processing
    const fileListPath = path.join(tempDirectory, `${language}-files.txt`);
    await fs.writeFile(fileListPath, files.join('\n'));

    this.logger.debug(`[${pipelineId}] [CODE-PARSING] Created file list for Docker parsing`, {
      language,
      fileListPath,
      fileCount: files.length
    });

    // Build Docker command
    const dockerCmd = [
      'docker run',
      '--rm',
      `--memory=${config.docker.memoryLimit}`,
      `--cpus=${config.docker.cpuLimit}`,
      `--network=${config.docker.networkMode}`,
      `-v "${repoPath}:/workspace:ro"`,
      `-v "${tempDirectory}:/output"`,
      languageConfig.dockerImage,
      '/workspace',
      `/output/${language}-results.json`,
      `/output/${language}-files.txt`
    ].join(' ');

    this.logger.debug(`[${pipelineId}] [CODE-PARSING] Executing Docker command for ${language}`, {
      command: dockerCmd,
      timeout: config.docker.timeout
    });

    logger.debug(`[${pipelineId}] [CODE-PARSING] Running Docker parser`, {
      language,
      command: dockerCmd
    });

    try {
      const dockerStartTime = Date.now();
      const { stdout, stderr } = await execAsync(dockerCmd, {
        timeout: config.docker.timeout,
      });
      const dockerDuration = Date.now() - dockerStartTime;

      this.logger.debug(`[${pipelineId}] [CODE-PARSING] Docker execution completed for ${language}`, {
        language,
        durationMs: dockerDuration,
        hasStdout: !!stdout,
        hasStderr: !!stderr
      });

      logger.debug(`[${pipelineId}] [CODE-PARSING] Docker parser output`, {
        language,
        stdout,
        stderr
      });

      // Read results
      const resultsPath = path.join(tempDirectory, `${language}-results.json`);

      this.logger.debug(`[${pipelineId}] [CODE-PARSING] Reading Docker parsing results for ${language}`, {
        resultsPath
      });

      const resultsContent = await fs.readFile(resultsPath, 'utf-8');
      const results = JSON.parse(resultsContent);

      const parseResult = {
        symbolsExtracted: results.symbols?.length || 0,
        filesProcessed: results.files?.length || 0,
        results: results.symbols || [],
      };

      this.logger.debug(`[${pipelineId}] [CODE-PARSING] Docker parsing completed for ${language}`, {
        language,
        symbolsExtracted: parseResult.symbolsExtracted,
        filesProcessed: parseResult.filesProcessed,
        durationMs: dockerDuration
      });

      return parseResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`[${pipelineId}] [CODE-PARSING] Docker parsing failed for ${language}`, {
        language,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        dockerImage: languageConfig.dockerImage,
        fileCount: files.length
      });

      logger.error(`[${pipelineId}] [CODE-PARSING] Docker parsing failed for ${language}`, {
        error: errorMessage
      });
      throw error;
    }
  }

  private async parseWithLocalTools(
    language: string,
    files: string[],
    repoPath: string,
    languageConfig: any,
    context: PipelineContext
  ): Promise<any> {
    const { logger, pipeline } = context;
    const pipelineId = pipeline.id;

    this.logger.warn(`[${pipelineId}] [CODE-PARSING] Local parsing not implemented for ${language}, using mock results`, {
      language,
      fileCount: files.length,
      repoPath
    });

    logger.warn(`[${pipelineId}] [CODE-PARSING] Local parsing not implemented for ${language}, using mock results`);

    // Mock implementation - replace with actual local parsing tools
    const mockProcessingTime = 1000 * files.length * 0.1;

    this.logger.debug(`[${pipelineId}] [CODE-PARSING] Simulating local parsing for ${language}`, {
      language,
      fileCount: files.length,
      mockProcessingTimeMs: mockProcessingTime
    });

    await new Promise(resolve => setTimeout(resolve, mockProcessingTime));

    const mockResult = {
      symbolsExtracted: files.length * 5, // Mock: 5 symbols per file
      filesProcessed: files.length,
      results: files.map(file => ({
        file,
        symbols: Array.from({ length: 5 }, (_, i) => ({
          name: `symbol_${i}`,
          type: 'function',
          line: i + 1,
        })),
      })),
    };

    this.logger.debug(`[${pipelineId}] [CODE-PARSING] Mock local parsing completed for ${language}`, {
      language,
      symbolsExtracted: mockResult.symbolsExtracted,
      filesProcessed: mockResult.filesProcessed,
      processingTimeMs: mockProcessingTime
    });

    return mockResult;
  }

  async cleanup(context: PipelineContext): Promise<void> {
    const { pipeline, tempDirectory } = context;
    const pipelineId = pipeline.id;

    this.logger.debug(`[${pipelineId}] [CODE-PARSING] Starting task cleanup`, {
      tempDirectory
    });

    try {
      const files = await fs.readdir(tempDirectory);
      const parsingFiles = files.filter(file =>
        file.endsWith('-files.txt') || file.endsWith('-results.json')
      );

      this.logger.debug(`[${pipelineId}] [CODE-PARSING] Found ${parsingFiles.length} parsing files to clean up`, {
        parsingFiles
      });

      let cleanedFiles = 0;
      for (const file of parsingFiles) {
        const filePath = path.join(tempDirectory, file);
        await fs.rm(filePath, { force: true });
        cleanedFiles++;
        this.logger.debug(`[${pipelineId}] [CODE-PARSING] Cleaned up file: ${file}`);
      }

      this.logger.debug(`[${pipelineId}] [CODE-PARSING] Task cleanup completed`, {
        cleanedFiles,
        tempDirectory
      });

      context.logger.debug(`[${pipelineId}] [CODE-PARSING] Code parsing cleanup completed`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.warn(`[${pipelineId}] [CODE-PARSING] Task cleanup failed`, {
        error: errorMessage,
        tempDirectory
      });

      context.logger.warn(`[${pipelineId}] [CODE-PARSING] Code parsing cleanup failed`, {
        error: errorMessage
      });
    }
  }
}