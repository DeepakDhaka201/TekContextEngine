package com.tekcode.parser.util;

import spoon.reflect.declaration.CtExecutable;
import spoon.reflect.declaration.CtClass;
import org.apache.commons.lang3.StringUtils;

/**
 * Utility class for generating consistent, unique IDs for various entities
 * 
 * All IDs follow the format: codebaseName:entityType:identifier
 * This ensures global uniqueness across different codebases and entity types.
 */
public class IdGenerator {
    
    private static final String SEPARATOR = ":";
    private static final String UNKNOWN = "unknown";
    
    private IdGenerator() {
        // Utility class - prevent instantiation
    }
    
    /**
     * Generates a unique ID for a file
     * 
     * @param codebaseName the codebase name
     * @param filePath the relative file path
     * @return unique file ID
     */
    public static String generateFileId(String codebaseName, String filePath) {
        return sanitize(codebaseName) + SEPARATOR + "file" + SEPARATOR + sanitize(filePath);
    }
    
    /**
     * Generates a unique ID for a class
     * 
     * @param codebaseName the codebase name
     * @param fullyQualifiedName the fully qualified class name
     * @return unique class ID
     */
    public static String generateClassId(String codebaseName, String fullyQualifiedName) {
        return sanitize(codebaseName) + SEPARATOR + "class" + SEPARATOR + sanitize(fullyQualifiedName);
    }
    
    /**
     * Generates a unique ID for an interface
     * 
     * @param codebaseName the codebase name
     * @param fullyQualifiedName the fully qualified interface name
     * @return unique interface ID
     */
    public static String generateInterfaceId(String codebaseName, String fullyQualifiedName) {
        return sanitize(codebaseName) + SEPARATOR + "interface" + SEPARATOR + sanitize(fullyQualifiedName);
    }
    
    /**
     * Generates a unique ID for a method
     * 
     * @param codebaseName the codebase name
     * @param executable the method or constructor
     * @return unique method ID
     */
    public static String generateMethodId(String codebaseName, CtExecutable<?> executable) {
        String className = getContainingClassName(executable);
        String signature = executable.getSignature();
        
        return sanitize(codebaseName) + SEPARATOR + "method" + SEPARATOR + 
               sanitize(className) + "." + sanitize(signature);
    }
    
    /**
     * Generates a unique ID for a field
     * 
     * @param codebaseName the codebase name
     * @param className the containing class name
     * @param fieldName the field name
     * @return unique field ID
     */
    public static String generateFieldId(String codebaseName, String className, String fieldName) {
        return sanitize(codebaseName) + SEPARATOR + "field" + SEPARATOR + 
               sanitize(className) + "." + sanitize(fieldName);
    }
    
    /**
     * Generates a unique ID for an annotation
     * 
     * @param codebaseName the codebase name
     * @param annotationName the annotation name
     * @return unique annotation ID
     */
    public static String generateAnnotationId(String codebaseName, String annotationName) {
        return sanitize(codebaseName) + SEPARATOR + "annotation" + SEPARATOR + sanitize(annotationName);
    }
    
    /**
     * Generates a unique ID for a dependency
     * 
     * @param codebaseName the codebase name
     * @param groupId the dependency group ID
     * @param artifactId the dependency artifact ID
     * @return unique dependency ID
     */
    public static String generateDependencyId(String codebaseName, String groupId, String artifactId) {
        return sanitize(codebaseName) + SEPARATOR + "dependency" + SEPARATOR + 
               sanitize(groupId) + "." + sanitize(artifactId);
    }
    
    /**
     * Generates a unique ID for a package
     * 
     * @param codebaseName the codebase name
     * @param packageName the package name
     * @return unique package ID
     */
    public static String generatePackageId(String codebaseName, String packageName) {
        return sanitize(codebaseName) + SEPARATOR + "package" + SEPARATOR + sanitize(packageName);
    }
    
    /**
     * Generates a unique ID for a test case
     * 
     * @param codebaseName the codebase name
     * @param testClassName the test class name
     * @param testMethodName the test method name
     * @return unique test case ID
     */
    public static String generateTestCaseId(String codebaseName, String testClassName, String testMethodName) {
        return sanitize(codebaseName) + SEPARATOR + "test" + SEPARATOR + 
               sanitize(testClassName) + "." + sanitize(testMethodName);
    }
    
    /**
     * Generates a unique ID for an API endpoint
     * 
     * @param codebaseName the codebase name
     * @param httpMethod the HTTP method (GET, POST, etc.)
     * @param path the endpoint path
     * @return unique API endpoint ID
     */
    public static String generateApiEndpointId(String codebaseName, String httpMethod, String path) {
        return sanitize(codebaseName) + SEPARATOR + "endpoint" + SEPARATOR + 
               sanitize(httpMethod) + SEPARATOR + sanitize(path);
    }
    
    /**
     * Generates a unique ID for a relationship
     * 
     * @param relationshipType the type of relationship
     * @param sourceId the source entity ID
     * @param targetId the target entity ID
     * @return unique relationship ID
     */
    public static String generateRelationshipId(String relationshipType, String sourceId, String targetId) {
        return "rel" + SEPARATOR + sanitize(relationshipType) + SEPARATOR + 
               sanitize(sourceId) + SEPARATOR + sanitize(targetId);
    }
    
    /**
     * Extracts the codebase name from an entity ID
     * 
     * @param entityId the entity ID
     * @return codebase name or null if not found
     */
    public static String extractCodebaseName(String entityId) {
        if (StringUtils.isBlank(entityId)) {
            return null;
        }
        
        String[] parts = entityId.split(SEPARATOR, 2);
        return parts.length > 0 ? parts[0] : null;
    }
    
    /**
     * Extracts the entity type from an entity ID
     * 
     * @param entityId the entity ID
     * @return entity type or null if not found
     */
    public static String extractEntityType(String entityId) {
        if (StringUtils.isBlank(entityId)) {
            return null;
        }
        
        String[] parts = entityId.split(SEPARATOR, 3);
        return parts.length > 1 ? parts[1] : null;
    }
    
    /**
     * Validates that an ID follows the expected format
     * 
     * @param entityId the ID to validate
     * @return true if valid, false otherwise
     */
    public static boolean isValidId(String entityId) {
        if (StringUtils.isBlank(entityId)) {
            return false;
        }
        
        String[] parts = entityId.split(SEPARATOR);
        return parts.length >= 3 && 
               StringUtils.isNotBlank(parts[0]) && 
               StringUtils.isNotBlank(parts[1]) && 
               StringUtils.isNotBlank(parts[2]);
    }
    
    /**
     * Gets the containing class name for a method or constructor
     */
    private static String getContainingClassName(CtExecutable<?> executable) {
        CtClass<?> parentClass = executable.getParent(CtClass.class);
        if (parentClass != null) {
            return parentClass.getQualifiedName();
        }
        
        // Try to get from parent type
        if (executable.getParent() instanceof spoon.reflect.declaration.CtType) {
            spoon.reflect.declaration.CtType<?> parentType = 
                (spoon.reflect.declaration.CtType<?>) executable.getParent();
            return parentType.getQualifiedName();
        }
        
        return UNKNOWN;
    }
    
    /**
     * Sanitizes a string for use in IDs by replacing problematic characters
     */
    private static String sanitize(String input) {
        if (StringUtils.isBlank(input)) {
            return UNKNOWN;
        }
        
        // Replace problematic characters with safe alternatives
        return input.replaceAll("[^a-zA-Z0-9._$/-]", "_");
    }
}
