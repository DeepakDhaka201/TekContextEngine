package com.testproject;

/**
 * Custom runtime exception demonstrating:
 * - Exception class inheritance from RuntimeException
 * - Constructor overloading
 * - Exception chaining
 * - Custom fields and methods
 */
public class EntityNotFoundException extends RuntimeException {
    
    private final String entityType;
    private final Object entityId;
    private final String operation;
    
    public EntityNotFoundException() {
        super("Entity not found");
        this.entityType = "Unknown";
        this.entityId = null;
        this.operation = "find";
    }
    
    public EntityNotFoundException(String message) {
        super(message);
        this.entityType = "Unknown";
        this.entityId = null;
        this.operation = "find";
    }
    
    public EntityNotFoundException(String message, Throwable cause) {
        super(message, cause);
        this.entityType = "Unknown";
        this.entityId = null;
        this.operation = "find";
    }
    
    public EntityNotFoundException(String entityType, Object entityId) {
        super(String.format("%s not found with id: %s", entityType, entityId));
        this.entityType = entityType;
        this.entityId = entityId;
        this.operation = "find";
    }
    
    public EntityNotFoundException(String entityType, Object entityId, String operation) {
        super(String.format("Cannot %s %s with id: %s", operation, entityType, entityId));
        this.entityType = entityType;
        this.entityId = entityId;
        this.operation = operation;
    }
    
    public EntityNotFoundException(String entityType, Object entityId, String operation, Throwable cause) {
        super(String.format("Cannot %s %s with id: %s", operation, entityType, entityId), cause);
        this.entityType = entityType;
        this.entityId = entityId;
        this.operation = operation;
    }
    
    public String getEntityType() {
        return entityType;
    }
    
    public Object getEntityId() {
        return entityId;
    }
    
    public String getOperation() {
        return operation;
    }
    
    /**
     * Static factory methods
     */
    public static EntityNotFoundException userNotFound(Long userId) {
        return new EntityNotFoundException("User", userId);
    }
    
    public static EntityNotFoundException orderNotFound(Long orderId) {
        return new EntityNotFoundException("Order", orderId);
    }
    
    public static EntityNotFoundException productNotFound(String productCode) {
        return new EntityNotFoundException("Product", productCode);
    }
    
    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append(getClass().getSimpleName()).append(": ");
        sb.append(getMessage());
        
        if (entityType != null && !entityType.equals("Unknown")) {
            sb.append(" [entityType: ").append(entityType).append("]");
        }
        
        if (entityId != null) {
            sb.append(" [entityId: ").append(entityId).append("]");
        }
        
        if (operation != null && !operation.equals("find")) {
            sb.append(" [operation: ").append(operation).append("]");
        }
        
        return sb.toString();
    }
}