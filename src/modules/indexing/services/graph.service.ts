import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TekProject, Codebase } from '@/entities';
import { Neo4jService, GraphOperationResult } from './neo4j.service';
import { GraphUpdateConfig } from '../entities/index-job.entity';
import { StandardizedFile, StandardizedSymbol } from './parser-output-transformer.service';
import { createHash } from 'crypto';

@Injectable()
export class GraphService {
  constructor(
    private readonly neo4jService: Neo4jService,
    @InjectRepository(TekProject)
    private readonly projectRepository: Repository<TekProject>,
    @InjectRepository(Codebase)
    private readonly codebaseRepository: Repository<Codebase>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Initialize the graph database with constraints and indexes
   */
  async initializeGraph(config: GraphUpdateConfig): Promise<void> {
    await this.neo4jService.connect(config);
    await this.neo4jService.createConstraintsAndIndexes();
    this.logger.log(`[GRAPH-SERVICE] Graph database initialized`);
  }

  /**
   * Update the graph with parsed files from a codebase
   */
  async updateCodebaseGraph(
    codebaseId: string,
    files: StandardizedFile[],
    config: GraphUpdateConfig
  ): Promise<GraphOperationResult> {
    await this.neo4jService.connect(config);

    // Get codebase and project information
    const codebase = await this.codebaseRepository.findOne({
      where: { id: codebaseId },
      relations: ['project']
    });

    if (!codebase || !codebase.project) {
      throw new Error(`Codebase ${codebaseId} or its project not found`);
    }

    this.logger.debug(`[GRAPH-SERVICE] Updating graph for codebase: ${codebase.name}`);

    // Create/update project and codebase nodes
    await this.neo4jService.createOrUpdateProject(
      codebase.project.id,
      codebase.project.name
    );

    await this.neo4jService.createOrUpdateCodebase(
      codebase.project.id,
      codebase.id,
      codebase.name,
      codebase.gitlabUrl,
      codebase.language,
      undefined, // framework not available in entity
      codebase.lastSyncCommit
    );

    // Process files in batches
    const batchSize = config.batchSize;
    let totalResult: GraphOperationResult = {
      nodesCreated: 0,
      nodesUpdated: 0,
      relationshipsCreated: 0,
      relationshipsUpdated: 0
    };

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchResult = await this.processBatch(codebaseId, batch);
      
      totalResult.nodesCreated += batchResult.nodesCreated;
      totalResult.nodesUpdated += batchResult.nodesUpdated;
      totalResult.relationshipsCreated += batchResult.relationshipsCreated;
      totalResult.relationshipsUpdated += batchResult.relationshipsUpdated;

      this.logger.debug(`[GRAPH-SERVICE] Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(files.length / batchSize)}`);
    }

    this.logger.log(`[GRAPH-SERVICE] Graph update completed`, {
      codebaseId,
      filesProcessed: files.length,
      ...totalResult
    });

    return totalResult;
  }

  /**
   * Process a batch of files
   */
  private async processBatch(codebaseId: string, files: StandardizedFile[]): Promise<GraphOperationResult> {
    const queries: Array<{ query: string; parameters: Record<string, any> }> = [];

    for (const file of files) {
      // Create file node
      const fileChecksum = this.calculateFileChecksum(file);
      queries.push({
        query: `
          MATCH (c:Codebase {id: $codebaseId})
          MERGE (f:File {path: $filePath})
          SET f.fileName = $fileName,
              f.packageName = $packageName,
              f.language = $language,
              f.checksum = $checksum,
              f.updatedAt = datetime()
          MERGE (c)-[:CONTAINS_FILE]->(f)
        `,
        parameters: {
          codebaseId,
          filePath: file.path,
          fileName: file.fileName,
          packageName: file.packageName,
          language: file.language,
          checksum: fileChecksum
        }
      });

      // Process symbols in the file
      for (const symbol of file.symbols) {
        const symbolQueries = this.createSymbolQueries(file.path, symbol);
        queries.push(...symbolQueries);
      }

      // Process relationships
      for (const relationship of file.relationships) {
        // Extract entity names from spoon IDs for matching
        const sourceName = this.extractEntityNameFromSpoonId(relationship.source);
        const targetName = this.extractEntityNameFromSpoonId(relationship.target);

        if (sourceName && targetName) {
          queries.push({
            query: `
              MATCH (source), (target)
              WHERE (source:Class OR source:Method OR source:Interface OR source:Variable)
                AND (source.name = $sourceName OR source.fullyQualifiedName = $sourceFullName)
                AND (target:Class OR target:Method OR target:Interface OR target:Variable)
                AND (target.name = $targetName OR target.fullyQualifiedName = $targetFullName)
              MERGE (source)-[:${relationship.type.toUpperCase()}]->(target)
            `,
            parameters: {
              sourceName,
              targetName,
              sourceFullName: this.extractFullyQualifiedNameFromSpoonId(relationship.source),
              targetFullName: this.extractFullyQualifiedNameFromSpoonId(relationship.target)
            }
          });
        }
      }
    }

    return await this.neo4jService.executeBatch(queries);
  }

