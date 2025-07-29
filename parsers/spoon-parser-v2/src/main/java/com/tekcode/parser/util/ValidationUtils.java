package com.tekcode.parser.util;

import org.apache.commons.lang3.StringUtils;

import java.util.regex.Pattern;

/**
 * Utility class for validation operations
 */
public class ValidationUtils {
    
    // Pattern for valid codebase names: alphanumeric, hyphens, underscores, dots
    private static final Pattern CODEBASE_NAME_PATTERN = Pattern.compile("^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$");
    
    // Pattern for valid Java identifiers
    private static final Pattern JAVA_IDENTIFIER_PATTERN = Pattern.compile("^[a-zA-Z_$][a-zA-Z0-9_$]*$");
    
    // Pattern for valid package names
    private static final Pattern PACKAGE_NAME_PATTERN = Pattern.compile("^[a-zA-Z_$][a-zA-Z0-9_$]*(?:\\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$");
    
    private ValidationUtils() {
        // Utility class - prevent instantiation
    }
    
    /**
     * Validates a codebase name
     * 
     * @param codebaseName the name to validate
     * @return true if valid, false otherwise
     */
    public static boolean isValidCodebaseName(String codebaseName) {
        if (StringUtils.isBlank(codebaseName)) {
            return false;
        }
        
        // Check length constraints
        if (codebaseName.length() < 2 || codebaseName.length() > 100) {
            return false;
        }
        
        // Check pattern
        return CODEBASE_NAME_PATTERN.matcher(codebaseName).matches();
    }
    
    /**
     * Validates a Java identifier
     * 
     * @param identifier the identifier to validate
     * @return true if valid, false otherwise
     */
    public static boolean isValidJavaIdentifier(String identifier) {
        if (StringUtils.isBlank(identifier)) {
            return false;
        }
        
        return JAVA_IDENTIFIER_PATTERN.matcher(identifier).matches();
    }
    
    /**
     * Validates a Java package name
     * 
     * @param packageName the package name to validate
     * @return true if valid, false otherwise
     */
    public static boolean isValidPackageName(String packageName) {
        if (StringUtils.isBlank(packageName)) {
            return false;
        }
        
        return PACKAGE_NAME_PATTERN.matcher(packageName).matches();
    }
    
    /**
     * Validates a fully qualified class name
     * 
     * @param className the class name to validate
     * @return true if valid, false otherwise
     */
    public static boolean isValidClassName(String className) {
        if (StringUtils.isBlank(className)) {
            return false;
        }
        
        // Split by dots and validate each part
        String[] parts = className.split("\\.");
        if (parts.length == 0) {
            return false;
        }
        
        // All parts except the last should be valid package identifiers
        for (int i = 0; i < parts.length - 1; i++) {
            if (!isValidJavaIdentifier(parts[i])) {
                return false;
            }
        }
        
        // Last part should be a valid class identifier (can contain $ for inner classes)
        String lastPart = parts[parts.length - 1];
        return isValidJavaIdentifier(lastPart) || isValidInnerClassName(lastPart);
    }
    
    /**
     * Validates an inner class name (can contain $ separators)
     * 
     * @param innerClassName the inner class name to validate
     * @return true if valid, false otherwise
     */
    public static boolean isValidInnerClassName(String innerClassName) {
        if (StringUtils.isBlank(innerClassName)) {
            return false;
        }
        
        String[] parts = innerClassName.split("\\$");
        for (String part : parts) {
            if (!isValidJavaIdentifier(part)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Validates a method signature
     * 
     * @param signature the method signature to validate
     * @return true if valid, false otherwise
     */
    public static boolean isValidMethodSignature(String signature) {
        if (StringUtils.isBlank(signature)) {
            return false;
        }
        
        // Basic validation - should contain method name and parentheses
        return signature.contains("(") && signature.contains(")");
    }
    
    /**
     * Validates an entity ID format
     * 
     * @param id the ID to validate
     * @return true if valid, false otherwise
     */
    public static boolean isValidEntityId(String id) {
        if (StringUtils.isBlank(id)) {
            return false;
        }
        
        // Should contain at least one colon separator
        return id.contains(":");
    }
    
    /**
     * Sanitizes a string for use in IDs
     * 
     * @param input the input string
     * @return sanitized string
     */
    public static String sanitizeForId(String input) {
        if (StringUtils.isBlank(input)) {
            return "";
        }
        
        // Replace problematic characters with safe alternatives
        return input.replaceAll("[^a-zA-Z0-9._$-]", "_");
    }
    
    /**
     * Validates a file path
     * 
     * @param path the path to validate
     * @return true if valid, false otherwise
     */
    public static boolean isValidFilePath(String path) {
        if (StringUtils.isBlank(path)) {
            return false;
        }
        
        // Basic validation - should not contain null bytes or control characters
        return !path.contains("\0") && !containsControlCharacters(path);
    }
    
    /**
     * Checks if a string contains control characters
     * 
     * @param str the string to check
     * @return true if contains control characters, false otherwise
     */
    private static boolean containsControlCharacters(String str) {
        for (char c : str.toCharArray()) {
            if (Character.isISOControl(c) && c != '\t' && c != '\n' && c != '\r') {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Validates a version string
     * 
     * @param version the version to validate
     * @return true if valid, false otherwise
     */
    public static boolean isValidVersion(String version) {
        if (StringUtils.isBlank(version)) {
            return false;
        }
        
        // Basic semantic version pattern: major.minor.patch with optional suffixes
        Pattern versionPattern = Pattern.compile("^\\d+\\.\\d+\\.\\d+(?:-[a-zA-Z0-9.-]+)?(?:\\+[a-zA-Z0-9.-]+)?$");
        return versionPattern.matcher(version).matches();
    }
}
