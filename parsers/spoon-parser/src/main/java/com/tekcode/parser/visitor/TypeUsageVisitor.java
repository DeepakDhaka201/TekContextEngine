package com.tekcode.parser.visitor;

import com.tekcode.parser.model.ParseResult;
import com.tekcode.parser.model.Relationship;
import spoon.reflect.declaration.*;
import spoon.reflect.code.*;
import spoon.reflect.reference.CtTypeReference;
import spoon.reflect.visitor.CtAbstractVisitor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashSet;
import java.util.Set;
import java.util.List;

/**
 * Comprehensive visitor to extract USES_TYPE relationships for all type usage scenarios:
 * - Method signatures (parameters and return types)
 * - Constructor parameters
 * - Field declarations
 * - Local variable declarations
 * - Class inheritance (extends)
 * - Interface implementation (implements)
 * - Generic type parameters
 * - Type casting
 * - Exception handling
 * - Static type references
 */
public class TypeUsageVisitor extends CtAbstractVisitor {
    private static final Logger logger = LoggerFactory.getLogger(TypeUsageVisitor.class);
    private final ParseResult result;
    private final String codebaseName;

    public TypeUsageVisitor(ParseResult result, String codebaseName) {
        this.result = result;
        this.codebaseName = codebaseName;
    }

    @Override
    public <T> void visitCtMethod(CtMethod<T> method) {
        extractTypeUsagesFromMethod(method);
        extractOverrideRelationships(method);
        super.visitCtMethod(method);
    }

    @Override
    public <T> void visitCtConstructor(CtConstructor<T> constructor) {
        extractTypeUsagesFromConstructor(constructor);
        super.visitCtConstructor(constructor);
    }

    @Override
    public <T> void visitCtClass(CtClass<T> ctClass) {
        extractInheritanceRelationships(ctClass);
        super.visitCtClass(ctClass);
    }

    @Override
    public <T> void visitCtInterface(CtInterface<T> ctInterface) {
        extractInterfaceInheritance(ctInterface);
        super.visitCtInterface(ctInterface);
    }

    @Override
    public <T> void visitCtField(CtField<T> field) {
        extractFieldTypeUsage(field);
        super.visitCtField(field);
    }

    @Override
    public <T> void visitCtLocalVariable(CtLocalVariable<T> localVariable) {
        extractLocalVariableTypeUsage(localVariable);
        super.visitCtLocalVariable(localVariable);
    }


    @Override
    public void visitCtCatch(CtCatch ctCatch) {
        extractExceptionTypeUsage(ctCatch);
        super.visitCtCatch(ctCatch);
    }

    @Override
    public <T> void visitCtInvocation(CtInvocation<T> invocation) {
        extractStaticTypeReferences(invocation);
        super.visitCtInvocation(invocation);
    }

    @Override
    public <T> void visitCtFieldRead(CtFieldRead<T> fieldRead) {
        extractStaticFieldReferences(fieldRead);
        super.visitCtFieldRead(fieldRead);
    }

    private void extractTypeUsagesFromMethod(CtMethod<?> method) {
        try {
            String methodId = createMethodId(method);
            Set<String> usedTypes = new HashSet<>();

            // Extract return type
            if (method.getType() != null && !isVoidType(method.getType())) {
                String returnTypeId = createTypeId(method.getType());
                if (returnTypeId != null) {
                    usedTypes.add(returnTypeId);
                }
            }

            // Extract parameter types
            for (CtParameter<?> parameter : method.getParameters()) {
                if (parameter.getType() != null) {
                    String paramTypeId = createTypeId(parameter.getType());
                    if (paramTypeId != null) {
                        usedTypes.add(paramTypeId);
                    }
                    // Extract generic type arguments from parameter types
                    extractGenericTypeArguments(parameter.getType(), methodId, "Method");
                }
            }

            // Extract thrown exception types
            for (CtTypeReference<? extends Throwable> thrownType : method.getThrownTypes()) {
                if (!isBuiltInType(thrownType)) {
                    String exceptionTypeId = createTypeId(thrownType);
                    if (exceptionTypeId != null) {
                        usedTypes.add(exceptionTypeId);
                    }
                }
            }

            // Extract generic type arguments from return type
            if (method.getType() != null && !isVoidType(method.getType())) {
                extractGenericTypeArguments(method.getType(), methodId, "Method");
            }

            // Create USES_TYPE relationships
            for (String typeId : usedTypes) {
                Relationship relationship = new Relationship(
                    "USES_TYPE",
                    "Method",
                    methodId,
                    "Class",
                    typeId
                );
                result.addRelationship(relationship);
            }

        } catch (Exception e) {
            logger.debug("Error extracting type usages from method {}: {}", method.getSimpleName(), e.getMessage());
        }
    }

