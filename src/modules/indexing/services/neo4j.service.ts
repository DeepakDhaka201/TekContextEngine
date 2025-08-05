import { Injectable, Inject, LoggerService, OnModuleDestroy } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Driver, Session, auth, driver as neo4jDriver } from 'neo4j-driver';
import { GraphUpdateConfig } from '../entities/index-job.entity';

export interface Neo4jNode {
  id: string;
  labels: string[];
  properties: Record<string, any>;
}

export interface Neo4jRelationship {
  type: string;
  startNodeId: string;
  endNodeId: string;
  properties?: Record<string, any>;
}

export interface GraphOperationResult {
  nodesCreated: number;
  nodesUpdated: number;
  relationshipsCreated: number;
  relationshipsUpdated: number;
  nodesDeleted?: number;
  relationshipsDeleted?: number;
}

@Injectable()
export class Neo4jService implements OnModuleDestroy {
  private driver: Driver | null = null;
  private isConnected = false;
  private database: string = 'neo4j';

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Initialize connection to Neo4j
   */
  async connect(config: GraphUpdateConfig): Promise<void> {
    if (this.isConnected && this.driver) {
      return;
    }

    try {
      this.logger.debug(`[NEO4J] Connecting to Neo4j at ${config.url}`);

      this.database = config.database;
      this.driver = neo4jDriver(
        config.url,
        auth.basic(config.username, config.password),
        {
          maxConnectionLifetime: 30 * 60 * 1000, // 30 minutes
          maxConnectionPoolSize: 50,
          connectionAcquisitionTimeout: 60000, // 60 seconds
        }
      );

      // Test connection
      const session = this.driver.session({ database: this.database });
      await session.run('RETURN 1');
      await session.close();

      this.isConnected = true;
      this.logger.log(`[NEO4J] Successfully connected to Neo4j database: ${config.database}`);
    } catch (error) {
      this.logger.error(`[NEO4J] Failed to connect to Neo4j`, {
        error: error instanceof Error ? error.message : String(error),
        url: config.url,
        database: config.database
      });
      throw error;
    }
  }

