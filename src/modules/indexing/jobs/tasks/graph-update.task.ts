import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { BaseTask } from '../interfaces/base-task.interface';
import { JobContext, TaskExecutionResult } from '../interfaces/job-context.interface';
import { GraphUpdateConfig } from '../../entities/index-job.entity';
import { TaskConfigService } from '../../config/task-config.service';
import { StandardizedGraphOutput } from '../../services/parser-output-transformer.service';
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

      // Process parsing results - now expecting StandardizedGraphOutput
      const parsingResults: StandardizedGraphOutput[] = codeParsingData.parsingResults;

      // Combine all nodes and relationships from all parser outputs
      const allNodes = [];
      const allRelationships = [];

      for (const parserOutput of parsingResults) {
        allNodes.push(...parserOutput.nodes);
        allRelationships.push(...parserOutput.relationships);
      }

      context.logger.info(`[${jobId}] [GRAPH-UPDATE] Total nodes from parser: ${allNodes.length}`);
      context.logger.info(`[${jobId}] [GRAPH-UPDATE] Total relationships from parser: ${allRelationships.length}`);
      context.logger.info(`[${jobId}] [GRAPH-UPDATE] Parser results structure:`, {
        parsingResultsCount: parsingResults.length,
        firstResultStructure: parsingResults[0] ? {
          hasMetadata: !!parsingResults[0].metadata,
          hasNodes: !!parsingResults[0].nodes,
          nodesCount: parsingResults[0].nodes?.length || 0,
          relationshipsCount: parsingResults[0].relationships?.length || 0,
          totalNodes: parsingResults[0].metadata?.totalNodes || 0
        } : 'No results'
      });

      context.logger.info(`[${jobId}] [GRAPH-UPDATE] Sample node structure:`, allNodes[0] ? {
        id: allNodes[0].id,
        nodeType: allNodes[0].nodeType,
        propertiesKeys: Object.keys(allNodes[0].properties || {}),
        nodeStructure: Object.keys(allNodes[0])
      } : 'No nodes');

      context.logger.info(`[${jobId}] [GRAPH-UPDATE] Processing ${allNodes.length} nodes and ${allRelationships.length} relationships in batches of ${config.batchSize}`);

      // Get codebase ID from job context
      if (!context.codebase) {
        throw new Error('Codebase not found in job context');
      }
      const codebaseId = context.codebase.id;

      // Update the graph with parsed nodes and relationships
      const result = await this.graphService.updateCodebaseGraph(
        codebaseId,
        allNodes,
        allRelationships,
        config
      );

      // Store results in context for next tasks
      context.data.GRAPH_UPDATE = result;

      context.logger.info(`[${jobId}] [GRAPH-UPDATE] Graph update completed successfully`, {
        ...result,
        nodesProcessed: allNodes.length,
        relationshipsProcessed: allRelationships.length
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
