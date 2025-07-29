package com.tekcode.parser.visitor;

import com.tekcode.parser.model.DecoratorInfo;
import com.tekcode.parser.model.MethodNode;
import com.tekcode.parser.model.ParseResult;
import com.tekcode.parser.model.Relationship;
import com.tekcode.parser.model.TestCaseNode;
import spoon.reflect.code.*;
import spoon.reflect.declaration.*;
import spoon.reflect.visitor.CtAbstractVisitor;
import spoon.reflect.code.BinaryOperatorKind;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import com.tekcode.parser.util.PathUtils;

public class MethodVisitor extends CtAbstractVisitor {
    private static final Logger logger = LoggerFactory.getLogger(MethodVisitor.class);
    private final ParseResult result;
    private final String codebaseName;
    private final String projectPath;
    
    // Common test annotations
    private static final Set<String> TEST_ANNOTATIONS = new HashSet<>();
    static {
        // JUnit 4
        TEST_ANNOTATIONS.add("Test");
        TEST_ANNOTATIONS.add("org.junit.Test");
        // JUnit 5
        TEST_ANNOTATIONS.add("org.junit.jupiter.api.Test");
        TEST_ANNOTATIONS.add("ParameterizedTest");
        TEST_ANNOTATIONS.add("org.junit.jupiter.params.ParameterizedTest");
        TEST_ANNOTATIONS.add("RepeatedTest");
        TEST_ANNOTATIONS.add("org.junit.jupiter.api.RepeatedTest");
        // TestNG
        TEST_ANNOTATIONS.add("org.testng.annotations.Test");
    }

    public MethodVisitor(ParseResult result, String codebaseName, String projectPath) {
        this.result = result;
        this.codebaseName = codebaseName;
        this.projectPath = projectPath;
    }

    @Override
    public <T> void visitCtMethod(CtMethod<T> method) {
        try {
            MethodNode methodNode = createMethodNode(method);
            result.addMethod(methodNode);
            
            // Check if this is a test method and create TestCase node
            if (isTestMethod(method)) {
                TestCaseNode testCase = createTestCaseNode(method);
                result.addTestCase(testCase);
            }
            
            // Create relationships
            createMethodRelationships(method, methodNode);
            
        } catch (Exception e) {
            logger.error("Error processing method: " + method.getSignature(), e);
        }
        
        super.visitCtMethod(method);
    }
    
    @Override
    public <T> void visitCtConstructor(CtConstructor<T> constructor) {
        try {
            MethodNode methodNode = createConstructorNode(constructor);
            result.addMethod(methodNode);
            
            // Create relationships for constructor
            createConstructorRelationships(constructor, methodNode);
            
        } catch (Exception e) {
            logger.error("Error processing constructor: " + constructor.getSignature(), e);
        }
        
        super.visitCtConstructor(constructor);
    }

    private MethodNode createMethodNode(CtMethod<?> method) {
        MethodNode methodNode = new MethodNode();
        
        // Basic properties
        methodNode.setName(method.getSimpleName());
        methodNode.setSignature(method.getSignature());
        
        // Set globally unique ID
        String className = method.getParent(CtClass.class) != null ? 
            method.getParent(CtClass.class).getQualifiedName() : "global";
        methodNode.setId(codebaseName + ":" + className + "." + method.getSignature());
        
        // Return type
        if (method.getType() != null) {
            methodNode.setReturnType(method.getType().getQualifiedName());
        }
        
        // Comments
        if (method.getDocComment() != null) {
            methodNode.setComment(method.getDocComment());
        }
        
        // Body
        if (method.getBody() != null) {
            methodNode.setBody(method.getBody().toString());
        }
        
        // Modifiers
        methodNode.setVisibility(getVisibility(method));
        methodNode.setAbstract(method.hasModifier(ModifierKind.ABSTRACT));
        methodNode.setStatic(method.hasModifier(ModifierKind.STATIC));
        methodNode.setFinal(method.hasModifier(ModifierKind.FINAL));
        methodNode.setSynchronized(method.hasModifier(ModifierKind.SYNCHRONIZED));
        
        // Parameters
        List<String> parameters = new ArrayList<>();
        for (CtParameter<?> param : method.getParameters()) {
            parameters.add(param.getType().getQualifiedName() + " " + param.getSimpleName());
        }
        methodNode.setParameters(parameters);
        
        // Position information
        if (method.getPosition() != null) {
            methodNode.setFilePath(PathUtils.toRelativePath(method.getPosition().getFile().getAbsolutePath(), projectPath));
            methodNode.setStartLine(method.getPosition().getLine());
            methodNode.setEndLine(method.getPosition().getEndLine());
        }
        
        // Parent class
        if (method.getParent(CtClass.class) != null) {
            methodNode.setClassName(method.getParent(CtClass.class).getQualifiedName());
        }
        
        // Method characteristics
        methodNode.setConstructor(false);
        
        // Calculate cyclomatic complexity (basic implementation)
        methodNode.setCyclomaticComplexity(calculateCyclomaticComplexity(method));
        
        // Extract annotations/decorators
        List<DecoratorInfo> decorators = extractDecorators(method);
        methodNode.setDecorators(decorators);
        
        // Create ANNOTATED_WITH relationships
        for (DecoratorInfo decorator : decorators) {
            Relationship annotatedWith = new Relationship(
                "ANNOTATED_WITH",
                "Method",
                methodNode.getId(),
                "Annotation",
                codebaseName + ":annotation:" + decorator.getName()
            );
            result.addRelationship(annotatedWith);
        }
        
        return methodNode;
    }
    