    private void extractTypeUsagesFromConstructor(CtConstructor<?> constructor) {
        try {
            String constructorId = createConstructorId(constructor);
            Set<String> usedTypes = new HashSet<>();

            // Extract parameter types
            for (CtParameter<?> parameter : constructor.getParameters()) {
                if (parameter.getType() != null) {
                    String paramTypeId = createTypeId(parameter.getType());
                    if (paramTypeId != null) {
                        usedTypes.add(paramTypeId);
                    }
                    // Extract generic type arguments from parameter types
                    extractGenericTypeArguments(parameter.getType(), constructorId, "Method");
                }
            }

            // Extract thrown exception types
            for (CtTypeReference<? extends Throwable> thrownType : constructor.getThrownTypes()) {
                if (!isBuiltInType(thrownType)) {
                    String exceptionTypeId = createTypeId(thrownType);
                    if (exceptionTypeId != null) {
                        usedTypes.add(exceptionTypeId);
                    }
                }
            }

            // Create USES_TYPE relationships
            for (String typeId : usedTypes) {
                Relationship relationship = new Relationship(
                    "USES_TYPE",
                    "Method",
                    constructorId,
                    "Class",
                    typeId
                );
                result.addRelationship(relationship);
            }

        } catch (Exception e) {
            logger.debug("Error extracting type usages from constructor: {}", e.getMessage());
        }
    }

    private void extractInheritanceRelationships(CtClass<?> ctClass) {
        try {
            String classId = codebaseName + ":" + ctClass.getQualifiedName();

            // Handle class inheritance (extends)
            CtTypeReference<?> superClass = ctClass.getSuperclass();
            if (superClass != null && !isBuiltInType(superClass)) {
                String superClassId = createTypeId(superClass);
                if (superClassId != null) {
                    Relationship extendsRel = new Relationship(
                        "EXTENDS",
                        "Class",
                        classId,
                        "Class", 
                        superClassId
                    );
                    result.addRelationship(extendsRel);

                    // Also create USES_TYPE for inheritance
                    Relationship usesRel = new Relationship(
                        "USES_TYPE",
                        "Class",
                        classId,
                        "Class",
                        superClassId
                    );
                    result.addRelationship(usesRel);
                }
            }

            // Handle interface implementation (implements)
            Set<CtTypeReference<?>> interfaces = ctClass.getSuperInterfaces();
            for (CtTypeReference<?> interfaceRef : interfaces) {
                if (!isBuiltInType(interfaceRef)) {
                    String interfaceId = createTypeId(interfaceRef);
                    if (interfaceId != null) {
                        Relationship implementsRel = new Relationship(
                            "IMPLEMENTS",
                            "Class",
                            classId,
                            "Interface",
                            interfaceId
                        );
                        result.addRelationship(implementsRel);

                        // Also create USES_TYPE for interface implementation
                        Relationship usesRel = new Relationship(
                            "USES_TYPE",
                            "Class",
                            classId,
                            "Interface",
                            interfaceId
                        );
                        result.addRelationship(usesRel);
                    }
                }
            }

            // Extract generic type parameters
            extractGenericTypes(ctClass.getFormalCtTypeParameters(), classId, "Class");

        } catch (Exception e) {
            logger.debug("Error extracting inheritance relationships for class {}: {}", ctClass.getSimpleName(), e.getMessage());
        }
    }

