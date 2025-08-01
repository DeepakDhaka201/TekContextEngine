package com.testproject;

import java.util.List;
import java.util.Optional;

/**
 * Base repository interface demonstrating:
 * - Interface definitions with generics
 * - Method signatures with generic parameters
 * - Complex return types
 */
public interface BaseRepository<T, ID> {
    
    /**
     * Find entity by ID
     */
    Optional<T> findById(ID id);
    
    /**
     * Find all entities with pagination
     */
    List<T> findAll();
    
    /**
     * Save entity
     */
    T save(T entity);
    
    /**
     * Delete by ID
     */
    void deleteById(ID id);
    
    /**
     * Check if entity exists
     */
    boolean existsById(ID id);
    
    /**
     * Count all entities
     */
    long count();
    
    /**
     * Find entities by IDs
     */
    List<T> findAllById(Iterable<ID> ids);
    
    /**
     * Save all entities
     */
    List<T> saveAll(Iterable<T> entities);
    
    /**
     * Delete all entities
     */
    void deleteAll();
}