  /**
   * Create Cypher queries for a symbol
   */
  private createSymbolQueries(filePath: string, symbol: StandardizedSymbol): Array<{ query: string; parameters: Record<string, any> }> {
    const queries: Array<{ query: string; parameters: Record<string, any> }> = [];
    const symbolId = this.generateSymbolId(filePath, symbol);

    switch (symbol.type) {
      case 'class':
        queries.push({
          query: `
            MATCH (f:File {path: $filePath})
            MERGE (c:Class {id: $symbolId})
            SET c.name = $name,
                c.fullyQualifiedName = $fullyQualifiedName,
                c.visibility = $visibility,
                c.isStatic = $isStatic,
                c.isAbstract = $isAbstract,
                c.line = $line,
                c.updatedAt = datetime()
            MERGE (f)-[:DEFINES_CLASS]->(c)
          `,
          parameters: {
            filePath,
            symbolId,
            name: symbol.name,
            fullyQualifiedName: this.getFullyQualifiedName(filePath, symbol),
            visibility: symbol.visibility,
            isStatic: symbol.isStatic,
            isAbstract: symbol.isAbstract,
            line: symbol.line
          }
        });
        break;

      case 'interface':
        queries.push({
          query: `
            MATCH (f:File {path: $filePath})
            MERGE (i:Interface {id: $symbolId})
            SET i.name = $name,
                i.fullyQualifiedName = $fullyQualifiedName,
                i.line = $line,
                i.updatedAt = datetime()
            MERGE (f)-[:DEFINES_INTERFACE]->(i)
          `,
          parameters: {
            filePath,
            symbolId,
            name: symbol.name,
            fullyQualifiedName: this.getFullyQualifiedName(filePath, symbol),
            line: symbol.line
          }
        });
        break;

      case 'method':
      case 'function':
        const signature = this.buildMethodSignature(symbol);
        queries.push({
          query: `
            MATCH (f:File {path: $filePath})
            MERGE (m:Method {id: $symbolId})
            SET m.name = $name,
                m.signature = $signature,
                m.returnType = $returnType,
                m.visibility = $visibility,
                m.isStatic = $isStatic,
                m.isAbstract = $isAbstract,
                m.line = $line,
                m.updatedAt = datetime()
            MERGE (f)-[:DEFINES_METHOD]->(m)
          `,
          parameters: {
            filePath,
            symbolId,
            name: symbol.name,
            signature,
            returnType: symbol.returnType,
            visibility: symbol.visibility,
            isStatic: symbol.isStatic,
            isAbstract: symbol.isAbstract,
            line: symbol.line
          }
        });
        break;

      case 'field':
      case 'property':
      case 'variable':
        queries.push({
          query: `
            MATCH (f:File {path: $filePath})
            MERGE (v:Variable {id: $symbolId})
            SET v.name = $name,
                v.type = $type,
                v.visibility = $visibility,
                v.isStatic = $isStatic,
                v.line = $line,
                v.updatedAt = datetime()
            MERGE (f)-[:DEFINES_VARIABLE]->(v)
          `,
          parameters: {
            filePath,
            symbolId,
            name: symbol.name,
            type: symbol.returnType || 'unknown',
            visibility: symbol.visibility,
            isStatic: symbol.isStatic,
            line: symbol.line
          }
        });
        break;
    }

    return queries;
  }

  /**
   * Generate a unique ID for a symbol
   */
  private generateSymbolId(filePath: string, symbol: StandardizedSymbol): string {
    const content = `${filePath}:${symbol.type}:${symbol.name}:${symbol.line || 0}`;
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Get fully qualified name for a symbol
   */
  private getFullyQualifiedName(filePath: string, symbol: StandardizedSymbol): string {
    // Extract package from file path or use symbol name
    const pathParts = filePath.split('/');
    const fileName = pathParts[pathParts.length - 1].replace(/\.(java|ts|js)$/, '');
    return `${fileName}.${symbol.name}`;
  }

  /**
   * Build method signature from symbol
   */
  private buildMethodSignature(symbol: StandardizedSymbol): string {
    const params = symbol.parameters?.map(p => `${p.name}: ${p.type}`).join(', ') || '';
    return `${symbol.name}(${params})${symbol.returnType ? `: ${symbol.returnType}` : ''}`;
  }

  /**
   * Calculate checksum for a file
   */
  private calculateFileChecksum(file: StandardizedFile): string {
    const content = JSON.stringify({
      path: file.path,
      symbols: file.symbols.length,
      relationships: file.relationships.length
    });
    return createHash('md5').update(content).digest('hex');
  }

  /**
   * Handle deleted files by removing them and their related nodes from the graph
   */
  async handleDeletedFiles(codebaseId: string, deletedFilePaths: string[]): Promise<GraphOperationResult> {
    if (deletedFilePaths.length === 0) {
      return { nodesCreated: 0, nodesUpdated: 0, relationshipsCreated: 0, relationshipsUpdated: 0 };
    }

    this.logger.debug(`[GRAPH-SERVICE] Handling ${deletedFilePaths.length} deleted files for codebase: ${codebaseId}`);

    return await this.neo4jService.deleteFilesFromCodebase(codebaseId, deletedFilePaths);
  }

  /**
   * Extract entity name from spoon ID
   * e.g., "comprehensive-test-project:class:com.testproject.BaseEntity" -> "BaseEntity"
   */
  private extractEntityNameFromSpoonId(spoonId: string): string | null {
    if (!spoonId) return null;

    const parts = spoonId.split(':');
    if (parts.length >= 3) {
      const fullyQualifiedName = parts.slice(2).join(':');
      const nameParts = fullyQualifiedName.split('.');
      return nameParts[nameParts.length - 1];
    }

    return null;
  }

  /**
   * Extract fully qualified name from spoon ID
   * e.g., "comprehensive-test-project:class:com.testproject.BaseEntity" -> "com.testproject.BaseEntity"
   */
  private extractFullyQualifiedNameFromSpoonId(spoonId: string): string | null {
    if (!spoonId) return null;

    const parts = spoonId.split(':');
    if (parts.length >= 3) {
      return parts.slice(2).join(':');
    }

    return null;
  }
}