    private MethodNode createConstructorNode(CtConstructor<?> constructor) {
        MethodNode methodNode = new MethodNode();
        
        // Basic properties
        methodNode.setName(constructor.getSimpleName());
        methodNode.setSignature(constructor.getSignature());
        methodNode.setReturnType("void");
        methodNode.setConstructor(true);
        
        // Set globally unique ID
        String className = constructor.getParent(CtClass.class) != null ? 
            constructor.getParent(CtClass.class).getQualifiedName() : "global";
        methodNode.setId(codebaseName + ":" + className + "." + constructor.getSignature());
        
        // Comments
        if (constructor.getDocComment() != null) {
            methodNode.setComment(constructor.getDocComment());
        }
        
        // Body
        if (constructor.getBody() != null) {
            methodNode.setBody(constructor.getBody().toString());
        }
        
        // Modifiers
        methodNode.setVisibility(getVisibility(constructor));
        
        // Parameters
        List<String> parameters = new ArrayList<>();
        for (CtParameter<?> param : constructor.getParameters()) {
            parameters.add(param.getType().getQualifiedName() + " " + param.getSimpleName());
        }
        methodNode.setParameters(parameters);
        
        // Position information
        if (constructor.getPosition() != null) {
            methodNode.setFilePath(PathUtils.toRelativePath(constructor.getPosition().getFile().getAbsolutePath(), projectPath));
            methodNode.setStartLine(constructor.getPosition().getLine());
            methodNode.setEndLine(constructor.getPosition().getEndLine());
        }
        
        // Parent class
        if (constructor.getParent(CtClass.class) != null) {
            methodNode.setClassName(constructor.getParent(CtClass.class).getQualifiedName());
        }
        
        methodNode.setCyclomaticComplexity(calculateCyclomaticComplexity(constructor));
        
        return methodNode;
    }

    private void createMethodRelationships(CtMethod<?> method, MethodNode methodNode) {
        // HAS_METHOD relationship (Class -> Method)
        if (method.getParent(CtClass.class) != null) {
            CtClass<?> parentClass = method.getParent(CtClass.class);
            Relationship relationship = new Relationship(
                "HAS_METHOD",
                "Class",
                codebaseName + ":" + parentClass.getQualifiedName(),
                "Method",
                methodNode.getId()
            );
            result.addRelationship(relationship);
        }
        
        // DEFINES_METHOD relationship (File -> Method) for standalone methods
        if (method.getParent(CtClass.class) == null && method.getPosition() != null) {
            Relationship relationship = new Relationship(
                "DEFINES_METHOD",
                "File",
                codebaseName + ":" + PathUtils.toRelativePath(method.getPosition().getFile().getAbsolutePath(), projectPath),
                "Method",
                methodNode.getId()
            );
            result.addRelationship(relationship);
        }
    }
    
    private void createConstructorRelationships(CtConstructor<?> constructor, MethodNode methodNode) {
        // HAS_METHOD relationship (Class -> Method) for constructors
        if (constructor.getParent(CtClass.class) != null) {
            CtClass<?> parentClass = constructor.getParent(CtClass.class);
            Relationship relationship = new Relationship(
                "HAS_METHOD",
                "Class",
                codebaseName + ":" + parentClass.getQualifiedName(),
                "Method",
                methodNode.getId()
            );
            result.addRelationship(relationship);
        }
    }

    private String getVisibility(CtModifiable modifiable) {
        if (modifiable.hasModifier(ModifierKind.PUBLIC)) return "public";
        if (modifiable.hasModifier(ModifierKind.PROTECTED)) return "protected";
        if (modifiable.hasModifier(ModifierKind.PRIVATE)) return "private";
        return "package";
    }
    
    
    private int calculateCyclomaticComplexity(CtExecutable<?> executable) {
        // Simplified complexity calculation - just count decision points
        int complexity = 1; // Base complexity
        
        if (executable.getBody() != null) {
            String bodyStr = executable.getBody().toString();
            // Count common decision points
            complexity += countOccurrences(bodyStr, "if");
            complexity += countOccurrences(bodyStr, "while"); 
            complexity += countOccurrences(bodyStr, "for");
            complexity += countOccurrences(bodyStr, "switch");
            complexity += countOccurrences(bodyStr, "catch");
            complexity += countOccurrences(bodyStr, "&&");
            complexity += countOccurrences(bodyStr, "||");
        }
        
        return complexity;
    }
    
