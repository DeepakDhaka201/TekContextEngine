package com.tekcode.parser.core;

import com.tekcode.parser.config.ParserConfig;
import com.tekcode.parser.model.*;
import com.tekcode.parser.processor.*;
import com.tekcode.parser.util.IdGenerator;
import com.tekcode.parser.util.PathUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import spoon.Launcher;
import spoon.reflect.CtModel;
import spoon.reflect.declaration.CtCompilationUnit;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Core parsing engine that orchestrates the entire parsing process
 * 
 * Features:
 * - Single-pass processing architecture
 * - Comprehensive deduplication
 * - Memory-efficient processing
 * - Progress reporting
 * - Error handling and recovery
 */
public class ParsingEngine {
    private static final Logger logger = LoggerFactory.getLogger(ParsingEngine.class);
    
    private final String codebaseName;
    private final String projectPath;
    private final ParserConfig config;
    private final ParseResult result;
    private final ParsingContext context;
    
    // Processors
    private final FileProcessor fileProcessor;
    private final ClassProcessor classProcessor;
    private final MethodProcessor methodProcessor;
    private final InterfaceProcessor interfaceProcessor;
    private final RelationshipProcessor relationshipProcessor;
    private final DependencyProcessor dependencyProcessor;
    private final FrameworkProcessor frameworkProcessor;
    
    // Deduplication sets
    private final Set<String> processedFiles = ConcurrentHashMap.newKeySet();
    private final Set<String> processedClasses = ConcurrentHashMap.newKeySet();
    private final Set<String> processedMethods = ConcurrentHashMap.newKeySet();
    private final Set<String> processedInterfaces = ConcurrentHashMap.newKeySet();
    
    public ParsingEngine(String codebaseName, String projectPath, ParserConfig config) {
        this.codebaseName = codebaseName;
        this.projectPath = projectPath;
        this.config = config;
        this.result = new ParseResult();
        this.context = new ParsingContext(codebaseName, projectPath, config);
        
        // Initialize processors
        this.fileProcessor = new FileProcessor(context);
        this.classProcessor = new ClassProcessor(context);
        this.methodProcessor = new MethodProcessor(context);
        this.interfaceProcessor = new InterfaceProcessor(context);
        this.relationshipProcessor = new RelationshipProcessor(context);
        this.dependencyProcessor = new DependencyProcessor(context);
        this.frameworkProcessor = new FrameworkProcessor(context);
        
        // Set codebase name in result
        result.setCodebaseName(codebaseName);
    }
    
    /**
     * Main parsing method that orchestrates the entire process
     */
    public ParseResult parse() throws IOException {
        logger.info("Starting parsing process for codebase: {}", codebaseName);
        Instant startTime = Instant.now();
        
        try {
            // Step 1: Validate project structure
            validateProject();
            
            // Step 2: Initialize metadata
            initializeMetadata();
            
            // Step 3: Build Spoon model
            CtModel model = buildSpoonModel();
            
            // Step 4: Extract dependencies first (needed for framework detection)
            if (config.isExtractDependencies()) {
                extractDependencies();
            }
            
            // Step 5: Detect frameworks
            if (config.isEnableFrameworkDetection()) {
                detectFrameworks();
            }
            
            // Step 6: Process compilation units (single pass)
            processCompilationUnits(model);
            
            // Step 7: Extract relationships
            if (shouldExtractRelationships()) {
                extractRelationships(model);
            }
            
            // Step 8: Finalize metadata and statistics
            finalizeMetadata(startTime);
            
            // Step 9: Validate output if requested
            if (config.isValidateOutput()) {
                validateOutput();
            }
            
            logger.info("Parsing completed successfully in {} ms", 
                       java.time.Duration.between(startTime, Instant.now()).toMillis());
            
            return result;
            
        } catch (Exception e) {
            logger.error("Parsing failed: {}", e.getMessage(), e);
            throw new IOException("Parsing failed: " + e.getMessage(), e);
        }
    }
    
    private void validateProject() throws IOException {
        Path projectDir = Paths.get(projectPath);
        if (!Files.exists(projectDir)) {
            throw new IOException("Project directory does not exist: " + projectPath);
        }
        if (!Files.isDirectory(projectDir)) {
            throw new IOException("Project path is not a directory: " + projectPath);
        }
        
        // Count Java files
        long javaFileCount = Files.walk(projectDir)
                .filter(Files::isRegularFile)
                .filter(path -> path.toString().endsWith(".java"))
                .count();
        
        if (javaFileCount == 0) {
            logger.warn("No Java files found in project directory: {}", projectPath);
        } else {
            logger.info("Found {} Java files to process", javaFileCount);
        }
    }
    
