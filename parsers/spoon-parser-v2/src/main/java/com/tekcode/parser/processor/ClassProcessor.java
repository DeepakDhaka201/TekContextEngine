package com.tekcode.parser.processor;

import com.tekcode.parser.core.ParsingContext;
import com.tekcode.parser.model.ClassNode;
import com.tekcode.parser.model.DecoratorInfo;
import com.tekcode.parser.model.FieldNode;
import com.tekcode.parser.util.IdGenerator;
import com.tekcode.parser.util.PathUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import spoon.reflect.declaration.CtClass;
import spoon.reflect.declaration.CtAnnotation;
import spoon.reflect.declaration.CtEnum;
import spoon.reflect.declaration.CtExecutable;
import spoon.reflect.declaration.CtField;
import spoon.reflect.declaration.CtType;
import spoon.reflect.declaration.ModifierKind;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Processor for extracting class-level information
 */
public class ClassProcessor {
    private static final Logger logger = LoggerFactory.getLogger(ClassProcessor.class);
    
    private final ParsingContext context;
    
    public ClassProcessor(ParsingContext context) {
        this.context = context;
    }
    
    /**
     * Processes a class and extracts comprehensive information
     * 
     * @param ctClass the class to process
     * @return ClassNode or null if processing fails
     */
    public ClassNode processClass(CtClass<?> ctClass) {
        try {
            if (!shouldIncludeClass(ctClass)) {
                return null;
            }
            
            ClassNode classNode = new ClassNode();
            
            // Basic information
            classNode.setName(ctClass.getSimpleName());
            classNode.setFullyQualifiedName(ctClass.getQualifiedName());
            classNode.setId(IdGenerator.generateClassId(context.getCodebaseName(), ctClass.getQualifiedName()));
            
            // Comments and documentation
            if (context.shouldIncludeComments() && ctClass.getDocComment() != null) {
                classNode.setComment(ctClass.getDocComment());
            }
            
            // Modifiers and characteristics
            extractModifiers(classNode, ctClass);
            
            // Position information
            extractPositionInfo(classNode, ctClass);
            
            // Annotations/Decorators
            List<DecoratorInfo> decorators = new ArrayList<>();
            if (context.shouldExtractAnnotations()) {
                decorators = extractDecorators(ctClass);
            }
            classNode.setDecorators(decorators);
            
            // Framework-specific analysis
            analyzeFrameworkSpecificFeatures(classNode, ctClass);
            
            // Generic type information
            extractGenericInfo(classNode, ctClass);
            
            // Note: Fields will be processed by ParsingEngine

            // Field count and other metrics
            extractMetrics(classNode, ctClass);
            
            logger.debug("Processed class: {}", ctClass.getQualifiedName());
            return classNode;
            
        } catch (Exception e) {
            logger.error("Error processing class: {}", ctClass.getQualifiedName(), e);
            context.incrementErrorCount();
            return null;
        }
    }
    
