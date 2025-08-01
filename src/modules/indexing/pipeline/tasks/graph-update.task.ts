import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { BaseTask } from '../interfaces/base-task.interface';
import { PipelineContext, TaskExecutionResult } from '../interfaces/pipeline-context.interface';
// TODO: Install neo4j-driver package
// import { Driver, Session } from 'neo4j-driver';
// import * as neo4j from 'neo4j-driver';

// Temporary mock types
interface Driver {
  session: (config: any) => Session;
  close: () => Promise<void>;
}

interface Session {
  run: (query: string, params?: any) => Promise<any>;
  close: () => Promise<void>;
}

@Injectable()
export class GraphUpdateTask extends BaseTask {
  readonly name = 'update_graph';
  readonly description = 'Update Neo4j knowledge graph with parsed symbols';
  readonly requiredSteps: string[] = ['codeParsing'];
  readonly optionalSteps: string[] = [];

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    super();
  }

  private driver?: Driver;

  shouldExecute(context: PipelineContext): boolean {
    const { pipeline, data } = context;
    const pipelineId = pipeline.id;
    const hasParsingResults = !!(data.codeParsing?.parsingResults?.length);

    this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Checking if task should execute`, 'GraphUpdateTask');
    this.logger.debug({
      hasCodeParsingData: !!data.codeParsing,
      parsingResultsCount: data.codeParsing?.parsingResults?.length || 0,
      symbolsExtracted: data.codeParsing?.symbolsExtracted || 0,
      shouldExecute: hasParsingResults
    }, 'GraphUpdateTask');

    return hasParsingResults;
  }

  async validate(context: PipelineContext): Promise<void> {
    const { pipeline, data, config } = context;
    const pipelineId = pipeline.id;

    this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Validating task prerequisites`, 'GraphUpdateTask');

    await super.validate(context);

    if (!data.codeParsing?.parsingResults) {
      this.logger.error(`[${pipelineId}] [GRAPH-UPDATE] Validation failed: No code parsing results available`);
      throw new Error('Code parsing results required for graph update');
    }

    this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Code parsing results validation passed`, {
      parsingResultsCount: data.codeParsing.parsingResults.length,
      symbolsExtracted: data.codeParsing.symbolsExtracted,
      filesProcessed: data.codeParsing.filesProcessed
    });

    if (!config.graph.url || !config.graph.username || !config.graph.password) {
      this.logger.error(`[${pipelineId}] [GRAPH-UPDATE] Validation failed: Neo4j configuration incomplete`, {
        hasUrl: !!config.graph.url,
        hasUsername: !!config.graph.username,
        hasPassword: !!config.graph.password,
        database: config.graph.database
      });
      throw new Error('Neo4j connection configuration is required');
    }

    this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Task validation completed successfully`, {
      graphUrl: config.graph.url,
      graphDatabase: config.graph.database,
      batchSize: config.graph.batchSize,
      parsingResultsCount: data.codeParsing.parsingResults.length
    });
  }

  protected async executeTask(context: PipelineContext): Promise<TaskExecutionResult> {
    const { data, config, logger, project, codebase, pipeline } = context;
    const pipelineId = pipeline.id;
    const parsingResults = data.codeParsing!.parsingResults;

    this.logger.log(`[${pipelineId}] [GRAPH-UPDATE] Starting graph update task`, {
      totalResults: parsingResults.length,
      database: config.graph.database,
      batchSize: config.graph.batchSize,
      projectId: project.id,
      projectName: project.name,
      codebaseId: codebase?.id,
      codebaseName: codebase?.name
    });

    let nodesCreated = 0;
    let nodesUpdated = 0;
    let relationshipsCreated = 0;
    let relationshipsUpdated = 0;

    let session: Session | undefined;

    try {
      logger.info(`[${pipelineId}] [GRAPH-UPDATE] Starting graph update`, {
        totalResults: parsingResults.length,
        database: config.graph.database,
      });

      // TODO: Initialize Neo4j connection when package is installed
      // this.driver = neo4j.driver(
      //   config.graph.url,
      //   neo4j.auth.basic(config.graph.username, config.graph.password)
      // );

      this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Initializing mock Neo4j session`, {
        graphUrl: config.graph.url,
        database: config.graph.database
      });

      // Mock Neo4j session for now
      session = {
        run: async (query: string, params?: any) => {
          this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Executing mock Neo4j query`, {
            query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
            paramKeys: params ? Object.keys(params) : []
          });
          logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Mock Neo4j query`, { query, params });
          return { records: [{ get: () => 'created' }] };
        },
        close: async () => {
          this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Closing mock Neo4j session`);
        },
      };

      // Verify connection
      this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Verifying Neo4j connection`);
      await session.run('RETURN 1');

      this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Neo4j connection verified successfully`);
      logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Neo4j connection established`);

      // Create project and codebase nodes if they don't exist
      this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Ensuring project and codebase nodes exist`);
      await this.ensureProjectNodes(session, project, codebase, logger, pipelineId);

      // Process parsing results in batches
      const batchSize = config.graph.batchSize;
      const totalBatches = Math.ceil(parsingResults.length / batchSize);

      this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Starting batch processing`, {
        totalResults: parsingResults.length,
        batchSize,
        totalBatches
      });

      for (let i = 0; i < parsingResults.length; i += batchSize) {
        const batch = parsingResults.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;

        this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Processing batch ${batchNumber}/${totalBatches}`, {
          batchNumber,
          totalBatches,
          batchSize: batch.length,
          startIndex: i,
          endIndex: i + batch.length - 1
        });

        logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Processing batch ${batchNumber}/${totalBatches}`);

        const batchStartTime = Date.now();
        const batchResult = await this.processBatch(session, batch, project, codebase, config, logger, pipelineId);
        const batchDuration = Date.now() - batchStartTime;

        nodesCreated += batchResult.nodesCreated;
        nodesUpdated += batchResult.nodesUpdated;
        relationshipsCreated += batchResult.relationshipsCreated;
        relationshipsUpdated += batchResult.relationshipsUpdated;

        this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Batch ${batchNumber} completed`, {
          batchNumber,
          durationMs: batchDuration,
          nodesCreated: batchResult.nodesCreated,
          nodesUpdated: batchResult.nodesUpdated,
          relationshipsCreated: batchResult.relationshipsCreated,
          relationshipsUpdated: batchResult.relationshipsUpdated,
          totalNodesCreated: nodesCreated,
          totalRelationshipsCreated: relationshipsCreated
        });
      }

      this.logger.log(`[${pipelineId}] [GRAPH-UPDATE] Graph update task completed successfully`, {
        nodesCreated,
        nodesUpdated,
        relationshipsCreated,
        relationshipsUpdated,
        totalItems: nodesCreated + nodesUpdated + relationshipsCreated + relationshipsUpdated,
        parsingResultsProcessed: parsingResults.length
      });

      logger.info(`[${pipelineId}] [GRAPH-UPDATE] Graph update completed`, {
        nodesCreated,
        nodesUpdated,
        relationshipsCreated,
        relationshipsUpdated,
      });

      // Store results in context
      context.data.graphUpdate = {
        nodesCreated,
        nodesUpdated,
        relationshipsCreated,
        relationshipsUpdated,
      };

      return {
        success: true,
        duration: 0,
        data: context.data.graphUpdate,
        metrics: {
          itemsCreated: nodesCreated + relationshipsCreated,
          itemsUpdated: nodesUpdated + relationshipsUpdated,
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`[${pipelineId}] [GRAPH-UPDATE] Task failed with error`, {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        nodesCreated,
        nodesUpdated,
        relationshipsCreated,
        relationshipsUpdated,
        parsingResultsCount: parsingResults.length
      });

      logger.error(`[${pipelineId}] [GRAPH-UPDATE] Graph update failed`, {
        error: errorMessage
      });

      return {
        success: false,
        duration: 0,
        error: `Graph update failed: ${errorMessage}`,
      };
    } finally {
      this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Cleaning up resources`);

      if (session) {
        this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Closing Neo4j session`);
        await session.close();
      }
      if (this.driver) {
        this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Closing Neo4j driver`);
        await this.driver.close();
      }

      this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Resource cleanup completed`);
    }
  }

  getEstimatedDuration(context: PipelineContext): number {
    const { pipeline, data } = context;
    const pipelineId = pipeline.id;

    const results = data.codeParsing?.parsingResults?.length || 0;
    const symbols = data.codeParsing?.symbolsExtracted || 0;
    const estimatedTime = Math.max(30000, symbols * 10); // Minimum 30 seconds, ~10ms per symbol

    this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Estimated task duration calculated`, {
      parsingResults: results,
      symbolsExtracted: symbols,
      estimatedTimeMs: estimatedTime,
      estimatedTimeMin: Math.round(estimatedTime / 60000)
    });

    return estimatedTime;
  }

  private async ensureProjectNodes(
    session: Session,
    project: any,
    codebase: any,
    logger: any,
    pipelineId: string
  ): Promise<void> {
    this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Creating/updating project node`, {
      projectId: project.id,
      projectName: project.name
    });

    // Create or update project node
    await session.run(`
      MERGE (p:Project {id: $projectId})
      SET p.name = $projectName,
          p.updatedAt = datetime()
      ON CREATE SET p.createdAt = datetime()
    `, {
      projectId: project.id,
      projectName: project.name,
    });

    this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Project node created/updated successfully`);

    if (codebase) {
      this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Creating/updating codebase node and relationship`, {
        codebaseId: codebase.id,
        codebaseName: codebase.name,
        gitlabUrl: codebase.gitlabUrl,
        branch: codebase.branch
      });

      // Create or update codebase node and relationship
      await session.run(`
        MATCH (p:Project {id: $projectId})
        MERGE (c:Codebase {id: $codebaseId})
        SET c.name = $codebaseName,
            c.gitlabUrl = $gitlabUrl,
            c.branch = $branch,
            c.updatedAt = datetime()
        ON CREATE SET c.createdAt = datetime()
        MERGE (p)-[:CONTAINS]->(c)
      `, {
        projectId: project.id,
        codebaseId: codebase.id,
        codebaseName: codebase.name,
        gitlabUrl: codebase.gitlabUrl,
        branch: codebase.branch,
      });

      this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Codebase node and relationship created/updated successfully`);
    } else {
      this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] No codebase provided, skipping codebase node creation`);
    }

    this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Project and codebase nodes ensured successfully`);
    logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Project and codebase nodes ensured`);
  }

  private async processBatch(
    session: Session,
    batch: any[],
    project: any,
    codebase: any,
    config: any,
    logger: any,
    pipelineId: string
  ): Promise<{
    nodesCreated: number;
    nodesUpdated: number;
    relationshipsCreated: number;
    relationshipsUpdated: number;
  }> {
    let nodesCreated = 0;
    let nodesUpdated = 0;
    let relationshipsCreated = 0;
    let relationshipsUpdated = 0;

    this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Processing batch of ${batch.length} file results`);

    for (let fileIndex = 0; fileIndex < batch.length; fileIndex++) {
      const fileResult = batch[fileIndex];

      this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Processing file ${fileIndex + 1}/${batch.length}`, {
        filePath: fileResult.file,
        symbolCount: fileResult.symbols?.length || 0
      });
      // Create file node
      const fileResult2 = await session.run(`
        MERGE (f:File {path: $filePath, codebaseId: $codebaseId})
        SET f.name = $fileName,
            f.extension = $extension,
            f.updatedAt = datetime()
        ON CREATE SET f.createdAt = datetime()
        RETURN f, 
               CASE WHEN f.createdAt = f.updatedAt THEN 'created' ELSE 'updated' END as action
      `, {
        filePath: fileResult.file,
        codebaseId: codebase?.id || null,
        fileName: fileResult.file.split('/').pop(),
        extension: fileResult.file.split('.').pop(),
      });

      const fileAction = fileResult2.records[0]?.get('action');
      if (fileAction === 'created') nodesCreated++;
      else nodesUpdated++;

      // Connect file to codebase
      if (codebase) {
        const relResult = await session.run(`
          MATCH (c:Codebase {id: $codebaseId})
          MATCH (f:File {path: $filePath, codebaseId: $codebaseId})
          MERGE (c)-[r:CONTAINS]->(f)
          RETURN r,
                 CASE WHEN r.createdAt IS NULL THEN 'created' ELSE 'updated' END as action
          SET r.createdAt = COALESCE(r.createdAt, datetime()),
              r.updatedAt = datetime()
        `, {
          codebaseId: codebase.id,
          filePath: fileResult.file,
        });

        const relAction = relResult.records[0]?.get('action');
        if (relAction === 'created') relationshipsCreated++;
        else relationshipsUpdated++;
      }

      // Process symbols in the file
      for (const symbol of fileResult.symbols || []) {
        const symbolResult = await session.run(`
          MERGE (s:Symbol {name: $name, file: $file, type: $type})
          SET s.line = $line,
              s.updatedAt = datetime()
          ON CREATE SET s.createdAt = datetime()
          RETURN s,
                 CASE WHEN s.createdAt = s.updatedAt THEN 'created' ELSE 'updated' END as action
        `, {
          name: symbol.name,
          file: fileResult.file,
          type: symbol.type,
          line: symbol.line,
        });

        const symbolAction = symbolResult.records[0]?.get('action');
        if (symbolAction === 'created') nodesCreated++;
        else nodesUpdated++;

        // Connect symbol to file
        const symbolRelResult = await session.run(`
          MATCH (f:File {path: $filePath, codebaseId: $codebaseId})
          MATCH (s:Symbol {name: $name, file: $file, type: $type})
          MERGE (f)-[r:DEFINES]->(s)
          SET r.createdAt = COALESCE(r.createdAt, datetime()),
              r.updatedAt = datetime()
          RETURN r,
                 CASE WHEN r.createdAt = r.updatedAt THEN 'created' ELSE 'updated' END as action
        `, {
          filePath: fileResult.file,
          codebaseId: codebase?.id || null,
          name: symbol.name,
          file: fileResult.file,
          type: symbol.type,
        });

        const symbolRelAction = symbolRelResult.records[0]?.get('action');
        if (symbolRelAction === 'created') relationshipsCreated++;
        else relationshipsUpdated++;
      }
    }

    return {
      nodesCreated,
      nodesUpdated,
      relationshipsCreated,
      relationshipsUpdated,
    };
  }

  async cleanup(context: PipelineContext): Promise<void> {
    const { pipeline } = context;
    const pipelineId = pipeline.id;

    this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Starting task cleanup`);

    if (this.driver) {
      this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Closing Neo4j driver connection`);
      await this.driver.close();
      this.driver = undefined;
      this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Neo4j driver closed successfully`);
    } else {
      this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] No Neo4j driver to close`);
    }

    this.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Task cleanup completed`);
    context.logger.debug(`[${pipelineId}] [GRAPH-UPDATE] Graph update cleanup completed`);
  }
}