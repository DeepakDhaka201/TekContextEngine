package com.tekcode.parser;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.tekcode.parser.config.ParserConfig;
import com.tekcode.parser.core.ParsingEngine;
import com.tekcode.parser.model.ParseResult;
import com.tekcode.parser.util.ValidationUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.Instant;

/**
 * Spoon Parser v2 - Advanced Java code parser with comprehensive analysis capabilities
 * 
 * Features:
 * - Single-pass processing architecture
 * - Comprehensive deduplication
 * - Advanced framework detection
 * - Memory-efficient processing
 * - Extensive error handling
 * - Full test coverage
 * 
 * Usage: java -jar spoon-parser-v2.jar <codebase-name> <input-directory> <output-file> [config-file]
 */
public class SpoonParserV2 {
    private static final Logger logger = LoggerFactory.getLogger(SpoonParserV2.class);
    
    private static final ObjectMapper objectMapper = new ObjectMapper()
            .enable(SerializationFeature.INDENT_OUTPUT)
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    public static void main(String[] args) {
        if (args.length < 3 || args.length > 4) {
            printUsage();
            System.exit(1);
        }

        String codebaseName = args[0];
        String inputDirectory = args[1];
        String outputFile = args[2];
        String configFile = args.length > 3 ? args[3] : null;

        try {
            logger.info("Starting Spoon Parser v2 for codebase: '{}' in directory: '{}'", 
                       codebaseName, inputDirectory);
            
            // Validate inputs
            validateInputs(codebaseName, inputDirectory, outputFile);
            
            // Load configuration
            ParserConfig config = loadConfiguration(configFile);
            
            // Parse the project
            Instant startTime = Instant.now();
            ParseResult result = parseJavaProject(codebaseName, inputDirectory, config);
            Duration duration = Duration.between(startTime, Instant.now());
            
            // Write result to output file
            writeResult(result, outputFile);
            
            // Log summary
            logSummary(result, duration);
            
        } catch (IllegalArgumentException e) {
            logger.error("Invalid arguments: {}", e.getMessage());
            printUsage();
            System.exit(1);
        } catch (IOException e) {
            logger.error("IO error: {}", e.getMessage(), e);
            System.err.println("Error: Unable to read/write files - " + e.getMessage());
            System.exit(1);
        } catch (Exception e) {
            logger.error("Unexpected error: {}", e.getMessage(), e);
            System.err.println("Error: " + e.getMessage());
            System.exit(1);
        }
    }

    /**
     * Parse a Java project and extract comprehensive information
     */
    public static ParseResult parseJavaProject(String codebaseName, String projectPath, ParserConfig config) 
            throws IOException {
        
        logger.info("Initializing parsing engine with configuration: {}", config.toString());
        
        ParsingEngine engine = new ParsingEngine(codebaseName, projectPath, config);
        return engine.parse();
    }

    /**
     * Parse with default configuration
     */
    public static ParseResult parseJavaProject(String codebaseName, String projectPath) throws IOException {
        return parseJavaProject(codebaseName, projectPath, ParserConfig.defaultConfig());
    }

    private static void validateInputs(String codebaseName, String inputDirectory, String outputFile) {
        // Validate codebase name
        if (!ValidationUtils.isValidCodebaseName(codebaseName)) {
            throw new IllegalArgumentException("Invalid codebase name: " + codebaseName);
        }

        // Validate input directory
        Path inputPath = Paths.get(inputDirectory);
        if (!Files.exists(inputPath)) {
            throw new IllegalArgumentException("Input directory does not exist: " + inputDirectory);
        }
        if (!Files.isDirectory(inputPath)) {
            throw new IllegalArgumentException("Input path is not a directory: " + inputDirectory);
        }

        // Validate output file path
        Path outputPath = Paths.get(outputFile);
        Path outputDir = outputPath.getParent();
        if (outputDir != null && !Files.exists(outputDir)) {
            try {
                Files.createDirectories(outputDir);
            } catch (IOException e) {
                throw new IllegalArgumentException("Cannot create output directory: " + outputDir, e);
            }
        }
    }

    private static ParserConfig loadConfiguration(String configFile) throws IOException {
        if (configFile == null) {
            logger.info("Using default configuration");
            return ParserConfig.defaultConfig();
        }

        Path configPath = Paths.get(configFile);
        if (!Files.exists(configPath)) {
            throw new IllegalArgumentException("Configuration file does not exist: " + configFile);
        }

        logger.info("Loading configuration from: {}", configFile);
        return objectMapper.readValue(configPath.toFile(), ParserConfig.class);
    }

    private static void writeResult(ParseResult result, String outputFile) throws IOException {
        File output = new File(outputFile);
        objectMapper.writeValue(output, result);
        
        long fileSizeBytes = output.length();
        String fileSize = formatFileSize(fileSizeBytes);
        logger.info("Parse result written to: {} ({})", outputFile, fileSize);
    }

    private static void logSummary(ParseResult result, Duration duration) {
        logger.info("=== Parsing Summary ===");
        logger.info("Duration: {} ms", duration.toMillis());
        logger.info("Files processed: {}", result.getFiles().size());
        logger.info("Classes found: {}", result.getClasses().size());
        logger.info("Interfaces found: {}", result.getInterfaces().size());
        logger.info("Methods found: {}", result.getMethods().size());
        logger.info("Dependencies found: {}", result.getDependencies().size());
        logger.info("Relationships found: {}", result.getRelationships().size());
        logger.info("API endpoints found: {}", result.getApiEndpoints().size());
        logger.info("Test cases found: {}", result.getTestCases().size());
        
        if (result.getMetadata() != null && result.getMetadata().getStatistics() != null) {
            var stats = result.getMetadata().getStatistics();
            logger.info("Total lines of code: {}", stats.getTotalLines());
            logger.info("Total cyclomatic complexity: {}", stats.getComplexity());
        }
        
        logger.info("======================");
    }

    private static String formatFileSize(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format("%.1f KB", bytes / 1024.0);
        if (bytes < 1024 * 1024 * 1024) return String.format("%.1f MB", bytes / (1024.0 * 1024.0));
        return String.format("%.1f GB", bytes / (1024.0 * 1024.0 * 1024.0));
    }

    private static void printUsage() {
        System.err.println("Spoon Parser v2 - Advanced Java Code Analysis Tool");
        System.err.println();
        System.err.println("Usage: java -jar spoon-parser-v2.jar <codebase-name> <input-directory> <output-file> [config-file]");
        System.err.println();
        System.err.println("Arguments:");
        System.err.println("  codebase-name    : Unique identifier for this codebase (e.g., 'user-service', 'payment-api')");
        System.err.println("  input-directory  : Path to the Java project to parse");
        System.err.println("  output-file      : Path where the JSON output will be written");
        System.err.println("  config-file      : Optional path to configuration file (JSON format)");
        System.err.println();
        System.err.println("Examples:");
        System.err.println("  java -jar spoon-parser-v2.jar my-service ./src/main/java output.json");
        System.err.println("  java -jar spoon-parser-v2.jar my-service ./project result.json config.json");
        System.err.println();
        System.err.println("Features:");
        System.err.println("  - Comprehensive Java code analysis");
        System.err.println("  - Framework detection (Spring Boot, etc.)");
        System.err.println("  - Call graph generation");
        System.err.println("  - Dependency extraction");
        System.err.println("  - Memory-efficient processing");
        System.err.println("  - Full deduplication");
    }
}
