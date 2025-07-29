package com.tekcode.parser.processor;

import com.tekcode.parser.core.ParsingContext;
import com.tekcode.parser.model.FileNode;
import com.tekcode.parser.util.PathUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import spoon.reflect.declaration.CtCompilationUnit;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * Processor for extracting file-level information
 */
public class FileProcessor {
    private static final Logger logger = LoggerFactory.getLogger(FileProcessor.class);
    
    private final ParsingContext context;
    
    public FileProcessor(ParsingContext context) {
        this.context = context;
    }
    
    /**
     * Processes a compilation unit and extracts file information
     * 
     * @param compilationUnit the compilation unit to process
     * @return FileNode or null if processing fails
     */
    public FileNode processFile(CtCompilationUnit compilationUnit) {
        try {
            File file = compilationUnit.getFile();
            if (file == null || !file.exists()) {
                logger.warn("Compilation unit has no associated file or file does not exist");
                return null;
            }
            
            // Check if we should include this file based on configuration
            if (!shouldIncludeFile(file)) {
                logger.debug("Skipping file based on configuration: {}", file.getPath());
                return null;
            }
            
            FileNode fileNode = new FileNode();
            
            // Basic file information
            String relativePath = PathUtils.toRelativePath(file.getAbsolutePath(), context.getProjectPath());
            fileNode.setPath(relativePath);
            fileNode.setFileName(file.getName());
            fileNode.setAbsolutePath(file.getAbsolutePath());
            
            // File metadata
            fileNode.setLastModified(file.lastModified());
            fileNode.setFileSize(file.length());
            
            // Calculate checksum if requested
            if (context.getConfig().isIncludeFileChecksums()) {
                String checksum = calculateChecksum(file);
                fileNode.setChecksum(checksum);
            }
            
            // Count lines
            int lineCount = countLines(file);
            fileNode.setLineCount(lineCount);
            
            // Determine file type and characteristics
            analyzeFileCharacteristics(fileNode, file);
            
            // Extract source code if requested
            if (context.getConfig().isIncludeSourceCode()) {
                String sourceCode = readSourceCode(file);
                fileNode.setSourceCode(sourceCode);
            }
            
            logger.debug("Processed file: {} ({} lines)", relativePath, lineCount);
            return fileNode;
            
        } catch (Exception e) {
            logger.error("Error processing file from compilation unit", e);
            context.incrementErrorCount();
            return null;
        }
    }
    
    /**
     * Determines if a file should be included based on configuration
     */
    private boolean shouldIncludeFile(File file) {
        String path = file.getAbsolutePath();
        
        // Check if it's a Java file
        if (!PathUtils.isJavaFile(path)) {
            return false;
        }
        
        // Check if it's a test file and tests are excluded
        if (PathUtils.isTestFile(path) && !context.getConfig().isIncludeTestFiles()) {
            return false;
        }
        
        // Check if it's a generated file and generated files are excluded
        if (PathUtils.isGeneratedFile(path) && !context.getConfig().isIncludeGeneratedFiles()) {
            return false;
        }
        
        // Check exclude patterns
        for (String pattern : context.getConfig().getExcludePatterns()) {
            if (path.matches(pattern)) {
                return false;
            }
        }
        
        // Check include patterns
        if (!context.getConfig().getIncludePatterns().isEmpty()) {
            boolean matches = false;
            for (String pattern : context.getConfig().getIncludePatterns()) {
                if (path.matches(pattern)) {
                    matches = true;
                    break;
                }
            }
            if (!matches) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Calculates MD5 checksum of a file
     */
    private String calculateChecksum(File file) {
        try {
            byte[] content = Files.readAllBytes(file.toPath());
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(content);
            
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
            
        } catch (IOException | NoSuchAlgorithmException e) {
            logger.warn("Could not calculate checksum for file: {}", file.getAbsolutePath(), e);
            return "";
        }
    }
    
    /**
     * Counts the number of lines in a file
     */
    private int countLines(File file) {
        try {
            return (int) Files.lines(file.toPath()).count();
        } catch (IOException e) {
            logger.warn("Could not count lines for file: {}", file.getAbsolutePath(), e);
            return 0;
        }
    }
    
    /**
     * Analyzes file characteristics and sets appropriate flags
     */
    private void analyzeFileCharacteristics(FileNode fileNode, File file) {
        String path = file.getAbsolutePath();
        
        // Set file type flags
        fileNode.setIsTestFile(PathUtils.isTestFile(path));
        fileNode.setIsGeneratedFile(PathUtils.isGeneratedFile(path));
        
        // Determine package name from path
        String packageName = PathUtils.pathToPackageName(fileNode.getPath());
        fileNode.setPackageName(packageName);
        
        // Set file extension
        String extension = PathUtils.getFileExtension(path);
        fileNode.setFileExtension(extension);
        
        // Analyze content characteristics
        analyzeContentCharacteristics(fileNode, file);
    }
    
    /**
     * Analyzes content characteristics like line counts by type
     */
    private void analyzeContentCharacteristics(FileNode fileNode, File file) {
        try {
            int totalLines = 0;
            int codeLines = 0;
            int commentLines = 0;
            int blankLines = 0;
            
            for (String line : Files.readAllLines(file.toPath())) {
                totalLines++;
                String trimmedLine = line.trim();
                
                if (trimmedLine.isEmpty()) {
                    blankLines++;
                } else if (trimmedLine.startsWith("//") || 
                          trimmedLine.startsWith("/*") || 
                          trimmedLine.startsWith("*") ||
                          trimmedLine.endsWith("*/")) {
                    commentLines++;
                } else {
                    codeLines++;
                }
            }
            
            fileNode.setLineCount(totalLines);
            fileNode.setCodeLines(codeLines);
            fileNode.setCommentLines(commentLines);
            fileNode.setBlankLines(blankLines);
            
        } catch (IOException e) {
            logger.warn("Could not analyze content characteristics for file: {}", file.getAbsolutePath(), e);
        }
    }
    
    /**
     * Reads the source code content of a file
     */
    private String readSourceCode(File file) {
        try {
            return Files.readString(file.toPath());
        } catch (IOException e) {
            logger.warn("Could not read source code for file: {}", file.getAbsolutePath(), e);
            return "";
        }
    }
}