    private void initializeMetadata() {
        MetadataNode metadata = new MetadataNode();
        metadata.setCodebaseName(codebaseName);
        metadata.setVersion("2.0.0");
        metadata.setParseTime(Instant.now().toString());
        metadata.setParserVersion("spoon-parser-v2");
        
        result.setMetadata(metadata);
    }
    
    private CtModel buildSpoonModel() {
        logger.info("Building Spoon model for project: {}", projectPath);
        
        Launcher launcher = new Launcher();
        launcher.addInputResource(projectPath);
        
        // Configure Spoon environment
        launcher.getEnvironment().setNoClasspath(true);
        launcher.getEnvironment().setCommentEnabled(config.isIncludeComments());
        launcher.getEnvironment().setShouldCompile(false);
        launcher.getEnvironment().setIgnoreDuplicateDeclarations(true);
        launcher.getEnvironment().setLevel("ERROR");
        launcher.getEnvironment().setAutoImports(false);
        
        // Build the model
        CtModel model = launcher.buildModel();
        
        logger.info("Spoon model built successfully. Found {} types in {} packages", 
                   model.getAllTypes().size(), model.getAllPackages().size());
        
        return model;
    }
    
    private void extractDependencies() {
        logger.info("Extracting project dependencies");
        List<DependencyNode> dependencies = dependencyProcessor.extractDependencies();
        result.setDependencies(dependencies);
        logger.info("Found {} dependencies", dependencies.size());
    }
    
    private void detectFrameworks() {
        logger.info("Detecting frameworks");
        FrameworkInfo frameworkInfo = frameworkProcessor.detectFrameworks();
        
        // Update metadata with framework information
        MetadataNode metadata = result.getMetadata();
        metadata.setFramework(frameworkInfo.getPrimaryFramework());
        metadata.setDetectedFrameworks(frameworkInfo.getAllFrameworks());
        
        logger.info("Detected frameworks: {}", frameworkInfo.getAllFrameworks());
        logger.info("Primary framework: {}", frameworkInfo.getPrimaryFramework());
    }
    
    private void processCompilationUnits(CtModel model) {
        logger.info("Processing compilation units");
        
        // Get all compilation units (deduplicated)
        Set<CtCompilationUnit> compilationUnits = model.getAllTypes().stream()
                .filter(type -> type.getPosition() != null && type.getPosition().getCompilationUnit() != null)
                .map(type -> type.getPosition().getCompilationUnit())
                .collect(Collectors.toSet());
        
        logger.info("Found {} unique compilation units to process", compilationUnits.size());
        
        int processed = 0;
        for (CtCompilationUnit compilationUnit : compilationUnits) {
            try {
                processCompilationUnit(compilationUnit);
                processed++;
                
                if (config.isEnableProgressReporting() && processed % 10 == 0) {
                    logger.info("Processed {}/{} compilation units", processed, compilationUnits.size());
                }
                
            } catch (Exception e) {
                logger.error("Error processing compilation unit: {}", 
                           compilationUnit.getFile() != null ? compilationUnit.getFile().getName() : "unknown", e);
                
                if (config.isFailOnErrors()) {
                    throw new RuntimeException("Processing failed", e);
                }
            }
        }
        
        logger.info("Completed processing {} compilation units", processed);
    }
    
    private void processCompilationUnit(CtCompilationUnit compilationUnit) {
        // Process file information
        FileNode fileNode = fileProcessor.processFile(compilationUnit);
        if (fileNode != null && !processedFiles.contains(fileNode.getPath())) {
            result.addFile(fileNode);
            processedFiles.add(fileNode.getPath());
        }
        
        // Process all types in this compilation unit
        compilationUnit.getDeclaredTypes().forEach(type -> {
            try {
                if (type instanceof spoon.reflect.declaration.CtClass) {
                    processClass((spoon.reflect.declaration.CtClass<?>) type);
                } else if (type instanceof spoon.reflect.declaration.CtInterface) {
                    processInterface((spoon.reflect.declaration.CtInterface<?>) type);
                }
            } catch (Exception e) {
                logger.error("Error processing type: {}", type.getQualifiedName(), e);
            }
        });
    }
    
