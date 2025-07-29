package com.tekcode.parser.visitor;

import com.tekcode.parser.model.ClassNode;
import com.tekcode.parser.model.DecoratorInfo;
import com.tekcode.parser.model.ParseResult;
import com.tekcode.parser.model.Relationship;
import spoon.reflect.declaration.CtClass;
import spoon.reflect.declaration.CtType;
import spoon.reflect.declaration.ModifierKind;
import spoon.reflect.declaration.CtAnnotation;
import spoon.reflect.reference.CtTypeReference;
import spoon.reflect.visitor.CtAbstractVisitor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.ArrayList;
import java.util.List;
import com.tekcode.parser.util.PathUtils;

public class ClassVisitor extends CtAbstractVisitor {
    private static final Logger logger = LoggerFactory.getLogger(ClassVisitor.class);
    private final ParseResult result;
    private final String codebaseName;
    private final String projectPath;

    public ClassVisitor(ParseResult result, String codebaseName, String projectPath) {
        this.result = result;
        this.codebaseName = codebaseName;
        this.projectPath = projectPath;
    }

    @Override
    public <T> void visitCtClass(CtClass<T> ctClass) {
        try {
            ClassNode classNode = new ClassNode();
            
            // Basic properties
            classNode.setName(ctClass.getSimpleName());
            classNode.setFullyQualifiedName(ctClass.getQualifiedName());
            classNode.setId(codebaseName + ":" + ctClass.getQualifiedName());
            
            // Comments
            if (ctClass.getDocComment() != null) {
                classNode.setComment(ctClass.getDocComment());
            }
            
            // Modifiers
            classNode.setVisibility(getVisibility(ctClass));
            classNode.setAbstract(ctClass.hasModifier(ModifierKind.ABSTRACT));
            classNode.setFinal(ctClass.hasModifier(ModifierKind.FINAL));
            classNode.setStatic(ctClass.hasModifier(ModifierKind.STATIC));
            
            // Position information
            if (ctClass.getPosition() != null) {
                classNode.setFilePath(PathUtils.toRelativePath(ctClass.getPosition().getFile().getAbsolutePath(), projectPath));
                classNode.setStartLine(ctClass.getPosition().getLine());
                classNode.setEndLine(ctClass.getPosition().getEndLine());
            }
            
            // Extract annotations/decorators
            List<DecoratorInfo> decorators = extractDecorators(ctClass);
            classNode.setDecorators(decorators);
            
            // Create ANNOTATED_WITH relationships
            for (DecoratorInfo decorator : decorators) {
                Relationship annotatedWith = new Relationship(
                    "ANNOTATED_WITH",
                    "Class",
                    classNode.getId(),
                    "Annotation",
                    codebaseName + ":annotation:" + decorator.getName()
                );
                result.addRelationship(annotatedWith);
            }
            
            result.addClass(classNode);
            
            // Create relationships
            createClassRelationships(ctClass, classNode);
            
            // Process inner classes
            processInnerClasses(ctClass, classNode);
            
        } catch (Exception e) {
            logger.error("Error processing class: " + ctClass.getQualifiedName(), e);
        }
        
        super.visitCtClass(ctClass);
    }

    private void createClassRelationships(CtClass<?> ctClass, ClassNode classNode) {
        // Check if this is an inner class
        CtType<?> declaringType = ctClass.getDeclaringType();
        
        if (declaringType != null) {
            // This is an inner class - create HAS_INNER_CLASS relationship
            Relationship innerClassRel = new Relationship(
                "HAS_INNER_CLASS",
                "Class",
                codebaseName + ":" + declaringType.getQualifiedName(),
                "Class",
                codebaseName + ":" + classNode.getFullyQualifiedName()
            );
            result.addRelationship(innerClassRel);
        }
        
        // DEFINES_CLASS relationship (File -> Class)
        if (ctClass.getPosition() != null && ctClass.getPosition().getFile() != null) {
            Relationship relationship = new Relationship(
                "DEFINES_CLASS",
                "File",
                codebaseName + ":" + PathUtils.toRelativePath(ctClass.getPosition().getFile().getAbsolutePath(), projectPath),
                "Class",
                codebaseName + ":" + classNode.getFullyQualifiedName()
            );
            result.addRelationship(relationship);
        }
        
        // EXTENDS relationship
        CtTypeReference<?> superClass = ctClass.getSuperclass();
        if (superClass != null && !superClass.getQualifiedName().equals("java.lang.Object")) {
            Relationship relationship = new Relationship(
                "EXTENDS",
                "Class",
                codebaseName + ":" + classNode.getFullyQualifiedName(),
                "Class",
                codebaseName + ":" + superClass.getQualifiedName()
            );
            result.addRelationship(relationship);
        }
        
        // IMPLEMENTS relationships
        for (CtTypeReference<?> interfaceRef : ctClass.getSuperInterfaces()) {
            Relationship relationship = new Relationship(
                "IMPLEMENTS",
                "Class",
                codebaseName + ":" + classNode.getFullyQualifiedName(),
                "Interface",
                codebaseName + ":" + interfaceRef.getQualifiedName()
            );
            result.addRelationship(relationship);
        }
    }
    
