package com.testproject;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Abstract base entity demonstrating:
 * - Abstract classes
 * - Interface implementation  
 * - Field declarations with various types
 * - Constructor overloading
 * - Method overriding
 * - Generic methods
 */
public abstract class BaseEntity implements Auditable {
    
    protected Long id;
    protected String version;
    protected LocalDateTime createdAt;
    protected LocalDateTime updatedAt;
    protected String createdBy;
    protected String updatedBy;
    protected boolean deleted;
    protected boolean active;
    
    public BaseEntity() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        this.deleted = false;
        this.active = true;
        this.version = "1.0";
    }
    
    public BaseEntity(String createdBy) {
        this();
        this.createdBy = createdBy;
        this.updatedBy = createdBy;
    }
    
    public BaseEntity(Long id, String createdBy) {
        this(createdBy);
        this.id = id;
    }
    
    // Getters and setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getVersion() {
        return version;
    }
    
    public void setVersion(String version) {
        this.version = version;
    }
    
    @Override
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    @Override
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    @Override
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    @Override
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    @Override
    public String getCreatedBy() {
        return createdBy;
    }
    
    @Override
    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }
    
    @Override
    public String getUpdatedBy() {
        return updatedBy;
    }
    
    @Override
    public void setUpdatedBy(String updatedBy) {
        this.updatedBy = updatedBy;
    }
    
    public boolean isDeleted() {
        return deleted;
    }
    
    public void setDeleted(boolean deleted) {
        this.deleted = deleted;
    }
    
    public boolean isActive() {
        return active;
    }
    
    public void setActive(boolean active) {
        this.active = active;
    }
    
    /**
     * Abstract method to be implemented by subclasses
     */
    public abstract String getEntityName();
    
    /**
     * Generic method with bounded type parameter
     */
    public <T extends BaseEntity> boolean isSameType(T other) {
        return other != null && this.getClass().equals(other.getClass());
    }
    
    /**
     * Method with complex logic demonstrating:
     * - Local variables
     * - Conditional statements
     * - Method calls
     * - Exception handling
     */
    public void markAsUpdated(String updatedBy) throws ValidationException {
        if (updatedBy == null || updatedBy.trim().isEmpty()) {
            throw new ValidationException("UpdatedBy cannot be null or empty");
        }
        
        LocalDateTime now = LocalDateTime.now();
        this.updatedAt = now;
        this.updatedBy = updatedBy;
        
        // Update version
        try {
            double currentVersion = Double.parseDouble(this.version);
            this.version = String.valueOf(currentVersion + 0.1);
        } catch (NumberFormatException e) {
            this.version = "1.1";
        }
    }
    
    /**
     * Method demonstrating static method calls and type casting
     */
    public void softDelete() {
        this.deleted = true;
        this.active = false;
        this.updatedAt = LocalDateTime.now();
        
        // Log the deletion
        String message = String.format("Entity %s with ID %d marked as deleted", 
                                     getEntityName(), getId());
        System.out.println(message);
    }
    
    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        
        BaseEntity that = (BaseEntity) obj;
        return Objects.equals(id, that.id);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(id, getEntityName());
    }
    
    @Override
    public String toString() {
        return String.format("%s{id=%d, version='%s', active=%s}", 
                           getEntityName(), id, version, active);
    }
}