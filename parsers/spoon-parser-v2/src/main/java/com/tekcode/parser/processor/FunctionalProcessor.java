package com.tekcode.parser.processor;

import com.tekcode.parser.core.ParsingContext;
import com.tekcode.parser.model.LambdaExpressionNode;
import com.tekcode.parser.model.MethodReferenceNode;
import com.tekcode.parser.model.ParameterInfo;
import com.tekcode.parser.util.IdGenerator;
import com.tekcode.parser.util.PathUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import spoon.reflect.CtModel;
import spoon.reflect.code.CtExecutableReferenceExpression;
import spoon.reflect.code.CtLambda;
import spoon.reflect.declaration.CtExecutable;
import spoon.reflect.declaration.CtParameter;
import spoon.reflect.declaration.CtType;
import spoon.reflect.declaration.ModifierKind;
import spoon.reflect.reference.CtExecutableReference;
import spoon.reflect.reference.CtTypeReference;
import spoon.reflect.visitor.CtScanner;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Processor for extracting functional programming constructs (lambdas and method references)
 */
public class FunctionalProcessor {
    private static final Logger logger = LoggerFactory.getLogger(FunctionalProcessor.class);
    
    private final ParsingContext context;
    private final AtomicInteger lambdaCounter = new AtomicInteger(0);
    private final AtomicInteger methodRefCounter = new AtomicInteger(0);
    
    public FunctionalProcessor(ParsingContext context) {
        this.context = context;
    }
    
    /**
     * Extracts all lambda expressions from the model
     */
    public List<LambdaExpressionNode> extractLambdaExpressions(CtModel model) {
        List<LambdaExpressionNode> lambdas = new ArrayList<>();
        
        LambdaScanner scanner = new LambdaScanner(lambdas);
        for (CtType<?> type : model.getAllTypes()) {
            type.accept(scanner);
        }
        
        logger.info("Extracted {} lambda expressions", lambdas.size());
        return lambdas;
    }
    
    /**
     * Extracts all method references from the model
     */
    public List<MethodReferenceNode> extractMethodReferences(CtModel model) {
        List<MethodReferenceNode> methodRefs = new ArrayList<>();
        
        MethodReferenceScanner scanner = new MethodReferenceScanner(methodRefs);
        for (CtType<?> type : model.getAllTypes()) {
            type.accept(scanner);
        }
        
        logger.info("Extracted {} method references", methodRefs.size());
        return methodRefs;
    }
    
    /**
     * Scanner for lambda expressions
     */
    private class LambdaScanner extends CtScanner {
        private final List<LambdaExpressionNode> lambdas;
        
        public LambdaScanner(List<LambdaExpressionNode> lambdas) {
            this.lambdas = lambdas;
        }
        
        @Override
        public <T> void visitCtLambda(CtLambda<T> lambda) {
            try {
                LambdaExpressionNode lambdaNode = processLambda(lambda);
                if (lambdaNode != null) {
                    lambdas.add(lambdaNode);
                }
            } catch (Exception e) {
                logger.warn("Error processing lambda expression: {}", lambda, e);
                context.incrementErrorCount();
            }
            
            super.visitCtLambda(lambda);
        }
    }
    
    /**
     * Scanner for method references
     */
    private class MethodReferenceScanner extends CtScanner {
        private final List<MethodReferenceNode> methodRefs;
        
        public MethodReferenceScanner(List<MethodReferenceNode> methodRefs) {
            this.methodRefs = methodRefs;
        }
        
        // Note: Method reference detection is simplified for now
        // Spoon's API for method references is complex and version-dependent
        // This would require more sophisticated analysis
    }
    
