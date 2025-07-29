package com.testproject;

import java.util.*;
import java.util.concurrent.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.function.*;

// ========== SUPPORTING CLASSES AND INTERFACES ==========

/**
 * Interface with generic wildcards and complex bounds
 */
interface DataProcessor<T extends BaseEntity & Auditable> {
    <R extends Collection<? super T>> R process(R collection, Predicate<? super T> filter);
    Map<String, ? extends List<T>> groupBy(Function<? super T, ? extends String> classifier);
    <U> CompletableFuture<List<U>> transformAsync(Function<? super T, ? extends U> mapper);
}

/**
 * Generic utility class with nested static classes
 */
class GenericUtils {
    
    /**
     * Nested static class with generics
     */
    public static class TypeSafeBuilder<T> {
        private final Class<T> type;
        private final Map<String, Object> properties;
        
        private TypeSafeBuilder(Class<T> type) {
            this.type = type;
            this.properties = new HashMap<>();
        }
        
        public static <T> TypeSafeBuilder<T> of(Class<T> type) {
            return new TypeSafeBuilder<>(type);
        }
        
        public TypeSafeBuilder<T> with(String property, Object value) {
            properties.put(property, value);
            return this;
        }
        
        public T build() throws Exception {
            T instance = type.newInstance();
            // Set properties via reflection (simplified)
            return instance;
        }
    }
    
    /**
     * Nested inner class (non-static)
     */
    public class InstanceBuilder<T> {
        private T instance;
        
        public InstanceBuilder(T instance) {
            this.instance = instance;
        }
        
        public T getInstance() {
            return instance;
        }
    }
    
    /**
     * Static method with complex generics
     */
    public static <T, R> List<R> mapList(List<? extends T> source, Function<? super T, ? extends R> mapper) {
        List<R> result = new ArrayList<>();
        for (T item : source) {
            result.add(mapper.apply(item));
        }
        return result;
    }
    
    /**
     * Method with multiple type parameters and wildcards
     */
    public static <K, V extends Comparable<? super V>> Map<K, V> sortMapByValue(Map<K, V> map) {
        return map.entrySet().stream()
            .sorted(Map.Entry.<K, V>comparingByValue())
            .collect(LinkedHashMap::new, 
                    (m, e) -> m.put(e.getKey(), e.getValue()), 
                    LinkedHashMap::putAll);
    }
}

// ========== COMPLEX INHERITANCE HIERARCHY ==========

/**
 * Base class for all services
 */
abstract class BaseService {
    protected final String serviceName;
    
    protected BaseService(String serviceName) {
        this.serviceName = serviceName;
    }
    
    public abstract void initialize();
    public abstract void shutdown();
    
    protected void logMessage(String message) {
        System.out.println("[" + serviceName + "] " + message);
    }
}

/**
 * Cacheable mixin interface
 */
interface Cacheable {
    void clearCache();
    long getCacheSize();
    
    default boolean isCacheEnabled() {
        return getCacheSize() > 0;
    }
}

/**
 * Monitorable mixin interface
 */
interface Monitorable {
    Map<String, Object> getMetrics();
    void recordMetric(String name, Object value);
    
    default void recordExecutionTime(String operation, long milliseconds) {
        recordMetric(operation + ".executionTime", milliseconds);
    }
}

/**
 * Complex service with multiple inheritance
 */
abstract class CacheableService extends BaseService implements Cacheable, Monitorable {
    protected final Map<String, Object> cache;
    protected final Map<String, Object> metrics;
    
    protected CacheableService(String serviceName) {
        super(serviceName);
        this.cache = new ConcurrentHashMap<>();
        this.metrics = new ConcurrentHashMap<>();
    }
    
    @Override
    public void clearCache() {
        cache.clear();
        recordMetric("cache.cleared", LocalDateTime.now());
    }
    
    @Override
    public long getCacheSize() {
        return cache.size();
    }
    
    @Override
    public Map<String, Object> getMetrics() {
        return new HashMap<>(metrics);
    }
    
    @Override
    public void recordMetric(String name, Object value) {
        metrics.put(name, value);
    }
    
    // Abstract method with generic parameter
    protected abstract <T> T getCachedValue(String key, Class<T> type);
    
    // Template method with multiple overridable points
    public final <T> T processWithCache(String key, Supplier<T> supplier, Class<T> type) {
        long startTime = System.currentTimeMillis();
        
        try {
            // Check cache first
            T cached = getCachedValue(key, type);
            if (cached != null) {
                recordMetric("cache.hits", ((Long) metrics.getOrDefault("cache.hits", 0L)) + 1);
                return cached;
            }
            
            // Execute supplier
            T result = supplier.get();
            
            // Cache result
            cacheValue(key, result);
            recordMetric("cache.misses", ((Long) metrics.getOrDefault("cache.misses", 0L)) + 1);
            
            return result;
            
        } finally {
            long executionTime = System.currentTimeMillis() - startTime;
            recordExecutionTime("processWithCache", executionTime);
        }
    }
    