    private int countOccurrences(String text, String pattern) {
        int count = 0;
        int index = 0;
        while ((index = text.indexOf(pattern, index)) != -1) {
            count++;
            index += pattern.length();
        }
        return count;
    }
    
    private List<DecoratorInfo> extractDecorators(CtExecutable<?> executable) {
        List<DecoratorInfo> decorators = new ArrayList<>();
        
        for (CtAnnotation<?> annotation : executable.getAnnotations()) {
            try {
                DecoratorInfo decorator = new DecoratorInfo();
                decorator.setName(annotation.getAnnotationType().getSimpleName());
                
                // Extract annotation values if any
                if (!annotation.getValues().isEmpty()) {
                    List<Object> arguments = new ArrayList<>();
                    annotation.getValues().forEach((key, value) -> {
                        // Format as key=value for named parameters, or just value for positional
                        if (key.equals("value") && annotation.getValues().size() == 1) {
                            // Single value parameter, don't include key
                            arguments.add(value.toString());
                        } else {
                            // Named parameter or multiple parameters
                            arguments.add(key + "=" + value.toString());
                        }
                    });
                    decorator.setArguments(arguments);
                } else {
                    // Check if annotation has any implicit values
                    String annotationStr = annotation.toString();
                    if (annotationStr.contains("(") && annotationStr.contains(")")) {
                        // Extract content between parentheses
                        int start = annotationStr.indexOf("(") + 1;
                        int end = annotationStr.lastIndexOf(")");
                        if (start < end) {
                            String argsStr = annotationStr.substring(start, end).trim();
                            if (!argsStr.isEmpty()) {
                                List<Object> arguments = new ArrayList<>();
                                arguments.add(argsStr);
                                decorator.setArguments(arguments);
                            }
                        }
                    }
                }
                
                decorators.add(decorator);
                
            } catch (Exception e) {
                logger.warn("Error extracting annotation: " + annotation.toString(), e);
            }
        }
        
        
        return decorators;
    }
    
    private boolean isTestMethod(CtMethod<?> method) {
        // Check annotations
        for (CtAnnotation<?> annotation : method.getAnnotations()) {
            String annotationName = annotation.getAnnotationType().getQualifiedName();
            String simpleName = annotation.getAnnotationType().getSimpleName();
            
            if (TEST_ANNOTATIONS.contains(annotationName) || TEST_ANNOTATIONS.contains(simpleName)) {
                return true;
            }
        }
        
        // Check method name patterns (fallback for conventions)
        String methodName = method.getSimpleName();
        if (methodName.startsWith("test") || methodName.endsWith("Test")) {
            // Additional check: in a test class?
            CtClass<?> parent = method.getParent(CtClass.class);
            if (parent != null) {
                String className = parent.getSimpleName();
                if (className.endsWith("Test") || className.endsWith("Tests") || 
                    className.startsWith("Test") || className.contains("Test")) {
                    return true;
                }
            }
        }
        
        return false;
    }

    private TestCaseNode createTestCaseNode(CtMethod<?> method) {
        TestCaseNode testCase = new TestCaseNode();
        
        // Basic information
        testCase.setName(method.getSimpleName());
        testCase.setMethodName(method.getSimpleName());
        
        // Parent class information
        CtClass<?> parent = method.getParent(CtClass.class);
        if (parent != null) {
            testCase.setClassName(parent.getQualifiedName());
            testCase.setId(codebaseName + ":test:" + parent.getQualifiedName() + "." + method.getSimpleName());
        } else {
            testCase.setId(codebaseName + ":test:" + method.getSimpleName());
        }
        
        // File path
        if (method.getPosition() != null) {
            testCase.setFilePath(PathUtils.toRelativePath(method.getPosition().getFile().getAbsolutePath(), projectPath));
        }
        
        // Detect test framework
        testCase.setFramework(detectTestFramework(method));
        
        // Detect test type
        testCase.setTestType(detectTestType(method, parent));
        
        return testCase;
    }

    private String detectTestFramework(CtMethod<?> method) {
        for (CtAnnotation<?> annotation : method.getAnnotations()) {
            String annotationName = annotation.getAnnotationType().getQualifiedName();
            
            if (annotationName.contains("junit.jupiter")) {
                return "JUnit5";
            } else if (annotationName.contains("junit")) {
                return "JUnit4";
            } else if (annotationName.contains("testng")) {
                return "TestNG";
            }
        }
        
        return "Unknown";
    }

    private String detectTestType(CtMethod<?> method, CtClass<?> testClass) {
        if (testClass == null) {
            return "unit";
        }
        
        String className = testClass.getSimpleName().toLowerCase();
        String methodName = method.getSimpleName().toLowerCase();
        
        // Check for integration test patterns
        if (className.contains("integration") || methodName.contains("integration") ||
            className.contains("it") || className.endsWith("it")) {
            return "integration";
        }
        
        // Check for e2e test patterns
        if (className.contains("e2e") || methodName.contains("e2e") ||
            className.contains("endtoend") || methodName.contains("endtoend")) {
            return "e2e";
        }
        
        // Default to unit test
        return "unit";
    }
}