    /**
     * Processes a lambda expression
     */
    private LambdaExpressionNode processLambda(CtLambda<?> lambda) {
        try {
            LambdaExpressionNode lambdaNode = new LambdaExpressionNode();
            
            // Generate unique ID
            int lambdaId = lambdaCounter.incrementAndGet();
            String id = context.getCodebaseName() + ":lambda:" + lambdaId;
            lambdaNode.setId(id);
            
            // Expression content
            lambdaNode.setExpression(lambda.toString());
            
            // Parameters
            List<ParameterInfo> parameters = extractLambdaParameters(lambda);
            lambdaNode.setParameters(parameters);
            
            // Return type (if determinable)
            CtTypeReference<?> type = lambda.getType();
            if (type != null) {
                lambdaNode.setReturnType(type.toString());
            }
            
            // Functional interface (if determinable)
            String functionalInterface = determineFunctionalInterface(lambda);
            lambdaNode.setFunctionalInterface(functionalInterface);
            
            // Body type (expression vs block)
            lambdaNode.setBlockBody(lambda.getBody() != null &&
                                     lambda.getBody().toString().contains("{"));
            
            // Position information
            extractLambdaPositionInfo(lambdaNode, lambda);
            
            // Enclosing context
            extractEnclosingContext(lambdaNode, lambda);
            
            return lambdaNode;
            
        } catch (Exception e) {
            logger.error("Error processing lambda: {}", lambda, e);
            return null;
        }
    }
    
    /**
     * Processes a method reference
     */
    private MethodReferenceNode processMethodReference(CtExecutableReferenceExpression<?, ?> methodRef) {
        try {
            MethodReferenceNode methodRefNode = new MethodReferenceNode();
            
            // Generate unique ID
            int methodRefId = methodRefCounter.incrementAndGet();
            String id = context.getCodebaseName() + ":methodref:" + methodRefId;
            methodRefNode.setId(id);
            
            // Target information
            CtExecutableReference<?> executable = methodRef.getExecutable();
            if (executable != null) {
                if (executable.getDeclaringType() != null) {
                    methodRefNode.setTargetClass(executable.getDeclaringType().getQualifiedName());
                }
                methodRefNode.setTargetMethod(executable.getSimpleName());
            }
            
            // Reference type
            String referenceType = determineReferenceType(methodRef);
            methodRefNode.setReferenceType(referenceType);
            
            // Functional interface
            String functionalInterface = determineFunctionalInterface(methodRef);
            methodRefNode.setFunctionalInterface(functionalInterface);
            
            // Position information
            extractMethodRefPositionInfo(methodRefNode, methodRef);
            
            // Enclosing context
            extractEnclosingContext(methodRefNode, methodRef);
            
            return methodRefNode;
            
        } catch (Exception e) {
            logger.error("Error processing method reference: {}", methodRef, e);
            return null;
        }
    }
    
    /**
     * Extracts parameters from lambda expression
     */
    private List<ParameterInfo> extractLambdaParameters(CtLambda<?> lambda) {
        List<ParameterInfo> parameters = new ArrayList<>();
        
        for (CtParameter<?> param : lambda.getParameters()) {
            try {
                ParameterInfo paramInfo = new ParameterInfo();
                paramInfo.setName(param.getSimpleName());
                paramInfo.setType(param.getType().toString());
                paramInfo.setIsFinal(param.hasModifier(ModifierKind.FINAL));
                paramInfo.setDecorators(new ArrayList<>()); // Lambda parameters don't have annotations

                parameters.add(paramInfo);
                
            } catch (Exception e) {
                logger.warn("Error extracting lambda parameter: {}", param, e);
            }
        }
        
        return parameters;
    }
    
    /**
     * Determines the functional interface for a lambda or method reference
     */
    private String determineFunctionalInterface(Object functionalExpression) {
        // This is a simplified implementation
        // In practice, you'd need more sophisticated type analysis
        
        if (functionalExpression instanceof CtLambda) {
            CtLambda<?> lambda = (CtLambda<?>) functionalExpression;
            CtTypeReference<?> type = lambda.getType();
            if (type != null) {
                return type.getQualifiedName();
            }
        } else if (functionalExpression instanceof CtExecutableReferenceExpression) {
            CtExecutableReferenceExpression<?, ?> methodRef = 
                (CtExecutableReferenceExpression<?, ?>) functionalExpression;
            CtTypeReference<?> type = methodRef.getType();
            if (type != null) {
                return type.getQualifiedName();
            }
        }
        
        return "unknown";
    }
    
