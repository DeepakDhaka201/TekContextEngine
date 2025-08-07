/**
 * @fileoverview In-memory vector store implementation
 * @module modules/memory/vector-store/memory-vector-store
 * @requires ./base-vector-store
 * @requires ../types
 * @requires ../errors
 * 
 * This file provides an in-memory vector store implementation for development,
 * testing, and small-scale deployments. Uses brute-force similarity search
 * with optimizations for reasonable performance.
 * 
 * @since 1.0.0
 */

import {
  VectorSearchQuery,
  VectorSearchResult,
  VectorStoreConfig
} from '../types';
import { BaseVectorStore, VectorRecord } from './base-vector-store';
import { VectorOperationError, VectorSearchError } from '../errors';

/**
 * In-memory vector store implementation.
 * 
 * Stores all vectors in memory and uses brute-force similarity search.
 * Suitable for development, testing, and small-scale deployments with
 * limited vector counts (typically < 10,000 vectors).
 * 
 * Features:
 * - No external dependencies
 * - Fast startup and shutdown
 * - Exact similarity search
 * - Memory usage monitoring
 * - Data export/import capabilities
 * 
 * @public
 */
export class MemoryVectorStore extends BaseVectorStore {
  private vectors: Map<string, VectorRecord> = new Map();
  private maxVectors: number;
  private indexedVectors: VectorRecord[] = [];
  private indexDirty: boolean = false;
  
  constructor(config: VectorStoreConfig & { maxVectors?: number } = {}) {
    super(config);
    this.maxVectors = config.maxVectors || 50000; // Default limit
  }
  
  /**
   * Initializes the in-memory vector store.
   */
  async initialize(): Promise<void> {
    console.log('Initializing in-memory vector store...');
    console.log(`Configuration: ${this.dimensions} dimensions, max ${this.maxVectors} vectors`);
    
    // Clear any existing data
    this.vectors.clear();
    this.indexedVectors = [];
    this.indexDirty = false;
    
    this.initialized = true;
    console.log('✓ In-memory vector store initialized');
  }
  
  /**
   * Shuts down the vector store and clears all data.
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down in-memory vector store...');
    
    this.vectors.clear();
    this.indexedVectors = [];
    this.initialized = false;
    
    console.log('✓ In-memory vector store shutdown complete');
  }
  
  /**
   * Upserts vectors in the store.
   */
  async upsert(vectors: VectorRecord[]): Promise<void> {
    this.ensureInitialized();
    this.validateVectorRecords(vectors);
    
    try {
      // Check capacity limits
      const newVectorCount = vectors.filter(v => !this.vectors.has(v.id)).length;
      if (this.vectors.size + newVectorCount > this.maxVectors) {
        throw new VectorOperationError(
          'capacity-exceeded',
          `Vector store capacity exceeded: ${this.vectors.size + newVectorCount} > ${this.maxVectors}`,
          undefined,
          {
            currentSize: this.vectors.size,
            newVectors: newVectorCount,
            maxCapacity: this.maxVectors
          }
        );
      }
      
      // Upsert vectors
      for (const vector of vectors) {
        this.vectors.set(vector.id, {
          ...vector,
          vector: [...vector.vector], // Deep copy
          metadata: { ...vector.metadata } // Deep copy
        });
      }
      
      this.indexDirty = true;
      console.log(`✓ Upserted ${vectors.length} vectors`);
      
    } catch (error) {
      throw new VectorOperationError(
        'upsert',
        `Failed to upsert vectors: ${error}`,
        error instanceof Error ? error : undefined,
        { vectorCount: vectors.length }
      );
    }
  }
  
