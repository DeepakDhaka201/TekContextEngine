package com.testproject;

/**
 * Mock Spring annotations for testing parser
 * These simulate the actual Spring Boot annotations
 */

// Spring Boot Web Annotations
@interface RestController {
    String value() default "";
}

@interface Controller {
    String value() default "";
}

@interface RequestMapping {
    String[] value() default {};
    String[] path() default {};
    String[] method() default {};
    String[] produces() default {};
    String[] consumes() default {};
    String[] headers() default {};
}

@interface GetMapping {
    String[] value() default {};
    String[] path() default {};
    String[] produces() default {};
    String[] consumes() default {};
    String[] headers() default {};
}

@interface PostMapping {
    String[] value() default {};
    String[] path() default {};
    String[] produces() default {};
    String[] consumes() default {};
    String[] headers() default {};
}

@interface PutMapping {
    String[] value() default {};
    String[] path() default {};
    String[] produces() default {};
    String[] consumes() default {};
    String[] headers() default {};
}

@interface DeleteMapping {
    String[] value() default {};
    String[] path() default {};
    String[] produces() default {};
    String[] consumes() default {};
    String[] headers() default {};
}

@interface PatchMapping {
    String[] value() default {};
    String[] path() default {};
    String[] produces() default {};
    String[] consumes() default {};
    String[] headers() default {};
}

// Parameter Annotations
@interface PathVariable {
    String value() default "";
    String name() default "";
    boolean required() default true;
}

@interface RequestParam {
    String value() default "";
    String name() default "";
    String defaultValue() default "";
    boolean required() default true;
}

@interface RequestBody {
    boolean required() default true;
}

@interface RequestHeader {
    String value() default "";
    String name() default "";
    String defaultValue() default "";
    boolean required() default true;
}

@interface Valid {
}

// Spring Stereotype Annotations
@interface Service {
    String value() default "";
}

@interface Repository {
    String value() default "";
}

@interface Component {
    String value() default "";
}

@interface Configuration {
    boolean proxyBeanMethods() default true;
}

@interface Bean {
    String[] value() default {};
    String[] name() default {};
}

@interface Profile {
    String[] value();
}

@interface ConfigurationProperties {
    String value() default "";
    String prefix() default "";
}

// Transaction Annotations
@interface Transactional {
    boolean readOnly() default false;
    String value() default "";
    String transactionManager() default "";
}

// Cross-Origin Annotation
@interface CrossOrigin {
    String[] value() default {};
    String[] origins() default {};
    String[] allowedHeaders() default {};
    String[] exposedHeaders() default {};
    boolean allowCredentials() default false;
    long maxAge() default -1;
}

// Test Annotations (JUnit 5)
@interface Test {
}

@interface BeforeEach {
}

@interface AfterEach {
}

@interface DisplayName {
    String value();
}

// Mockito Annotations
@interface Mock {
}

// Media Types (Mock)
class MediaType {
    public static final String APPLICATION_JSON_VALUE = "application/json";
    public static final String APPLICATION_XML_VALUE = "application/xml";
    public static final String TEXT_PLAIN_VALUE = "text/plain";
}

// HTTP Status (Mock)
enum HttpStatus {
    OK, CREATED, NO_CONTENT, BAD_REQUEST, NOT_FOUND, INTERNAL_SERVER_ERROR
}

// Response Entity (Mock)
class ResponseEntity<T> {
    private T body;
    private HttpStatus status;
    
    private ResponseEntity(T body, HttpStatus status) {
        this.body = body;
        this.status = status;
    }
    
    public static <T> ResponseEntity<T> ok(T body) {
        return new ResponseEntity<>(body, HttpStatus.OK);
    }
    
    public static <T> ResponseEntity<T> status(HttpStatus status) {
        return new ResponseEntity<>(null, status);
    }
    
    public static <T> ResponseEntity<T> notFound() {
        return new ResponseEntity<>(null, HttpStatus.NOT_FOUND);
    }
    
    public static <T> ResponseEntity<T> badRequest() {
        return new ResponseEntity<>(null, HttpStatus.BAD_REQUEST);
    }
    
    public ResponseEntity<T> body(T body) {
        return new ResponseEntity<>(body, this.status);
    }
    
    public ResponseEntity<T> build() {
        return this;
    }
}