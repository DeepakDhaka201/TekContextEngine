package com.tekcode.parser.util;

import org.apache.commons.lang3.StringUtils;

import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Utility class for path operations
 */
public class PathUtils {
    
    private PathUtils() {
        // Utility class - prevent instantiation
    }
    
    /**
     * Converts an absolute file path to a relative path based on the project root
     * 
     * @param absolutePath The absolute file path
     * @param projectRoot The project root directory path
     * @return Relative path from project root, or original path if conversion fails
     */
    public static String toRelativePath(String absolutePath, String projectRoot) {
        if (StringUtils.isBlank(absolutePath) || StringUtils.isBlank(projectRoot)) {
            return absolutePath;
        }
        
        try {
            Path absolute = Paths.get(absolutePath).toAbsolutePath().normalize();
            Path root = Paths.get(projectRoot).toAbsolutePath().normalize();
            
            // Check if the file is within the project directory
            if (absolute.startsWith(root)) {
                Path relative = root.relativize(absolute);
                return normalizePath(relative.toString());
            } else {
                // File is outside project directory, return absolute path
                return normalizePath(absolutePath);
            }
        } catch (Exception e) {
            // If any error occurs, return the original path
            return normalizePath(absolutePath);
        }
    }
    
    /**
     * Normalize path separators to use forward slashes for consistency
     * 
     * @param path the path to normalize
     * @return normalized path
     */
    public static String normalizePath(String path) {
        if (StringUtils.isBlank(path)) {
            return path;
        }
        return path.replace('\\', '/');
    }
    
    /**
     * Gets the file extension from a path
     * 
     * @param path the file path
     * @return file extension (without dot) or empty string if no extension
     */
    public static String getFileExtension(String path) {
        if (StringUtils.isBlank(path)) {
            return "";
        }
        
        int lastDotIndex = path.lastIndexOf('.');
        int lastSeparatorIndex = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
        
        if (lastDotIndex > lastSeparatorIndex && lastDotIndex < path.length() - 1) {
            return path.substring(lastDotIndex + 1);
        }
        
        return "";
    }
    
    /**
     * Gets the filename without extension from a path
     * 
     * @param path the file path
     * @return filename without extension
     */
    public static String getFilenameWithoutExtension(String path) {
        if (StringUtils.isBlank(path)) {
            return "";
        }
        
        String filename = getFilename(path);
        int lastDotIndex = filename.lastIndexOf('.');
        
        if (lastDotIndex > 0) {
            return filename.substring(0, lastDotIndex);
        }
        
        return filename;
    }
    
    /**
     * Gets the filename from a path
     * 
     * @param path the file path
     * @return filename
     */
    public static String getFilename(String path) {
        if (StringUtils.isBlank(path)) {
            return "";
        }
        
        int lastSeparatorIndex = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
        
        if (lastSeparatorIndex >= 0 && lastSeparatorIndex < path.length() - 1) {
            return path.substring(lastSeparatorIndex + 1);
        }
        
        return path;
    }
    
    /**
     * Gets the parent directory from a path
     * 
     * @param path the file path
     * @return parent directory path or empty string if no parent
     */
    public static String getParentDirectory(String path) {
        if (StringUtils.isBlank(path)) {
            return "";
        }
        
        int lastSeparatorIndex = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
        
        if (lastSeparatorIndex > 0) {
            return path.substring(0, lastSeparatorIndex);
        }
        
        return "";
    }
    
    /**
     * Joins path components with the appropriate separator
     * 
     * @param components path components to join
     * @return joined path
     */
    public static String joinPaths(String... components) {
        if (components == null || components.length == 0) {
            return "";
        }
        
        StringBuilder result = new StringBuilder();
        
        for (int i = 0; i < components.length; i++) {
            String component = components[i];
            if (StringUtils.isBlank(component)) {
                continue;
            }
            
            // Remove leading/trailing separators
            component = component.replaceAll("^[/\\\\]+", "").replaceAll("[/\\\\]+$", "");
            
            if (result.length() > 0 && StringUtils.isNotBlank(component)) {
                result.append('/');
            }
            
            result.append(component);
        }
        
        return result.toString();
    }
    
    /**
     * Checks if a path represents a Java source file
     * 
     * @param path the file path
     * @return true if it's a Java file, false otherwise
     */
    public static boolean isJavaFile(String path) {
        return "java".equalsIgnoreCase(getFileExtension(path));
    }
    
    /**
     * Checks if a path represents a test file based on common patterns
     * 
     * @param path the file path
     * @return true if it appears to be a test file, false otherwise
     */
    public static boolean isTestFile(String path) {
        if (StringUtils.isBlank(path)) {
            return false;
        }
        
        String normalizedPath = normalizePath(path.toLowerCase());
        
        // Check for common test directory patterns
        if (normalizedPath.contains("/test/") || 
            normalizedPath.contains("/tests/") ||
            normalizedPath.startsWith("test/") ||
            normalizedPath.startsWith("tests/")) {
            return true;
        }
        
        // Check for test file naming patterns
        String filename = getFilenameWithoutExtension(path).toLowerCase();
        return filename.endsWith("test") || 
               filename.endsWith("tests") || 
               filename.startsWith("test") ||
               filename.contains("test");
    }
    
    /**
     * Checks if a path represents a generated file based on common patterns
     * 
     * @param path the file path
     * @return true if it appears to be a generated file, false otherwise
     */
    public static boolean isGeneratedFile(String path) {
        if (StringUtils.isBlank(path)) {
            return false;
        }
        
        String normalizedPath = normalizePath(path.toLowerCase());
        
        // Check for common generated file patterns
        return normalizedPath.contains("/generated/") ||
               normalizedPath.contains("/target/generated-sources/") ||
               normalizedPath.contains("/build/generated/") ||
               normalizedPath.contains(".generated.") ||
               getFilename(path).toLowerCase().contains("generated");
    }
    
    /**
     * Converts a file path to a package name
     * 
     * @param javaFilePath the Java file path (relative to source root)
     * @return package name or empty string if cannot be determined
     */
    public static String pathToPackageName(String javaFilePath) {
        if (StringUtils.isBlank(javaFilePath) || !isJavaFile(javaFilePath)) {
            return "";
        }
        
        String normalizedPath = normalizePath(javaFilePath);
        
        // Remove common source directory prefixes
        normalizedPath = normalizedPath.replaceFirst("^src/main/java/", "");
        normalizedPath = normalizedPath.replaceFirst("^src/test/java/", "");
        normalizedPath = normalizedPath.replaceFirst("^src/", "");
        
        // Remove filename
        String packagePath = getParentDirectory(normalizedPath);
        
        if (StringUtils.isBlank(packagePath)) {
            return "";
        }
        
        // Convert path separators to dots
        return packagePath.replace('/', '.');
    }
}