  /**
   * Searches for similar vectors using brute-force comparison.
   */
  async search(query: VectorSearchQuery): Promise<VectorSearchResult[]> {
    this.ensureInitialized();
    this.validateSearchQuery(query);
    
    try {
      if (!query.vector) {
        throw new VectorSearchError(
          'missing-vector',
          'In-memory vector store requires a query vector for search',
          undefined,
          { query }
        );
      }
      
      // Rebuild index if dirty
      if (this.indexDirty) {
        this.rebuildIndex();
      }
      
      const results: VectorSearchResult[] = [];
      const limit = query.limit || 10;
      
      // Calculate similarities for all vectors
      for (const vector of this.indexedVectors) {
        const similarity = this.cosineSimilarity(query.vector, vector.vector);
        
        results.push({
          id: vector.id,
          score: similarity,
          metadata: query.includeMetadata ? vector.metadata : undefined,
          vector: undefined // Don't return vectors by default for performance
        });
      }
      
      // Sort by similarity (highest first)
      results.sort((a, b) => b.score - a.score);
      
      // Apply filters
      let filteredResults = results;
      
      if (query.minScore) {
        filteredResults = this.applyScoreFilter(filteredResults, query.minScore);
      }
      
      if (query.filter) {
        filteredResults = this.applyMetadataFilter(filteredResults, query.filter);
      }
      
      // Apply limit
      filteredResults = this.applyResultLimit(filteredResults, limit);
      
      return filteredResults;
      
    } catch (error) {
      throw new VectorSearchError(
        'search',
        `Vector search failed: ${error}`,
        error instanceof Error ? error : undefined,
        { 
          queryHasVector: !!query.vector,
          queryHasText: !!query.text,
          indexSize: this.indexedVectors.length
        }
      );
    }
  }
  
  /**
   * Deletes vectors by IDs.
   */
  async delete(ids: string[]): Promise<void> {
    this.ensureInitialized();
    
    try {
      let deletedCount = 0;
      
      for (const id of ids) {
        if (this.vectors.delete(id)) {
          deletedCount++;
        }
      }
      
      if (deletedCount > 0) {
        this.indexDirty = true;
        console.log(`✓ Deleted ${deletedCount} vectors`);
      }
      
    } catch (error) {
      throw new VectorOperationError(
        'delete',
        `Failed to delete vectors: ${error}`,
        error instanceof Error ? error : undefined,
        { idsToDelete: ids.length }
      );
    }
  }
  
  /**
   * Gets vector store statistics.
   */
  async getStats(): Promise<{
    totalVectors: number;
    dimensions: number;
    indexSize: number;
    memoryUsage: number;
  }> {
    this.ensureInitialized();
    
    return {
      totalVectors: this.vectors.size,
      dimensions: this.dimensions,
      indexSize: this.indexedVectors.length,
      memoryUsage: this.estimateMemoryUsage()
    };
  }
  
  /**
   * Clears all vectors from the store.
   */
  async clear(): Promise<void> {
    this.ensureInitialized();
    
    this.vectors.clear();
    this.indexedVectors = [];
    this.indexDirty = false;
    
    console.log('✓ Vector store cleared');
  }
  
  /**
   * Exports all vectors for backup or transfer.
   * 
   * @returns Exported vector data
   */
  exportVectors(): {
    vectors: VectorRecord[];
    dimensions: number;
    exportedAt: string;
    totalVectors: number;
  } {
    this.ensureInitialized();
    
    const vectors: VectorRecord[] = [];
    const vectorValues = Array.from(this.vectors.values());
    for (const vector of vectorValues) {
      vectors.push({
        id: vector.id,
        vector: [...vector.vector],
        metadata: { ...vector.metadata }
      });
    }
    
    return {
      vectors,
      dimensions: this.dimensions,
      exportedAt: new Date().toISOString(),
      totalVectors: vectors.length
    };
  }
  
  /**
   * Imports vectors from backup or transfer.
   * 
   * @param data - Vector data to import
   * @param clearExisting - Whether to clear existing vectors first
   */
  async importVectors(
    data: { vectors: VectorRecord[]; dimensions?: number },
    clearExisting: boolean = false
  ): Promise<void> {
    this.ensureInitialized();
    
    try {
      if (clearExisting) {
        await this.clear();
      }
      
      // Validate dimensions if provided
      if (data.dimensions && data.dimensions !== this.dimensions) {
        console.warn(`Dimension mismatch: store=${this.dimensions}, data=${data.dimensions}`);
        // Could either throw error or update store dimensions based on policy
      }
      
      // Validate and import vectors
      this.validateVectorRecords(data.vectors);
      await this.upsert(data.vectors);
      
      console.log(`✓ Imported ${data.vectors.length} vectors`);
      
    } catch (error) {
      throw new VectorOperationError(
        'import',
        `Failed to import vectors: ${error}`,
        error instanceof Error ? error : undefined,
        { vectorCount: data.vectors.length, clearExisting }
      );
    }
  }
  
