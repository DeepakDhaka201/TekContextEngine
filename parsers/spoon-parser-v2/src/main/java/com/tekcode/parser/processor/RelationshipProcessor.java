package com.tekcode.parser.processor;

import com.tekcode.parser.core.ParsingContext;
import com.tekcode.parser.model.Relationship;
import com.tekcode.parser.util.IdGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import spoon.reflect.CtModel;
import spoon.reflect.declaration.*;
import spoon.reflect.reference.*;
import spoon.reflect.code.*;
import spoon.reflect.visitor.CtScanner;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Processor for extracting relationships between entities
 */
public class RelationshipProcessor {
    private static final Logger logger = LoggerFactory.getLogger(RelationshipProcessor.class);

    private final ParsingContext context;
    private final Set<String> processedRelationships = new HashSet<>();

    public RelationshipProcessor(ParsingContext context) {
        this.context = context;
    }

    /**
     * Extracts all relationships from the model
     */
    public List<Relationship> extractRelationships(CtModel model) {
        List<Relationship> relationships = new ArrayList<>();

        try {
            // Extract inheritance relationships
            if (context.shouldExtractInheritance()) {
                relationships.addAll(extractInheritanceRelationships(model));
            }

            // Extract type usage relationships
            if (context.shouldExtractTypeUsage()) {
                relationships.addAll(extractTypeUsageRelationships(model));
            }

            // Extract method call relationships
            if (context.shouldExtractCallGraph()) {
                relationships.addAll(extractMethodCallRelationships(model));
            }

            // Extract field relationships
            if (context.shouldExtractFieldRelationships()) {
                relationships.addAll(extractFieldRelationships(model));
            }

            // Extract annotation relationships
            if (context.shouldExtractAnnotations()) {
                relationships.addAll(extractAnnotationRelationships(model));
            }

            logger.info("Extracted {} relationships", relationships.size());

        } catch (Exception e) {
            logger.error("Error extracting relationships", e);
            context.incrementErrorCount();
        }

        return relationships;
    }

    /**
     * Extracts inheritance relationships (extends, implements)
     */
    private List<Relationship> extractInheritanceRelationships(CtModel model) {
        List<Relationship> relationships = new ArrayList<>();

        for (CtType<?> type : model.getAllTypes()) {
            try {
                String sourceId = IdGenerator.generateClassId(context.getCodebaseName(), type.getQualifiedName());

                // Extract extends relationships
                if (type instanceof CtClass) {
                    CtClass<?> ctClass = (CtClass<?>) type;
                    CtTypeReference<?> superClass = ctClass.getSuperclass();

                    if (superClass != null && !superClass.getQualifiedName().equals("java.lang.Object")) {
                        String targetId = IdGenerator.generateClassId(context.getCodebaseName(), superClass.getQualifiedName());
                        Relationship relationship = createRelationship("EXTENDS", "class", sourceId, "class", targetId);
                        if (relationship != null) {
                            relationships.add(relationship);
                        }
                    }
                }

                // Extract implements relationships
                Set<CtTypeReference<?>> interfaces = type.getSuperInterfaces();
                for (CtTypeReference<?> interfaceRef : interfaces) {
                    String targetId = IdGenerator.generateInterfaceId(context.getCodebaseName(), interfaceRef.getQualifiedName());
                    Relationship relationship = createRelationship("IMPLEMENTS", "class", sourceId, "interface", targetId);
                    if (relationship != null) {
                        relationships.add(relationship);
                    }
                }

            } catch (Exception e) {
                logger.warn("Error extracting inheritance for type: {}", type.getQualifiedName(), e);
            }
        }

        return relationships;
    }

    /**
     * Extracts type usage relationships
     */
    private List<Relationship> extractTypeUsageRelationships(CtModel model) {
        List<Relationship> relationships = new ArrayList<>();

        TypeUsageScanner scanner = new TypeUsageScanner(relationships);
        model.accept(scanner);

        return relationships;
    }

