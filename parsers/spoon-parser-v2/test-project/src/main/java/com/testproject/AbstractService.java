package com.testproject;

import java.util.List;
import java.util.Optional;
import java.util.Map;

/**
 * Abstract service class demonstrating:
 * - Abstract classes with generic parameters
 * - Template method pattern
 * - Abstract and concrete methods
 * - Complex inheritance hierarchy
 */
public abstract class AbstractService<T extends BaseEntity, ID> {
    
    protected final BaseRepository<T, ID> repository;
    
    public AbstractService(BaseRepository<T, ID> repository) {
        this.repository = repository;
        initializeService();
    }
    
    /**
     * Template method - calls abstract methods
     */
    public final T create(T entity) {
        validateForCreation(entity);
        beforeCreate(entity);
        
        T savedEntity = repository.save(entity);
        
        afterCreate(savedEntity);
        return savedEntity;
    }
    
    /**
     * Template method for updates
     */
    public final T update(ID id, T entity) throws EntityNotFoundException {
        Optional<T> existing = repository.findById(id);
        if (!existing.isPresent()) {
            throw new EntityNotFoundException(getEntityName(), id, "update");
        }
        
        T existingEntity = existing.get();
        validateForUpdate(existingEntity, entity);
        beforeUpdate(existingEntity, entity);
        
        T updatedEntity = performUpdate(existingEntity, entity);
        T savedEntity = repository.save(updatedEntity);
        
        afterUpdate(savedEntity);
        return savedEntity;
    }
    
    /**
     * Concrete method that can be overridden
     */
    public List<T> findAll() {
        beforeFindAll();
        List<T> entities = repository.findAll();
        afterFindAll(entities);
        return entities;
    }
    
    /**
     * Concrete method with default implementation
     */
    public Optional<T> findById(ID id) {
        if (id == null) {
            return Optional.empty();
        }
        return repository.findById(id);
    }
    
    /**
     * Virtual method that can be overridden
     */
    public boolean delete(ID id) {
        Optional<T> entity = repository.findById(id);
        if (entity.isPresent()) {
            beforeDelete(entity.get());
            repository.deleteById(id);
            afterDelete(entity.get());
            return true;
        }
        return false;
    }
    
    // Abstract methods to be implemented by subclasses
    protected abstract String getEntityName();
    protected abstract void validateForCreation(T entity);
    protected abstract void validateForUpdate(T existing, T updated);
    protected abstract T performUpdate(T existing, T updated);
    
    // Hook methods with default empty implementations
    protected void initializeService() {
        // Default empty implementation
    }
    
    protected void beforeCreate(T entity) {
        // Default empty implementation
    }
    
    protected void afterCreate(T entity) {
        // Default empty implementation
    }
    
    protected void beforeUpdate(T existing, T updated) {
        // Default empty implementation
    }
    
    protected void afterUpdate(T entity) {
        // Default empty implementation
    }
    
    protected void beforeDelete(T entity) {
        // Default empty implementation
    }
    
    protected void afterDelete(T entity) {
        // Default empty implementation
    }
    
    protected void beforeFindAll() {
        // Default empty implementation
    }
    
    protected void afterFindAll(List<T> entities) {
        // Default empty implementation
    }
    
    /**
     * Generic method with multiple bounds
     */
    protected <R extends BaseEntity & Auditable> R convertToRelated(T entity, Class<R> targetType) {
        try {
            R instance = targetType.newInstance();
            // Copy audit fields
            instance.setCreatedAt(entity.getCreatedAt());
            instance.setUpdatedAt(entity.getUpdatedAt());
            instance.setCreatedBy(entity.getCreatedBy());
            instance.setUpdatedBy(entity.getUpdatedBy());
            return instance;
        } catch (Exception e) {
            throw new RuntimeException("Cannot convert entity", e);
        }
    }
    
    /**
     * Method with nested generics and wildcards
     */
    protected Map<String, List<? extends T>> groupEntities(List<T> entities) {
        Map<String, List<? extends T>> grouped = new java.util.HashMap<>();
        // Grouping logic would go here
        return grouped;
    }
}