    protected abstract void cacheValue(String key, Object value);
}

// ========== EXCEPTION HIERARCHY ==========

/**
 * Base business exception
 */
abstract class BusinessException extends Exception {
    private final String errorCode;
    private final Map<String, Object> context;
    
    protected BusinessException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
        this.context = new HashMap<>();
    }
    
    protected BusinessException(String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
        this.context = new HashMap<>();
    }
    
    public String getErrorCode() {
        return errorCode;
    }
    
    public Map<String, Object> getContext() {
        return new HashMap<>(context);
    }
    
    public BusinessException addContext(String key, Object value) {
        this.context.put(key, value);
        return this;
    }
    
    public abstract String getBusinessMessage();
}

/**
 * Payment related exceptions
 */
class PaymentException extends BusinessException {
    public PaymentException(String message) {
        super("PAYMENT_ERROR", message);
    }
    
    public PaymentException(String message, Throwable cause) {
        super("PAYMENT_ERROR", message, cause);
    }
    
    @Override
    public String getBusinessMessage() {
        return "Payment processing failed: " + getMessage();
    }
}

class PaymentServiceException extends RuntimeException {
    public PaymentServiceException(String message) {
        super(message);
    }
    
    public PaymentServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}

// ========== SUPPORTING SERVICE CLASSES ==========

class NotificationService extends CacheableService {
    
    private final EmailService emailService;
    private final SmsService smsService;
    
    public NotificationService(EmailService emailService, SmsService smsService) {
        super("NotificationService");
        this.emailService = emailService;
        this.smsService = smsService;
    }
    
    @Override
    public void initialize() {
        logMessage("Initializing notification service");
        emailService.initialize();
        smsService.initialize();
    }
    
    @Override
    public void shutdown() {
        logMessage("Shutting down notification service");
        emailService.shutdown();
        smsService.shutdown();
        clearCache();
    }
    
    @Override
    protected <T> T getCachedValue(String key, Class<T> type) {
        Object value = cache.get(key);
        if (value != null && type.isInstance(value)) {
            return type.cast(value);
        }
        return null;
    }
    
    @Override
    protected void cacheValue(String key, Object value) {
        cache.put(key, value);
    }
    
    // Business methods
    public void sendWelcomeEmail(User user) {
        String templateKey = "welcome_email_template";
        String template = processWithCache(templateKey, 
            () -> loadEmailTemplate("welcome"), String.class);
        
        emailService.sendEmail(user.getEmail(), "Welcome!", formatTemplate(template, user));
    }
    
    public void sendOrderConfirmation(Order order) {
        CompletableFuture.runAsync(() -> {
            try {
                String template = loadEmailTemplate("order_confirmation");
                String content = formatOrderTemplate(template, order);
                emailService.sendEmail(order.getUser().getEmail(), "Order Confirmed", content);
                
                // Also send SMS if phone number available
                if (order.getShippingAddress() != null) {
                    smsService.sendSms("123-456-7890", "Your order " + order.getOrderNumber() + " has been confirmed");
                }
                
            } catch (Exception e) {
                logMessage("Failed to send order confirmation: " + e.getMessage());
            }
        });
    }
    
    public void sendPaymentConfirmation(Order order, PaymentResult result) {
        // Implementation
    }
    
    public void sendShippingNotification(Order order) {
        // Implementation
    }
    
    public void sendDeliveryConfirmation(Order order) {
        // Implementation
    }
    
    public void sendCancellationNotification(Order order) {
        // Implementation
    }
    
    public void sendAccountActivatedEmail(User user) {
        // Implementation
    }
    
    public void sendAccountBlockedEmail(User user) {
        // Implementation
    }
    
    public void sendAccountDeactivatedEmail(User user) {
        // Implementation
    }
    
    private String loadEmailTemplate(String templateName) {
        // Simulate loading template
        return "Template for " + templateName;
    }
    
    private String formatTemplate(String template, User user) {
        return template.replace("{username}", user.getUsername())
                      .replace("{email}", user.getEmail());
    }
    
    private String formatOrderTemplate(String template, Order order) {
        return template.replace("{orderNumber}", order.getOrderNumber())
                      .replace("{total}", order.getTotalAmount().toString());
    }
}

