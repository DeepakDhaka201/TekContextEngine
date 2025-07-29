package com.testproject;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;
import java.util.Map;

/**
 * Service class demonstrating:
 * - Service annotations
 * - Transaction management
 * - Business logic methods
 * - Exception handling
 * - Method overriding from abstract parent
 */
@Service
@Transactional
public class UserService extends AbstractService<User, Long> {
    
    private final UserRepository userRepository;
    private final OrderService orderService;
    private final NotificationService notificationService;
    
    public UserService(UserRepository userRepository, 
                      OrderService orderService,
                      NotificationService notificationService) {
        super(userRepository);
        this.userRepository = userRepository;
        this.orderService = orderService;
        this.notificationService = notificationService;
    }
    
    // Override abstract methods from AbstractService
    @Override
    protected String getEntityName() {
        return "User";
    }
    
    @Override
    protected void validateForCreation(User user) {
        if (user.getUsername() == null || user.getUsername().trim().isEmpty()) {
            throw new ValidationException("Username is required");
        }
        
        if (user.getEmail() == null || !isValidEmail(user.getEmail())) {
            throw new ValidationException("Valid email is required");
        }
        
        // Check for duplicate username
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new ValidationException("Username already exists");
        }
    }
    
    @Override
    protected void validateForUpdate(User existing, User updated) {
        if (updated.getUsername() != null && 
            !updated.getUsername().equals(existing.getUsername()) &&
            userRepository.existsByUsername(updated.getUsername())) {
            throw new ValidationException("Username already exists");
        }
    }
    
    @Override
    protected User performUpdate(User existing, User updated) {
        // Copy updated fields
        if (updated.getFirstName() != null) {
            existing.setFirstName(updated.getFirstName());
        }
        if (updated.getLastName() != null) {
            existing.setLastName(updated.getLastName());
        }
        if (updated.getEmail() != null) {
            existing.setEmail(updated.getEmail());
        }
        
        existing.markAsUpdated("system");
        return existing;
    }
    
    // Override hook methods
    @Override
    protected void afterCreate(User user) {
        super.afterCreate(user);
        notificationService.sendWelcomeEmail(user);
    }
    
    @Override
    protected void beforeDelete(User user) {
        super.beforeDelete(user);
        // Cancel any pending orders
        List<Order> activeOrders = orderService.findActiveByUser(user);
        for (Order order : activeOrders) {
            orderService.cancel(order.getId());
        }
    }
    
    // Override concrete method with different behavior
    @Override
    public List<User> findAll() {
        beforeFindAll();
        // Custom implementation - exclude deleted users
        List<User> users = userRepository.findByDeletedFalse();
        afterFindAll(users);
        return users;
    }
    
    @Transactional(readOnly = true)
    public List<User> findAll(int page, int size, String search) {
        if (search != null && !search.isEmpty()) {
            return userRepository.findByUsernameContainingOrEmailContaining(search, search);
        }
        return userRepository.findAll();
    }
    
    @Transactional(readOnly = true)
    public Optional<User> findById(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("ID cannot be null");
        }
        return userRepository.findById(id);
    }
    
    public User save(User user) {
        if (user == null) {
            throw new IllegalArgumentException("User cannot be null");
        }
        
        // Validate user before saving
        validateUser(user);
        
        User savedUser = userRepository.save(user);
        
        // Send notification asynchronously
        notificationService.sendWelcomeEmail(savedUser);
        
        return savedUser;
    }
    
    public boolean deleteById(Long id) {
        Optional<User> user = findById(id);
        if (user.isPresent()) {
            userRepository.deleteById(id);
            return true;
        }
        return false;
    }
    
    public User updateStatus(Long id, UserStatus status) throws EntityNotFoundException {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("User not found with id: " + id));
        
        UserStatus oldStatus = user.getStatus();
        user.setStatus(status);
        
        User updatedUser = userRepository.save(user);
        
        // Handle status change notifications
        handleStatusChange(updatedUser, oldStatus, status);
        
        return updatedUser;
    }
    
    @Transactional(readOnly = true)
    public List<Order> getUserOrders(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new EntityNotFoundException("User not found"));
        
        return orderService.findByUser(user);
    }
    
    public Order createOrderForUser(Long userId, CreateOrderRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new EntityNotFoundException("User not found"));
        
        Order order = new Order();
        order.setUser(user);
        order.setOrderNumber(generateOrderNumber());
        
        return orderService.save(order);
    }
    
    public Map<String, Object> searchUsers(String query, String sortBy, String sortDirection) {
        // Complex search logic would go here
        List<User> users = userRepository.searchUsers(query, sortBy, sortDirection);
        
        Map<String, Object> result = new java.util.HashMap<>();
        result.put("users", users);
        result.put("total", users.size());
        result.put("query", query);
        
        return result;
    }
    
    /**
     * Private method with exception handling
     */
    private void validateUser(User user) {
        if (user.getUsername() == null || user.getUsername().trim().isEmpty()) {
            throw new ValidationException("Username is required");
        }
        
        if (user.getEmail() == null || !isValidEmail(user.getEmail())) {
            throw new ValidationException("Valid email is required");
        }
        
        // Check for duplicate username
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new ValidationException("Username already exists");
        }
    }
    
    private boolean isValidEmail(String email) {
        return email != null && email.contains("@") && email.contains(".");
    }
    
    private void handleStatusChange(User user, UserStatus oldStatus, UserStatus newStatus) {
        if (oldStatus != newStatus) {
            switch (newStatus) {
                case ACTIVE:
                    notificationService.sendAccountActivatedEmail(user);
                    break;
                case BLOCKED:
                    notificationService.sendAccountBlockedEmail(user);
                    break;
                case INACTIVE:
                    notificationService.sendAccountDeactivatedEmail(user);
                    break;
            }
        }
    }
    
    private String generateOrderNumber() {
        return "ORD-" + System.currentTimeMillis();
    }
}