    private void extractInterfaceInheritance(CtInterface<?> ctInterface) {
        try {
            String interfaceId = codebaseName + ":" + ctInterface.getQualifiedName();

            // Handle interface inheritance (extends)
            Set<CtTypeReference<?>> superInterfaces = ctInterface.getSuperInterfaces();
            for (CtTypeReference<?> superInterfaceRef : superInterfaces) {
                if (!isBuiltInType(superInterfaceRef)) {
                    String superInterfaceId = createTypeId(superInterfaceRef);
                    if (superInterfaceId != null) {
                        Relationship extendsRel = new Relationship(
                            "EXTENDS",
                            "Interface",
                            interfaceId,
                            "Interface",
                            superInterfaceId
                        );
                        result.addRelationship(extendsRel);

                        Relationship usesRel = new Relationship(
                            "USES_TYPE",
                            "Interface",
                            interfaceId,
                            "Interface",
                            superInterfaceId
                        );
                        result.addRelationship(usesRel);
                    }
                }
            }

            // Extract generic type parameters
            extractGenericTypes(ctInterface.getFormalCtTypeParameters(), interfaceId, "Interface");

        } catch (Exception e) {
            logger.debug("Error extracting interface inheritance for {}: {}", ctInterface.getSimpleName(), e.getMessage());
        }
    }

    private void extractFieldTypeUsage(CtField<?> field) {
        try {
            CtClass<?> parentClass = field.getParent(CtClass.class);
            if (parentClass == null) return;

            String classId = codebaseName + ":" + parentClass.getQualifiedName();
            
            // Extract field type
            if (field.getType() != null && !isBuiltInType(field.getType())) {
                String fieldTypeId = createTypeId(field.getType());
                if (fieldTypeId != null) {
                    Relationship relationship = new Relationship(
                        "USES_TYPE",
                        "Class",
                        classId,
                        "Class",
                        fieldTypeId
                    );
                    result.addRelationship(relationship);
                }

                // Extract generic type arguments from field type
                extractGenericTypeArguments(field.getType(), classId, "Class");
            }

        } catch (Exception e) {
            logger.debug("Error extracting field type usage for {}: {}", field.getSimpleName(), e.getMessage());
        }
    }

    private void extractLocalVariableTypeUsage(CtLocalVariable<?> localVariable) {
        try {
            // Find the containing method
            CtMethod<?> containingMethod = localVariable.getParent(CtMethod.class);
            if (containingMethod != null) {
                String methodId = createMethodId(containingMethod);
                
                if (localVariable.getType() != null && !isBuiltInType(localVariable.getType())) {
                    String variableTypeId = createTypeId(localVariable.getType());
                    if (variableTypeId != null) {
                        Relationship relationship = new Relationship(
                            "USES_TYPE",
                            "Method",
                            methodId,
                            "Class",
                            variableTypeId
                        );
                        result.addRelationship(relationship);
                    }

                    // Extract generic type arguments
                    extractGenericTypeArguments(localVariable.getType(), methodId, "Method");
                }
            }

        } catch (Exception e) {
            logger.debug("Error extracting local variable type usage: {}", e.getMessage());
        }
    }


    private void extractExceptionTypeUsage(CtCatch ctCatch) {
        try {
            CtMethod<?> containingMethod = ctCatch.getParent(CtMethod.class);
            if (containingMethod != null) {
                String methodId = createMethodId(containingMethod);
                
                CtCatchVariable<? extends Throwable> catchVariable = ctCatch.getParameter();
                if (catchVariable != null && catchVariable.getType() != null && !isBuiltInType(catchVariable.getType())) {
                    String exceptionTypeId = createTypeId(catchVariable.getType());
                    if (exceptionTypeId != null) {
                        Relationship relationship = new Relationship(
                            "USES_TYPE",
                            "Method",
                            methodId,
                            "Class",
                            exceptionTypeId
                        );
                        result.addRelationship(relationship);
                    }
                }
            }

        } catch (Exception e) {
            logger.debug("Error extracting exception type usage: {}", e.getMessage());
        }
    }

