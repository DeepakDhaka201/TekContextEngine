package com.tekcode.parser.processor;

import com.tekcode.parser.core.ParsingContext;
import com.tekcode.parser.model.*;
import com.tekcode.parser.util.IdGenerator;
import com.tekcode.parser.util.PathUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import spoon.reflect.declaration.*;
import spoon.reflect.code.*;
import spoon.reflect.visitor.CtScanner;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Processor for extracting method-level information
 */
public class MethodProcessor {
    private static final Logger logger = LoggerFactory.getLogger(MethodProcessor.class);

    private final ParsingContext context;

    public MethodProcessor(ParsingContext context) {
        this.context = context;
    }

    /**
     * Processes a method and extracts comprehensive information
     */
    public MethodNode processMethod(CtExecutable<?> executable) {
        try {
            if (!shouldIncludeMethod(executable)) {
                return null;
            }

            MethodNode methodNode = new MethodNode();

            // Basic information
            methodNode.setName(executable.getSimpleName());
            methodNode.setSignature(executable.getSignature());
            methodNode.setId(IdGenerator.generateMethodId(context.getCodebaseName(), executable));

            // Return type (for methods, not constructors)
            if (executable instanceof CtMethod) {
                CtMethod<?> method = (CtMethod<?>) executable;
                methodNode.setReturnType(method.getType().toString());
            } else {
                methodNode.setReturnType("void"); // Constructor
            }

            // Comments and documentation
            if (context.shouldIncludeComments() && executable.getDocComment() != null) {
                methodNode.setComment(executable.getDocComment());
            }

            // Method body
            if (context.shouldIncludeMethodBodies() && executable.getBody() != null) {
                methodNode.setBody(executable.getBody().toString());
            }

            // Modifiers and characteristics
            extractModifiers(methodNode, executable);

            // Position information
            extractPositionInfo(methodNode, executable);

            // Parameters
            List<ParameterInfo> parameters = extractParameters(executable);
            methodNode.setParameters(parameters);

            // Annotations/Decorators
            List<DecoratorInfo> decorators = new ArrayList<>();
            if (context.shouldExtractAnnotations()) {
                decorators = extractDecorators(executable);
            }
            methodNode.setDecorators(decorators);

            // Cyclomatic complexity
            int complexity = calculateCyclomaticComplexity(executable);
            methodNode.setCyclomaticComplexity(complexity);

            // Test method detection
            methodNode.setTestMethod(isTestMethod(executable));

            logger.debug("Processed method: {}", executable.getSignature());
            return methodNode;

        } catch (Exception e) {
            logger.error("Error processing method: {}", executable.getSignature(), e);
            context.incrementErrorCount();
            return null;
        }
    }

    /**
     * Determines if a method should be included based on configuration
     */
    private boolean shouldIncludeMethod(CtExecutable<?> executable) {
        // Check visibility
        if (!context.shouldIncludePrivateMembers() && hasModifier(executable, ModifierKind.PRIVATE)) {
            return false;
        }

        return true;
    }

    /**
     * Extracts modifier information from the method
     */
    private void extractModifiers(MethodNode methodNode, CtExecutable<?> executable) {
        // Visibility
        methodNode.setVisibility(getVisibility(executable));

        // Other modifiers
        methodNode.setAbstract(hasModifier(executable, ModifierKind.ABSTRACT));
        methodNode.setFinal(hasModifier(executable, ModifierKind.FINAL));
        methodNode.setStatic(hasModifier(executable, ModifierKind.STATIC));
        methodNode.setConstructor(executable instanceof CtConstructor);
    }

    /**
     * Extracts position information (file path, line numbers)
     */
    private void extractPositionInfo(MethodNode methodNode, CtExecutable<?> executable) {
        if (executable.getPosition() != null && executable.getPosition().isValidPosition()) {
            var position = executable.getPosition();

            if (position.getFile() != null) {
                String filePath = PathUtils.toRelativePath(
                    position.getFile().getAbsolutePath(),
                    context.getProjectPath()
                );
                methodNode.setFilePath(filePath);
            }

            methodNode.setStartLine(position.getLine());
            methodNode.setEndLine(position.getEndLine());
        }
    }

    /**
     * Extracts parameter information
     */
    private List<ParameterInfo> extractParameters(CtExecutable<?> executable) {
        List<ParameterInfo> parameters = new ArrayList<>();

        for (CtParameter<?> param : executable.getParameters()) {
            try {
                ParameterInfo paramInfo = new ParameterInfo();
                paramInfo.setName(param.getSimpleName());
                paramInfo.setType(param.getType().toString());
                paramInfo.setIsVarArgs(param.isVarArgs());
                paramInfo.setIsFinal(param.hasModifier(ModifierKind.FINAL));

                // Extract parameter annotations
                List<DecoratorInfo> decorators = new ArrayList<>();
                for (CtAnnotation<?> annotation : param.getAnnotations()) {
                    try {
                        DecoratorInfo decorator = new DecoratorInfo();
                        decorator.setName(annotation.getAnnotationType().getSimpleName());

                        // Extract annotation values if any
                        if (!annotation.getValues().isEmpty()) {
                            Map<String, Object> properties = new HashMap<>();
                            annotation.getValues().forEach((key, value) -> {
                                properties.put(key, value != null ? value.toString() : null);
                            });
                            decorator.setProperties(properties);
                        }

                        decorators.add(decorator);

                    } catch (Exception e) {
                        logger.warn("Error extracting parameter annotation: " + annotation.toString(), e);
                    }
                }
                paramInfo.setDecorators(decorators);

                parameters.add(paramInfo);

            } catch (Exception e) {
                logger.warn("Error extracting parameter: {}", param, e);
            }
        }

        return parameters;
    }

