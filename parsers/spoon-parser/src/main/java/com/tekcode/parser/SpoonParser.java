package com.tekcode.parser;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.tekcode.parser.model.*;
import com.tekcode.parser.visitor.*;
import com.tekcode.parser.visitor.TypeUsageVisitor;
import com.tekcode.parser.framework.FrameworkDetector;
import com.tekcode.parser.framework.SpringBootAnalyzer;
import spoon.Launcher;
import spoon.reflect.CtModel;
import spoon.reflect.declaration.CtCompilationUnit;
import spoon.reflect.declaration.CtClass;
import spoon.reflect.declaration.CtType;
import spoon.reflect.declaration.CtMethod;
import spoon.reflect.declaration.CtConstructor;
import spoon.reflect.declaration.CtInterface;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Set;
import java.util.List;

public class SpoonParser {
    private static final Logger logger = LoggerFactory.getLogger(SpoonParser.class);
    private static final ObjectMapper objectMapper = new ObjectMapper()
            .enable(SerializationFeature.INDENT_OUTPUT);

    public static void main(String[] args) {
        if (args.length != 3) {
            System.err.println("Usage: java -jar spoon-parser.jar <codebase-name> <input-directory> <output-file>");
            System.err.println("  codebase-name: Unique identifier for this codebase (e.g., 'user-service', 'payment-api')");
            System.err.println("  input-directory: Path to the Java project to parse");
            System.err.println("  output-file: Path where the JSON output will be written");
            System.exit(1);
        }

        String codebaseName = args[0];
        String inputDir = args[1];
        String outputFile = args[2];

        try {
            logger.info("Starting Spoon parser for codebase: {} in directory: {}", codebaseName, inputDir);
            
            ParseResult result = parseJavaProject(codebaseName, inputDir);
            
            // Write result to output file
            objectMapper.writeValue(new File(outputFile), result);
            
            logger.info("Successfully parsed {} files, {} classes, {} methods", 
                result.getFiles().size(), 
                result.getClasses().size(), 
                result.getMethods().size());
            
        } catch (IOException e) {
            logger.error("IO error while parsing Java project: {}", e.getMessage(), e);
            System.err.println("Error: Unable to read/write files - " + e.getMessage());
            System.exit(1);
        } catch (Exception e) {
            logger.error("Unexpected error parsing Java project: {}", e.getMessage(), e);
            System.err.println("Error: " + e.getMessage());
            System.exit(1);
        }
    }

