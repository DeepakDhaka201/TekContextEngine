package com.testproject;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import java.util.List;
import java.util.Optional;
import java.util.Map;

/**
 * REST Controller demonstrating:
 * - Spring Boot annotations
 * - API endpoint mappings
 * - Multiple HTTP methods
 * - Path parameters and request bodies
 * - Complex annotation parameters
 */
@RestController
@RequestMapping(path = "/api/v1/users", produces = MediaType.APPLICATION_JSON_VALUE)
@CrossOrigin(origins = "*")
public class UserController {
    
    private final UserService userService;
    private final UserMapper userMapper;
    
    public UserController(UserService userService, UserMapper userMapper) {
        this.userService = userService;
        this.userMapper = userMapper;
    }
    
    @GetMapping
    public ResponseEntity<List<UserDto>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {
        
        try {
            List<User> users = userService.findAll(page, size, search);
            List<UserDto> userDtos = userMapper.toDto(users);
            return ResponseEntity.ok(userDtos);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @GetMapping(path = "/{id}")
    public ResponseEntity<UserDto> getUserById(@PathVariable Long id) {
        Optional<User> user = userService.findById(id);
        
        if (user.isPresent()) {
            UserDto userDto = userMapper.toDto(user.get());
            return ResponseEntity.ok(userDto);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<UserDto> createUser(@RequestBody @Valid CreateUserRequest request) {
        try {
            User user = userMapper.toEntity(request);
            User savedUser = userService.save(user);
            UserDto userDto = userMapper.toDto(savedUser);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(userDto);
        } catch (ValidationException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PutMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<UserDto> updateUser(
            @PathVariable Long id, 
            @RequestBody @Valid UpdateUserRequest request) {
        
        Optional<User> existingUser = userService.findById(id);
        if (!existingUser.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        
        User user = userMapper.updateEntity(existingUser.get(), request);
        User savedUser = userService.save(user);
        UserDto userDto = userMapper.toDto(savedUser);
        
        return ResponseEntity.ok(userDto);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        boolean deleted = userService.deleteById(id);
        
        if (deleted) {
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @PatchMapping(path = "/{id}/status")
    public ResponseEntity<UserDto> updateUserStatus(
            @PathVariable Long id,
            @RequestParam UserStatus status) {
        
        try {
            User user = userService.updateStatus(id, status);
            UserDto userDto = userMapper.toDto(user);
            return ResponseEntity.ok(userDto);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/{id}/orders")
    public ResponseEntity<List<OrderDto>> getUserOrders(@PathVariable Long id) {
        List<Order> orders = userService.getUserOrders(id);
        List<OrderDto> orderDtos = orders.stream()
            .map(order -> new OrderDto(order))
            .collect(java.util.stream.Collectors.toList());
        
        return ResponseEntity.ok(orderDtos);
    }
    
    @PostMapping("/{id}/orders")
    public ResponseEntity<OrderDto> createUserOrder(
            @PathVariable Long id,
            @RequestBody CreateOrderRequest request) {
        
        Order order = userService.createOrderForUser(id, request);
        OrderDto orderDto = new OrderDto(order);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(orderDto);
    }
    
    /**
     * Complex endpoint with multiple parameters and custom media type
     */
    @RequestMapping(
        path = "/search", 
        method = RequestMethod.GET,
        produces = {MediaType.APPLICATION_JSON_VALUE, MediaType.APPLICATION_XML_VALUE}
    )
    public ResponseEntity<Map<String, Object>> searchUsers(
            @RequestParam String query,
            @RequestParam(defaultValue = "username") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDirection,
            @RequestHeader(value = "X-Client-Version", required = false) String clientVersion) {
        
        Map<String, Object> result = userService.searchUsers(query, sortBy, sortDirection);
        return ResponseEntity.ok(result);
    }
}