/**
 * @fileoverview Base vector store implementation for semantic search
 * @module modules/memory/vector-store/base-vector-store
 * @requires ../types
 * @requires ../errors
 * 
 * This file provides the base abstract vector store implementation that defines
 * the common interface for different vector database backends including
 * Pinecone, Weaviate, Qdrant, Chroma, and in-memory vector stores.
 * 
 * @since 1.0.0
 */

import {
  VectorSearchQuery,
  VectorSearchResult,
  Embedding,
  VectorStoreConfig
} from '../types';
import { VectorOperationError, VectorSearchError } from '../errors';

/**
 * Vector record for storage in vector databases.
 */
export interface VectorRecord {
  /** Unique identifier */
  id: string;
  
  /** Vector embedding */
  vector: number[];
  
  /** Associated metadata */
  metadata: Record<string, any>;
}

/**
 * Abstract base class for vector store implementations.
 * 
 * Defines the common interface and provides shared functionality
 * for different vector database backends. Concrete implementations
 * should extend this class and implement the abstract methods.
 * 
 * @abstract
 */
export abstract class BaseVectorStore {
  protected initialized: boolean = false;
  protected config: VectorStoreConfig;
  protected dimensions: number;
  
  constructor(config: VectorStoreConfig) {
    this.config = config;
    this.dimensions = config.dimensions || 1536; // Default OpenAI embedding dimension
  }
  
  /**
   * Initializes the vector store.
   * 
   * @returns Promise that resolves when initialization is complete
   */
  abstract initialize(): Promise<void>;
  
  /**
   * Shuts down the vector store.
   * 
   * @returns Promise that resolves when shutdown is complete
   */
  abstract shutdown(): Promise<void>;
  
  /**
   * Upserts (insert or update) vectors in the store.
   * 
   * @param vectors - Array of vector records to upsert
   * @returns Promise that resolves when upsert is complete
   */
  abstract upsert(vectors: VectorRecord[]): Promise<void>;
  
  /**
   * Searches for similar vectors.
   * 
   * @param query - Vector search query
   * @returns Promise resolving to search results
   */
  abstract search(query: VectorSearchQuery): Promise<VectorSearchResult[]>;
  
  /**
   * Deletes vectors by IDs.
   * 
   * @param ids - Array of vector IDs to delete
   * @returns Promise that resolves when deletion is complete
   */
  abstract delete(ids: string[]): Promise<void>;
  
  /**
   * Gets vector store statistics.
   * 
   * @returns Promise resolving to store statistics
   */
  abstract getStats(): Promise<{
    totalVectors: number;
    dimensions: number;
    indexSize?: number;
  }>;
  