    /**
     * Determines if a class should be included based on configuration
     */
    private boolean shouldIncludeClass(CtClass<?> ctClass) {
        // Skip enums - they should be processed by EnumProcessor
        if (ctClass instanceof CtEnum) {
            return false;
        }

        // Check visibility
        if (!context.shouldIncludePrivateMembers() && ctClass.isPrivate()) {
            return false;
        }

        // Check package filters
        String packageName = ctClass.getPackage() != null ? ctClass.getPackage().getQualifiedName() : "";

        // Check exclude packages
        for (String excludePackage : context.getConfig().getExcludePackages()) {
            if (packageName.startsWith(excludePackage)) {
                return false;
            }
        }

        // Check include packages (if specified)
        if (!context.getConfig().getIncludePackages().isEmpty()) {
            boolean matches = false;
            for (String includePackage : context.getConfig().getIncludePackages()) {
                if (packageName.startsWith(includePackage)) {
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
     * Extracts modifier information from the class
     */
    private void extractModifiers(ClassNode classNode, CtClass<?> ctClass) {
        // Visibility
        if (ctClass.isPublic()) {
            classNode.setVisibility("public");
        } else if (ctClass.isProtected()) {
            classNode.setVisibility("protected");
        } else if (ctClass.isPrivate()) {
            classNode.setVisibility("private");
        } else {
            classNode.setVisibility("package");
        }
        
        // Other modifiers
        classNode.setAbstract(ctClass.hasModifier(ModifierKind.ABSTRACT));
        classNode.setFinal(ctClass.hasModifier(ModifierKind.FINAL));
        classNode.setStatic(ctClass.hasModifier(ModifierKind.STATIC));

        // Inner class detection
        classNode.setInnerClass(ctClass.isTopLevel() == false);
        classNode.setAnonymous(ctClass.isAnonymous());
        classNode.setLocal(ctClass.isLocalType());

        // Enclosing context for inner classes
        if (!ctClass.isTopLevel()) {
            extractEnclosingContext(classNode, ctClass);
        }
    }
    
    /**
     * Extracts position information (file path, line numbers)
     */
    private void extractPositionInfo(ClassNode classNode, CtClass<?> ctClass) {
        if (ctClass.getPosition() != null && ctClass.getPosition().isValidPosition()) {
            var position = ctClass.getPosition();
            
            if (position.getFile() != null) {
                String filePath = PathUtils.toRelativePath(
                    position.getFile().getAbsolutePath(), 
                    context.getProjectPath()
                );
                classNode.setFilePath(filePath);
            }
            
            classNode.setStartLine(position.getLine());
            classNode.setEndLine(position.getEndLine());
        }
    }
    
    /**
     * Extracts annotation/decorator information
     */
    private List<DecoratorInfo> extractDecorators(CtClass<?> ctClass) {
        List<DecoratorInfo> decorators = new ArrayList<>();
        
        for (CtAnnotation<?> annotation : ctClass.getAnnotations()) {
            try {
                DecoratorInfo decorator = new DecoratorInfo();
                decorator.setName(annotation.getAnnotationType().getSimpleName());
                decorator.setFullyQualifiedName(annotation.getAnnotationType().getQualifiedName());
                
                // Extract annotation values
                Map<String, Object> properties = new HashMap<>();
                annotation.getValues().forEach((key, value) -> {
                    properties.put(key, value != null ? value.toString() : null);
                });
                decorator.setProperties(properties);
                
                decorators.add(decorator);
                
            } catch (Exception e) {
                logger.warn("Error extracting annotation: {}", annotation, e);
            }
        }
        
        return decorators;
    }
    
    /**
     * Analyzes framework-specific features
     */
    private void analyzeFrameworkSpecificFeatures(ClassNode classNode, CtClass<?> ctClass) {
        // Spring Boot analysis
        if (context.isSpringBootProject()) {
            analyzeSpringBootFeatures(classNode, ctClass);
        }
        
        // Test framework analysis
        if (context.isTestFrameworkProject()) {
            analyzeTestFeatures(classNode, ctClass);
        }
    }
    
    /**
     * Analyzes Spring Boot specific features
     */
    private void analyzeSpringBootFeatures(ClassNode classNode, CtClass<?> ctClass) {
        for (CtAnnotation<?> annotation : ctClass.getAnnotations()) {
            String annotationName = annotation.getAnnotationType().getSimpleName();
            
            switch (annotationName) {
                case "Controller":
                case "RestController":
                    classNode.setController(true);
                    break;
                case "Service":
                    classNode.setService(true);
                    break;
                case "Repository":
                    classNode.setRepository(true);
                    break;
                case "Component":
                    classNode.setComponent(true);
                    break;
                case "Configuration":
                    classNode.setConfiguration(true);
                    break;
                case "Entity":
                    classNode.setEntity(true);
                    break;
            }
        }
    }
    
    /**
     * Analyzes test-related features
     */
    private void analyzeTestFeatures(ClassNode classNode, CtClass<?> ctClass) {
        // Check if this is a test class
        String className = ctClass.getSimpleName().toLowerCase();
        if (className.contains("test") || className.endsWith("tests")) {
            classNode.setTestClass(true);
        }

        // Check for test annotations
        for (CtAnnotation<?> annotation : ctClass.getAnnotations()) {
            String annotationName = annotation.getAnnotationType().getSimpleName();
            if ("TestInstance".equals(annotationName) ||
                "ExtendWith".equals(annotationName) ||
                "RunWith".equals(annotationName)) {
                classNode.setTestClass(true);
                break;
            }
        }
    }
    
    /**
     * Extracts generic type information
     */
    private void extractGenericInfo(ClassNode classNode, CtClass<?> ctClass) {
        if (!ctClass.getFormalCtTypeParameters().isEmpty()) {
            classNode.setGeneric(true);
            
            List<String> typeParameters = new ArrayList<>();
            ctClass.getFormalCtTypeParameters().forEach(param -> {
                typeParameters.add(param.getSimpleName());
            });
            classNode.setGenericTypeParameters(typeParameters);
        }
    }
    
    /**
     * Extracts various metrics about the class
     */
    private void extractMetrics(ClassNode classNode, CtClass<?> ctClass) {
        // Count fields
        int fieldCount = 0;
        int staticFieldCount = 0;
        
        for (CtField<?> field : ctClass.getFields()) {
            fieldCount++;
            if (field.hasModifier(ModifierKind.STATIC)) {
                staticFieldCount++;
            }
        }
        
        // Field counting removed - not needed for LLM context
    }

    /**
     * Process fields in the class and return them
     */
    public List<FieldNode> processFields(CtClass<?> ctClass) {
        List<FieldNode> fields = new ArrayList<>();
        for (CtField<?> field : ctClass.getFields()) {
            try {
                FieldNode fieldNode = createFieldNode(field, ctClass);
                if (fieldNode != null) {
                    fields.add(fieldNode);
                }
            } catch (Exception e) {
                logger.error("Error processing field: {} in class: {}", field.getSimpleName(), ctClass.getQualifiedName(), e);
            }
        }
        return fields;
    }

    /**
     * Create a FieldNode from a CtField
     */
    private FieldNode createFieldNode(CtField<?> field, CtClass<?> parentClass) {
        FieldNode fieldNode = new FieldNode();

        // Generate ID
        String fieldId = IdGenerator.generateFieldId(
            context.getCodebaseName(),
            parentClass.getQualifiedName(),
            field.getSimpleName()
        );
        fieldNode.setId(fieldId);

        // Basic information
        fieldNode.setName(field.getSimpleName());
        fieldNode.setType(field.getType().getQualifiedName());

        // Visibility
        if (field.hasModifier(ModifierKind.PUBLIC)) {
            fieldNode.setVisibility("public");
        } else if (field.hasModifier(ModifierKind.PROTECTED)) {
            fieldNode.setVisibility("protected");
        } else if (field.hasModifier(ModifierKind.PRIVATE)) {
            fieldNode.setVisibility("private");
        } else {
            fieldNode.setVisibility("package");
        }

        // Modifiers
        fieldNode.setStatic(field.hasModifier(ModifierKind.STATIC));
        fieldNode.setFinal(field.hasModifier(ModifierKind.FINAL));

        // Annotations/Decorators
        List<DecoratorInfo> decorators = new ArrayList<>();
        if (context.shouldExtractAnnotations()) {
            for (CtAnnotation<?> annotation : field.getAnnotations()) {
                try {
                    DecoratorInfo decorator = new DecoratorInfo();
                    decorator.setName(annotation.getAnnotationType().getSimpleName());
                    decorator.setFullyQualifiedName(annotation.getAnnotationType().getQualifiedName());

                    // Extract annotation values
                    Map<String, Object> properties = new HashMap<>();
                    annotation.getValues().forEach((key, value) -> {
                        properties.put(key, value != null ? value.toString() : null);
                    });
                    decorator.setProperties(properties);

                    decorators.add(decorator);

                } catch (Exception e) {
                    logger.warn("Error extracting field annotation: {}", annotation, e);
                }
            }
        }
        fieldNode.setDecorators(decorators);

        return fieldNode;
    }
    


    /**
     * Extracts enclosing context for inner/nested classes
     */
    private void extractEnclosingContext(ClassNode classNode, CtClass<?> ctClass) {
        try {
            // Find enclosing class
            CtType<?> enclosingType = ctClass.getDeclaringType();
            if (enclosingType instanceof CtClass) {
                CtClass<?> enclosingClass = (CtClass<?>) enclosingType;
            if (enclosingClass != null) {
                String enclosingClassId = IdGenerator.generateClassId(
                    context.getCodebaseName(),
                    enclosingClass.getQualifiedName()
                );
                classNode.setEnclosingClassId(enclosingClassId);

                // Nesting level calculation removed - not needed for LLM context

                // Create HAS_INNER_CLASS relationship (Outer Class -> Inner Class)
                // Note: This will be added to the result when the class is processed by ParsingEngine
            }

            // For local classes, find enclosing method
            if (ctClass.isLocalType()) {
                // Note: Finding enclosing method for local classes requires more complex analysis
                // This is a simplified implementation
            }
            }

        } catch (Exception e) {
            logger.warn("Error extracting enclosing context for class: {}", ctClass.getQualifiedName(), e);
        }
    }


}