    /**
     * Extracts method call relationships
     */
    private List<Relationship> extractMethodCallRelationships(CtModel model) {
        List<Relationship> relationships = new ArrayList<>();

        MethodCallScanner scanner = new MethodCallScanner(relationships);
        model.accept(scanner);

        return relationships;
    }

    /**
     * Extracts field relationships
     */
    private List<Relationship> extractFieldRelationships(CtModel model) {
        List<Relationship> relationships = new ArrayList<>();

        for (CtType<?> type : model.getAllTypes()) {
            try {
                String classId = IdGenerator.generateClassId(context.getCodebaseName(), type.getQualifiedName());

                for (CtField<?> field : type.getFields()) {
                    String fieldId = IdGenerator.generateFieldId(
                        context.getCodebaseName(),
                        type.getQualifiedName(),
                        field.getSimpleName()
                    );

                    // HAS_FIELD relationship
                    Relationship relationship = createRelationship("HAS_FIELD", "class", classId, "field", fieldId);
                    if (relationship != null) {
                        relationships.add(relationship);
                    }

                    // Field type relationship
                    CtTypeReference<?> fieldType = field.getType();
                    if (fieldType != null && !isPrimitiveType(fieldType.getQualifiedName())) {
                        String typeId = IdGenerator.generateClassId(context.getCodebaseName(), fieldType.getQualifiedName());
                        Relationship typeRelationship = createRelationship("FIELD_TYPE", "field", fieldId, "class", typeId);
                        if (typeRelationship != null) {
                            relationships.add(typeRelationship);
                        }
                    }
                }

            } catch (Exception e) {
                logger.warn("Error extracting field relationships for type: {}", type.getQualifiedName(), e);
            }
        }

        return relationships;
    }

    /**
     * Extracts annotation relationships
     */
    private List<Relationship> extractAnnotationRelationships(CtModel model) {
        List<Relationship> relationships = new ArrayList<>();

        AnnotationScanner scanner = new AnnotationScanner(relationships);
        model.accept(scanner);

        return relationships;
    }

    /**
     * Creates a relationship with deduplication
     */
    private Relationship createRelationship(String type, String sourceType, String sourceId, String targetType, String targetId) {
        String relationshipId = IdGenerator.generateRelationshipId(type, sourceId, targetId);

        if (processedRelationships.contains(relationshipId)) {
            return null; // Already processed
        }

        processedRelationships.add(relationshipId);

        Relationship relationship = new Relationship(type, sourceType, sourceId, targetType, targetId);
        relationship.setId(relationshipId);

        return relationship;
    }

    /**
     * Checks if a type is a primitive type
     */
    private boolean isPrimitiveType(String typeName) {
        return typeName.equals("int") || typeName.equals("long") || typeName.equals("double") ||
               typeName.equals("float") || typeName.equals("boolean") || typeName.equals("char") ||
               typeName.equals("byte") || typeName.equals("short") || typeName.equals("void") ||
               typeName.startsWith("java.lang.");
    }

    /**
     * Scanner for type usage relationships
     */
    private class TypeUsageScanner extends CtScanner {
        private final List<Relationship> relationships;

        public TypeUsageScanner(List<Relationship> relationships) {
            this.relationships = relationships;
        }

        @Override
        public <T> void visitCtMethod(CtMethod<T> method) {
            try {
                CtType<?> declaringType = method.getDeclaringType();
                if (declaringType != null) {
                    String methodId = IdGenerator.generateMethodId(context.getCodebaseName(), method);

                    // Return type relationship
                    CtTypeReference<T> returnType = method.getType();
                    if (returnType != null && !isPrimitiveType(returnType.getQualifiedName())) {
                        String returnTypeId = IdGenerator.generateClassId(context.getCodebaseName(), returnType.getQualifiedName());
                        Relationship relationship = createRelationship("RETURNS", "method", methodId, "class", returnTypeId);
                        if (relationship != null) {
                            relationships.add(relationship);
                        }
                    }

                    // Parameter type relationships
                    for (CtParameter<?> param : method.getParameters()) {
                        CtTypeReference<?> paramType = param.getType();
                        if (paramType != null && !isPrimitiveType(paramType.getQualifiedName())) {
                            String paramTypeId = IdGenerator.generateClassId(context.getCodebaseName(), paramType.getQualifiedName());
                            Relationship relationship = createRelationship("USES_TYPE", "method", methodId, "class", paramTypeId);
                            if (relationship != null) {
                                relationships.add(relationship);
                            }
                        }
                    }
                }
            } catch (Exception e) {
                logger.warn("Error processing method for type usage: {}", method.getSignature(), e);
            }

            super.visitCtMethod(method);
        }
    }