    private void processInnerClasses(CtClass<?> outerClass, ClassNode outerClassNode) {
        try {
            // Get all nested types (inner classes, static nested classes, enums, interfaces)
            for (CtType<?> nestedType : outerClass.getNestedTypes()) {
                if (nestedType instanceof CtClass) {
                    CtClass<?> innerClass = (CtClass<?>) nestedType;
                    
                    // Create ClassNode for inner class
                    ClassNode innerClassNode = createInnerClassNode(innerClass);
                    result.addClass(innerClassNode);
                    
                    // Create HAS_INNER_CLASS relationship
                    Relationship hasInnerClassRel = new Relationship(
                        "HAS_INNER_CLASS",
                        "Class",
                        outerClassNode.getId(),
                        "Class",
                        innerClassNode.getId()
                    );
                    result.addRelationship(hasInnerClassRel);
                    
                    // Create other relationships for the inner class
                    createInnerClassRelationships(innerClass, innerClassNode);
                    
                    // Recursively process nested inner classes
                    processInnerClasses(innerClass, innerClassNode);
                }
            }
        } catch (Exception e) {
            logger.warn("Error processing inner classes for {}: {}", outerClass.getQualifiedName(), e.getMessage());
        }
    }
    
    private ClassNode createInnerClassNode(CtClass<?> innerClass) {
        ClassNode classNode = new ClassNode();
        
        // Basic properties
        classNode.setName(innerClass.getSimpleName());
        classNode.setFullyQualifiedName(innerClass.getQualifiedName());
        classNode.setId(codebaseName + ":" + innerClass.getQualifiedName());
        
        // Comments
        if (innerClass.getDocComment() != null) {
            classNode.setComment(innerClass.getDocComment());
        }
        
        // Modifiers
        classNode.setVisibility(getVisibility(innerClass));
        classNode.setAbstract(innerClass.hasModifier(ModifierKind.ABSTRACT));
        classNode.setFinal(innerClass.hasModifier(ModifierKind.FINAL));
        classNode.setStatic(innerClass.hasModifier(ModifierKind.STATIC));
        
        // Position information
        if (innerClass.getPosition() != null) {
            classNode.setFilePath(PathUtils.toRelativePath(innerClass.getPosition().getFile().getAbsolutePath(), projectPath));
            classNode.setStartLine(innerClass.getPosition().getLine());
            classNode.setEndLine(innerClass.getPosition().getEndLine());
        }
        
        // Extract annotations/decorators
        List<DecoratorInfo> decorators = extractDecorators(innerClass);
        classNode.setDecorators(decorators);
        
        // Create ANNOTATED_WITH relationships
        for (DecoratorInfo decorator : decorators) {
            Relationship annotatedWith = new Relationship(
                "ANNOTATED_WITH",
                "Class",
                classNode.getId(),
                "Annotation",
                codebaseName + ":annotation:" + decorator.getName()
            );
            result.addRelationship(annotatedWith);
        }
        
        return classNode;
    }
    
    private void createInnerClassRelationships(CtClass<?> innerClass, ClassNode innerClassNode) {
        // DEFINES_CLASS relationship (File -> Class) - inner classes are also defined in files
        if (innerClass.getPosition() != null && innerClass.getPosition().getFile() != null) {
            Relationship relationship = new Relationship(
                "DEFINES_CLASS",
                "File",
                codebaseName + ":" + PathUtils.toRelativePath(innerClass.getPosition().getFile().getAbsolutePath(), projectPath),
                "Class",
                innerClassNode.getId()
            );
            result.addRelationship(relationship);
        }
        
        // EXTENDS relationship
        CtTypeReference<?> superClass = innerClass.getSuperclass();
        if (superClass != null && !superClass.getQualifiedName().equals("java.lang.Object")) {
            Relationship relationship = new Relationship(
                "EXTENDS",
                "Class",
                innerClassNode.getId(),
                "Class",
                codebaseName + ":" + superClass.getQualifiedName()
            );
            result.addRelationship(relationship);
        }
        
        // IMPLEMENTS relationships
        for (CtTypeReference<?> interfaceRef : innerClass.getSuperInterfaces()) {
            Relationship relationship = new Relationship(
                "IMPLEMENTS",
                "Class",
                innerClassNode.getId(),
                "Interface",
                codebaseName + ":" + interfaceRef.getQualifiedName()
            );
            result.addRelationship(relationship);
        }
    }

    private String getVisibility(CtType<?> type) {
        if (type.hasModifier(ModifierKind.PUBLIC)) return "public";
        if (type.hasModifier(ModifierKind.PROTECTED)) return "protected";
        if (type.hasModifier(ModifierKind.PRIVATE)) return "private";
        return "package";
    }
    
    private List<DecoratorInfo> extractDecorators(CtClass<?> ctClass) {
        List<DecoratorInfo> decorators = new ArrayList<>();
        
        for (CtAnnotation<?> annotation : ctClass.getAnnotations()) {
            try {
                DecoratorInfo decorator = new DecoratorInfo();
                decorator.setName(annotation.getAnnotationType().getSimpleName());
                
                // Extract annotation values if any
                if (!annotation.getValues().isEmpty()) {
                    List<Object> arguments = new ArrayList<>();
                    annotation.getValues().forEach((key, value) -> {
                        arguments.add(value.toString());
                    });
                    decorator.setArguments(arguments);
                }
                
                decorators.add(decorator);
                
            } catch (Exception e) {
                logger.warn("Error extracting annotation: " + annotation.toString(), e);
            }
        }
        
        return decorators;
    }
}