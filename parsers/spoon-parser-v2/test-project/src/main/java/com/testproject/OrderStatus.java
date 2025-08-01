package com.testproject;

/**
 * Enum demonstrating:
 * - Enum definitions with constructor
 * - Enum with methods and fields
 * - Static methods in enums
 * - Complex enum logic
 */
public enum OrderStatus {
    PENDING("Pending", "Order is waiting for confirmation", 1, true),
    CONFIRMED("Confirmed", "Order has been confirmed", 2, true),
    PROCESSING("Processing", "Order is being processed", 3, true),
    SHIPPED("Shipped", "Order has been shipped", 4, true),
    DELIVERED("Delivered", "Order has been delivered", 5, false),
    CANCELLED("Cancelled", "Order has been cancelled", 0, false),
    REFUNDED("Refunded", "Order has been refunded", 0, false);
    
    private final String displayName;
    private final String description;
    private final int priority;
    private final boolean canModify;
    
    OrderStatus(String displayName, String description, int priority, boolean canModify) {
        this.displayName = displayName;
        this.description = description;
        this.priority = priority;
        this.canModify = canModify;
    }
    
    public String getDisplayName() {
        return displayName;
    }
    
    public String getDescription() {
        return description;
    }
    
    public int getPriority() {
        return priority;
    }
    
    public boolean canModify() {
        return canModify;
    }
    
    /**
     * Check if status is terminal (cannot be changed)
     */
    public boolean isTerminal() {
        return this == DELIVERED || this == CANCELLED || this == REFUNDED;
    }
    
    /**
     * Check if status allows cancellation
     */
    public boolean canCancel() {
        return this == PENDING || this == CONFIRMED;
    }
    
    /**
     * Get next possible statuses
     */
    public OrderStatus[] getNextStatuses() {
        switch (this) {
            case PENDING:
                return new OrderStatus[]{CONFIRMED, CANCELLED};
            case CONFIRMED:
                return new OrderStatus[]{PROCESSING, CANCELLED};
            case PROCESSING:
                return new OrderStatus[]{SHIPPED, CANCELLED};
            case SHIPPED:
                return new OrderStatus[]{DELIVERED};
            case CANCELLED:
                return new OrderStatus[]{REFUNDED};
            default:
                return new OrderStatus[0];
        }
    }
    
    /**
     * Static method to find status by name
     */
    public static OrderStatus fromString(String status) {
        if (status == null || status.trim().isEmpty()) {
            return PENDING;
        }
        
        for (OrderStatus orderStatus : values()) {
            if (orderStatus.name().equalsIgnoreCase(status.trim()) ||
                orderStatus.displayName.equalsIgnoreCase(status.trim())) {
                return orderStatus;
            }
        }
        
        throw new IllegalArgumentException("Unknown order status: " + status);
    }
    
    /**
     * Static method to get active statuses
     */
    public static OrderStatus[] getActiveStatuses() {
        return java.util.Arrays.stream(values())
                .filter(status -> status.canModify)
                .toArray(OrderStatus[]::new);
    }
}