    private void processClass(spoon.reflect.declaration.CtClass<?> ctClass) {
        String classId = IdGenerator.generateClassId(codebaseName, ctClass.getQualifiedName());
        
        if (!processedClasses.contains(classId)) {
            ClassNode classNode = classProcessor.processClass(ctClass);
            if (classNode != null) {
                result.addClass(classNode);
                processedClasses.add(classId);
                
                // Process methods in this class
                ctClass.getMethods().forEach(method -> processMethod(method));
                ctClass.getConstructors().forEach(constructor -> processMethod(constructor));
            }
        }
    }
    
    private void processInterface(spoon.reflect.declaration.CtInterface<?> ctInterface) {
        String interfaceId = IdGenerator.generateInterfaceId(codebaseName, ctInterface.getQualifiedName());
        
        if (!processedInterfaces.contains(interfaceId)) {
            InterfaceNode interfaceNode = interfaceProcessor.processInterface(ctInterface);
            if (interfaceNode != null) {
                result.addInterface(interfaceNode);
                processedInterfaces.add(interfaceId);
                
                // Process methods in this interface
                ctInterface.getMethods().forEach(method -> processMethod(method));
            }
        }
    }
    
    private void processMethod(spoon.reflect.declaration.CtExecutable<?> executable) {
        String methodId = IdGenerator.generateMethodId(codebaseName, executable);
        
        if (!processedMethods.contains(methodId)) {
            MethodNode methodNode = methodProcessor.processMethod(executable);
            if (methodNode != null) {
                result.addMethod(methodNode);
                processedMethods.add(methodId);
                
                // Check if this is a test method
                if (methodProcessor.isTestMethod(executable)) {
                    TestCaseNode testCase = methodProcessor.createTestCase(executable);
                    if (testCase != null) {
                        result.addTestCase(testCase);
                    }
                }
            }
        }
    }
    
    private boolean shouldExtractRelationships() {
        return config.isExtractCallGraph() || 
               config.isExtractTypeUsage() || 
               config.isExtractInheritance() || 
               config.isExtractAnnotations() ||
               config.isExtractFieldRelationships();
    }
    
    private void extractRelationships(CtModel model) {
        logger.info("Extracting relationships");
        
        List<Relationship> relationships = relationshipProcessor.extractRelationships(model);
        result.setRelationships(relationships);
        
        logger.info("Extracted {} relationships", relationships.size());
    }
    
    private void finalizeMetadata(Instant startTime) {
        MetadataNode metadata = result.getMetadata();
        
        // Calculate statistics
        StatisticsNode statistics = new StatisticsNode();
        statistics.setTotalFiles(result.getFiles().size());
        statistics.setTotalLines(result.getFiles().stream()
                .mapToInt(FileNode::getLineCount)
                .sum());
        statistics.setComplexity(result.getMethods().stream()
                .mapToInt(MethodNode::getCyclomaticComplexity)
                .sum());
        statistics.setTotalClasses(result.getClasses().size());
        statistics.setTotalInterfaces(result.getInterfaces().size());
        statistics.setTotalMethods(result.getMethods().size());
        
        metadata.setStatistics(statistics);
        
        // Set parsing duration
        long durationMs = java.time.Duration.between(startTime, Instant.now()).toMillis();
        metadata.setParsingDurationMs(durationMs);
    }
    
    private void validateOutput() {
        logger.info("Validating output");
        
        // Basic validation checks
        if (result.getFiles().isEmpty()) {
            logger.warn("No files were processed");
        }
        
        if (result.getClasses().isEmpty() && result.getInterfaces().isEmpty()) {
            logger.warn("No classes or interfaces were found");
        }
        
        // Check for duplicate IDs
        Set<String> fileIds = new HashSet<>();
        for (FileNode file : result.getFiles()) {
            if (!fileIds.add(file.getPath())) {
                logger.error("Duplicate file path found: {}", file.getPath());
            }
        }
        
        Set<String> classIds = new HashSet<>();
        for (ClassNode clazz : result.getClasses()) {
            if (!classIds.add(clazz.getId())) {
                logger.error("Duplicate class ID found: {}", clazz.getId());
            }
        }
        
        logger.info("Output validation completed");
    }
}
