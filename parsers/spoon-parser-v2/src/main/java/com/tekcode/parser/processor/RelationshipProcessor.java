package com.tekcode.parser.processor;

import com.tekcode.parser.core.ParsingContext;
import com.tekcode.parser.model.Relationship;
import com.tekcode.parser.util.IdGenerator;
import com.tekcode.parser.util.PathUtils;
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

            // Extract structural relationships (V1 compatibility)
            relationships.addAll(extractStructuralRelationships(model));

            // Extract method override relationships
            relationships.addAll(extractOverrideRelationships(model));

            // Extract dependency relationships (will be populated by DependencyProcessor)
            // This is a placeholder - actual dependencies are added by ParsingEngine

            // Extract API endpoint relationships (will be populated by APIEndpointProcessor)
            // This is a placeholder - actual endpoints are added by ParsingEngine

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
        for (CtType<?> type : model.getAllTypes()) {
            type.accept(scanner);
        }

        return relationships;
    }

    /**
     * Extracts method call relationships
     */
    private List<Relationship> extractMethodCallRelationships(CtModel model) {
        List<Relationship> relationships = new ArrayList<>();

        MethodCallScanner scanner = new MethodCallScanner(relationships);
        for (CtType<?> type : model.getAllTypes()) {
            type.accept(scanner);
        }

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
        for (CtType<?> type : model.getAllTypes()) {
            type.accept(scanner);
        }

        return relationships;
    }

    /**
     * Extracts structural relationships (DEFINES_CLASS, DEFINES_INTERFACE, HAS_METHOD, HAS_INNER_CLASS)
     */
    private List<Relationship> extractStructuralRelationships(CtModel model) {
        List<Relationship> relationships = new ArrayList<>();

        // Get all types including nested types recursively
        List<CtType<?>> allTypes = getAllTypesRecursively(new ArrayList<>(model.getAllTypes()));

        for (CtType<?> type : allTypes) {
            try {


                // DEFINES_CLASS and DEFINES_INTERFACE relationships (File -> Class/Interface)
                if (type.getPosition() != null && type.getPosition().getFile() != null) {
                    String filePath = type.getPosition().getFile().getAbsolutePath();
                    String relativePath = PathUtils.toRelativePath(filePath, context.getProjectPath());
                    String fileId = context.getCodebaseName() + ":file:" + relativePath;

                    if (type instanceof CtClass) {
                        String classId = IdGenerator.generateClassId(context.getCodebaseName(), type.getQualifiedName());
                        Relationship definesClassRel = createRelationship("DEFINES_CLASS", "file", fileId, "class", classId);
                        if (definesClassRel != null) {
                            relationships.add(definesClassRel);
                        }
                    } else if (type instanceof CtInterface) {
                        String interfaceId = IdGenerator.generateInterfaceId(context.getCodebaseName(), type.getQualifiedName());
                        Relationship definesInterfaceRel = createRelationship("DEFINES_INTERFACE", "file", fileId, "interface", interfaceId);
                        if (definesInterfaceRel != null) {
                            relationships.add(definesInterfaceRel);
                        }
                    }
                }

                // HAS_METHOD relationships (Class/Interface -> Method)
                String parentId;
                String parentType;
                if (type instanceof CtInterface) {
                    parentId = IdGenerator.generateInterfaceId(context.getCodebaseName(), type.getQualifiedName());
                    parentType = "interface";
                } else {
                    parentId = IdGenerator.generateClassId(context.getCodebaseName(), type.getQualifiedName());
                    parentType = "class";
                }

                for (CtMethod<?> method : type.getMethods()) {
                    String methodId = IdGenerator.generateMethodId(context.getCodebaseName(), method);
                    Relationship hasMethodRel = createRelationship("HAS_METHOD", parentType, parentId, "method", methodId);
                    if (hasMethodRel != null) {
                        relationships.add(hasMethodRel);
                    }
                }

                // HAS_INNER_CLASS relationships (Outer Class -> Inner Class)
                if (type instanceof CtClass && !type.isTopLevel()) {
                    CtType<?> declaringType = type.getDeclaringType();
                    if (declaringType instanceof CtClass) {
                        String outerClassId = IdGenerator.generateClassId(context.getCodebaseName(), declaringType.getQualifiedName());
                        String innerClassId = IdGenerator.generateClassId(context.getCodebaseName(), type.getQualifiedName());
                        Relationship hasInnerClassRel = createRelationship("HAS_INNER_CLASS", "class", outerClassId, "class", innerClassId);
                        if (hasInnerClassRel != null) {
                            relationships.add(hasInnerClassRel);
                        }
                    }
                }

            } catch (Exception e) {
                logger.warn("Error extracting structural relationships for type: {}", type.getQualifiedName(), e);
            }
        }

        return relationships;
    }

    /**
     * Extracts method override relationships
     */
    private List<Relationship> extractOverrideRelationships(CtModel model) {
        List<Relationship> relationships = new ArrayList<>();

        // Get all types including nested types recursively
        List<CtType<?>> allTypes = getAllTypesRecursively(new ArrayList<>(model.getAllTypes()));

        for (CtType<?> type : allTypes) {
            for (CtMethod<?> method : type.getMethods()) {
                try {
                    // Check for @Override annotation
                    boolean hasOverrideAnnotation = method.getAnnotations().stream()
                        .anyMatch(annotation -> annotation.getAnnotationType().getSimpleName().equals("Override"));

                    if (hasOverrideAnnotation) {
                        String methodId = IdGenerator.generateMethodId(context.getCodebaseName(), method);

                        // Find the overridden method in parent class/interface
                        String overriddenMethodId = findOverriddenMethodId(method);
                        if (overriddenMethodId != null) {
                            Relationship overridesRel = createRelationship("OVERRIDES", "method", methodId, "method", overriddenMethodId);
                            if (overridesRel != null) {
                                relationships.add(overridesRel);
                            }
                        }
                    }

                } catch (Exception e) {
                    logger.warn("Error extracting override relationship for method: {}", method.getSignature(), e);
                }
            }
        }

        return relationships;
    }

    /**
     * Finds the ID of the overridden method
     */
    private String findOverriddenMethodId(CtMethod<?> method) {
        try {
            CtClass<?> declaringClass = method.getParent(CtClass.class);
            if (declaringClass == null) return null;

            // First check superclass
            CtTypeReference<?> superClassRef = declaringClass.getSuperclass();
            if (superClassRef != null && !superClassRef.getQualifiedName().equals("java.lang.Object")) {
                String overriddenMethodId = findMethodInType(superClassRef, method);
                if (overriddenMethodId != null) {
                    return overriddenMethodId;
                }
            }

            // Then check all interfaces for default methods or abstract methods
            for (CtTypeReference<?> interfaceRef : declaringClass.getSuperInterfaces()) {
                String overriddenMethodId = findMethodInType(interfaceRef, method);
                if (overriddenMethodId != null) {
                    return overriddenMethodId;
                }
            }

        } catch (Exception e) {
            logger.debug("Error finding overridden method for: {}", method.getSignature(), e);
        }

        return null;
    }

    /**
     * Finds a method with matching signature in the given type
     */
    private String findMethodInType(CtTypeReference<?> typeRef, CtMethod<?> method) {
        try {
            // Try to get the actual type declaration
            CtType<?> type = typeRef.getTypeDeclaration();
            if (type != null) {
                // Look for a method with the same signature
                for (CtMethod<?> parentMethod : type.getMethods()) {
                    if (methodSignaturesMatch(method, parentMethod)) {
                        return IdGenerator.generateMethodId(context.getCodebaseName(), parentMethod);
                    }
                }
            }

            // Fallback: construct ID manually if type declaration not available
            String typeName = typeRef.getQualifiedName();
            return context.getCodebaseName() + ":method:" + typeName + "." + method.getSignature();

        } catch (Exception e) {
            logger.debug("Error finding method in type {}: {}", typeRef.getQualifiedName(), e.getMessage());
            return null;
        }
    }

    /**
     * Checks if two methods have matching signatures for override detection
     */
    private boolean methodSignaturesMatch(CtMethod<?> method1, CtMethod<?> method2) {
        // Check method name
        if (!method1.getSimpleName().equals(method2.getSimpleName())) {
            return false;
        }

        // Check parameter count
        if (method1.getParameters().size() != method2.getParameters().size()) {
            return false;
        }

        // Check parameter types
        for (int i = 0; i < method1.getParameters().size(); i++) {
            CtParameter<?> param1 = method1.getParameters().get(i);
            CtParameter<?> param2 = method2.getParameters().get(i);

            // Compare parameter types (handle generics)
            String type1 = param1.getType().getQualifiedName();
            String type2 = param2.getType().getQualifiedName();

            if (!type1.equals(type2)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Creates a DEPENDS_ON relationship (Project -> Dependency)
     */
    public Relationship createDependsOnRelationship(String dependencyId) {
        return createRelationship("DEPENDS_ON", "project", context.getCodebaseName(), "dependency", dependencyId);
    }

    /**
     * Creates an IMPLEMENTS_ENDPOINT relationship (Class -> APIEndpoint)
     */
    public Relationship createImplementsEndpointRelationship(String classId, String endpointId) {
        return createRelationship("IMPLEMENTS_ENDPOINT", "class", classId, "apiendpoint", endpointId);
    }

    /**
     * Creates a CONTAINS_DOCUMENT relationship (Project -> Document)
     */
    public Relationship createContainsDocumentRelationship(String documentId) {
        return createRelationship("CONTAINS_DOCUMENT", "project", context.getCodebaseName(), "document", documentId);
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

    /**
     * Recursively collect all types including nested types (inner classes, static nested classes, etc.)
     */
    private List<CtType<?>> getAllTypesRecursively(List<CtType<?>> topLevelTypes) {
        List<CtType<?>> allTypes = new ArrayList<>();

        for (CtType<?> type : topLevelTypes) {
            allTypes.add(type);
            // Recursively add nested types (convert Set to List)
            allTypes.addAll(getAllTypesRecursively(new ArrayList<>(type.getNestedTypes())));
        }

        return allTypes;
    }
}