  /**
   * Ensures the vector store is initialized before operations.
   * 
   * @protected
   */
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new VectorOperationError(
        'initialize-check',
        'Vector store has not been initialized. Call initialize() first.',
        undefined,
        { initialized: this.initialized, storeType: this.constructor.name }
      );
    }
  }
  
  /**
   * Validates vector dimensions match store configuration.
   * 
   * @param vector - Vector to validate
   * @protected
   */
  protected validateVectorDimensions(vector: number[]): void {
    if (vector.length !== this.dimensions) {
      throw new VectorOperationError(
        'dimension-mismatch',
        `Vector dimension mismatch: expected ${this.dimensions}, got ${vector.length}`,
        undefined,
        {
          expectedDimensions: this.dimensions,
          actualDimensions: vector.length,
          storeType: this.constructor.name
        }
      );
    }
  }
  
  /**
   * Validates search query parameters.
   * 
   * @param query - Search query to validate
   * @protected
   */
  protected validateSearchQuery(query: VectorSearchQuery): void {
    if (!query.vector && !query.text) {
      throw new VectorSearchError(
        'query-validation',
        'Search query must contain either a vector or text',
        undefined,
        { query }
      );
    }
    
    if (query.vector) {
      this.validateVectorDimensions(query.vector);
    }
    
    if (query.limit && query.limit <= 0) {
      throw new VectorSearchError(
        'query-validation',
        'Search limit must be greater than 0',
        undefined,
        { limit: query.limit }
      );
    }
    
    if (query.minScore && (query.minScore < 0 || query.minScore > 1)) {
      throw new VectorSearchError(
        'query-validation',
        'Minimum score must be between 0 and 1',
        undefined,
        { minScore: query.minScore }
      );
    }
  }
  
  /**
   * Validates vector records before upsert operations.
   * 
   * @param vectors - Vector records to validate
   * @protected
   */
  protected validateVectorRecords(vectors: VectorRecord[]): void {
    if (!vectors || vectors.length === 0) {
      throw new VectorOperationError(
        'validation',
        'Vector records array cannot be empty',
        undefined,
        { vectorCount: vectors?.length || 0 }
      );
    }
    
    for (const record of vectors) {
      if (!record.id) {
        throw new VectorOperationError(
          'validation',
          'Vector record must have an ID',
          undefined,
          { record }
        );
      }
      
      if (!record.vector || !Array.isArray(record.vector)) {
        throw new VectorOperationError(
          'validation',
          'Vector record must have a valid vector array',
          undefined,
          { recordId: record.id, hasVector: !!record.vector }
        );
      }
      
      this.validateVectorDimensions(record.vector);
    }
  }
  
  /**
   * Normalizes a vector to unit length.
   * 
   * @param vector - Vector to normalize
   * @returns Normalized vector
   * @protected
   */
  protected normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitude === 0) {
      throw new VectorOperationError(
        'normalization',
        'Cannot normalize zero vector',
        undefined,
        { vectorLength: vector.length }
      );
    }
    
    return vector.map(val => val / magnitude);
  }
  
  /**
   * Calculates cosine similarity between two vectors.
   * 
   * @param vectorA - First vector
   * @param vectorB - Second vector
   * @returns Cosine similarity score (0 to 1)
   * @protected
   */
  protected cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new VectorOperationError(
        'similarity-calculation',
        'Vectors must have the same dimensions for similarity calculation',
        undefined,
        { dimensionsA: vectorA.length, dimensionsB: vectorB.length }
      );
    }
    
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      magnitudeA += vectorA[i] * vectorA[i];
      magnitudeB += vectorB[i] * vectorB[i];
    }
    
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    
    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }
    
    const similarity = dotProduct / (magnitudeA * magnitudeB);
    
    // Convert from [-1, 1] to [0, 1] range
    return (similarity + 1) / 2;
  }
  
  /**
   * Batches vector operations for efficiency.
   * 
   * @param items - Items to batch
   * @param batchSize - Size of each batch
   * @returns Array of batches
   * @protected
   */
  protected createBatches<T>(items: T[], batchSize: number = 100): T[][] {
    const batches: T[][] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    return batches;
  }
  
  /**
   * Generates a unique vector ID.
   * 
   * @param prefix - Optional prefix for the ID
   * @returns Unique identifier
   * @protected
   */
  protected generateVectorId(prefix: string = 'vec'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
  
  /**
   * Filters search results by metadata criteria.
   * 
   * @param results - Search results to filter
   * @param filter - Metadata filter criteria
   * @returns Filtered results
   * @protected
   */
  protected applyMetadataFilter(
    results: VectorSearchResult[], 
    filter: Record<string, any>
  ): VectorSearchResult[] {
    if (!filter || Object.keys(filter).length === 0) {
      return results;
    }
    
    return results.filter(result => {
      if (!result.metadata) return false;
      
      return Object.entries(filter).every(([key, value]) => {
        const metadataValue = result.metadata![key];
        
        if (Array.isArray(value)) {
          return value.includes(metadataValue);
        }
        
        if (typeof value === 'object' && value !== null) {
          // Support range queries like { $gte: 0.5 }
          if ('$gte' in value) return metadataValue >= value.$gte;
          if ('$lte' in value) return metadataValue <= value.$lte;
          if ('$gt' in value) return metadataValue > value.$gt;
          if ('$lt' in value) return metadataValue < value.$lt;
          if ('$eq' in value) return metadataValue === value.$eq;
          if ('$ne' in value) return metadataValue !== value.$ne;
        }
        
        return metadataValue === value;
      });
    });
  }
  
  /**
   * Applies minimum score filter to search results.
   * 
   * @param results - Search results to filter
   * @param minScore - Minimum similarity score
   * @returns Filtered results
   * @protected
   */
  protected applyScoreFilter(
    results: VectorSearchResult[], 
    minScore: number
  ): VectorSearchResult[] {
    return results.filter(result => result.score >= minScore);
  }
  
  /**
   * Limits search results to specified count.
   * 
   * @param results - Search results to limit
   * @param limit - Maximum number of results
   * @returns Limited results
   * @protected
   */
  protected applyResultLimit(
    results: VectorSearchResult[], 
    limit: number
  ): VectorSearchResult[] {
    return results.slice(0, limit);
  }
}