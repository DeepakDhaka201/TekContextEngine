package com.tekcode.parser.processor;

import com.tekcode.parser.core.ParsingContext;
import com.tekcode.parser.model.DecoratorInfo;
import com.tekcode.parser.model.InterfaceNode;
import com.tekcode.parser.util.IdGenerator;
import com.tekcode.parser.util.PathUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import spoon.reflect.declaration.CtAnnotation;
import spoon.reflect.declaration.CtInterface;
import spoon.reflect.declaration.ModifierKind;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Processor for extracting interface-level information
 */
public class InterfaceProcessor {
    private static final Logger logger = LoggerFactory.getLogger(InterfaceProcessor.class);

    private final ParsingContext context;

    public InterfaceProcessor(ParsingContext context) {
        this.context = context;
    }

    /**
     * Processes an interface and extracts comprehensive information
     */
    public InterfaceNode processInterface(CtInterface<?> ctInterface) {
        try {
            if (!shouldIncludeInterface(ctInterface)) {
                return null;
            }

            InterfaceNode interfaceNode = new InterfaceNode();

            // Basic information
            interfaceNode.setName(ctInterface.getSimpleName());
            interfaceNode.setFullyQualifiedName(ctInterface.getQualifiedName());
            interfaceNode.setId(IdGenerator.generateInterfaceId(context.getCodebaseName(), ctInterface.getQualifiedName()));

            // Comments and documentation
            if (context.shouldIncludeComments() && ctInterface.getDocComment() != null) {
                interfaceNode.setComment(ctInterface.getDocComment());
            }

            // Visibility
            extractVisibility(interfaceNode, ctInterface);

            // Position information
            extractPositionInfo(interfaceNode, ctInterface);

            // Annotations/Decorators
            List<DecoratorInfo> decorators = new ArrayList<>();
            if (context.shouldExtractAnnotations()) {
                decorators = extractDecorators(ctInterface);
            }
            interfaceNode.setDecorators(decorators);

            // Method count
            interfaceNode.setMethodCount(ctInterface.getMethods().size());

            logger.debug("Processed interface: {}", ctInterface.getQualifiedName());
            return interfaceNode;

        } catch (Exception e) {
            logger.error("Error processing interface: {}", ctInterface.getQualifiedName(), e);
            context.incrementErrorCount();
            return null;
        }
    }

    /**
     * Determines if an interface should be included based on configuration
     */
    private boolean shouldIncludeInterface(CtInterface<?> ctInterface) {
        // Check visibility
        if (!context.shouldIncludePrivateMembers() && ctInterface.isPrivate()) {
            return false;
        }

        // Check package filters
        String packageName = ctInterface.getPackage() != null ? ctInterface.getPackage().getQualifiedName() : "";

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
     * Extracts visibility information
     */
    private void extractVisibility(InterfaceNode interfaceNode, CtInterface<?> ctInterface) {
        if (ctInterface.isPublic()) {
            interfaceNode.setVisibility("public");
        } else if (ctInterface.isProtected()) {
            interfaceNode.setVisibility("protected");
        } else if (ctInterface.isPrivate()) {
            interfaceNode.setVisibility("private");
        } else {
            interfaceNode.setVisibility("package");
        }
    }

    /**
     * Extracts position information (file path, line numbers)
     */
    private void extractPositionInfo(InterfaceNode interfaceNode, CtInterface<?> ctInterface) {
        if (ctInterface.getPosition() != null && ctInterface.getPosition().isValidPosition()) {
            var position = ctInterface.getPosition();

            if (position.getFile() != null) {
                String filePath = PathUtils.toRelativePath(
                    position.getFile().getAbsolutePath(),
                    context.getProjectPath()
                );
                interfaceNode.setFilePath(filePath);
            }

            interfaceNode.setStartLine(position.getLine());
            interfaceNode.setEndLine(position.getEndLine());
        }
    }

    /**
     * Extracts annotation/decorator information
     */
    private List<DecoratorInfo> extractDecorators(CtInterface<?> ctInterface) {
        List<DecoratorInfo> decorators = new ArrayList<>();

        for (CtAnnotation<?> annotation : ctInterface.getAnnotations()) {
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
}
