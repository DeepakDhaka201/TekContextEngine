import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { BaseTask } from '../interfaces/base-task.interface';
import { JobContext, TaskExecutionResult } from '../interfaces/job-context.interface';
import { GraphUpdateConfig } from '../../entities/index-job.entity';
import { TaskConfigService } from '../../config/task-config.service';
import { StandardizedParserOutput, StandardizedFile, StandardizedSymbol } from '../../services/parser-output-transformer.service';
import { GraphService } from '../../services/graph.service';

@Injectable()
export class GraphUpdateTask extends BaseTask {
  readonly name = 'GRAPH_UPDATE';
  readonly description = 'Update Neo4j graph database with extracted symbols';
  readonly requiredTasks: string[] = ['CODE_PARSING'];
  readonly optionalTasks: string[] = [];

  constructor(
    private taskConfigService: TaskConfigService,
    private graphService: GraphService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    super();
  }

  getConfig(context: JobContext): GraphUpdateConfig {
    return this.taskConfigService.getGraphUpdateConfig(context.job.type);
  }

  shouldExecute(context: JobContext): boolean {
    const { job, data } = context;
    const jobId = job.id;
    const hasParsingData = !!(data.CODE_PARSING?.parsingResults?.length);

    this.logger.debug(`[${jobId}] [GRAPH-UPDATE] Checking if task should execute`, {
      hasCodeParsingData: !!data.CODE_PARSING,
      parsingResultsCount: data.CODE_PARSING?.parsingResults?.length || 0,
      shouldExecute: hasParsingData
    });

    return hasParsingData;
  }

  async validate(context: JobContext): Promise<void> {
    const { job, data } = context;
    const jobId = job.id;

    this.logger.debug(`[${jobId}] [GRAPH-UPDATE] Validating task prerequisites`);

    if (!data.CODE_PARSING) {
      throw new Error('Code parsing data is required for graph update');
    }

    if (!data.CODE_PARSING.parsingResults || data.CODE_PARSING.parsingResults.length === 0) {
      throw new Error('No parsing results available for graph update');
    }

    this.logger.debug(`[${jobId}] [GRAPH-UPDATE] Task validation completed successfully`);
  }

  protected async executeTask(context: JobContext): Promise<TaskExecutionResult> {
    const { job, data } = context;
    const jobId = job.id;
    const config = this.getConfig(context);
    const codeParsingData = data.CODE_PARSING!;

    context.logger.info(`[${jobId}] [GRAPH-UPDATE] Starting graph update task`);

    try {
      // Initialize graph database
      await this.graphService.initializeGraph(config);

      // Process parsing results
      const parsingResults: StandardizedParserOutput[] = codeParsingData.parsingResults;

      // Flatten all files from all parser outputs
      const allFiles: StandardizedFile[] = [];
      for (const parserOutput of parsingResults) {
        allFiles.push(...parserOutput.files);
      }

      context.logger.info(`[${jobId}] [GRAPH-UPDATE] Total files from parser: ${allFiles.length}`);
      context.logger.info(`[${jobId}] [GRAPH-UPDATE] Parser results structure:`, {
        parsingResultsCount: parsingResults.length,
        firstResultStructure: parsingResults[0] ? {
          hasMetadata: !!parsingResults[0].metadata,
          hasFiles: !!parsingResults[0].files,
          filesCount: parsingResults[0].files?.length || 0,
          metadataSymbols: parsingResults[0].metadata?.totalSymbols || 0
        } : 'No results'
      });

      context.logger.info(`[${jobId}] [GRAPH-UPDATE] Sample file structure:`, allFiles[0] ? {
        path: allFiles[0].path,
        symbolsCount: allFiles[0].symbols?.length || 0,
        hasSymbols: !!allFiles[0].symbols,
        symbolsArray: allFiles[0].symbols,
        fileStructure: Object.keys(allFiles[0])
      } : 'No files');

      // Filter files that have symbols (skip empty files)
      const filesWithSymbols = allFiles.filter(file => file.symbols && file.symbols.length > 0);

      context.logger.info(`[${jobId}] [GRAPH-UPDATE] Processing ${filesWithSymbols.length} files with symbols in batches of ${config.batchSize}`);

      // Get codebase ID from job context
      if (!context.codebase) {
        throw new Error('Codebase not found in job context');
      }
      const codebaseId = context.codebase.id;

      // Update the graph with parsed files
      const result = await this.graphService.updateCodebaseGraph(
        codebaseId,
        filesWithSymbols,
        config
      );

      // Store results in context for next tasks
      context.data.GRAPH_UPDATE = result;

      context.logger.info(`[${jobId}] [GRAPH-UPDATE] Graph update completed successfully`, {
        ...result,
        filesProcessed: filesWithSymbols.length
      });

      return {
        success: true,
        duration: 0, // Will be set by base class
        data: context.data.GRAPH_UPDATE,
        metrics: {
          itemsCreated: result.nodesCreated,
          itemsUpdated: result.relationshipsCreated,
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`[${jobId}] [GRAPH-UPDATE] Task failed with error`, {
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

  async cleanup(context: JobContext): Promise<void> {
    const { job } = context;
    const jobId = job.id;

    this.logger.debug(`[${jobId}] [GRAPH-UPDATE] Starting task cleanup`);
    // Cleanup any temporary graph connections or transactions
    this.logger.debug(`[${jobId}] [GRAPH-UPDATE] Task cleanup completed`);
  }

  getEstimatedDuration(context: JobContext): number {
    const codeParsingData = context.data.CODE_PARSING;
    const resultCount = codeParsingData?.parsingResults?.length || 0;
    const baseTime = 30000; // 30 seconds base
    const timePerResult = 500; // 0.5 seconds per result
    return baseTime + (resultCount * timePerResult);
  }
}
