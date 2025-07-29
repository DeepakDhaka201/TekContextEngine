package com.testproject;

import java.time.LocalDateTime;

/**
 * Interface for auditable entities demonstrating:
 * - Interface inheritance
 * - Default methods
 * - Built-in type usage
 */
public interface Auditable {
    
    LocalDateTime getCreatedAt();
    void setCreatedAt(LocalDateTime createdAt);
    
    LocalDateTime getUpdatedAt();
    void setUpdatedAt(LocalDateTime updatedAt);
    
    String getCreatedBy();
    void setCreatedBy(String createdBy);
    
    String getUpdatedBy();
    void setUpdatedBy(String updatedBy);
    
    /**
     * Default method with implementation
     */
    default boolean isRecent() {
        return getCreatedAt() != null && 
               getCreatedAt().isAfter(LocalDateTime.now().minusDays(7));
    }
    
    /**
     * Default method with static method call
     */
    default void updateTimestamp() {
        setUpdatedAt(LocalDateTime.now());
    }
}