  /**
   * Gets a specific vector by ID.
   * 
   * @param id - Vector ID
   * @returns Vector record or undefined
   */
  async getVector(id: string): Promise<VectorRecord | undefined> {
    this.ensureInitialized();
    
    const vector = this.vectors.get(id);
    if (!vector) return undefined;
    
    return {
      id: vector.id,
      vector: [...vector.vector],
      metadata: { ...vector.metadata }
    };
  }
  
  /**
   * Checks if a vector exists in the store.
   * 
   * @param id - Vector ID
   * @returns True if vector exists
   */
  async hasVector(id: string): Promise<boolean> {
    this.ensureInitialized();
    return this.vectors.has(id);
  }
  
  /**
   * Gets vectors by metadata filter.
   * 
   * @param filter - Metadata filter criteria
   * @param limit - Maximum number of results
   * @returns Matching vectors
   */
  async getVectorsByMetadata(
    filter: Record<string, any>, 
    limit: number = 100
  ): Promise<VectorRecord[]> {
    this.ensureInitialized();
    
    const results: VectorRecord[] = [];
    
    const vectorValues = Array.from(this.vectors.values());
    for (const vector of vectorValues) {
      if (this.matchesMetadataFilter(vector.metadata, filter)) {
        results.push({
          id: vector.id,
          vector: [...vector.vector],
          metadata: { ...vector.metadata }
        });
        
        if (results.length >= limit) break;
      }
    }
    
    return results;
  }
  
  /**
   * Rebuilds the search index from stored vectors.
   * 
   * @private
   */
  private rebuildIndex(): void {
    this.indexedVectors = Array.from(this.vectors.values());
    this.indexDirty = false;
    console.log(`✓ Rebuilt vector index with ${this.indexedVectors.length} vectors`);
  }
  
  /**
   * Estimates memory usage of the vector store.
   * 
   * @returns Estimated memory usage in bytes
   * @private
   */
  private estimateMemoryUsage(): number {
    let usage = 0;
    
    const vectorValues = Array.from(this.vectors.values());
    for (const vector of vectorValues) {
      // Estimate vector array size (8 bytes per float64)
      usage += vector.vector.length * 8;
      
      // Estimate metadata size (rough JSON serialization)
      usage += JSON.stringify(vector.metadata).length * 2; // UTF-16 encoding
      
      // Estimate ID string size
      usage += vector.id.length * 2;
    }
    
    // Add index overhead
    usage += this.indexedVectors.length * 64; // Rough estimate for object references
    
    return usage;
  }
  
  /**
   * Checks if metadata matches filter criteria.
   * 
   * @param metadata - Vector metadata
   * @param filter - Filter criteria
   * @returns True if metadata matches filter
   * @private
   */
  private matchesMetadataFilter(metadata: Record<string, any>, filter: Record<string, any>): boolean {
    return Object.entries(filter).every(([key, value]) => {
      const metadataValue = metadata[key];
      
      if (Array.isArray(value)) {
        return value.includes(metadataValue);
      }
      
      if (typeof value === 'object' && value !== null) {
        // Support range queries
        if ('$gte' in value) return metadataValue >= value.$gte;
        if ('$lte' in value) return metadataValue <= value.$lte;
        if ('$gt' in value) return metadataValue > value.$gt;
        if ('$lt' in value) return metadataValue < value.$lt;
        if ('$eq' in value) return metadataValue === value.$eq;
        if ('$ne' in value) return metadataValue !== value.$ne;
        if ('$in' in value) return Array.isArray(value.$in) && value.$in.includes(metadataValue);
        if ('$nin' in value) return Array.isArray(value.$nin) && !value.$nin.includes(metadataValue);
      }
      
      return metadataValue === value;
    });
  }
}