    /**
     * Determines the type of method reference
     */
    private String determineReferenceType(CtExecutableReferenceExpression<?, ?> methodRef) {
        CtExecutableReference<?> executable = methodRef.getExecutable();
        if (executable == null) {
            return "UNKNOWN";
        }
        
        String methodName = executable.getSimpleName();
        
        // Constructor reference
        if ("<init>".equals(methodName) || "new".equals(methodName)) {
            return "CONSTRUCTOR";
        }
        
        // Static method reference
        if (executable.isStatic()) {
            return "STATIC";
        }
        
        // For instance methods, we'd need more context to determine bound vs unbound
        // This is a simplified implementation
        return "INSTANCE_UNBOUND";
    }
    
    /**
     * Extracts position information for lambda
     */
    private void extractLambdaPositionInfo(LambdaExpressionNode lambdaNode, CtLambda<?> lambda) {
        if (lambda.getPosition() != null && lambda.getPosition().isValidPosition()) {
            var position = lambda.getPosition();
            
            if (position.getFile() != null) {
                String filePath = PathUtils.toRelativePath(
                    position.getFile().getAbsolutePath(), 
                    context.getProjectPath()
                );
                lambdaNode.setFilePath(filePath);
            }
            
            lambdaNode.setStartLine(position.getLine());
            lambdaNode.setEndLine(position.getEndLine());
        }
    }
    
    /**
     * Extracts position information for method reference
     */
    private void extractMethodRefPositionInfo(MethodReferenceNode methodRefNode, 
                                            CtExecutableReferenceExpression<?, ?> methodRef) {
        if (methodRef.getPosition() != null && methodRef.getPosition().isValidPosition()) {
            var position = methodRef.getPosition();
            
            if (position.getFile() != null) {
                String filePath = PathUtils.toRelativePath(
                    position.getFile().getAbsolutePath(), 
                    context.getProjectPath()
                );
                methodRefNode.setFilePath(filePath);
            }
            
            methodRefNode.setStartLine(position.getLine());
            methodRefNode.setEndLine(position.getEndLine());
        }
    }
    
    /**
     * Extracts enclosing context (method and class)
     */
    private void extractEnclosingContext(LambdaExpressionNode lambdaNode, CtLambda<?> lambda) {
        // Find enclosing method
        CtExecutable<?> enclosingMethod = lambda.getParent(CtExecutable.class);
        if (enclosingMethod != null) {
            String methodId = IdGenerator.generateMethodId(context.getCodebaseName(), enclosingMethod);
            lambdaNode.setEnclosingMethodId(methodId);
        }
        
        // Find enclosing class
        CtType<?> enclosingClass = lambda.getParent(CtType.class);
        if (enclosingClass != null) {
            String classId = IdGenerator.generateClassId(context.getCodebaseName(), enclosingClass.getQualifiedName());
            lambdaNode.setEnclosingClassId(classId);
        }
    }
    
    /**
     * Extracts enclosing context for method reference
     */
    private void extractEnclosingContext(MethodReferenceNode methodRefNode, 
                                       CtExecutableReferenceExpression<?, ?> methodRef) {
        // Find enclosing method
        CtExecutable<?> enclosingMethod = methodRef.getParent(CtExecutable.class);
        if (enclosingMethod != null) {
            String methodId = IdGenerator.generateMethodId(context.getCodebaseName(), enclosingMethod);
            methodRefNode.setEnclosingMethodId(methodId);
        }
        
        // Find enclosing class
        CtType<?> enclosingClass = methodRef.getParent(CtType.class);
        if (enclosingClass != null) {
            String classId = IdGenerator.generateClassId(context.getCodebaseName(), enclosingClass.getQualifiedName());
            methodRefNode.setEnclosingClassId(classId);
        }
    }
}