  /**
   * Disconnect from Neo4j
   */
  async disconnect(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
      this.isConnected = false;
      this.logger.debug(`[NEO4J] Disconnected from Neo4j`);
    }
  }

  /**
   * Get a new session
   */
  private getSession(): Session {
    if (!this.driver || !this.isConnected) {
      throw new Error('Neo4j driver not connected. Call connect() first.');
    }
    return this.driver.session({ database: this.database });
  }

  /**
   * Create or update a project node
   */
  async createOrUpdateProject(projectId: string, projectName: string): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(
        `
        MERGE (p:Project {projectId: $projectId})
        SET p.name = $projectName,
            p.updatedAt = datetime()
        `,
        { projectId, projectName }
      );
      this.logger.debug(`[NEO4J] Created/updated project node: ${projectId}`);
    } finally {
      await session.close();
    }
  }

  /**
   * Create or update a codebase node
   */
  async createOrUpdateCodebase(
    projectId: string,
    codebaseId: string,
    codebaseName: string,
    gitUrl: string,
    language: string,
    framework?: string,
    lastIndexedCommit?: string
  ): Promise<void> {
    const session = this.getSession();
    try {
      const query = `
        MATCH (p:Project {projectId: $projectId})
        MERGE (c:Codebase {id: $codebaseId})
        SET c.name = $codebaseName,
            c.gitUrl = $gitUrl,
            c.language = $language,
            c.lastIndexedCommit = $lastIndexedCommit,
            c.updatedAt = datetime()
        ${framework ? ', c.framework = $framework' : ''}
        MERGE (p)-[:HAS_CODEBASE]->(c)
      `;

      const parameters: Record<string, any> = {
        projectId,
        codebaseId,
        codebaseName,
        gitUrl,
        language,
        lastIndexedCommit
      };

      if (framework) {
        parameters.framework = framework;
      }

      await session.run(query, parameters);
      this.logger.debug(`[NEO4J] Created/updated codebase node: ${codebaseId}`);
    } finally {
      await session.close();
    }
  }

  /**
   * Delete files and their related nodes for a codebase (for handling deleted files)
   */
  async deleteFilesFromCodebase(codebaseId: string, filePaths: string[]): Promise<GraphOperationResult> {
    if (filePaths.length === 0) {
      return { nodesCreated: 0, nodesUpdated: 0, relationshipsCreated: 0, relationshipsUpdated: 0 };
    }

    const session = this.getSession();
    try {
      const result = await session.run(
        `
        MATCH (c:Codebase {id: $codebaseId})-[:CONTAINS_FILE]->(f:File)
        WHERE f.path IN $filePaths
        
        // Delete all symbols and their relationships
        OPTIONAL MATCH (f)-[:DEFINES_CLASS|DEFINES_METHOD]->(symbol)
        OPTIONAL MATCH (symbol)-[r]-()
        
        WITH f, symbol, r, 
             count(DISTINCT symbol) as symbolsToDelete,
             count(DISTINCT r) as relationshipsToDelete
        
        DETACH DELETE symbol, f
        
        RETURN symbolsToDelete, relationshipsToDelete
        `,
        { codebaseId, filePaths }
      );

      const record = result.records[0];
      const symbolsDeleted = record?.get('symbolsToDelete')?.toNumber() || 0;
      const relationshipsDeleted = record?.get('relationshipsToDelete')?.toNumber() || 0;

      this.logger.debug(`[NEO4J] Deleted ${filePaths.length} files with ${symbolsDeleted} symbols and ${relationshipsDeleted} relationships`);

      return {
        nodesCreated: 0,
        nodesUpdated: 0,
        relationshipsCreated: 0,
        relationshipsUpdated: 0,
        nodesDeleted: filePaths.length + symbolsDeleted,
        relationshipsDeleted
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Create constraints and indexes for the graph schema
   */
  async createConstraintsAndIndexes(): Promise<void> {
    const session = this.getSession();
    try {
      // Create uniqueness constraints
      const constraints = [
        'CREATE CONSTRAINT project_id_unique IF NOT EXISTS FOR (p:Project) REQUIRE p.projectId IS UNIQUE',
        'CREATE CONSTRAINT codebase_id_unique IF NOT EXISTS FOR (c:Codebase) REQUIRE c.id IS UNIQUE',
        'CREATE CONSTRAINT class_id_unique IF NOT EXISTS FOR (cl:Class) REQUIRE cl.id IS UNIQUE',
        'CREATE CONSTRAINT method_id_unique IF NOT EXISTS FOR (m:Method) REQUIRE m.id IS UNIQUE',
        'CREATE CONSTRAINT interface_id_unique IF NOT EXISTS FOR (i:Interface) REQUIRE i.id IS UNIQUE',
        'CREATE CONSTRAINT api_endpoint_id_unique IF NOT EXISTS FOR (a:APIEndpoint) REQUIRE a.id IS UNIQUE',
      ];

      for (const constraint of constraints) {
        try {
          await session.run(constraint);
        } catch (error) {
          // Constraint might already exist, log but continue
          this.logger.debug(`[NEO4J] Constraint creation result: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Create indexes for frequently queried properties
      const indexes = [
        'CREATE INDEX file_path_index IF NOT EXISTS FOR (f:File) ON (f.path)',
        'CREATE INDEX class_name_index IF NOT EXISTS FOR (c:Class) ON (c.name)',
        'CREATE INDEX method_name_index IF NOT EXISTS FOR (m:Method) ON (m.name)',
        'CREATE INDEX class_fqn_index IF NOT EXISTS FOR (c:Class) ON (c.fullyQualifiedName)',
      ];

      for (const index of indexes) {
        try {
          await session.run(index);
        } catch (error) {
          // Index might already exist, log but continue
          this.logger.debug(`[NEO4J] Index creation result: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      this.logger.log(`[NEO4J] Created constraints and indexes`);
    } finally {
      await session.close();
    }
  }

  /**
   * Execute a batch of Cypher queries in a transaction
   */
  async executeBatch(queries: Array<{ query: string; parameters: Record<string, any> }>): Promise<GraphOperationResult> {
    const session = this.getSession();
    const tx = session.beginTransaction();

    let nodesCreated = 0;
    let nodesUpdated = 0;
    let relationshipsCreated = 0;
    let relationshipsUpdated = 0;

    try {
      for (const { query, parameters } of queries) {
        const result = await tx.run(query, parameters);

        // Extract statistics from result summary
        const summary = result.summary;
        if (summary && summary.counters) {
          // Use the correct property names for Neo4j v5
          nodesCreated += summary.counters.updates().nodesCreated || 0;
          nodesUpdated += summary.counters.updates().propertiesSet || 0;
          relationshipsCreated += summary.counters.updates().relationshipsCreated || 0;
        }
      }

      await tx.commit();

      return {
        nodesCreated,
        nodesUpdated,
        relationshipsCreated,
        relationshipsUpdated
      };
    } catch (error) {
      await tx.rollback();
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Create or update a file node and its relationship to codebase
   */
  async createOrUpdateFile(
    codebaseId: string,
    filePath: string,
    fileName: string,
    checksum?: string,
    lineCount?: number
  ): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(
        `
        MATCH (c:Codebase {id: $codebaseId})
        MERGE (f:File {path: $filePath})
        SET f.fileName = $fileName,
            f.checksum = $checksum,
            f.lineCount = $lineCount,
            f.updatedAt = datetime()
        MERGE (c)-[:CONTAINS_FILE]->(f)
        `,
        { codebaseId, filePath, fileName, checksum, lineCount }
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Create or update a class node
   */
  async createOrUpdateClass(
    fileId: string,
    classId: string,
    className: string,
    fullyQualifiedName: string,
    comment?: string,
    visibility?: string,
    isAbstract?: boolean,
    isStatic?: boolean
  ): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(
        `
        MATCH (f:File {path: $fileId})
        MERGE (c:Class {id: $classId})
        SET c.name = $className,
            c.fullyQualifiedName = $fullyQualifiedName,
            c.comment = $comment,
            c.visibility = $visibility,
            c.isAbstract = $isAbstract,
            c.isStatic = $isStatic,
            c.updatedAt = datetime()
        MERGE (f)-[:DEFINES_CLASS]->(c)
        `,
        {
          fileId,
          classId,
          className,
          fullyQualifiedName,
          comment,
          visibility,
          isAbstract,
          isStatic
        }
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Create or update a method node
   */
  async createOrUpdateMethod(
    parentId: string,
    parentType: 'File' | 'Class' | 'Interface',
    methodId: string,
    methodName: string,
    signature: string,
    returnType?: string,
    comment?: string,
    body?: string,
    visibility?: string,
    cyclomaticComplexity?: number
  ): Promise<void> {
    const session = this.getSession();
    try {
      const relationshipType = parentType === 'File' ? 'DEFINES_METHOD' : 'HAS_METHOD';

      await session.run(
        `
        MATCH (parent:${parentType} {${parentType === 'File' ? 'path' : 'id'}: $parentId})
        MERGE (m:Method {id: $methodId})
        SET m.name = $methodName,
            m.signature = $signature,
            m.returnType = $returnType,
            m.comment = $comment,
            m.body = $body,
            m.visibility = $visibility,
            m.cyclomaticComplexity = $cyclomaticComplexity,
            m.updatedAt = datetime()
        MERGE (parent)-[:${relationshipType}]->(m)
        `,
        {
          parentId,
          methodId,
          methodName,
          signature,
          returnType,
          comment,
          body,
          visibility,
          cyclomaticComplexity
        }
      );
    } finally {
      await session.close();
    }
  }

  async onModuleDestroy() {
    await this.disconnect();
  }
}
