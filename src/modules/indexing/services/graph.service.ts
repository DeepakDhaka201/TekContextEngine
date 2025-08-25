import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TekProject, Codebase } from '@/entities';
import { Neo4jService, GraphOperationResult } from './neo4j.service';
import { GraphUpdateConfig } from '../entities/index-job.entity';
import { StandardizedGraphNode } from './parser-output-transformer.service';
import { BaseRelationship } from '../dto';

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
   * Update the graph with standardized nodes and relationships from parser
   */
  async updateCodebaseGraph(
    codebaseId: string,
    nodes: StandardizedGraphNode[],
    relationships: BaseRelationship[],
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

    this.logger.debug(`[GRAPH-SERVICE] Updating graph with nodes for codebase: ${codebase.name}`);

    const queries = [];
    let nodesCreated = 0;
    let relationshipsCreated = 0;

    // Process nodes in batches
    const batchSize = config.batchSize || 100;
    for (let i = 0; i < nodes.length; i += batchSize) {
      const batch = nodes.slice(i, i + batchSize);
      
      for (const node of batch) {
        // Create node query based on node type
        const nodeQuery = this.createNodeQuery(node);
        if (nodeQuery) {
          queries.push(nodeQuery);
          nodesCreated++;
        }
      }

      // Execute batch
      if (queries.length > 0) {
        await this.neo4jService.executeBatch(queries);
        queries.length = 0; // Clear the array
      }
    }

    // Process relationships in batches
    for (let i = 0; i < relationships.length; i += batchSize) {
      const batch = relationships.slice(i, i + batchSize);
      
      for (const relationship of batch) {
        // Create relationship query
        const relQuery = this.createRelationshipQuery(relationship);
        if (relQuery) {
          queries.push(relQuery);
          relationshipsCreated++;
        }
      }

      // Execute batch
      if (queries.length > 0) {
        await this.neo4jService.executeBatch(queries);
        queries.length = 0; // Clear the array
      }
    }

    this.logger.log(`[GRAPH-SERVICE] Graph update completed`, {
      codebaseId,
      nodesCreated,
      relationshipsCreated
    });

    return {
      nodesCreated,
      relationshipsCreated,
      nodesUpdated: 0,
      relationshipsUpdated: 0
    };
  }

  /**
   * Create a Cypher query for a standardized graph node
   */
  private createNodeQuery(node: StandardizedGraphNode): { query: string; parameters: any } | null {
    const nodeType = node.nodeType;
    const properties = this.sanitizeProperties(node.properties);

    // Build property string for Cypher
    const propertyKeys = Object.keys(properties);
    const setClause = propertyKeys.map(key => `n.${key} = $${key}`).join(', ');

    const query = `
      MERGE (n:${nodeType} {id: $id})
      SET ${setClause}
      SET n.updatedAt = datetime()
    `;

    const parameters = {
      id: node.id,
      ...properties
    };

    return { query, parameters };
  }

  /**
   * Create a Cypher query for a relationship
   */
  private createRelationshipQuery(relationship: BaseRelationship): { query: string; parameters: any } | null {
    const query = `
      MATCH (start {id: $startNodeId})
      MATCH (end {id: $endNodeId})
      MERGE (start)-[r:${relationship.type}]->(end)
      SET r.updatedAt = datetime()
    `;

    const parameters = {
      startNodeId: relationship.startNodeId,
      endNodeId: relationship.endNodeId,
      ...relationship.properties
    };

    return { query, parameters };
  }

  /**
   * Sanitize properties to ensure they are Neo4j compatible
   * Neo4j only accepts primitive types (string, number, boolean) or arrays of primitives
   */
  private sanitizeProperties(properties: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(properties)) {
      if (value === null || value === undefined) {
        continue; // Skip null/undefined values
      }

      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (Array.isArray(value)) {
        // Handle arrays - convert complex objects to strings
        sanitized[key] = value.map(item => {
          if (typeof item === 'object' && item !== null) {
            return JSON.stringify(item);
          }
          return item;
        });
      } else if (typeof value === 'object') {
        // Convert objects to JSON strings
        sanitized[key] = JSON.stringify(value);
      } else {
        // Convert other types to strings
        sanitized[key] = String(value);
      }
    }

    return sanitized;
  }
}
