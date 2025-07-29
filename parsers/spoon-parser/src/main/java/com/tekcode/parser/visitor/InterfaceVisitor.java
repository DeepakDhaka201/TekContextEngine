package com.tekcode.parser.visitor;

import com.tekcode.parser.model.InterfaceNode;
import com.tekcode.parser.model.ParseResult;
import com.tekcode.parser.model.Relationship;
import com.tekcode.parser.model.DecoratorInfo;
import spoon.reflect.declaration.CtInterface;
import spoon.reflect.declaration.CtAnnotation;
import spoon.reflect.visitor.CtAbstractVisitor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.ArrayList;
import java.util.List;
import com.tekcode.parser.util.PathUtils;

public class InterfaceVisitor extends CtAbstractVisitor {
    private static final Logger logger = LoggerFactory.getLogger(InterfaceVisitor.class);
    private final ParseResult result;
    private final String codebaseName;
    private final String projectPath;

    public InterfaceVisitor(ParseResult result, String codebaseName, String projectPath) {
        this.result = result;
        this.codebaseName = codebaseName;
        this.projectPath = projectPath;
    }

    @Override
    public <T> void visitCtInterface(CtInterface<T> ctInterface) {
        try {
            InterfaceNode interfaceNode = new InterfaceNode();
            
            // Basic properties
            interfaceNode.setName(ctInterface.getSimpleName());
            interfaceNode.setFullyQualifiedName(ctInterface.getQualifiedName());
            interfaceNode.setId(codebaseName + ":" + ctInterface.getQualifiedName());
            
            // Comments
            if (ctInterface.getDocComment() != null) {
                interfaceNode.setComment(ctInterface.getDocComment());
            }
            
            // Position information
            if (ctInterface.getPosition() != null) {
                interfaceNode.setFilePath(PathUtils.toRelativePath(ctInterface.getPosition().getFile().getAbsolutePath(), projectPath));
                interfaceNode.setStartLine(ctInterface.getPosition().getLine());
                interfaceNode.setEndLine(ctInterface.getPosition().getEndLine());
            }
            
            // Extract annotations
            List<DecoratorInfo> decorators = extractDecorators(ctInterface);
            interfaceNode.setDecorators(decorators);
            
            // Create ANNOTATED_WITH relationships
            for (DecoratorInfo decorator : decorators) {
                Relationship annotatedWith = new Relationship(
                    "ANNOTATED_WITH",
                    "Interface",
                    interfaceNode.getId(),
                    "Annotation",
                    codebaseName + ":annotation:" + decorator.getName()
                );
                result.addRelationship(annotatedWith);
            }
            
            result.addInterface(interfaceNode);
            
            // Create DEFINES_INTERFACE relationship (File -> Interface)
            if (ctInterface.getPosition() != null && ctInterface.getPosition().getFile() != null) {
                Relationship relationship = new Relationship(
                    "DEFINES_INTERFACE",
                    "File",
                    codebaseName + ":" + PathUtils.toRelativePath(ctInterface.getPosition().getFile().getAbsolutePath(), projectPath),
                    "Interface",
                    codebaseName + ":" + interfaceNode.getFullyQualifiedName()
                );
                result.addRelationship(relationship);
            }
            
        } catch (Exception e) {
            logger.error("Error processing interface: " + ctInterface.getQualifiedName(), e);
        }
        
        super.visitCtInterface(ctInterface);
    }
    
    private List<DecoratorInfo> extractDecorators(CtInterface<?> ctInterface) {
        List<DecoratorInfo> decorators = new ArrayList<>();
        
        for (CtAnnotation<?> annotation : ctInterface.getAnnotations()) {
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