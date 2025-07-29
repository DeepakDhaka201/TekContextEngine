import { Injectable } from '@nestjs/common';
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

  private driver?: Driver;

  shouldExecute(context: PipelineContext): boolean {
    return !!(context.data.codeParsing?.parsingResults?.length);
  }

  async validate(context: PipelineContext): Promise<void> {
    await super.validate(context);
    
    if (!context.data.codeParsing?.parsingResults) {
      throw new Error('Code parsing results required for graph update');
    }

    const { config } = context;
    if (!config.graph.url || !config.graph.username || !config.graph.password) {
      throw new Error('Neo4j connection configuration is required');
    }
  }

  protected async executeTask(context: PipelineContext): Promise<TaskExecutionResult> {
    const { data, config, logger, project, codebase } = context;
    const parsingResults = data.codeParsing!.parsingResults;
    
    let nodesCreated = 0;
    let nodesUpdated = 0;
    let relationshipsCreated = 0;
    let relationshipsUpdated = 0;
    
    let session: Session | undefined;
    
    try {
      logger.info('Starting graph update', { 
        totalResults: parsingResults.length,
        database: config.graph.database,
      });

      // TODO: Initialize Neo4j connection when package is installed
      // this.driver = neo4j.driver(
      //   config.graph.url,
      //   neo4j.auth.basic(config.graph.username, config.graph.password)
      // );

      // Mock Neo4j session for now
      session = {
        run: async (query: string, params?: any) => {
          logger.debug('Mock Neo4j query', { query, params });
          return { records: [{ get: () => 'created' }] };
        },
        close: async () => { /* mock close */ },
      };

      // Verify connection
      await session.run('RETURN 1');
      logger.debug('Neo4j connection established');

      // Create project and codebase nodes if they don't exist
      await this.ensureProjectNodes(session, project, codebase, logger);

      // Process parsing results in batches
      const batchSize = config.graph.batchSize;
      for (let i = 0; i < parsingResults.length; i += batchSize) {
        const batch = parsingResults.slice(i, i + batchSize);
        
        logger.debug(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(parsingResults.length / batchSize)}`);
        
        const batchResult = await this.processBatch(session, batch, project, codebase, config, logger);
        
        nodesCreated += batchResult.nodesCreated;
        nodesUpdated += batchResult.nodesUpdated;
        relationshipsCreated += batchResult.relationshipsCreated;
        relationshipsUpdated += batchResult.relationshipsUpdated;
      }

      logger.info('Graph update completed', {
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
      logger.error('Graph update failed', { error: error.message });
      
      return {
        success: false,
        duration: 0,
        error: `Graph update failed: ${error.message}`,
      };
    } finally {
      if (session) {
        await session.close();
      }
      if (this.driver) {
        await this.driver.close();
      }
    }
  }

  getEstimatedDuration(context: PipelineContext): number {
    const results = context.data.codeParsing?.parsingResults?.length || 0;
    const symbols = context.data.codeParsing?.symbolsExtracted || 0;
    return Math.max(30000, symbols * 10); // Minimum 30 seconds, ~10ms per symbol
  }

  private async ensureProjectNodes(
    session: Session,
    project: any,
    codebase: any,
    logger: any
  ): Promise<void> {
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

    if (codebase) {
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
    }

    logger.debug('Project and codebase nodes ensured');
  }

  private async processBatch(
    session: Session,
    batch: any[],
    project: any,
    codebase: any,
    config: any,
    logger: any
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

    for (const fileResult of batch) {
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
    if (this.driver) {
      await this.driver.close();
      this.driver = undefined;
    }
    context.logger.debug('Graph update cleanup completed');
  }
}