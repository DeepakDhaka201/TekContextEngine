package com.testproject;

/**
 * Simple test case to verify CALLS relationships are generated.
 */
public class SimpleCallTest {
    
    public void caller() {
        // Simple method call
        target();
        
        // Call with parameters
        targetWithParam("hello");
        
        // Overloaded method calls
        overloaded("string");
        overloaded(42);
        overloaded("string", 42);
        
        // Call static method
        String result = formatMessage("test");
        System.out.println(result);
    }
    
    public void target() {
        System.out.println("Target method called");
    }
    
    public void targetWithParam(String param) {
        System.out.println("Target with param: " + param);
    }
    
    // Overloaded methods to test signature differentiation
    public void overloaded(String param) {
        System.out.println("String version: " + param);
    }
    
    public void overloaded(int param) {
        System.out.println("Int version: " + param);
    }
    
    public void overloaded(String param1, int param2) {
        System.out.println("Two param version: " + param1 + ", " + param2);
    }
    
    public static String formatMessage(String message) {
        return "Formatted: " + message.toUpperCase();
    }
}