    private void extractStaticTypeReferences(CtInvocation<?> invocation) {
        try {
            // Check for static method calls
            if (invocation.getTarget() != null && invocation.getTarget() instanceof CtTypeAccess) {
                CtTypeAccess<?> typeAccess = (CtTypeAccess<?>) invocation.getTarget();
                if (typeAccess.getAccessedType() != null && !isBuiltInType(typeAccess.getAccessedType())) {
                    CtMethod<?> containingMethod = invocation.getParent(CtMethod.class);
                    if (containingMethod != null) {
                        String methodId = createMethodId(containingMethod);
                        String staticTypeId = createTypeId(typeAccess.getAccessedType());
                        
                        if (staticTypeId != null) {
                            Relationship relationship = new Relationship(
                                "USES_TYPE",
                                "Method",
                                methodId,
                                "Class",
                                staticTypeId
                            );
                            result.addRelationship(relationship);
                        }
                    }
                }
            }

        } catch (Exception e) {
            logger.debug("Error extracting static type references: {}", e.getMessage());
        }
    }

    private void extractStaticFieldReferences(CtFieldRead<?> fieldRead) {
        try {
            // Check for static field access
            if (fieldRead.getTarget() != null && fieldRead.getTarget() instanceof CtTypeAccess) {
                CtTypeAccess<?> typeAccess = (CtTypeAccess<?>) fieldRead.getTarget();
                if (typeAccess.getAccessedType() != null && !isBuiltInType(typeAccess.getAccessedType())) {
                    CtMethod<?> containingMethod = fieldRead.getParent(CtMethod.class);
                    if (containingMethod != null) {
                        String methodId = createMethodId(containingMethod);
                        String staticTypeId = createTypeId(typeAccess.getAccessedType());
                        
                        if (staticTypeId != null) {
                            Relationship relationship = new Relationship(
                                "USES_TYPE",
                                "Method",
                                methodId,
                                "Class",
                                staticTypeId
                            );
                            result.addRelationship(relationship);
                        }
                    }
                }
            }

        } catch (Exception e) {
            logger.debug("Error extracting static field references: {}", e.getMessage());
        }
    }

    private void extractGenericTypes(List<CtTypeParameter> typeParameters, String sourceId, String sourceType) {
        for (CtTypeParameter typeParam : typeParameters) {
            if (typeParam.getSuperclass() != null && !isBuiltInType(typeParam.getSuperclass())) {
                String boundTypeId = createTypeId(typeParam.getSuperclass());
                if (boundTypeId != null) {
                    Relationship relationship = new Relationship(
                        "USES_TYPE",
                        sourceType,
                        sourceId,
                        "Class",
                        boundTypeId
                    );
                    result.addRelationship(relationship);
                }
            }
        }
    }

    private void extractGenericTypeArguments(CtTypeReference<?> typeRef, String sourceId, String sourceType) {
        if (typeRef.getActualTypeArguments() != null && !typeRef.getActualTypeArguments().isEmpty()) {
            for (CtTypeReference<?> typeArg : typeRef.getActualTypeArguments()) {
                if (!isBuiltInType(typeArg)) {
                    String typeArgId = createTypeId(typeArg);
                    if (typeArgId != null) {
                        Relationship relationship = new Relationship(
                            "USES_TYPE",
                            sourceType,
                            sourceId,
                            "Class",
                            typeArgId
                        );
                        result.addRelationship(relationship);
                    }
                }
                // Recursively handle nested generics
                extractGenericTypeArguments(typeArg, sourceId, sourceType);
            }
        }
    }

    private void extractOverrideRelationships(CtMethod<?> method) {
        try {
            CtClass<?> currentClass = method.getParent(CtClass.class);
            if (currentClass == null) return;

            String currentMethodId = createMethodId(method);
            
            // Check if method has @Override annotation
            boolean hasOverrideAnnotation = method.getAnnotations().stream()
                .anyMatch(ann -> ann.getAnnotationType().getSimpleName().equals("Override"));
            
            // Find overridden methods in superclass hierarchy
            findOverriddenMethods(method, currentClass, currentMethodId);
            
            // Find overridden methods in implemented interfaces
            findOverriddenInterfaceMethods(method, currentClass, currentMethodId);
            
        } catch (Exception e) {
            logger.debug("Error extracting override relationships for method {}: {}", method.getSimpleName(), e.getMessage());
        }
    }
    
