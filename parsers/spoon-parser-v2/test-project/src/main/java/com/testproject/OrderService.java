package com.testproject;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;
import java.math.BigDecimal;

/**
 * Order service demonstrating:
 * - Service extending abstract service
 * - Method overriding
 * - Complex business logic
 * - Transaction management
 */
@Service
@Transactional
public class OrderService extends AbstractService<Order, Long> {
    
    private final OrderRepository orderRepository;
    private final ProductService productService;
    private final NotificationService notificationService;
    private final PaymentService paymentService;
    
    public OrderService(OrderRepository orderRepository,
                       ProductService productService,
                       NotificationService notificationService,
                       PaymentService paymentService) {
        super(orderRepository);
        this.orderRepository = orderRepository;
        this.productService = productService;
        this.notificationService = notificationService;
        this.paymentService = paymentService;
    }
    
    // Override abstract methods
    @Override
    protected String getEntityName() {
        return "Order";
    }
    
    @Override
    protected void validateForCreation(Order order) {
        if (order.getUser() == null) {
            throw new ValidationException("Order must have a user");
        }
        
        if (order.getItems() == null || order.getItems().isEmpty()) {
            throw new ValidationException("Order must have at least one item");
        }
        
        // Validate each item
        for (OrderItem item : order.getItems()) {
            validateOrderItem(item);
        }
    }
    
    @Override
    protected void validateForUpdate(Order existing, Order updated) {
        if (existing.getStatus().isTerminal()) {
            throw new ValidationException("Cannot update order in terminal status: " + existing.getStatus());
        }
        
        if (updated.getStatus() != null) {
            validateStatusTransition(existing.getStatus(), updated.getStatus());
        }
    }
    
    @Override
    protected Order performUpdate(Order existing, Order updated) {
        if (updated.getStatus() != null) {
            existing.setStatus(updated.getStatus());
        }
        
        if (updated.getShippingAddress() != null) {
            existing.setShippingAddress(updated.getShippingAddress());
        }
        
        existing.markAsUpdated("system");
        return existing;
    }
    
    // Override hook methods
    @Override
    protected void afterCreate(Order order) {
        super.afterCreate(order);
        
        // Calculate total
        calculateOrderTotal(order);
        
        // Send confirmation
        notificationService.sendOrderConfirmation(order);
        
        // Reserve inventory
        reserveInventory(order);
    }
    
    @Override
    protected void afterUpdate(Order order) {
        super.afterUpdate(order);
        
        // Handle status change notifications
        handleStatusChangeNotification(order);
    }
    
    // Business methods
    public List<Order> findByUser(User user) {
        return orderRepository.findByUserAndDeletedFalse(user);
    }
    
    public List<Order> findActiveByUser(User user) {
        return orderRepository.findByUserAndStatusIn(user, OrderStatus.getActiveStatuses());
    }
    
    public Order updateStatus(Long orderId, OrderStatus newStatus) throws EntityNotFoundException {
        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (!orderOpt.isPresent()) {
            throw new EntityNotFoundException("Order", orderId, "update status");
        }
        
        Order order = orderOpt.get();
        OrderStatus oldStatus = order.getStatus();
        
        validateStatusTransition(oldStatus, newStatus);
        
        order.setStatus(newStatus);
        Order savedOrder = orderRepository.save(order);
        
        handleStatusTransition(savedOrder, oldStatus, newStatus);
        
        return savedOrder;
    }
    
    public boolean cancel(Long orderId) {
        try {
            return updateStatus(orderId, OrderStatus.CANCELLED) != null;
        } catch (EntityNotFoundException e) {
            return false;
        }
    }
    
    /**
     * Complex method with multiple exception types and nested calls
     */
    public Order processPayment(Long orderId, PaymentRequest paymentRequest) 
            throws EntityNotFoundException, PaymentException, ValidationException {
        
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new EntityNotFoundException("Order", orderId, "process payment"));
        
        if (order.getStatus() != OrderStatus.CONFIRMED) {
            throw new ValidationException("Order must be confirmed before payment", "status", order.getStatus());
        }
        
        try {
            // Process payment
            PaymentResult result = paymentService.processPayment(order.getTotalAmount(), paymentRequest);
            
            if (result.isSuccessful()) {
                order.setStatus(OrderStatus.PROCESSING);
                order.getMetadata().put("paymentId", result.getTransactionId());
                order.getMetadata().put("paymentMethod", paymentRequest.getMethod());
                
                Order savedOrder = orderRepository.save(order);
                notificationService.sendPaymentConfirmation(savedOrder, result);
                
                return savedOrder;
            } else {
                throw new PaymentException("Payment failed: " + result.getErrorMessage());
            }
            
        } catch (PaymentServiceException e) {
            throw new PaymentException("Payment service error", e);
        }
    }
    
    // Private helper methods
    private void validateOrderItem(OrderItem item) {
        if (item.getProduct() == null) {
            throw new ValidationException("Order item must have a product");
        }
        
        if (item.getQuantity() <= 0) {
            throw new ValidationException("Order item quantity must be positive");
        }
        
        if (item.getPrice() == null || item.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("Order item price must be positive");
        }
    }
    
    private void validateStatusTransition(OrderStatus from, OrderStatus to) {
        OrderStatus[] allowedStatuses = from.getNextStatuses();
        for (OrderStatus allowed : allowedStatuses) {
            if (allowed == to) {
                return;
            }
        }
        
        throw new ValidationException(
            String.format("Invalid status transition from %s to %s", from, to));
    }
    
    private void calculateOrderTotal(Order order) {
        BigDecimal total = BigDecimal.ZERO;
        
        for (OrderItem item : order.getItems()) {
            BigDecimal itemTotal = item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
            total = total.add(itemTotal);
        }
        
        order.setTotalAmount(total);
    }
    
    private void reserveInventory(Order order) {
        for (OrderItem item : order.getItems()) {
            productService.reserveInventory(item.getProduct().getId(), item.getQuantity());
        }
    }
    
    private void handleStatusChangeNotification(Order order) {
        switch (order.getStatus()) {
            case SHIPPED:
                notificationService.sendShippingNotification(order);
                break;
            case DELIVERED:
                notificationService.sendDeliveryConfirmation(order);
                break;
            case CANCELLED:
                notificationService.sendCancellationNotification(order);
                // Release inventory
                releaseInventory(order);
                break;
        }
    }
    
    private void handleStatusTransition(Order order, OrderStatus oldStatus, OrderStatus newStatus) {
        // Log status change
        String logMessage = String.format("Order %s status changed from %s to %s", 
                                        order.getOrderNumber(), oldStatus, newStatus);
        System.out.println(logMessage);
        
        // Handle business logic for specific transitions
        if (oldStatus == OrderStatus.CONFIRMED && newStatus == OrderStatus.PROCESSING) {
            // Start fulfillment process
            startFulfillment(order);
        }
    }
    
    private void releaseInventory(Order order) {
        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                productService.releaseInventory(item.getProduct().getId(), item.getQuantity());
            }
        }
    }
    
    private void startFulfillment(Order order) {
        // Implementation would trigger fulfillment workflow
        order.getMetadata().put("fulfillmentStarted", java.time.LocalDateTime.now().toString());
    }
}