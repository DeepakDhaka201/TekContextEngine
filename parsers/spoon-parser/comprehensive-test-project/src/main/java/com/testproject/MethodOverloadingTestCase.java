package com.testproject;

import java.util.List;
import java.util.ArrayList;

/**
 * Test case for method overloading to verify CALLS relationships
 * use full method signatures to distinguish between overloaded methods.
 */
public class MethodOverloadingTestCase {
    
    private UserService userService;
    private OrderService orderService;
    
    // Overloaded save methods
    public void save(User user) {
        System.out.println("Saving user: " + user.getName());
        userService.validateUser(user);
        userService.persistUser(user);
    }
    
    public void save(Order order) {
        System.out.println("Saving order: " + order.getId());
        orderService.validateOrder(order);
        orderService.persistOrder(order);
    }
    
    public void save(User user, boolean validate) {
        if (validate) {
            userService.validateUser(user);
        }
        userService.persistUser(user);
    }
    
    public void save(Order order, String context) {
        System.out.println("Saving order in context: " + context);
        orderService.validateOrder(order);
        orderService.persistOrder(order);
    }
    
    // Overloaded process methods
    public void process(String data) {
        System.out.println("Processing string data: " + data);
        validateData(data);
        transformData(data);
    }
    
    public void process(List<String> dataList) {
        System.out.println("Processing list data: " + dataList.size() + " items");
        for (String data : dataList) {
            validateData(data);
            transformData(data);
        }
    }
    
    public void process(String data, boolean async) {
        if (async) {
            processAsync(data);
        } else {
            process(data); // Calls the single-parameter version
        }
    }
    
    // Overloaded find methods with different return types
    public User findUser(String id) {
        User user = userService.findById(id);
        return user;
    }
    
    public User findUser(String firstName, String lastName) {
        List<User> users = userService.findByName(firstName, lastName);
        return users.isEmpty() ? null : users.get(0);
    }
    
    public List<User> findUser(String firstName, String lastName, int limit) {
        List<User> allUsers = userService.findByName(firstName, lastName);
        return allUsers.subList(0, Math.min(limit, allUsers.size()));
    }
    
    // Method that calls different overloaded versions
    public void testMethodCalls() {
        // Test overloaded save methods
        User user = new User("John", "john@example.com");
        Order order = new Order("ORD-001", user);
        
        save(user);                    // Calls save(User)
        save(order);                   // Calls save(Order)
        save(user, true);              // Calls save(User, boolean)
        save(order, "web");            // Calls save(Order, String)
        
        // Test overloaded process methods
        process("test data");          // Calls process(String)
        
        List<String> dataList = new ArrayList<>();
        dataList.add("item1");
        dataList.add("item2");
        process(dataList);             // Calls process(List<String>)
        process("async data", true);   // Calls process(String, boolean)
        
        // Test overloaded find methods
        User foundUser1 = findUser("user-123");              // Calls findUser(String)
        User foundUser2 = findUser("John", "Doe");           // Calls findUser(String, String)
        List<User> foundUsers = findUser("Jane", "Smith", 5); // Calls findUser(String, String, int)
    }
    
    // Helper methods that will be called
    private void validateData(String data) {
        if (data == null || data.trim().isEmpty()) {
            throw new IllegalArgumentException("Data cannot be null or empty");
        }
    }
    
    private void transformData(String data) {
        System.out.println("Transforming: " + data.toUpperCase());
    }
    
    private void processAsync(String data) {
        System.out.println("Processing asynchronously: " + data);
        validateData(data);
        transformData(data);
    }
    
    // Constructor overloading test
    public MethodOverloadingTestCase() {
        this.userService = new UserService();
        this.orderService = new OrderService();
    }
    
    public MethodOverloadingTestCase(UserService userService) {
        this.userService = userService;
        this.orderService = new OrderService();
    }
    
    public MethodOverloadingTestCase(UserService userService, OrderService orderService) {
        this.userService = userService;
        this.orderService = orderService;
    }
    
    // Static method overloading
    public static String format(String text) {
        return text.toUpperCase();
    }
    
    public static String format(String text, boolean capitalize) {
        if (capitalize) {
            return text.substring(0, 1).toUpperCase() + text.substring(1).toLowerCase();
        }
        return text.toLowerCase();
    }
    
    public static String format(String text, String prefix, String suffix) {
        return prefix + text + suffix;
    }
    
    // Test static method calls
    public void testStaticCalls() {
        String result1 = format("hello");                    // Calls format(String)
        String result2 = format("world", true);              // Calls format(String, boolean)
        String result3 = format("test", "[", "]");           // Calls format(String, String, String)
        
        System.out.println(result1 + ", " + result2 + ", " + result3);
    }
}