    private void findOverriddenMethods(CtMethod<?> method, CtClass<?> currentClass, String currentMethodId) {
        // Check superclass hierarchy
        CtTypeReference<?> superClassRef = currentClass.getSuperclass();
        while (superClassRef != null && !isBuiltInType(superClassRef)) {
            try {
                CtType<?> superType = superClassRef.getTypeDeclaration();
                if (superType instanceof CtClass) {
                    CtClass<?> superClass = (CtClass<?>) superType;
                    
                    // Look for matching method in superclass
                    for (CtMethod<?> superMethod : superClass.getMethods()) {
                        if (isMethodOverride(method, superMethod)) {
                            String superMethodId = createMethodId(superMethod);
                            
                            Relationship overrideRel = new Relationship(
                                "OVERRIDES",
                                "Method",
                                currentMethodId,
                                "Method",
                                superMethodId
                            );
                            result.addRelationship(overrideRel);
                            return; // Found the overridden method, stop searching
                        }
                    }
                    
                    // Move to next superclass
                    superClassRef = superClass.getSuperclass();
                } else {
                    break;
                }
            } catch (Exception e) {
                logger.debug("Error checking superclass {}: {}", superClassRef.getQualifiedName(), e.getMessage());
                break;
            }
        }
    }
    
    private void findOverriddenInterfaceMethods(CtMethod<?> method, CtClass<?> currentClass, String currentMethodId) {
        // Check all implemented interfaces recursively
        Set<CtTypeReference<?>> allInterfaces = getAllImplementedInterfaces(currentClass);
        
        for (CtTypeReference<?> interfaceRef : allInterfaces) {
            if (isBuiltInType(interfaceRef)) continue;
            
            try {
                CtType<?> interfaceType = interfaceRef.getTypeDeclaration();
                if (interfaceType instanceof CtInterface) {
                    CtInterface<?> ctInterface = (CtInterface<?>) interfaceType;
                    
                    // Look for matching method in interface
                    for (CtMethod<?> interfaceMethod : ctInterface.getMethods()) {
                        if (isMethodOverride(method, interfaceMethod)) {
                            String interfaceMethodId = createInterfaceMethodId(interfaceMethod);
                            
                            Relationship overrideRel = new Relationship(
                                "OVERRIDES",
                                "Method",
                                currentMethodId,
                                "Method",
                                interfaceMethodId
                            );
                            result.addRelationship(overrideRel);
                        }
                    }
                }
            } catch (Exception e) {
                logger.debug("Error checking interface {}: {}", interfaceRef.getQualifiedName(), e.getMessage());
            }
        }
    }
    
    private Set<CtTypeReference<?>> getAllImplementedInterfaces(CtClass<?> clazz) {
        Set<CtTypeReference<?>> allInterfaces = new HashSet<>();
        
        // Add direct interfaces
        allInterfaces.addAll(clazz.getSuperInterfaces());
        
        // Add interfaces from superclass hierarchy
        CtTypeReference<?> superClassRef = clazz.getSuperclass();
        while (superClassRef != null && !isBuiltInType(superClassRef)) {
            try {
                CtType<?> superType = superClassRef.getTypeDeclaration();
                if (superType instanceof CtClass) {
                    CtClass<?> superClass = (CtClass<?>) superType;
                    allInterfaces.addAll(superClass.getSuperInterfaces());
                    superClassRef = superClass.getSuperclass();
                } else {
                    break;
                }
            } catch (Exception e) {
                break;
            }
        }
        
        // Add inherited interfaces recursively
        Set<CtTypeReference<?>> inheritedInterfaces = new HashSet<>();
        for (CtTypeReference<?> interfaceRef : new HashSet<>(allInterfaces)) {
            inheritedInterfaces.addAll(getParentInterfaces(interfaceRef));
        }
        allInterfaces.addAll(inheritedInterfaces);
        
        return allInterfaces;
    }
    
