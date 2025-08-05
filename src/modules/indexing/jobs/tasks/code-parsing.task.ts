import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { BaseTask } from '../interfaces/base-task.interface';
import { JobContext, TaskExecutionResult } from '../interfaces/job-context.interface';
import { CodeParsingConfig } from '../../entities/index-job.entity';
import { TaskConfigService } from '../../config/task-config.service';
import { DockerParserService } from '../../services/docker-parser.service';
import { ParserOutputTransformerService, StandardizedParserOutput } from '../../services/parser-output-transformer.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class CodeParsingTask extends BaseTask {
  readonly name = 'CODE_PARSING';
  readonly description = 'Parse source code and extract symbols';
  readonly requiredTasks: string[] = ['GIT_SYNC'];
  readonly optionalTasks: string[] = [];

  constructor(
    private taskConfigService: TaskConfigService,
    private dockerParserService: DockerParserService,
    private parserTransformerService: ParserOutputTransformerService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    super();
  }

  getConfig(context: JobContext): CodeParsingConfig {
    return this.taskConfigService.getCodeParsingConfig(context.job.type);
  }

  shouldExecute(context: JobContext): boolean {
    const { job, data } = context;
    const jobId = job.id;
    const hasFilesToProcess = !!(data.GIT_SYNC?.filesAdded?.length || data.GIT_SYNC?.filesChanged?.length);

    this.logger.debug(`[${jobId}] [CODE-PARSING] Checking if task should execute`, {
      hasGitSyncData: !!data.GIT_SYNC,
      filesAdded: data.GIT_SYNC?.filesAdded?.length || 0,
      filesChanged: data.GIT_SYNC?.filesChanged?.length || 0,
      shouldExecute: hasFilesToProcess
    });

    return hasFilesToProcess;
  }

  async validate(context: JobContext): Promise<void> {
    const { job, data } = context;
    const jobId = job.id;

    this.logger.debug(`[${jobId}] [CODE-PARSING] Validating task prerequisites`);

    if (!data.GIT_SYNC) {
      throw new Error('Git sync data is required for code parsing');
    }

    if (!data.GIT_SYNC.clonePath) {
      throw new Error('Clone path is required for code parsing');
    }

    // Check if clone path exists
    try {
      await fs.access(data.GIT_SYNC.clonePath);
    } catch (error) {
      throw new Error(`Clone path does not exist: ${data.GIT_SYNC.clonePath}`);
    }

    this.logger.debug(`[${jobId}] [CODE-PARSING] Task validation completed successfully`);
  }

  protected async executeTask(context: JobContext): Promise<TaskExecutionResult> {
    const { job, data } = context;
    const jobId = job.id;
    const config = this.getConfig(context);
    const gitSyncData = data.GIT_SYNC!;

    context.logger.info(`[${jobId}] [CODE-PARSING] Starting code parsing task`);

    try {
      const filesToProcess = [
        ...(gitSyncData.filesAdded || []),
        ...(gitSyncData.filesChanged || [])
      ];

      let totalSymbolsExtracted = 0;
      let totalFilesProcessed = 0;
      const languageStats: Record<string, number> = {};
      const parsingResults: any[] = [];

      // Group files by language
      const filesByLanguage = this.groupFilesByLanguage(filesToProcess);

      // Process each language
      for (const [language, files] of Object.entries(filesByLanguage)) {
        if (!config.languages[language]?.enabled) {
          context.logger.debug(`[${jobId}] [CODE-PARSING] Skipping disabled language: ${language}`);
          continue;
        }

        context.logger.info(`[${jobId}] [CODE-PARSING] Processing ${files.length} ${language} files`);

        try {
          const languageResult = await this.parseLanguageFiles(
            language,
            files,
            gitSyncData.clonePath,
            config,
            context
          );

          totalSymbolsExtracted += languageResult.symbolsExtracted;
          totalFilesProcessed += languageResult.filesProcessed;
          languageStats[language] = languageResult.filesProcessed;
          parsingResults.push(languageResult.results);

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          context.logger.error(`[${jobId}] [CODE-PARSING] Failed to parse ${language} files`, {
            error: errorMessage,
            fileCount: files.length
          });
          // Continue with other languages
        }
      }

      // Store results in context for next tasks
      context.data.CODE_PARSING = {
        symbolsExtracted: totalSymbolsExtracted,
        filesProcessed: totalFilesProcessed,
        parsingResults,
        languages: languageStats,
      };

      context.logger.info(`[${jobId}] [CODE-PARSING] Code parsing completed successfully`, {
        totalFilesProcessed,
        totalSymbolsExtracted,
        languagesProcessed: Object.keys(languageStats).length
      });

      return {
        success: true,
        duration: 0, // Will be set by base class
        data: context.data.CODE_PARSING,
        metrics: {
          filesProcessed: totalFilesProcessed,
          symbolsExtracted: totalSymbolsExtracted,
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`[${jobId}] [CODE-PARSING] Task failed with error`, {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });

      return {
        success: false,
        duration: 0,
        error: errorMessage,
      };
    }
  }

  private groupFilesByLanguage(files: string[]): Record<string, string[]> {
    const filesByLanguage: Record<string, string[]> = {};

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      let language = 'unknown';

      // Map file extensions to languages
      switch (ext) {
        case '.java':
          language = 'java';
          break;
        case '.ts':
        case '.tsx':
        case '.js':
        case '.jsx':
          language = 'typescript';
          break;
        case '.py':
          language = 'python';
          break;
        case '.go':
          language = 'go';
          break;
        case '.rs':
          language = 'rust';
          break;
        default:
          continue; // Skip unknown file types
      }

      if (!filesByLanguage[language]) {
        filesByLanguage[language] = [];
      }
      filesByLanguage[language].push(file);
    }

    return filesByLanguage;
  }

  private async parseLanguageFiles(
    language: string,
    files: string[],
    basePath: string,
    config: CodeParsingConfig,
    context: JobContext
  ): Promise<{
    symbolsExtracted: number;
    filesProcessed: number;
    results: StandardizedParserOutput;
  }> {
    const jobId = context.job.id;
    const languageConfig = config.languages[language];

    context.logger.info(`[${jobId}] [CODE-PARSING] Starting Docker-based parsing for ${language}`, {
      fileCount: files.length,
      dockerImage: languageConfig.dockerImage,
      options: languageConfig.options
    });

    try {
      // Ensure Docker image is available
      const imageAvailable = await this.dockerParserService.ensureDockerImage(languageConfig.dockerImage);
      if (!imageAvailable) {
        throw new Error(`Docker image not available: ${languageConfig.dockerImage}`);
      }

      // Create temporary output file
      const outputPath = path.join(os.tmpdir(), `parser-output-${jobId}-${language}-${Date.now()}.json`);

      // Execute Docker parser
      const parserResult = await this.dockerParserService.executeParser({
        dockerImage: languageConfig.dockerImage,
        sourcePath: basePath,
        outputPath,
        options: languageConfig.options,
        timeout: config.timeout
      });

      if (!parserResult.success) {
        throw new Error(`Parser execution failed: ${parserResult.error}`);
      }

      // Transform parser output to standardized format
      const standardizedOutput = this.parserTransformerService.transformParserOutput(
        parserResult.output,
        language
      );

      context.logger.info(`[${jobId}] [CODE-PARSING] Successfully parsed ${language} files`, {
        filesProcessed: standardizedOutput.metadata.totalFiles,
        symbolsExtracted: standardizedOutput.metadata.totalSymbols,
        duration: parserResult.duration
      });

      return {
        symbolsExtracted: standardizedOutput.metadata.totalSymbols,
        filesProcessed: standardizedOutput.metadata.totalFiles,
        results: standardizedOutput,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      context.logger.error(`[${jobId}] [CODE-PARSING] Failed to parse ${language} files`, {
        error: errorMessage,
        fileCount: files.length
      });
      throw error;
    }
  }

  async cleanup(context: JobContext): Promise<void> {
    const { job } = context;
    const jobId = job.id;

    this.logger.debug(`[${jobId}] [CODE-PARSING] Starting task cleanup`);
    // Cleanup temporary parsing files if any
    this.logger.debug(`[${jobId}] [CODE-PARSING] Task cleanup completed`);
  }

  getEstimatedDuration(context: JobContext): number {
    const gitSyncData = context.data.GIT_SYNC;
    const fileCount = (gitSyncData?.filesAdded?.length || 0) + (gitSyncData?.filesChanged?.length || 0);
    const baseTime = 60000; // 1 minute base
    const timePerFile = 1000; // 1 second per file
    return baseTime + (fileCount * timePerFile);
  }
}
