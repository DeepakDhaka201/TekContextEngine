package com.testproject;

/**
 * Enum demonstrating:
 * - Enum definitions
 * - Enum with methods
 * - Enum with fields
 */
public enum UserStatus {
    ACTIVE("Active", true),
    INACTIVE("Inactive", false),
    BLOCKED("Blocked", false),
    PENDING("Pending Activation", false);
    
    private final String displayName;
    private final boolean canLogin;
    
    UserStatus(String displayName, boolean canLogin) {
        this.displayName = displayName;
        this.canLogin = canLogin;
    }
    
    public String getDisplayName() {
        return displayName;
    }
    
    public boolean canLogin() {
        return canLogin;
    }
    
    public static UserStatus fromString(String status) {
        if (status == null) return INACTIVE;
        
        for (UserStatus userStatus : values()) {
            if (userStatus.name().equalsIgnoreCase(status)) {
                return userStatus;
            }
        }
        return INACTIVE;
    }
}