// ========== MORE SUPPORTING CLASSES ==========

class EmailService extends BaseService {
    public EmailService() {
        super("EmailService");
    }
    
    @Override
    public void initialize() {
        logMessage("Email service initialized");
    }
    
    @Override
    public void shutdown() {
        logMessage("Email service shutdown");
    }
    
    public void sendEmail(String to, String subject, String content) {
        logMessage(String.format("Sending email to %s: %s", to, subject));
    }
}

class SmsService extends BaseService {
    public SmsService() {
        super("SmsService");
    }
    
    @Override
    public void initialize() {
        logMessage("SMS service initialized");
    }
    
    @Override
    public void shutdown() {
        logMessage("SMS service shutdown");
    }
    
    public void sendSms(String phoneNumber, String message) {
        logMessage(String.format("Sending SMS to %s: %s", phoneNumber, message));
    }
}

class ProductService extends AbstractService<Product, Long> {
    private final ProductRepository productRepository;
    private final InventoryService inventoryService;
    
    public ProductService(ProductRepository productRepository, InventoryService inventoryService) {
        super(productRepository);
        this.productRepository = productRepository;
        this.inventoryService = inventoryService;
    }
    
    @Override
    protected String getEntityName() {
        return "Product";
    }
    
    @Override
    protected void validateForCreation(Product product) {
        if (product.getName() == null || product.getName().trim().isEmpty()) {
            throw new ValidationException("Product name is required");
        }
        if (product.getPrice() == null || product.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("Product price must be positive");
        }
    }
    
    @Override
    protected void validateForUpdate(Product existing, Product updated) {
        // Validation logic
    }
    
    @Override
    protected Product performUpdate(Product existing, Product updated) {
        // Update logic
        return existing;
    }
    
    public void reserveInventory(Long productId, int quantity) {
        inventoryService.reserve(productId, quantity);
    }
    
    public void releaseInventory(Long productId, int quantity) {
        inventoryService.release(productId, quantity);
    }
}

class InventoryService {
    public void reserve(Long productId, int quantity) {
        // Implementation
    }
    
    public void release(Long productId, int quantity) {
        // Implementation
    }
}

class PaymentService {
    public PaymentResult processPayment(BigDecimal amount, PaymentRequest request) throws PaymentServiceException {
        // Simulate payment processing
        if (amount.compareTo(BigDecimal.valueOf(10000)) > 0) {
            throw new PaymentServiceException("Amount too large");
        }
        
        return new PaymentResult(true, "TXN-" + System.currentTimeMillis(), null);
    }
}

// ========== DATA TRANSFER OBJECTS ==========

class PaymentRequest {
    private String method;
    private String cardNumber;
    private BigDecimal amount;
    
    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }
}

class PaymentResult {
    private final boolean successful;
    private final String transactionId;
    private final String errorMessage;
    
    public PaymentResult(boolean successful, String transactionId, String errorMessage) {
        this.successful = successful;
        this.transactionId = transactionId;
        this.errorMessage = errorMessage;
    }
    
    public boolean isSuccessful() { return successful; }
    public String getTransactionId() { return transactionId; }
    public String getErrorMessage() { return errorMessage; }
}

// ========== ADDITIONAL REPOSITORY CLASSES ==========

class OrderRepository implements BaseRepository<Order, Long> {
    // Implement all abstract methods
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
    @Override
    public List<Order> findAllById(Iterable<Long> ids) { return Collections.emptyList(); }
    @Override
    public List<Order> saveAll(Iterable<Order> orders) { return Collections.emptyList(); }
    @Override
    public void deleteAll() {}
    
    // Custom methods
    public List<Order> findByUserAndDeletedFalse(User user) {
        return Collections.emptyList();
    }
    
    public List<Order> findByUserAndStatusIn(User user, OrderStatus[] statuses) {
        return Collections.emptyList();
    }
}

class ProductRepository implements BaseRepository<Product, Long> {
    @Override
    public Optional<Product> findById(Long id) { return Optional.empty(); }
    @Override
    public List<Product> findAll() { return Collections.emptyList(); }
    @Override
    public Product save(Product product) { return product; }
    @Override
    public void deleteById(Long id) {}
    @Override
    public boolean existsById(Long id) { return false; }
    @Override
    public long count() { return 0; }
    @Override
    public List<Product> findAllById(Iterable<Long> ids) { return Collections.emptyList(); }
    @Override
    public List<Product> saveAll(Iterable<Product> products) { return Collections.emptyList(); }
    @Override
    public void deleteAll() {}
}

// Update UserRepository to include missing methods
// This would be added to the existing UserRepository.java file