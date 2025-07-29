package com.tekcode.parser.util;

import java.nio.file.Path;
import java.nio.file.Paths;

public class PathUtils {
    
    /**
     * Converts an absolute file path to a relative path based on the project root
     * 
     * @param absolutePath The absolute file path
     * @param projectRoot The project root directory path
     * @return Relative path from project root, or original path if conversion fails
     */
    public static String toRelativePath(String absolutePath, String projectRoot) {
        if (absolutePath == null || projectRoot == null) {
            return absolutePath;
        }
        
        try {
            Path absolute = Paths.get(absolutePath).toAbsolutePath().normalize();
            Path root = Paths.get(projectRoot).toAbsolutePath().normalize();
            
            // Check if the file is within the project directory
            if (absolute.startsWith(root)) {
                Path relative = root.relativize(absolute);
                return relative.toString().replace('\\', '/'); // Normalize separators for consistency
            } else {
                // File is outside project directory, return absolute path
                return absolutePath;
            }
        } catch (Exception e) {
            // If any error occurs, return the original path
            return absolutePath;
        }
    }
    
    /**
     * Normalize path separators to use forward slashes
     */
    public static String normalizePath(String path) {
        return path != null ? path.replace('\\', '/') : null;
    }
}