    /**
     * Extracts annotation/decorator information
     */
    private List<DecoratorInfo> extractDecorators(CtExecutable<?> executable) {
        List<DecoratorInfo> decorators = new ArrayList<>();

        for (CtAnnotation<?> annotation : executable.getAnnotations()) {
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
     * Calculates cyclomatic complexity of a method
     */
    private int calculateCyclomaticComplexity(CtExecutable<?> executable) {
        if (executable.getBody() == null) {
            return 1; // Abstract methods have complexity 1
        }

        ComplexityCalculator calculator = new ComplexityCalculator();
        return calculator.calculateComplexity(executable);
    }

    /**
     * Checks if a method is a test method
     */
    public boolean isTestMethod(CtExecutable<?> executable) {
        // Check for test annotations
        for (CtAnnotation<?> annotation : executable.getAnnotations()) {
            String annotationName = annotation.getAnnotationType().getSimpleName();
            if ("Test".equals(annotationName) ||
                "TestCase".equals(annotationName) ||
                "ParameterizedTest".equals(annotationName) ||
                "RepeatedTest".equals(annotationName)) {
                return true;
            }
        }

        // Check method name patterns
        String methodName = executable.getSimpleName().toLowerCase();
        if (methodName.startsWith("test") ||
            methodName.endsWith("test") ||
            methodName.contains("should")) {
            return true;
        }

        return false;
    }

    /**
     * Creates a test case node from a test method
     */
    public TestCaseNode createTestCase(CtExecutable<?> executable) {
        if (!isTestMethod(executable)) {
            return null;
        }

        try {
            TestCaseNode testCase = new TestCaseNode();

            // Basic information
            testCase.setName(executable.getSimpleName());
            testCase.setMethodName(executable.getSimpleName());

            // Get containing class
            CtType<?> containingType = executable.getParent(CtType.class);
            if (containingType != null) {
                testCase.setClassName(containingType.getQualifiedName());
            }

            // Generate ID
            String testClassName = testCase.getClassName() != null ? testCase.getClassName() : "unknown";
            testCase.setId(IdGenerator.generateTestCaseId(
                context.getCodebaseName(),
                testClassName,
                executable.getSimpleName()
            ));

            // Determine test type
            String testType = determineTestType(executable);
            testCase.setTestType(testType);

            return testCase;

        } catch (Exception e) {
            logger.error("Error creating test case for method: {}", executable.getSignature(), e);
            return null;
        }
    }

    /**
     * Determines the type of test based on annotations
     */
    private String determineTestType(CtExecutable<?> executable) {
        for (CtAnnotation<?> annotation : executable.getAnnotations()) {
            String annotationName = annotation.getAnnotationType().getSimpleName();
            switch (annotationName) {
                case "Test":
                    return "unit";
                case "ParameterizedTest":
                    return "parameterized";
                case "RepeatedTest":
                    return "repeated";
                case "IntegrationTest":
                    return "integration";
                default:
                    // Continue checking
            }
        }

        // Check method name for hints
        String methodName = executable.getSimpleName().toLowerCase();
        if (methodName.contains("integration")) {
            return "integration";
        } else if (methodName.contains("performance") || methodName.contains("load")) {
            return "performance";
        }

        return "unit"; // Default
    }

    /**
     * Inner class for calculating cyclomatic complexity
     */
    private static class ComplexityCalculator {
        private int complexity = 1; // Base complexity

        public int calculateComplexity(CtExecutable<?> executable) {
            if (executable.getBody() != null) {
                calculateFromElement(executable.getBody());
            }
            return complexity;
        }

        private void calculateFromElement(CtElement element) {
            if (element == null) return;

            // Count decision points
            if (element instanceof CtIf) {
                complexity++;
            } else if (element instanceof CtWhile) {
                complexity++;
            } else if (element instanceof CtFor) {
                complexity++;
            } else if (element instanceof CtForEach) {
                complexity++;
            } else if (element instanceof CtDo) {
                complexity++;
            } else if (element instanceof CtSwitch) {
                CtSwitch<?> switchStmt = (CtSwitch<?>) element;
                complexity += switchStmt.getCases().size();
            } else if (element instanceof CtCatch) {
                complexity++;
            } else if (element instanceof CtConditional) {
                complexity++;
            }

            // Recursively process child elements
            for (CtElement child : element.getDirectChildren()) {
                calculateFromElement(child);
            }
        }

        public int getComplexity() {
            return complexity;
        }
    }

    /**
     * Helper method to check if an executable has a specific modifier
     */
    private boolean hasModifier(CtExecutable<?> executable, ModifierKind modifier) {
        if (executable instanceof CtModifiable) {
            return ((CtModifiable) executable).hasModifier(modifier);
        }
        return false;
    }



    /**
     * Helper method to get visibility of an executable
     */
    private String getVisibility(CtExecutable<?> executable) {
        if (hasModifier(executable, ModifierKind.PUBLIC)) {
            return "public";
        } else if (hasModifier(executable, ModifierKind.PROTECTED)) {
            return "protected";
        } else if (hasModifier(executable, ModifierKind.PRIVATE)) {
            return "private";
        } else {
            return "package";
        }
    }
}