    public static ParseResult parseJavaProject(String codebaseName, String projectPath) throws IOException {
        long startTime = System.currentTimeMillis();
        ParseResult result = new ParseResult();
        
        // Validate project path
        Path projectDir = Paths.get(projectPath);
        if (!Files.exists(projectDir)) {
            throw new IOException("Project directory does not exist: " + projectPath);
        }
        if (!Files.isDirectory(projectDir)) {
            throw new IOException("Path is not a directory: " + projectPath);
        }
        
        // Detect frameworks (single scan)
        FrameworkDetector frameworkDetector = new FrameworkDetector();
        Set<FrameworkDetector.Framework> detectedFrameworks = frameworkDetector.detectFrameworks(projectPath);
        FrameworkDetector.Framework primaryFramework = frameworkDetector.getPrimaryFramework(detectedFrameworks);
        
        logger.info("Detected frameworks: {}", detectedFrameworks.stream()
            .map(FrameworkDetector.Framework::getName)
            .collect(java.util.stream.Collectors.joining(", ")));
        logger.info("Primary framework: {}", primaryFramework.getName());
        
        // Initialize metadata
        MetadataNode metadata = new MetadataNode();
        metadata.setCodebaseName(codebaseName);
        metadata.setFramework(primaryFramework.getName());
        metadata.setDetectedFrameworks(detectedFrameworks.stream()
            .map(FrameworkDetector.Framework::getName)
            .collect(java.util.stream.Collectors.toList()));
        metadata.setVersion("1.0.0");
        metadata.setParseTime(java.time.Instant.now().toString());
        result.setMetadata(metadata);
        
        // Set codebase name in result for use by visitors
        result.setCodebaseName(codebaseName);
        
        // Configure Spoon
        Launcher launcher = new Launcher();
        launcher.addInputResource(projectPath);
        launcher.getEnvironment().setNoClasspath(true);
        launcher.getEnvironment().setCommentEnabled(true);
        launcher.getEnvironment().setShouldCompile(false);
        launcher.getEnvironment().setIgnoreDuplicateDeclarations(true);
        launcher.getEnvironment().setLevel("ERROR");
        
        // Build the model
        CtModel model = launcher.buildModel();
        
        logger.info("Spoon model built successfully. Found {} types in {} packages", 
            model.getAllTypes().size(), model.getAllPackages().size());
        
        // Process files - iterate through compilation units directly
        FileVisitor fileVisitor = new FileVisitor(result, codebaseName, projectPath);
        for (CtType<?> type : model.getAllTypes()) {
            if (type.getPosition() != null && type.getPosition().getCompilationUnit() != null) {
                type.getPosition().getCompilationUnit().accept(fileVisitor);
            }
        }
        
        // Process classes - iterate through all types
        ClassVisitor classVisitor = new ClassVisitor(result, codebaseName, projectPath);
        for (CtType<?> type : model.getAllTypes()) {
            if (type instanceof CtClass) {
                classVisitor.visitCtClass((CtClass<?>) type);
            }
        }
        
        // Process methods - iterate through methods directly  
        MethodVisitor methodVisitor = new MethodVisitor(result, codebaseName, projectPath);
        for (CtType<?> type : model.getAllTypes()) {
            if (type instanceof CtClass) {
                CtClass<?> clazz = (CtClass<?>) type;
                for (CtMethod<?> method : clazz.getMethods()) {
                    methodVisitor.visitCtMethod(method);
                }
                for (CtConstructor<?> constructor : clazz.getConstructors()) {
                    methodVisitor.visitCtConstructor(constructor);
                }
            }
        }
        
        // Process interfaces
        InterfaceVisitor interfaceVisitor = new InterfaceVisitor(result, codebaseName, projectPath);
        for (CtType<?> type : model.getAllTypes()) {
            if (type instanceof CtInterface) {
                interfaceVisitor.visitCtInterface((CtInterface<?>) type);
            }
        }
        
        // Process method calls and type usage - traverse all elements recursively
        CallGraphVisitor callGraphVisitor = new CallGraphVisitor(result, codebaseName);
        TypeUsageVisitor typeUsageVisitor = new TypeUsageVisitor(result, codebaseName);
        
        for (CtType<?> type : model.getAllTypes()) {
            if (type instanceof CtClass) {
                CtClass<?> clazz = (CtClass<?>) type;
                // Visit all methods for call graph and type usage
                for (CtMethod<?> method : clazz.getMethods()) {
                    method.accept(callGraphVisitor);
                    method.accept(typeUsageVisitor);
                }
                for (CtConstructor<?> constructor : clazz.getConstructors()) {
                    constructor.accept(callGraphVisitor);
                    constructor.accept(typeUsageVisitor);
                }
            }
        }
        
        // Process dependencies
        DependencyVisitor dependencyVisitor = new DependencyVisitor(result, projectPath, codebaseName);
        dependencyVisitor.extractDependencies();
        
        // Process documentation files
        DocumentVisitor documentVisitor = new DocumentVisitor(result, codebaseName, projectPath);
        documentVisitor.visitDocuments();
        
        // Framework-specific analysis
        if (detectedFrameworks.contains(FrameworkDetector.Framework.SPRING_BOOT)) {
            logger.info("Performing Spring Boot analysis...");
            SpringBootAnalyzer springAnalyzer = new SpringBootAnalyzer(codebaseName, projectPath);
            springAnalyzer.analyzeSpringBootSpecifics(result);
        }
        
        // Calculate statistics
        StatisticsNode statistics = new StatisticsNode();
        statistics.setTotalFiles(result.getFiles().size());
        statistics.setTotalLines(result.getFiles().stream()
            .mapToInt(FileNode::getLineCount)
            .sum());
        statistics.setComplexity(result.getMethods().stream()
            .mapToInt(MethodNode::getCyclomaticComplexity)
            .sum());
        metadata.setStatistics(statistics);
        
        long endTime = System.currentTimeMillis();
        logger.info("Parsing completed in {} ms", endTime - startTime);
        
        return result;
    }
}