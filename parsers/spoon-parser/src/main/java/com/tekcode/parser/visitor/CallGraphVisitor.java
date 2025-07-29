package com.tekcode.parser.visitor;

import com.tekcode.parser.model.ParseResult;
import com.tekcode.parser.model.Relationship;
import spoon.reflect.code.CtInvocation;
import spoon.reflect.declaration.CtClass;
import spoon.reflect.declaration.CtMethod;
import spoon.reflect.visitor.CtAbstractVisitor;
import spoon.reflect.declaration.CtElement;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class CallGraphVisitor extends CtAbstractVisitor {
    private static final Logger logger = LoggerFactory.getLogger(CallGraphVisitor.class);
    private final ParseResult result;
    private final String codebaseName;
    private CtMethod<?> currentMethod;

    public CallGraphVisitor(ParseResult result, String codebaseName) {
        this.result = result;
        this.codebaseName = codebaseName;
    }

    @Override
    public <T> void visitCtMethod(CtMethod<T> method) {
        this.currentMethod = method;
        
        // Manual approach: search for invocations in the method
        if (method.getBody() != null) {
            java.util.List<CtElement> invocations = method.getBody().getElements(e -> e instanceof CtInvocation);
            for (CtElement invocation : invocations) {
                if (invocation instanceof CtInvocation) {
                    visitCtInvocation((CtInvocation<?>) invocation);
                }
            }
        }
        
        super.visitCtMethod(method);
        this.currentMethod = null;
    }

    @Override
    public <T> void visitCtInvocation(CtInvocation<T> invocation) {
        if (currentMethod != null) {
            try {
                // Get the calling method identifier
                CtClass<?> parentClass = currentMethod.getParent(CtClass.class);
                String callerClass = parentClass != null 
                    ? parentClass.getQualifiedName()
                    : "Unknown";
                String callerId = codebaseName + ":" + callerClass + "." + currentMethod.getSignature();

                // Get the called method identifier with full signature
                String calledMethodSignature = invocation.getExecutable().getSignature();
                String calledClass = "Unknown";
                
                if (invocation.getExecutable().getDeclaringType() != null) {
                    calledClass = invocation.getExecutable().getDeclaringType().getQualifiedName();
                }
                
                // Create globally unique ID for called method - note: may be external to this codebase
                String calledId;
                if (calledClass.startsWith("java.") || calledClass.startsWith("javax.") || calledClass.startsWith("org.springframework.")) {
                    // External library call - don't prefix with codebase name
                    calledId = calledClass + "." + calledMethodSignature;
                } else {
                    // Internal call - prefix with codebase name
                    calledId = codebaseName + ":" + calledClass + "." + calledMethodSignature;
                }
                
                // Create CALLS relationship
                Relationship relationship = new Relationship(
                    "CALLS",
                    "Method",
                    callerId,
                    "Method",
                    calledId
                );
                
                // Add call site information
                if (invocation.getPosition() != null && invocation.getPosition().isValidPosition()) {
                    relationship.addProperty("lineNumber", invocation.getPosition().getLine());
                    if (invocation.getPosition().getFile() != null) {
                        relationship.addProperty("fileName", invocation.getPosition().getFile().getName());
                    }
                }
                
                result.addRelationship(relationship);
                
            } catch (Exception e) {
                logger.debug("Could not process method call: " + e.getMessage());
            }
        }
        
        super.visitCtInvocation(invocation);
    }
}