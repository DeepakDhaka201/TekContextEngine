package com.testproject;

/**
 * Custom exception demonstrating:
 * - Exception class inheritance
 * - Constructor overloading
 * - Exception chaining
 */
public class ValidationException extends Exception {
    
    private String field;
    private Object rejectedValue;
    
    public ValidationException() {
        super();
    }
    
    public ValidationException(String message) {
        super(message);
    }
    
    public ValidationException(String message, Throwable cause) {
        super(message, cause);
    }
    
    public ValidationException(String message, String field, Object rejectedValue) {
        super(message);
        this.field = field;
        this.rejectedValue = rejectedValue;
    }
    
    public String getField() {
        return field;
    }
    
    public Object getRejectedValue() {
        return rejectedValue;
    }
    
    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append(getClass().getSimpleName()).append(": ");
        sb.append(getMessage());
        
        if (field != null) {
            sb.append(" [field: ").append(field).append("]");
        }
        
        if (rejectedValue != null) {
            sb.append(" [rejected value: ").append(rejectedValue).append("]");
        }
        
        return sb.toString();
    }
}