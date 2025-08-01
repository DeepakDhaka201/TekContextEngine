package com.testproject;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.HashMap;

/**
 * Order entity demonstrating:
 * - Complex field types
 * - Nested generics
 * - BigDecimal usage
 * - Map collections
 */
public class Order extends BaseEntity {
    
    private String orderNumber;
    private User user;
    private OrderStatus status;
    private BigDecimal totalAmount;
    private LocalDateTime orderDate;
    private LocalDateTime deliveryDate;
    private List<OrderItem> items;
    private Map<String, String> metadata;
    private ShippingAddress shippingAddress;
    
    public Order() {
        super();
        this.items = new ArrayList<>();
        this.metadata = new HashMap<>();
        this.status = OrderStatus.PENDING;
        this.orderDate = LocalDateTime.now();
    }
    
    public Order(String orderNumber, User user) {
        this();
        this.orderNumber = orderNumber;
        this.user = user;
    }
    
    @Override
    public String getEntityName() {
        return "Order";
    }
    
    // Getters and setters
    public String getOrderNumber() {
        return orderNumber;
    }
    
    public void setOrderNumber(String orderNumber) {
        this.orderNumber = orderNumber;
    }
    
    public User getUser() {
        return user;
    }
    
    public void setUser(User user) {
        this.user = user;
    }
    
    public OrderStatus getStatus() {
        return status;
    }
    
    public void setStatus(OrderStatus status) {
        this.status = status;
    }
    
    public BigDecimal getTotalAmount() {
        return totalAmount;
    }
    
    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }
    
    public LocalDateTime getOrderDate() {
        return orderDate;
    }
    
    public void setOrderDate(LocalDateTime orderDate) {
        this.orderDate = orderDate;
    }
    
    public LocalDateTime getDeliveryDate() {
        return deliveryDate;
    }
    
    public void setDeliveryDate(LocalDateTime deliveryDate) {
        this.deliveryDate = deliveryDate;
    }
    
    public List<OrderItem> getItems() {
        return items;
    }
    
    public void setItems(List<OrderItem> items) {
        this.items = items;
    }
    
    public Map<String, String> getMetadata() {
        return metadata;
    }
    
    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }
    
    public ShippingAddress getShippingAddress() {
        return shippingAddress;
    }
    
    public void setShippingAddress(ShippingAddress shippingAddress) {
        this.shippingAddress = shippingAddress;
    }
    
    /**
     * Method demonstrating:
     * - Stream operations (would require java.util.stream import)
     * - BigDecimal calculations
     * - Exception handling
     */
    public void calculateTotal() {
        try {
            BigDecimal total = BigDecimal.ZERO;
            
            if (items != null) {
                for (OrderItem item : items) {
                    if (item.getPrice() != null && item.getQuantity() > 0) {
                        BigDecimal itemTotal = item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
                        total = total.add(itemTotal);
                    }
                }
            }
            
            this.totalAmount = total;
            markAsUpdated("system");
            
        } catch (Exception e) {
            throw new RuntimeException("Error calculating order total", e);
        }
    }
    
    /**
     * Method with nested generics
     */
    public Map<String, List<OrderItem>> groupItemsByCategory() {
        Map<String, List<OrderItem>> grouped = new HashMap<>();
        
        if (items != null) {
            for (OrderItem item : items) {
                String category = item.getProduct() != null ? item.getProduct().getCategory() : "Unknown";
                grouped.computeIfAbsent(category, k -> new ArrayList<>()).add(item);
            }
        }
        
        return grouped;
    }
}