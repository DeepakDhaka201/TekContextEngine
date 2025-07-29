package com.testproject;

import java.util.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

// ========== SUPPORTING ENUMS AND CLASSES ==========

enum OrderStatus {
    PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED
}

class EntityNotFoundException extends RuntimeException {
    public EntityNotFoundException(String message) {
        super(message);
    }
}

class Role extends BaseEntity {
    private String name;
    private String description;
    private Set<Permission> permissions;
    
    public Role() {
        this.permissions = new HashSet<>();
    }
    
    @Override
    public String getEntityName() {
        return "Role";
    }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}

class Permission {
    private String name;
    private String resource;
    private String action;
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}

class Profile extends BaseEntity {
    private String bio;
    private String avatarUrl;
    private Map<String, String> preferences;
    
    public Profile() {
        this.preferences = new HashMap<>();
    }
    
    @Override
    public String getEntityName() {
        return "Profile";
    }
}

class OrderItem extends BaseEntity {
    private Order order;
    private Product product;
    private int quantity;
    private BigDecimal price;
    
    @Override
    public String getEntityName() {
        return "OrderItem";
    }
    
    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
}

class Product extends BaseEntity {
    private String name;
    private String category;
    private BigDecimal price;
    private String description;
    
    @Override
    public String getEntityName() {
        return "Product";
    }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
}

class ShippingAddress extends BaseEntity {
    private String street;
    private String city;
    private String state;
    private String zipCode;
    private String country;
    
    @Override
    public String getEntityName() {
        return "ShippingAddress";
    }
}

// ========== SERVICE CLASSES ==========

class OrderService {
    private final OrderRepository orderRepository;
    
    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }
    
    public List<Order> findByUser(User user) {
        return orderRepository.findByUser(user);
    }
    
    public Order save(Order order) {
        return orderRepository.save(order);
    }
}

class NotificationService {
    public void sendWelcomeEmail(User user) {
        // Email sending logic
    }
    
    public void sendAccountActivatedEmail(User user) {
        // Email sending logic
    }
    
    public void sendAccountBlockedEmail(User user) {
        // Email sending logic
    }
    
    public void sendAccountDeactivatedEmail(User user) {
        // Email sending logic
    }
}

// ========== REPOSITORY CLASSES ==========

class OrderRepository implements BaseRepository<Order, Long> {
    @Override
    public Optional<Order> findById(Long id) { return Optional.empty(); }
    @Override
    public List<Order> findAll() { return Collections.emptyList(); }
    @Override
    public Order save(Order order) { return order; }
    @Override
    public void deleteById(Long id) {}
    @Override
    public boolean existsById(Long id) { return false; }
    @Override
    public long count() { return 0; }
    
    public List<Order> findByUser(User user) {
        return Collections.emptyList();
    }
}

// ========== DTO CLASSES ==========

class UserDto {
    private Long id;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private UserStatus status;
    
    public UserDto() {}
    
    public UserDto(User user) {
        this.id = user.getId();
        this.username = user.getUsername();
        this.email = user.getEmail();
        this.firstName = user.getFirstName();
        this.lastName = user.getLastName();
        this.status = user.getStatus();
    }
    
    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
}

class OrderDto {
    private Long id;
    private String orderNumber;
    private OrderStatus status;
    private BigDecimal totalAmount;
    
    public OrderDto() {}
    
    public OrderDto(Order order) {
        this.id = order.getId();
        this.orderNumber = order.getOrderNumber();
        this.status = order.getStatus();
        this.totalAmount = order.getTotalAmount();
    }
}

// ========== REQUEST/RESPONSE CLASSES ==========

class CreateUserRequest {
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    
    // Getters and setters
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
}

class UpdateUserRequest {
    private String firstName;
    private String lastName;
    private String email;
    
    // Getters and setters
}

class CreateOrderRequest {
    private List<OrderItemRequest> items;
    private ShippingAddress shippingAddress;
    
    // Getters and setters
}

class OrderItemRequest {
    private Long productId;
    private int quantity;
    
    // Getters and setters
}

// ========== MAPPER CLASSES ==========

class UserMapper {
    public UserDto toDto(User user) {
        return new UserDto(user);
    }
    
    public List<UserDto> toDto(List<User> users) {
        List<UserDto> dtos = new ArrayList<>();
        for (User user : users) {
            dtos.add(toDto(user));
        }
        return dtos;
    }
    
    public User toEntity(CreateUserRequest request) {
        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        return user;
    }
    
    public User updateEntity(User user, UpdateUserRequest request) {
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        return user;
    }
}

// ========== CONFIGURATION CLASSES ==========

class DataSource {
    private String url;
    private String username;
    private String password;
    
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}

class SecurityProperties {
    private int sessionTimeout;
    private boolean enableCsrf;
    private String jwtSecret;
    
    // Getters and setters
}

class CacheManager {
    private List<String> cacheNames;
    
    public List<String> getCacheNames() { return cacheNames; }
    public void setCacheNames(List<String> cacheNames) { this.cacheNames = cacheNames; }
}

// ========== ANNOTATIONS (Simulated) ==========

// These would normally be from Spring/JUnit but we simulate them for parsing
@interface Valid {}
@interface PathVariable { String value() default ""; }
@interface RequestParam { String defaultValue() default ""; boolean required() default true; }
@interface RequestBody {}
@interface RequestHeader { String value(); boolean required() default true; }
@interface CrossOrigin { String[] origins(); }

// Spring annotations are simulated in the actual controller files