    /**
     * Scanner for method call relationships
     */
    private class MethodCallScanner extends CtScanner {
        private final List<Relationship> relationships;

        public MethodCallScanner(List<Relationship> relationships) {
            this.relationships = relationships;
        }

        @Override
        public <T> void visitCtInvocation(CtInvocation<T> invocation) {
            try {
                CtExecutable<?> callerMethod = invocation.getParent(CtExecutable.class);
                if (callerMethod != null) {
                    String callerMethodId = IdGenerator.generateMethodId(context.getCodebaseName(), callerMethod);

                    CtExecutableReference<?> executableRef = invocation.getExecutable();
                    if (executableRef != null && executableRef.getDeclaringType() != null) {
                        // Create a pseudo method ID for the called method
                        String calledMethodId = context.getCodebaseName() + ":method:" +
                                              executableRef.getDeclaringType().getQualifiedName() + "." +
                                              executableRef.getSignature();

                        Relationship relationship = createRelationship("CALLS", "method", callerMethodId, "method", calledMethodId);
                        if (relationship != null) {
                            relationships.add(relationship);
                        }
                    }
                }
            } catch (Exception e) {
                logger.warn("Error processing method call: {}", invocation, e);
            }

            super.visitCtInvocation(invocation);
        }
    }

    /**
     * Scanner for annotation relationships
     */
    private class AnnotationScanner extends CtScanner {
        private final List<Relationship> relationships;

        public AnnotationScanner(List<Relationship> relationships) {
            this.relationships = relationships;
        }

        @Override
        public <T> void visitCtClass(CtClass<T> ctClass) {
            processAnnotations(ctClass, "class", IdGenerator.generateClassId(context.getCodebaseName(), ctClass.getQualifiedName()));
            super.visitCtClass(ctClass);
        }

        @Override
        public <T> void visitCtInterface(CtInterface<T> ctInterface) {
            processAnnotations(ctInterface, "interface", IdGenerator.generateInterfaceId(context.getCodebaseName(), ctInterface.getQualifiedName()));
            super.visitCtInterface(ctInterface);
        }

        @Override
        public <T> void visitCtMethod(CtMethod<T> method) {
            processAnnotations(method, "method", IdGenerator.generateMethodId(context.getCodebaseName(), method));
            super.visitCtMethod(method);
        }

        @Override
        public <T> void visitCtField(CtField<T> field) {
            CtType<?> declaringType = field.getDeclaringType();
            if (declaringType != null) {
                String fieldId = IdGenerator.generateFieldId(context.getCodebaseName(), declaringType.getQualifiedName(), field.getSimpleName());
                processAnnotations(field, "field", fieldId);
            }
            super.visitCtField(field);
        }

        private void processAnnotations(CtElement element, String sourceType, String sourceId) {
            for (CtAnnotation<?> annotation : element.getAnnotations()) {
                try {
                    String annotationId = IdGenerator.generateAnnotationId(context.getCodebaseName(), annotation.getAnnotationType().getQualifiedName());
                    Relationship relationship = createRelationship("ANNOTATED_WITH", sourceType, sourceId, "annotation", annotationId);
                    if (relationship != null) {
                        relationships.add(relationship);
                    }
                } catch (Exception e) {
                    logger.warn("Error processing annotation: {}", annotation, e);
                }
            }
        }
    }
}