    private Set<CtTypeReference<?>> getParentInterfaces(CtTypeReference<?> interfaceRef) {
        Set<CtTypeReference<?>> parentInterfaces = new HashSet<>();
        
        try {
            CtType<?> interfaceType = interfaceRef.getTypeDeclaration();
            if (interfaceType instanceof CtInterface) {
                CtInterface<?> ctInterface = (CtInterface<?>) interfaceType;
                parentInterfaces.addAll(ctInterface.getSuperInterfaces());
                
                // Recursively get parent interfaces
                for (CtTypeReference<?> parentRef : ctInterface.getSuperInterfaces()) {
                    parentInterfaces.addAll(getParentInterfaces(parentRef));
                }
            }
        } catch (Exception e) {
            logger.debug("Error getting parent interfaces for {}: {}", interfaceRef.getQualifiedName(), e.getMessage());
        }
        
        return parentInterfaces;
    }
    
    private boolean isMethodOverride(CtMethod<?> method1, CtMethod<?> method2) {
        // Same method name
        if (!method1.getSimpleName().equals(method2.getSimpleName())) {
            return false;
        }
        
        // Same parameter count
        if (method1.getParameters().size() != method2.getParameters().size()) {
            return false;
        }
        
        // Same parameter types (ignoring generic bounds for basic matching)
        for (int i = 0; i < method1.getParameters().size(); i++) {
            CtParameter<?> param1 = method1.getParameters().get(i);
            CtParameter<?> param2 = method2.getParameters().get(i);
            
            if (!areParameterTypesCompatible(param1.getType(), param2.getType())) {
                return false;
            }
        }
        
        return true;
    }
    
    private boolean areParameterTypesCompatible(CtTypeReference<?> type1, CtTypeReference<?> type2) {
        if (type1 == null || type2 == null) return false;
        
        // Basic type name comparison (could be enhanced for more sophisticated matching)
        String name1 = type1.getQualifiedName();
        String name2 = type2.getQualifiedName();
        
        // Handle erasure for generics - compare raw types
        if (name1.contains("<")) {
            name1 = name1.substring(0, name1.indexOf("<"));
        }
        if (name2.contains("<")) {
            name2 = name2.substring(0, name2.indexOf("<"));
        }
        
        return name1.equals(name2);
    }
    
    private String createInterfaceMethodId(CtMethod<?> method) {
        CtInterface<?> parentInterface = method.getParent(CtInterface.class);
        String interfaceName = parentInterface != null ? parentInterface.getQualifiedName() : "Unknown";
        return codebaseName + ":" + interfaceName + "." + method.getSimpleName() + method.getSignature();
    }

    private String createMethodId(CtMethod<?> method) {
        CtClass<?> parentClass = method.getParent(CtClass.class);
        String className = parentClass != null ? parentClass.getQualifiedName() : "Unknown";
        return codebaseName + ":" + className + "." + method.getSimpleName() + method.getSignature();
    }

    private String createConstructorId(CtConstructor<?> constructor) {
        CtClass<?> parentClass = constructor.getParent(CtClass.class);
        String className = parentClass != null ? parentClass.getQualifiedName() : "Unknown";
        return codebaseName + ":" + className + ".<init>" + constructor.getSignature();
    }

    private String createTypeId(CtTypeReference<?> typeRef) {
        if (typeRef == null || isBuiltInType(typeRef)) {
            return null;
        }
        
        return codebaseName + ":" + typeRef.getQualifiedName();
    }

    private boolean isVoidType(CtTypeReference<?> typeRef) {
        return typeRef.getSimpleName().equals("void");
    }

    private boolean isBuiltInType(CtTypeReference<?> typeRef) {
        String qualifiedName = typeRef.getQualifiedName();
        return qualifiedName.startsWith("java.lang.") ||
               qualifiedName.startsWith("java.util.") ||
               qualifiedName.startsWith("java.io.") ||
               qualifiedName.equals("int") ||
               qualifiedName.equals("long") ||
               qualifiedName.equals("double") ||
               qualifiedName.equals("float") ||
               qualifiedName.equals("boolean") ||
               qualifiedName.equals("char") ||
               qualifiedName.equals("byte") ||
               qualifiedName.equals("short");
    }
}