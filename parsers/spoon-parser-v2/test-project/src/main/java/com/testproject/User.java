package com.testproject;

import java.util.List;
import java.util.Set;
import java.util.ArrayList;
import java.util.HashSet;

/**
 * User entity demonstrating:
 * - Entity annotations
 * - Field types with collections
 * - Relationship annotations
 * - Constructor variations
 * - Business logic methods
 */
public class User extends BaseEntity {
    
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private UserStatus status;
    private List<Order> orders;
    private Set<Role> roles;
    private Profile profile;
    
    public User() {
        super();
        this.orders = new ArrayList<>();
        this.roles = new HashSet<>();
        this.status = UserStatus.ACTIVE;
    }
    
    public User(String username, String email) {
        this();
        this.username = username;
        this.email = email;
    }
    
    public User(String username, String email, String firstName, String lastName) {
        this(username, email);
        this.firstName = firstName;
        this.lastName = lastName;
    }
    
    @Override
    public String getEntityName() {
        return "User";
    }
    
    // Getters and setters
    public String getUsername() {
        return username;
    }
    
    public void setUsername(String username) {
        this.username = username;
    }
    
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    public String getFirstName() {
        return firstName;
    }
    
    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }
    
    public String getLastName() {
        return lastName;
    }
    
    public void setLastName(String lastName) {
        this.lastName = lastName;
    }
    
    public UserStatus getStatus() {
        return status;
    }
    
    public void setStatus(UserStatus status) {
        this.status = status;
    }
    
    public List<Order> getOrders() {
        return orders;
    }
    
    public void setOrders(List<Order> orders) {
        this.orders = orders;
    }
    
    public Set<Role> getRoles() {
        return roles;
    }
    
    public void setRoles(Set<Role> roles) {
        this.roles = roles;
    }
    
    public Profile getProfile() {
        return profile;
    }
    
    public void setProfile(Profile profile) {
        this.profile = profile;
    }
    
    /**
     * Business method demonstrating:
     * - Local variables
     * - Generic types
     * - Method chaining
     * - Exception handling
     */
    public void addOrder(Order order) {
        if (order == null) {
            throw new IllegalArgumentException("Order cannot be null");
        }
        
        if (this.orders == null) {
            this.orders = new ArrayList<>();
        }
        
        this.orders.add(order);
        order.setUser(this);
        markAsUpdated("system");
    }
    
    /**
     * Method with generic return type
     */
    public <T extends Role> T findRoleByType(Class<T> roleType) {
        if (roles == null) return null;
        
        for (Role role : roles) {
            if (roleType.isInstance(role)) {
                return roleType.cast(role);
            }
        }
        return null;
    }
    
    /**
     * Method demonstrating static method calls
     */
    public String getFullName() {
        return String.format("%s %s", 
            firstName != null ? firstName : "",
            lastName != null ? lastName : "").trim();
    }
    
    /**
     * Method with multiple exception types
     */
    public void validateUser() throws ValidationException, SecurityException {
        if (username == null || username.isEmpty()) {
            throw new ValidationException("Username is required");
        }
        
        if (email == null || !email.contains("@")) {
            throw new ValidationException("Valid email is required");
        }
        
        if (status == UserStatus.BLOCKED) {
            throw new SecurityException("User is blocked");
        }
    }
}